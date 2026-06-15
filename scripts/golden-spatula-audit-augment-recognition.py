#!/usr/bin/env python3
"""Audit Golden Spatula selected-augment icon recognition on local screenshots.

The script generates per-frame annotations, contact sheets, and a CSV summary.
It intentionally uses the same local augment image templates that the app loads,
so the audit catches template/ROI regressions without needing Maa tasks.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from PIL import Image, ImageDraw, ImageFont


LOGICAL_WIDTH = 1280
LOGICAL_HEIGHT = 720

BOARD_SLOTS = [
    (1, "1", (382, 154, 54, 58)),
    (2, "2", (428, 154, 54, 58)),
    (3, "3", (474, 154, 54, 58)),
    (4, "4", (520, 154, 54, 58)),
    (5, "5", (566, 154, 54, 58)),
    (6, "6", (612, 154, 54, 58)),
]

HUD_SLOTS = [
    (1, "1", (558, 2, 42, 40)),
    (2, "2", (602, 2, 42, 40)),
    (3, "3", (646, 2, 42, 40)),
    (4, "4", (690, 2, 42, 40)),
    (5, "5", (734, 2, 42, 40)),
    (6, "6", (778, 2, 42, 40)),
]

FEATURE_SIZE = (18, 18)
HISTOGRAM_BINS = 4
TEMPLATE_HEIGHTS = (26, 30, 34, 38, 42, 46)
COARSE_TEMPLATE_LIMIT = 64
BOARD_MIN_SCORE = 0.56
HUD_MIN_SCORE = 0.66
PRESENCE_MIN_DARK_FRAME_RATIO = 0.06
PRESENCE_MIN_COLOR_RATIO = 0.12


@dataclass(frozen=True)
class TemplateVariantFeature:
    width: int
    height: int
    values: np.ndarray
    feature: np.ndarray
    histogram: np.ndarray


@dataclass(frozen=True)
class TemplateFeature:
    name: str
    path: Path
    feature: np.ndarray
    histogram: np.ndarray
    variants: tuple[TemplateVariantFeature, ...]


@dataclass
class SlotAudit:
    region: str
    index: int
    rect: tuple[int, int, int, int]
    present: bool
    matched: bool
    name: str
    score: float
    second_name: str
    second_score: float


def load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            try:
                return ImageFont.truetype(candidate, size)
            except OSError:
                pass
    return ImageFont.load_default()


def normalize_feature(values: np.ndarray) -> np.ndarray:
    vector = values.astype(np.float32).reshape(-1)
    vector -= float(vector.mean())
    norm = float(np.linalg.norm(vector))
    if norm <= 1e-6:
        return np.zeros_like(vector)
    return vector / norm


def color_histogram(image: Image.Image) -> np.ndarray:
    array = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    bins = np.minimum(
        HISTOGRAM_BINS - 1,
        np.maximum(0, np.floor(array * HISTOGRAM_BINS).astype(np.int32)),
    )
    indexes = (bins[:, :, 0] * HISTOGRAM_BINS + bins[:, :, 1]) * HISTOGRAM_BINS + bins[:, :, 2]
    histogram = np.bincount(indexes.reshape(-1), minlength=HISTOGRAM_BINS ** 3).astype(np.float32)
    norm = float(np.linalg.norm(histogram))
    if norm <= 1e-6:
        return histogram
    return histogram / norm


def image_feature(image: Image.Image) -> np.ndarray:
    resized = image.convert("RGB").resize(FEATURE_SIZE, Image.Resampling.BICUBIC)
    return normalize_feature(np.asarray(resized, dtype=np.float32) / 255.0)


def trim_transparent(image: Image.Image) -> Image.Image:
    if image.mode != "RGBA":
        return image.convert("RGB")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return image.convert("RGB")
    return image.crop(bbox).convert("RGB")


def build_template_variants(image: Image.Image) -> tuple[TemplateVariantFeature, ...]:
    variants: list[TemplateVariantFeature] = []
    aspect_ratio = image.width / max(1, image.height)

    for height in TEMPLATE_HEIGHTS:
        width = max(8, round(height * aspect_ratio))
        if width >= 54 or height >= 54:
            continue
        resized = image.convert("RGB").resize((width, height), Image.Resampling.BICUBIC)
        values = np.asarray(resized, dtype=np.float32) / 255.0
        normalized = normalize_feature(values)
        if float(np.linalg.norm(normalized)) <= 1e-6:
            continue
        variants.append(
            TemplateVariantFeature(
                width=width,
                height=height,
                values=normalized,
                feature=image_feature(resized),
                histogram=color_histogram(resized),
            )
        )

    return tuple(variants)


def load_templates(repo_root: Path) -> list[TemplateFeature]:
    manifest_path = repo_root / "projects/golden_spatula_mumu/resource_knowledge/image/augment/manifest.json"
    image_root = repo_root / "projects/golden_spatula_mumu/resource_knowledge/image"
    templates: list[TemplateFeature] = []

    if manifest_path.exists():
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        entries = data.get("entries", [])
        for entry in entries:
            resource_path = entry.get("template_resource_path")
            if not resource_path:
                continue
            template_path = image_root / resource_path
            if not template_path.exists():
                continue
            try:
                image = trim_transparent(Image.open(template_path))
            except OSError:
                continue
            variants = build_template_variants(image)
            if not variants:
                continue
            name = str(entry.get("slug") or template_path.stem)
            templates.append(
                TemplateFeature(
                    name=name,
                    path=template_path,
                    feature=image_feature(image),
                    histogram=color_histogram(image),
                    variants=variants,
                )
            )

    if templates:
        return templates

    augment_dir = image_root / "augment"
    for template_path in sorted(augment_dir.glob("*.png")):
        try:
            image = trim_transparent(Image.open(template_path))
        except OSError:
            continue
        variants = build_template_variants(image)
        if not variants:
            continue
        templates.append(
            TemplateFeature(
                name=template_path.stem,
                path=template_path,
                feature=image_feature(image),
                histogram=color_histogram(image),
                variants=variants,
            )
        )
    return templates


def scale_rect(rect: tuple[int, int, int, int], image: Image.Image) -> tuple[int, int, int, int]:
    scale_x = image.width / LOGICAL_WIDTH
    scale_y = image.height / LOGICAL_HEIGHT
    return (
        round(rect[0] * scale_x),
        round(rect[1] * scale_y),
        round(rect[2] * scale_x),
        round(rect[3] * scale_y),
    )


def crop_slot(image: Image.Image, rect: tuple[int, int, int, int], size: tuple[int, int]) -> Image.Image:
    x, y, width, height = rect
    crop = image.crop((x, y, x + width, y + height)).convert("RGB")
    return crop.resize(size, Image.Resampling.BICUBIC)


def is_dark_frame_pixel(rgb: np.ndarray) -> np.ndarray:
    luminance = rgb.mean(axis=2)
    return (luminance < 0.18) | ((rgb[:, :, 2] > 0.18) & (rgb[:, :, 0] < 0.16) & (rgb[:, :, 1] < 0.2))


def is_colorful_icon_pixel(rgb: np.ndarray) -> np.ndarray:
    luminance = rgb.mean(axis=2)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    return (luminance > 0.16) & (chroma > 0.08)


def has_icon_presence(slot: Image.Image) -> bool:
    array = np.asarray(slot.convert("RGB"), dtype=np.float32) / 255.0
    height, width, _ = array.shape
    yy, xx = np.mgrid[0:height, 0:width]
    frame_mask = (
        (xx < width * 0.18)
        | (xx > width * 0.82)
        | (yy < height * 0.18)
        | (yy > height * 0.82)
    )
    center_mask = ~frame_mask

    dark_frame = is_dark_frame_pixel(array) & frame_mask
    colorful_center = is_colorful_icon_pixel(array) & center_mask
    dark_ratio = float(dark_frame.sum() / max(1, frame_mask.sum()))
    color_ratio = float(colorful_center.sum() / max(1, center_mask.sum()))
    dark_pixels = is_dark_frame_pixel(array)
    colorful_pixels = is_colorful_icon_pixel(array)
    top_left_mask = (xx < width * 0.72) & (yy < height * 0.72)
    floating_presence = (
        float(dark_pixels.mean()) >= 0.08
        and float(colorful_pixels.mean()) >= 0.2
        and float((dark_pixels & top_left_mask).sum() / max(1, top_left_mask.sum())) >= 0.08
    )
    centered_presence = (
        dark_ratio >= PRESENCE_MIN_DARK_FRAME_RATIO
        and color_ratio >= PRESENCE_MIN_COLOR_RATIO
    )
    return floating_presence or centered_presence


def normalized_patch_score(patch: np.ndarray, template_values: np.ndarray) -> float:
    vector = patch.astype(np.float32).reshape(-1)
    vector -= float(vector.mean())
    norm = float(np.linalg.norm(vector))
    if norm <= 1e-6:
        return -1.0
    return float(np.dot(vector / norm, template_values))


def sliding_variant_score(
    slot_array: np.ndarray,
    variant: TemplateVariantFeature,
) -> tuple[float, int, int]:
    max_y = slot_array.shape[0] - variant.height
    max_x = slot_array.shape[1] - variant.width
    if max_x < 0 or max_y < 0:
        return -1.0, 0, 0

    windows = sliding_window_view(slot_array, (variant.height, variant.width, 3))
    windows = windows[:, :, 0, :, :, :][::2, ::2]
    row_count, column_count = windows.shape[:2]
    flat_windows = windows.reshape(row_count * column_count, -1)
    sums = flat_windows.sum(axis=1)
    sum_squares = np.square(flat_windows).sum(axis=1)
    count = flat_windows.shape[1]
    variance = np.maximum(0.0, sum_squares - (sums * sums) / count)
    norms = np.sqrt(variance)
    dots = flat_windows @ variant.values
    scores = np.where(norms > 1e-6, dots / norms, -1.0)
    best_index = int(np.argmax(scores))
    best_score = float(scores[best_index])
    best_row = best_index // column_count
    best_column = best_index % column_count
    return best_score, best_column * 2, best_row * 2


def patch_image(slot_array: np.ndarray, x: int, y: int, width: int, height: int) -> Image.Image:
    patch = np.clip(slot_array[y:y + height, x:x + width, :] * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(patch, "RGB")


def score_slot(
    slot: Image.Image,
    templates: list[TemplateFeature],
    exhaustive: bool = False,
) -> tuple[str, float, str, float]:
    coarse_images = [slot]
    top_left_size = max(24, round(min(slot.width, slot.height) * 0.78))
    if top_left_size < min(slot.width, slot.height):
        coarse_images.append(slot.crop((0, 0, top_left_size, top_left_size)))
    coarse_features = [image_feature(image) for image in coarse_images]
    coarse_histograms = [color_histogram(image) for image in coarse_images]
    coarse_scores: list[tuple[float, TemplateFeature]] = []

    for template in templates:
        score = max(
            float(np.dot(feature, template.feature)) * 0.72
            + float(np.dot(histogram, template.histogram)) * 0.28
            for feature, histogram in zip(coarse_features, coarse_histograms)
        )
        coarse_scores.append((score, template))

    best_name = ""
    best_score = -1.0
    second_name = ""
    second_score = -1.0
    slot_array = np.asarray(slot.convert("RGB"), dtype=np.float32) / 255.0

    templates_to_scan = (
        [template for _, template in coarse_scores]
        if exhaustive
        else [template for _, template in sorted(coarse_scores, key=lambda item: item[0], reverse=True)[:COARSE_TEMPLATE_LIMIT]]
    )

    for template in templates_to_scan:
        best_template_score = -1.0
        for variant in template.variants:
            base_score, x, y = sliding_variant_score(slot_array, variant)
            if base_score < best_template_score:
                continue
            patch = patch_image(slot_array, x, y, variant.width, variant.height)
            feature_score = float(np.dot(image_feature(patch), variant.feature))
            color_score = float(np.dot(color_histogram(patch), variant.histogram))
            fused_score = max(
                base_score,
                base_score * 0.68 + max(0.0, feature_score) * 0.2 + max(0.0, color_score) * 0.12,
            )
            best_template_score = fused_score

        if best_template_score > best_score:
            second_name = best_name
            second_score = best_score
            best_name = template.name
            best_score = best_template_score
        elif best_template_score > second_score:
            second_name = template.name
            second_score = best_template_score

    return best_name, best_score, second_name, second_score


def audit_slot_group(
    image: Image.Image,
    templates: list[TemplateFeature],
    slots: Iterable[tuple[int, str, tuple[int, int, int, int]]],
    region: str,
    slot_size: tuple[int, int],
    min_score: float,
    exhaustive: bool = False,
) -> list[SlotAudit]:
    audits: list[SlotAudit] = []
    used_names: set[str] = set()

    for index, _label, logical_rect in slots:
        rect = scale_rect(logical_rect, image)
        slot = crop_slot(image, rect, slot_size)
        present = has_icon_presence(slot)
        if not present:
            audits.append(SlotAudit(region, index, rect, False, False, "", 0.0, "", 0.0))
            continue

        name, score, second_name, second_score = score_slot(slot, templates, exhaustive=exhaustive)
        matched = score >= min_score and name not in used_names
        if matched:
            used_names.add(name)
        audits.append(SlotAudit(region, index, rect, True, matched, name, score, second_name, second_score))

    return audits


def annotate_frame(
    image: Image.Image,
    audits: list[SlotAudit],
    frame_index: int,
    source_name: str,
    output_path: Path,
) -> None:
    canvas = image.convert("RGB").copy()
    draw = ImageDraw.Draw(canvas)
    font = load_font(16)
    small_font = load_font(13)

    draw.rectangle((8, 8, 520, 72), fill=(0, 0, 0), outline=(92, 92, 112), width=1)
    draw.text((18, 16), f"#{frame_index:04d} {source_name}", font=font, fill=(255, 255, 255))
    present_count = sum(1 for item in audits if item.present)
    matched_count = sum(1 for item in audits if item.matched)
    draw.text(
        (18, 42),
        f"present={present_count} matched={matched_count}",
        font=small_font,
        fill=(190, 210, 255),
    )

    for audit in audits:
        x, y, width, height = audit.rect
        if audit.matched:
            color = (52, 211, 153)
        elif audit.present:
            color = (251, 191, 36)
        else:
            color = (96, 96, 116)
        draw.rectangle((x, y, x + width, y + height), outline=color, width=3 if audit.present else 1)
        if audit.present:
            label = f"{audit.region}{audit.index} {audit.score:.2f}"
            draw.rectangle((x, max(0, y - 18), x + 92, y), fill=(0, 0, 0))
            draw.text((x + 3, max(0, y - 17)), label, font=small_font, fill=color)

    panel_top = canvas.height - 118
    draw.rectangle((0, panel_top, canvas.width, canvas.height), fill=(0, 0, 0))
    x_cursor = 14
    for audit in [item for item in audits if item.present][:12]:
        x, y, width, height = audit.rect
        crop = image.crop((x, y, x + width, y + height)).resize((42, 42), Image.Resampling.NEAREST)
        canvas.paste(crop, (x_cursor, panel_top + 14))
        name = audit.name.replace("augment_", "")
        if len(name) > 20:
            name = name[:19] + "."
        draw.text((x_cursor, panel_top + 60), f"{audit.region}{audit.index} {audit.score:.2f}", font=small_font, fill=(255, 255, 255))
        draw.text((x_cursor, panel_top + 80), name, font=small_font, fill=(170, 180, 210))
        x_cursor += 104
        if x_cursor > canvas.width - 100:
            break

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path)


def make_contact_sheet(image_paths: list[Path], output_path: Path) -> None:
    thumb_width = 320
    thumb_height = 210
    columns = 5
    rows = math.ceil(len(image_paths) / columns)
    sheet = Image.new("RGB", (columns * thumb_width, rows * thumb_height), (24, 24, 30))

    for index, image_path in enumerate(image_paths):
        image = Image.open(image_path).convert("RGB")
        image.thumbnail((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        x = (index % columns) * thumb_width
        y = (index // columns) * thumb_height
        sheet.paste(image, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)


def read_manifest_rows(manifest_path: Path, start_row: int, limit: int) -> list[dict[str, str]]:
    with manifest_path.open("r", newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    start_index = max(0, start_row - 1)
    return rows[start_index:start_index + limit]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default=".tmp/selected-augment-roi-audit-20260615/audit_manifest.csv")
    parser.add_argument("--output", default=".tmp/augment-recognition-audit-20260615")
    parser.add_argument("--limit", type=int, default=600)
    parser.add_argument("--start-row", type=int, default=1)
    parser.add_argument("--clean", action="store_true")
    parser.add_argument("--include-hud-fallback", action="store_true")
    args = parser.parse_args()

    repo_root = Path.cwd()
    manifest_path = repo_root / args.manifest
    output_root = repo_root / args.output
    annotated_root = output_root / "annotated"
    sheets_root = output_root / "sheets"

    if args.clean and output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True, exist_ok=True)

    templates = load_templates(repo_root)
    if not templates:
        raise SystemExit("No augment templates were found.")

    rows = read_manifest_rows(manifest_path, args.start_row, args.limit)
    annotated_paths: list[Path] = []
    summary_rows: list[dict[str, str]] = []
    total_present = 0
    total_matched = 0
    score_sum = 0.0
    score_count = 0
    low_confidence_count = 0

    for frame_number, row in enumerate(rows, start=args.start_row):
        source_path = repo_root / row["source"]
        image = Image.open(source_path).convert("RGB")
        board_audits = audit_slot_group(
            image,
            templates,
            BOARD_SLOTS,
            "B",
            (54, 54),
            BOARD_MIN_SCORE,
            exhaustive=True,
        )
        selected_audits = board_audits
        if args.include_hud_fallback and not any(item.present for item in board_audits):
            selected_audits = audit_slot_group(
                image,
                templates,
                HUD_SLOTS,
                "H",
                (54, 54),
                HUD_MIN_SCORE,
                exhaustive=False,
            )

        present = [item for item in selected_audits if item.present]
        matched = [item for item in selected_audits if item.matched]
        total_present += len(present)
        total_matched += len(matched)
        for item in present:
            score_sum += item.score
            score_count += 1
            if item.score < 0.62:
                low_confidence_count += 1

        annotated_path = annotated_root / f"audit_{frame_number:04d}.png"
        annotate_frame(
            image,
            selected_audits,
            frame_number,
            source_path.name,
            annotated_path,
        )
        annotated_paths.append(annotated_path)

        summary_rows.append(
            {
                "index": str(frame_number),
                "source": str(source_path.relative_to(repo_root)),
                "region": "board" if selected_audits is board_audits else "hud",
                "present_slots": str(len(present)),
                "matched_slots": str(len(matched)),
                "best_matches": "; ".join(f"{item.region}{item.index}:{item.name}:{item.score:.4f}" for item in matched),
                "low_confidence_present_slots": str(sum(1 for item in present if item.score < 0.62)),
            }
        )

    for sheet_index in range(0, len(annotated_paths), 25):
        sheet_paths = annotated_paths[sheet_index:sheet_index + 25]
        make_contact_sheet(
            sheet_paths,
            sheets_root / f"audit_sheet_{sheet_index // 25 + 1:03d}.png",
        )

    summary_path = output_root / "recognition_summary.csv"
    with summary_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "index",
                "source",
                "region",
                "present_slots",
                "matched_slots",
                "best_matches",
                "low_confidence_present_slots",
            ],
        )
        writer.writeheader()
        writer.writerows(summary_rows)

    average_score = score_sum / score_count if score_count else 0.0
    match_rate = total_matched / total_present if total_present else 0.0
    report_path = output_root / "manual_review.md"
    report_path.write_text(
        "\n".join(
            [
                "# Golden Spatula Augment Recognition Audit",
                "",
                f"- Generated at: {datetime.now().isoformat(timespec='seconds')}",
                f"- Frames reviewed: {len(rows)}",
                f"- Templates loaded: {len(templates)}",
                f"- Present slots: {total_present}",
                f"- Matched slots: {total_matched}",
                f"- Proxy hit rate: {match_rate:.2%}",
                f"- Average present-slot score: {average_score:.4f}",
                f"- Present slots below 0.62: {low_confidence_count}",
                f"- Annotated frames: `{annotated_root.relative_to(repo_root)}`",
                f"- Contact sheets: `{sheets_root.relative_to(repo_root)}`",
                f"- CSV: `{summary_path.relative_to(repo_root)}`",
                f"- HUD fallback included: {args.include_hud_fallback}",
                "",
                "Manual check notes:",
                "- Green boxes are accepted matches; yellow boxes are present but below the current acceptance threshold.",
                "- The contact sheets are intended for visual review in batches of 25 frames.",
                "- This audit measures icon hit/miss and candidate stability; exact semantic accuracy still depends on visible ground truth in the frames.",
            ]
        ),
        encoding="utf-8",
    )

    print(json.dumps({
        "frames": len(rows),
        "templates": len(templates),
        "present_slots": total_present,
        "matched_slots": total_matched,
        "proxy_hit_rate": round(match_rate, 4),
        "average_score": round(average_score, 4),
        "low_confidence_present_slots": low_confidence_count,
        "output": str(output_root),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

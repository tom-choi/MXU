#!/usr/bin/env python3
"""Audit and benchmark Golden Spatula augment-choice icon recognition.

This script mirrors the fast fixed-ROI classifier used by
goldenSpatulaAugmentChoiceVision.ts closely enough to review OCR outputs
offline. It produces CSV metrics and review sheets that place the source
icon crop next to the predicted template icon.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import shutil
import statistics
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageDraw, ImageFont


CARD_ROIS = [
    (130, 80, 355, 390),
    (465, 80, 355, 390),
    (800, 80, 355, 390),
]

ICON_ROIS = [
    (1, "1", (260, 95, 120, 120)),
    (2, "2", (585, 95, 120, 120)),
    (3, "3", (910, 95, 120, 120)),
]

TITLE_ROIS = [
    (1, (175, 232, 265, 50)),
    (2, (510, 232, 265, 50)),
    (3, (845, 232, 265, 50)),
]

FEATURE_SIZE = (24, 24)
TITLE_FEATURE_SIZE = (265, 50)
HISTOGRAM_BINS = 4
DEFAULT_MIN_SCORE = 0.36
AMBIGUOUS_MARGIN = 0.008
STRONG_SCORE = 0.42
TITLE_SCORE_WEIGHT = 0.9
ICON_SCORE_WEIGHT = 0.1
TITLE_THRESHOLD = 170


@dataclass(frozen=True)
class TemplateFeature:
    slug: str
    name: str
    path: Path
    feature: np.ndarray
    histogram: np.ndarray
    title_feature: np.ndarray


@dataclass
class SlotResult:
    frame: Path
    slot_index: int
    slot_label: str
    source_roi: tuple[int, int, int, int]
    matched: bool
    ambiguous: bool
    best_slug: str
    best_name: str
    best_path: Path | None
    best_score: float
    best_icon_score: float
    best_title_score: float
    second_slug: str
    second_score: float
    third_slug: str
    third_score: float
    match_ms: float


def load_font(size: int) -> ImageFont.ImageFont:
    for candidate in [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]:
        if Path(candidate).exists():
            try:
                return ImageFont.truetype(candidate, size)
            except OSError:
                pass
    return ImageFont.load_default()


def load_title_font(size: int) -> ImageFont.ImageFont:
    for candidate in [
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/msyhbd.ttc",
        "C:/Windows/Fonts/arial.ttf",
    ]:
        if Path(candidate).exists():
            try:
                return ImageFont.truetype(candidate, size)
            except OSError:
                pass
    return ImageFont.load_default()


def normalize(values: np.ndarray) -> np.ndarray:
    vector = values.astype(np.float32).reshape(-1)
    vector -= float(vector.mean())
    norm = float(np.linalg.norm(vector))
    if norm <= 1e-6:
        return vector
    return vector / norm


def feature(image: Image.Image) -> np.ndarray:
    resized = image.convert("RGB").resize(FEATURE_SIZE, Image.Resampling.BICUBIC)
    return normalize(np.asarray(resized, dtype=np.float32) / 255.0)


def title_feature_from_image(image: Image.Image) -> np.ndarray:
    resized = image.convert("L").resize(TITLE_FEATURE_SIZE, Image.Resampling.BICUBIC)
    array = np.asarray(resized, dtype=np.float32)
    mask = (array >= TITLE_THRESHOLD).astype(np.float32)
    return normalize(mask)


def title_feature_from_text(text: str) -> np.ndarray:
    image = Image.new("L", TITLE_FEATURE_SIZE, 0)
    draw = ImageDraw.Draw(image)
    font = load_title_font(22)
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=1)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (TITLE_FEATURE_SIZE[0] - text_width) // 2 - bbox[0]
    y = (TITLE_FEATURE_SIZE[1] - text_height) // 2 - bbox[1]
    draw.text((x, y), text, fill=255, font=font, stroke_width=1, stroke_fill=0)
    array = np.asarray(image, dtype=np.float32)
    mask = (array >= 50).astype(np.float32)
    return normalize(mask)


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


def trim_transparent(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    background = Image.new("RGB", rgba.size, (0, 0, 0))
    background.paste(rgba, mask=rgba.getchannel("A"))
    return background


def load_templates(repo_root: Path) -> tuple[list[TemplateFeature], float]:
    started = time.perf_counter()
    manifest_path = repo_root / "projects/golden_spatula_mumu/resource_knowledge/image/augment/manifest.json"
    image_root = repo_root / "projects/golden_spatula_mumu/resource_knowledge/image"
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    templates: list[TemplateFeature] = []

    for entry in data.get("entries", []):
        resource_path = entry.get("template_resource_path")
        if not resource_path:
            continue
        path = image_root / resource_path
        if not path.exists():
            continue
        try:
            image = trim_transparent(Image.open(path))
        except OSError:
            continue
        templates.append(
            TemplateFeature(
                slug=str(entry.get("slug") or path.stem),
                name=str(entry.get("name") or entry.get("slug") or path.stem),
                path=path,
                feature=feature(image),
                histogram=color_histogram(image),
                title_feature=title_feature_from_text(str(entry.get("name") or entry.get("slug") or path.stem)),
            )
        )

    return templates, (time.perf_counter() - started) * 1000


def card_visible(image: Image.Image) -> bool:
    visible = 0
    for x, y, width, height in CARD_ROIS:
        crop = image.crop((x, y, x + width, y + height)).resize((120, 132), Image.Resampling.BILINEAR)
        array = np.asarray(crop, dtype=np.float32)
        red = array[:, :, 0]
        green = array[:, :, 1]
        blue = array[:, :, 2]
        purple_ratio = ((blue > 78) & (red > 42) & (blue > green * 1.18) & (red > green * 0.72) & ((blue + red - green * 2) > 42)).mean()
        dark_ratio = ((red < 82) & (green < 72) & (blue < 132) & (blue >= green * 0.9)).mean()
        bright_ratio = ((blue > 125) & (red > 75) & (green > 55) & (blue > green * 1.1)).mean()
        if purple_ratio > 0.05 and dark_ratio > 0.15 and bright_ratio > 0.02:
            visible += 1
    return visible >= 2


def discover_frames(frame_root: Path) -> tuple[list[Path], float]:
    started = time.perf_counter()
    frames = sorted(frame_root.glob("*.png"))
    choices = []
    for frame in frames:
        try:
            image = Image.open(frame).convert("RGB")
        except OSError:
            continue
        if card_visible(image):
            choices.append(frame)
    return choices, (time.perf_counter() - started) * 1000


def classify_slot(
    image: Image.Image,
    slot_index: int,
    slot_label: str,
    roi: tuple[int, int, int, int],
    templates: list[TemplateFeature],
    used_paths: set[Path],
    min_score: float,
) -> SlotResult:
    started = time.perf_counter()
    x, y, width, height = roi
    crop = image.crop((x, y, x + width, y + height))
    slot_feature = feature(crop)
    slot_histogram = color_histogram(crop)
    title_roi = next((title_rect for title_slot, title_rect in TITLE_ROIS if title_slot == slot_index), None)
    if title_roi:
        title_x, title_y, title_width, title_height = title_roi
        title_crop = image.crop((title_x, title_y, title_x + title_width, title_y + title_height))
    else:
        title_crop = image.crop((x, y, x + TITLE_FEATURE_SIZE[0], y + TITLE_FEATURE_SIZE[1]))
    slot_title_feature = title_feature_from_image(title_crop)
    scored = []

    for template in templates:
        if template.path in used_paths:
            continue
        feature_score = float(np.dot(slot_feature, template.feature))
        color_score = float(np.dot(slot_histogram, template.histogram))
        icon_score = feature_score * 0.78 + color_score * 0.22
        title_score = float(np.dot(slot_title_feature, template.title_feature))
        scored.append((icon_score, title_score, template))

    if scored:
        icon_scores = [item[0] for item in scored]
        title_scores = [item[1] for item in scored]
        icon_min = min(icon_scores)
        icon_range = max(icon_scores) - icon_min
        title_min = min(title_scores)
        title_range = max(title_scores) - title_min
        fused = []
        for icon_score, title_score, template in scored:
            normalized_icon = (icon_score - icon_min) / icon_range if icon_range > 1e-6 else 0.0
            normalized_title = (title_score - title_min) / title_range if title_range > 1e-6 else 0.0
            score = normalized_title * TITLE_SCORE_WEIGHT + normalized_icon * ICON_SCORE_WEIGHT
            fused.append((score, icon_score, title_score, template))
        fused.sort(key=lambda item: item[0], reverse=True)
    else:
        fused = []

    best_score, best_icon_score, best_title_score, best = fused[0] if fused else (-1.0, -1.0, -1.0, None)
    second_score, _second_icon_score, _second_title_score, second = fused[1] if len(fused) > 1 else (-1.0, -1.0, -1.0, None)
    third_score, _third_icon_score, _third_title_score, third = fused[2] if len(fused) > 2 else (-1.0, -1.0, -1.0, None)
    ambiguous = bool(best and best_score < STRONG_SCORE and best_score - second_score < AMBIGUOUS_MARGIN)
    matched = bool(best and best_score >= min_score and not ambiguous)
    if matched and best:
        used_paths.add(best.path)

    return SlotResult(
        frame=Path(),
        slot_index=slot_index,
        slot_label=slot_label,
        source_roi=roi,
        matched=matched,
        ambiguous=ambiguous,
        best_slug=best.slug if best else "",
        best_name=best.name if best else "",
        best_path=best.path if best else None,
        best_score=best_score,
        best_icon_score=best_icon_score,
        best_title_score=best_title_score,
        second_slug=second.slug if second else "",
        second_score=second_score,
        third_slug=third.slug if third else "",
        third_score=third_score,
        match_ms=(time.perf_counter() - started) * 1000,
    )


def run_audit(
    frames: Iterable[Path],
    templates: list[TemplateFeature],
    min_score: float,
) -> tuple[list[SlotResult], dict[str, float]]:
    results: list[SlotResult] = []
    frame_times: list[float] = []
    for frame in frames:
        image = Image.open(frame).convert("RGB")
        used_paths: set[Path] = set()
        started = time.perf_counter()
        for slot_index, slot_label, roi in ICON_ROIS:
            result = classify_slot(image, slot_index, slot_label, roi, templates, used_paths, min_score)
            result.frame = frame
            results.append(result)
        frame_times.append((time.perf_counter() - started) * 1000)

    return results, {
        "frame_count": float(len(frame_times)),
        "slot_count": float(len(results)),
        "frame_avg_ms": statistics.mean(frame_times) if frame_times else 0.0,
        "frame_p50_ms": statistics.median(frame_times) if frame_times else 0.0,
        "frame_p95_ms": sorted(frame_times)[math.floor((len(frame_times) - 1) * 0.95)] if frame_times else 0.0,
        "slot_avg_ms": statistics.mean([item.match_ms for item in results]) if results else 0.0,
        "matched_count": float(sum(1 for item in results if item.matched)),
        "ambiguous_count": float(sum(1 for item in results if item.ambiguous)),
    }


def write_csv(results: list[SlotResult], output_path: Path, repo_root: Path) -> None:
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "frame",
                "slot",
                "matched",
                "ambiguous",
                "best_slug",
                "best_score",
                "best_icon_score",
                "best_title_score",
                "second_slug",
                "second_score",
                "third_slug",
                "third_score",
                "match_ms",
            ],
        )
        writer.writeheader()
        for item in results:
            writer.writerow({
                "frame": str(item.frame.relative_to(repo_root)),
                "slot": item.slot_label,
                "matched": item.matched,
                "ambiguous": item.ambiguous,
                "best_slug": item.best_slug,
                "best_score": f"{item.best_score:.4f}",
                "best_icon_score": f"{item.best_icon_score:.4f}",
                "best_title_score": f"{item.best_title_score:.4f}",
                "second_slug": item.second_slug,
                "second_score": f"{item.second_score:.4f}",
                "third_slug": item.third_slug,
                "third_score": f"{item.third_score:.4f}",
                "match_ms": f"{item.match_ms:.3f}",
            })


def make_review_sheets(results: list[SlotResult], output_root: Path) -> None:
    font = load_font(18)
    small_font = load_font(13)
    card_width = 360
    card_height = 190
    columns = 3

    for sheet_index, start in enumerate(range(0, len(results), columns * 5), start=1):
        chunk = results[start:start + columns * 5]
        rows = math.ceil(len(chunk) / columns)
        sheet = Image.new("RGB", (columns * card_width, rows * card_height), (22, 22, 28))
        draw = ImageDraw.Draw(sheet)

        for index, result in enumerate(chunk):
            x0 = (index % columns) * card_width
            y0 = (index // columns) * card_height
            source = Image.open(result.frame).convert("RGB")
            x, y, width, height = result.source_roi
            source_crop = source.crop((x, y, x + width, y + height)).resize((80, 80), Image.Resampling.LANCZOS)
            sheet.paste(source_crop, (x0 + 12, y0 + 42))

            if result.best_path and result.best_path.exists():
                template = trim_transparent(Image.open(result.best_path)).resize((80, 80), Image.Resampling.LANCZOS)
                sheet.paste(template, (x0 + 108, y0 + 42))
            verdict = "MATCH" if result.matched else ("AMBIG" if result.ambiguous else "MISS")
            verdict_color = (74, 222, 128) if result.matched else ((251, 191, 36) if result.ambiguous else (248, 113, 113))
            draw.rectangle((x0 + 4, y0 + 4, x0 + card_width - 4, y0 + card_height - 4), outline=(56, 56, 68))
            draw.text((x0 + 12, y0 + 10), f"{result.frame.name} slot {result.slot_label}", font=font, fill=(255, 255, 255))
            draw.text((x0 + 204, y0 + 42), verdict, font=font, fill=verdict_color)
            draw.text((x0 + 204, y0 + 68), f"score {result.best_score:.3f}", font=small_font, fill=(220, 220, 230))
            draw.text((x0 + 12, y0 + 128), f"src", font=small_font, fill=(180, 190, 210))
            draw.text((x0 + 108, y0 + 128), f"pred", font=small_font, fill=(180, 190, 210))
            slug = result.best_slug
            if len(slug) > 36:
                slug = slug[:35] + "."
            draw.text((x0 + 12, y0 + 150), slug, font=small_font, fill=(195, 205, 235))
            draw.text((x0 + 12, y0 + 168), f"2:{result.second_score:.3f} {result.second_slug[:24]}", font=small_font, fill=(135, 145, 165))

        output_path = output_root / "sheets" / f"augment_choice_review_{sheet_index:03d}.png"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(output_path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", default=".tmp/shop-champion-audit/frames")
    parser.add_argument("--output", default=".tmp/augment-choice-vision-audit-20260616")
    parser.add_argument("--min-score", type=float, default=DEFAULT_MIN_SCORE)
    parser.add_argument("--clean", action="store_true")
    args = parser.parse_args()

    repo_root = Path.cwd()
    output_root = repo_root / args.output
    if args.clean and output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True, exist_ok=True)

    templates, template_load_ms = load_templates(repo_root)
    frames, discover_ms = discover_frames(repo_root / args.frames)
    results, metrics = run_audit(frames, templates, args.min_score)
    write_csv(results, output_root / "augment_choice_results.csv", repo_root)
    make_review_sheets(results, output_root)

    summary = {
        "templates": len(templates),
        "frames_discovered": len(frames),
        "slots_reviewed": len(results),
        "template_load_ms": template_load_ms,
        "frame_discover_ms": discover_ms,
        "comparisons": len(templates) * len(results),
        "feature_length": FEATURE_SIZE[0] * FEATURE_SIZE[1] * 3,
        **metrics,
    }
    (output_root / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_root / "manual_review.md").write_text(
        "\n".join([
            "# Golden Spatula Augment Choice Vision Audit",
            "",
            f"- Frames discovered: {len(frames)}",
            f"- Slots reviewed: {len(results)}",
            f"- Templates: {len(templates)}",
            f"- Comparisons: {len(templates) * len(results)}",
            f"- Feature length: {FEATURE_SIZE[0] * FEATURE_SIZE[1] * 3}",
            f"- Template load: {template_load_ms:.2f} ms",
            f"- Frame discovery: {discover_ms:.2f} ms",
            f"- Frame avg: {metrics['frame_avg_ms']:.3f} ms",
            f"- Frame p50: {metrics['frame_p50_ms']:.3f} ms",
            f"- Frame p95: {metrics['frame_p95_ms']:.3f} ms",
            f"- Slot avg: {metrics['slot_avg_ms']:.3f} ms",
            f"- Matched: {int(metrics['matched_count'])}",
            f"- Ambiguous: {int(metrics['ambiguous_count'])}",
            "",
            "Review method:",
            "- Each card shows the source icon crop on the left and the predicted local template on the right.",
            "- Manually inspect every output in the generated sheets and compare shape/color identity.",
        ]),
        encoding="utf-8",
    )
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

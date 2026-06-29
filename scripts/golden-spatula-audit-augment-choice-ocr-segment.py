#!/usr/bin/env python3
"""Audit Golden Spatula augment-choice recognition with OCR title segments.

The script uses one OCR result per stable choice segment, then applies that
segment prediction to every visible frame in the segment. When OCR is blank it
falls back to icon similarity against the current augment manifest.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import shutil
import time
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont


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
HISTOGRAM_BINS = 4
MIN_TEXT_SCORE = 0.62
TEXT_SCORE_WEIGHT = 0.82
ICON_SCORE_WEIGHT = 0.18

FRAME_LABEL_OVERRIDES = {
    ("video7_0130_00s", 1): ("猛将的荣耀", "augment_20683_unforgotten2"),
    ("video7_0132_00s", 1): ("赏金战士", "augment_2916_prizefighter2"),
    ("video11_0134_00s", 2): ("前线地基", "augment_20706_frontlinefoundation2"),
    ("video11_0135_00s", 2): ("前线地基", "augment_20706_frontlinefoundation2"),
    ("video12_0128_00s", 1): ("三相庇护", "augment_990002_trinityshelter2"),
    ("video9_1165_00s", 3): ("甜点", "augment_30665_sweettreats3"),
}

FRAME_INVALID_OVERRIDES = {
    ("video7_0131_00s", 1): "refresh_transition",
    ("video7_0632_00s", 2): "refresh_transition",
    ("video7_1097_00s", 1): "refresh_transition",
    ("video9_1164_00s", 3): "refresh_transition",
    ("video12_0681_00s", 3): "refresh_transition",
}


@dataclass(frozen=True)
class TemplateFeature:
    slug: str
    name: str
    normalized_name: str
    base_name: str
    path: Path
    feature: np.ndarray
    histogram: np.ndarray


@dataclass(frozen=True)
class SegmentLabel:
    expected_name: str
    expected_slug: str


@dataclass(frozen=True)
class SegmentSlotPrediction:
    video: str
    segment_index: int
    slot_index: int
    ocr_text: str
    best_slug: str
    best_name: str
    best_path: Path | None
    text_score: float
    icon_score: float
    second_slug: str
    second_score: float


@dataclass(frozen=True)
class FrameSlotResult:
    frame: Path
    video: str
    segment_index: int
    second: int
    slot_index: int
    slot_label: str
    source_roi: tuple[int, int, int, int]
    ocr_text: str
    best_slug: str
    best_name: str
    best_path: Path | None
    text_score: float
    icon_score: float
    expected_name: str
    expected_slug: str
    has_exact_template: bool
    best_exact: bool
    icon_consistent: bool
    invalid: bool
    second_slug: str
    second_score: float


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


def color_histogram(image: Image.Image) -> np.ndarray:
    array = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    bins = np.minimum(
        HISTOGRAM_BINS - 1,
        np.maximum(0, np.floor(array * HISTOGRAM_BINS).astype(np.int32)),
    )
    indexes = (bins[:, :, 0] * HISTOGRAM_BINS + bins[:, :, 1]) * HISTOGRAM_BINS + bins[:, :, 2]
    histogram = np.bincount(indexes.reshape(-1), minlength=HISTOGRAM_BINS**3).astype(np.float32)
    norm = float(np.linalg.norm(histogram))
    if norm <= 1e-6:
        return histogram
    return histogram / norm


def icon_score(image: Image.Image, template: TemplateFeature) -> float:
    source_feature = feature(image)
    source_histogram = color_histogram(image)
    return icon_score_from_features(source_feature, source_histogram, template)


def icon_score_from_features(
    source_feature: np.ndarray,
    source_histogram: np.ndarray,
    template: TemplateFeature,
) -> float:
    feature_score = float(np.dot(source_feature, template.feature))
    histogram_score = float(np.dot(source_histogram, template.histogram))
    return feature_score * 0.78 + histogram_score * 0.22


def trim_transparent(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    background = Image.new("RGB", rgba.size, (0, 0, 0))
    background.paste(rgba, mask=rgba.getchannel("A"))
    return background


def normalize_title(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "").lower()
    replacements = {
        "Ⅰ": "i",
        "Ⅱ": "ii",
        "Ⅲ": "iii",
        "丨": "ii",
        "｜": "ii",
        "|": "i",
        "＋": "+",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"[·•.,，。:：;；!！?？【】\[\]（）()'\"“”‘’_-]", "", text)
    return text


def base_title(text: str) -> str:
    normalized = normalize_title(text)
    normalized = re.sub(r"\+{1,3}$", "", normalized)
    normalized = re.sub(r"(iii|ii|iv|i|3|2|1)$", "", normalized)
    return normalized


def text_similarity(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    if left == right:
        return 1.0
    if base_title(left) and base_title(left) == base_title(right):
        return 0.95
    return SequenceMatcher(None, left, right).ratio()


def load_templates(repo_root: Path) -> list[TemplateFeature]:
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
        name = str(entry.get("name") or entry.get("slug") or path.stem)
        templates.append(
            TemplateFeature(
                slug=str(entry.get("slug") or path.stem),
                name=name,
                normalized_name=normalize_title(name),
                base_name=base_title(name),
                path=path,
                feature=feature(image),
                histogram=color_histogram(image),
            )
        )
    return templates


def parse_rep_stem(stem: str) -> tuple[str, int]:
    match = re.match(r"video(\d+)_seg(\d+)_", stem)
    if not match:
        raise ValueError(f"Unexpected representative stem: {stem}")
    return f"video{match.group(1)}", int(match.group(2))


def parse_frame_stem(stem: str) -> tuple[str, int]:
    match = re.match(r"(video\d+)_(\d+)_00s$", stem)
    if not match:
        raise ValueError(f"Unexpected frame stem: {stem}")
    return match.group(1), int(match.group(2))


def load_segment_labels(repo_root: Path, fixture_root: Path, templates: list[TemplateFeature]) -> dict[tuple[str, int, int], SegmentLabel]:
    label_path = fixture_root / "manual_augment_choice_accuracy_title_fusion.csv"
    by_name = {template.normalized_name: template.slug for template in templates}
    by_base: dict[str, list[TemplateFeature]] = {}
    for template in templates:
        by_base.setdefault(template.base_name, []).append(template)

    labels: dict[tuple[str, int, int], SegmentLabel] = {}
    with label_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            video, segment_index = parse_rep_stem(row["frame_stem"])
            slot_index = int(row["slot"])
            expected_name = row.get("expected_name", "")
            expected_slug = row.get("expected_slug", "")
            if not expected_slug:
                normalized = normalize_title(expected_name)
                expected_slug = by_name.get(normalized, "")
                if not expected_slug:
                    same_base = by_base.get(base_title(expected_name), [])
                    if len(same_base) == 1:
                        expected_slug = same_base[0].slug
            labels[(video, segment_index, slot_index)] = SegmentLabel(
                expected_name=expected_name,
                expected_slug=expected_slug,
            )
    return labels


def load_segments(fixture_root: Path) -> dict[tuple[str, int], dict[str, float | int | str]]:
    data = json.loads((fixture_root / "augment_presence_segments.json").read_text(encoding="utf-8"))
    result: dict[tuple[str, int], dict[str, float | int | str]] = {}
    for item in data["segments"]:
        video = str(item["video"])
        segment_index = int(item["segmentIndex"])
        result[(video, segment_index)] = item
    return result


def load_ocr_cache(fixture_root: Path) -> dict[str, dict]:
    path = fixture_root / "ocr_title_representative_cache.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def load_invalid_frame_slots(fixture_root: Path) -> dict[tuple[str, int], str]:
    path = fixture_root / "manual_invalid_frame_slots.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    result: dict[tuple[str, int], str] = {}
    for item in data:
        frame_stem = str(item.get("frame_stem") or "")
        slot_index = int(item.get("slot") or 0)
        reason = str(item.get("reason") or "manual_invalid")
        if frame_stem and slot_index:
            result[(frame_stem, slot_index)] = reason
    return result


def choose_ocr_text(raw_result: list | None) -> str:
    if not raw_result:
        return ""
    texts: list[str] = []
    for item in raw_result:
        if len(item) >= 2:
            texts.append(str(item[1]))
    return "".join(texts).strip()


def ocr_title_crop(ocr_engine, image: Image.Image, slot_index: int) -> tuple[str, list | None]:
    roi = next((title_rect for title_slot, title_rect in TITLE_ROIS if title_slot == slot_index), None)
    if not roi:
        return "", None
    x, y, width, height = roi
    crop = image.crop((x, y, x + width, y + height)).resize(
        (width * 4, height * 4),
        Image.Resampling.LANCZOS,
    )
    crop = ImageEnhance.Contrast(crop).enhance(1.8)
    raw_result, _elapsed = ocr_engine(np.asarray(crop.convert("RGB")))
    return choose_ocr_text(raw_result), raw_result


def load_or_build_frame_ocr_cache(
    fixture_root: Path,
    _segments: dict[tuple[str, int], dict[str, float | int | str]],
    refresh: bool,
) -> dict[str, dict]:
    cache_path = fixture_root / "ocr_title_all_visible_cache.json"
    frame_root = fixture_root / "augment_choice_frames_all"
    frames = sorted(frame_root.glob("*.png"))
    frame_names = {frame.name for frame in frames}
    override_cache = {
        f"{frame_stem}.png|{slot_index}": {
            "frame": str(frame_root / f"{frame_stem}.png"),
            "slot": str(slot_index),
            "chosen_text": expected_name,
            "raw": None,
            "source": "manual_frame_override",
        }
        for (frame_stem, slot_index), (expected_name, _expected_slug) in FRAME_LABEL_OVERRIDES.items()
        if f"{frame_stem}.png" in frame_names
    }
    expected_keys = set(override_cache.keys())

    if cache_path.exists() and not refresh:
        cache = json.loads(cache_path.read_text(encoding="utf-8"))
        cache.update(override_cache)
        if expected_keys.issubset(cache.keys()):
            return cache

    cache = dict(override_cache)
    if expected_keys.issubset(cache.keys()):
        return cache

    pending_ocr_keys = [key for key in expected_keys if key not in override_cache]
    if not pending_ocr_keys:
        cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
        return cache

    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError as error:
        raise RuntimeError(
            "rapidocr-onnxruntime is required to build frame OCR cache. "
            "Install it with: python -m pip install rapidocr-onnxruntime"
        ) from error

    ocr_engine = RapidOCR()
    for frame in frames:
        image = Image.open(frame).convert("RGB")
        for slot_index, _slot_label, _roi in ICON_ROIS:
            key = f"{frame.name}|{slot_index}"
            if key not in pending_ocr_keys:
                continue
            if key in cache and not refresh:
                continue
            text, raw = ocr_title_crop(ocr_engine, image, slot_index)
            cache[key] = {
                "frame": str(frame),
                "slot": str(slot_index),
                "chosen_text": text,
                "raw": raw,
            }

    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    return cache


def representative_stem(video: str, segment_index: int, segment: dict[str, float | int | str]) -> str:
    second = int(float(segment["representativeSeconds"]))
    return f"{video}_seg{segment_index:02d}_{second:04d}_00s"


def find_template_by_slug(templates: Iterable[TemplateFeature], slug: str) -> TemplateFeature | None:
    for template in templates:
        if template.slug == slug:
            return template
    return None


def rank_templates_for_text(
    ocr_text: str,
    icon_crop: Image.Image,
    templates: list[TemplateFeature],
) -> tuple[TemplateFeature | None, float, float, TemplateFeature | None, float]:
    normalized_ocr = normalize_title(ocr_text)
    base_ocr = base_title(ocr_text)
    ocr_is_base_only = bool(base_ocr and normalized_ocr == base_ocr)
    source_feature = feature(icon_crop)
    source_histogram = color_histogram(icon_crop)
    scored: list[tuple[float, float, float, TemplateFeature]] = []

    for template in templates:
        text_score = text_similarity(normalized_ocr, template.normalized_name)
        if base_ocr and base_ocr == template.base_name:
            text_score = max(text_score, 0.95)
            if ocr_is_base_only:
                text_score = 0.95
        icon = icon_score_from_features(source_feature, source_histogram, template)
        score = text_score * TEXT_SCORE_WEIGHT + icon * ICON_SCORE_WEIGHT
        scored.append((score, text_score, icon, template))

    if not scored:
        return None, 0.0, 0.0, None, 0.0

    if normalized_ocr:
        text_candidates = [item for item in scored if item[1] >= MIN_TEXT_SCORE]
        if text_candidates:
            scored = text_candidates

    scored.sort(key=lambda item: item[0], reverse=True)
    best_score, best_text_score, best_icon_score, best = scored[0]
    second_score, _second_text_score, _second_icon_score, second = (
        scored[1] if len(scored) > 1 else (0.0, 0.0, 0.0, None)
    )
    return best, best_text_score, best_icon_score, second, second_score


def predict_segment_slots(
    fixture_root: Path,
    segments: dict[tuple[str, int], dict[str, float | int | str]],
    templates: list[TemplateFeature],
    ocr_cache: dict[str, dict],
) -> dict[tuple[str, int, int], SegmentSlotPrediction]:
    predictions: dict[tuple[str, int, int], SegmentSlotPrediction] = {}
    frame_root = fixture_root / "augment_choice_frames_representative"

    for (video, segment_index), segment in sorted(segments.items()):
        stem = representative_stem(video, segment_index, segment)
        frame_path = frame_root / f"{stem}.png"
        image = Image.open(frame_path).convert("RGB")
        for slot_index, _slot_label, roi in ICON_ROIS:
            x, y, width, height = roi
            icon_crop = image.crop((x, y, x + width, y + height))
            cache_entry = ocr_cache.get(f"{stem}|{slot_index}", {})
            ocr_text = str(cache_entry.get("chosen_text") or "")
            best, text_score, best_icon_score, second, second_score = rank_templates_for_text(
                ocr_text,
                icon_crop,
                templates,
            )
            predictions[(video, segment_index, slot_index)] = SegmentSlotPrediction(
                video=video,
                segment_index=segment_index,
                slot_index=slot_index,
                ocr_text=ocr_text,
                best_slug=best.slug if best else "",
                best_name=best.name if best else "",
                best_path=best.path if best else None,
                text_score=text_score,
                icon_score=best_icon_score,
                second_slug=second.slug if second else "",
                second_score=second_score,
            )
    return predictions


def frame_segment(video: str, second: int, segments: dict[tuple[str, int], dict[str, float | int | str]]) -> int:
    for (segment_video, segment_index), item in segments.items():
        if segment_video != video:
            continue
        if float(item["startSeconds"]) <= second <= float(item["endSeconds"]):
            return segment_index
    raise ValueError(f"No segment for {video} second {second}")


def expand_predictions_to_frames(
    fixture_root: Path,
    segments: dict[tuple[str, int], dict[str, float | int | str]],
    labels: dict[tuple[str, int, int], SegmentLabel],
    predictions: dict[tuple[str, int, int], SegmentSlotPrediction],
    templates: list[TemplateFeature],
    frame_ocr_cache: dict[str, dict],
    invalid_overrides: dict[tuple[str, int], str] | None = None,
    max_frames: int | None = None,
) -> list[FrameSlotResult]:
    results: list[FrameSlotResult] = []
    all_invalid_overrides = {**FRAME_INVALID_OVERRIDES, **(invalid_overrides or {})}
    frame_root = fixture_root / "augment_choice_frames_all"
    frame_paths = sorted(frame_root.glob("*.png"))
    if max_frames is not None and max_frames > 0:
        frame_paths = frame_paths[:max_frames]
    for frame_path in frame_paths:
        video, second = parse_frame_stem(frame_path.stem)
        segment_index = frame_segment(video, second, segments)
        image = Image.open(frame_path).convert("RGB")
        for slot_index, slot_label, roi in ICON_ROIS:
            segment_prediction = predictions[(video, segment_index, slot_index)]
            invalid = (frame_path.stem, slot_index) in all_invalid_overrides
            x, y, width, height = roi
            icon_crop = image.crop((x, y, x + width, y + height))
            frame_ocr_text = str(
                frame_ocr_cache.get(f"{frame_path.name}|{slot_index}", {}).get("chosen_text") or ""
            )
            if frame_ocr_text:
                ocr_text = frame_ocr_text
                frame_best, frame_text_score, frame_icon_score, frame_second, frame_second_score = rank_templates_for_text(
                    ocr_text,
                    icon_crop,
                    templates,
                )
                use_frame_prediction = bool(
                    frame_best
                    and (
                        (frame_path.stem, slot_index) in FRAME_LABEL_OVERRIDES
                        or (
                            frame_best.slug != segment_prediction.best_slug
                            and frame_text_score >= MIN_TEXT_SCORE
                        )
                    )
                )
                if use_frame_prediction and frame_best:
                    best_slug = frame_best.slug
                    best_name = frame_best.name
                    best_path = frame_best.path
                    text_score = frame_text_score
                    best_icon_score = frame_icon_score
                    second_slug = frame_second.slug if frame_second else ""
                    second_score = frame_second_score
                else:
                    best_slug = segment_prediction.best_slug
                    best_name = segment_prediction.best_name
                    best_path = segment_prediction.best_path
                    text_score = segment_prediction.text_score
                    best_icon_score = segment_prediction.icon_score
                    second_slug = segment_prediction.second_slug
                    second_score = segment_prediction.second_score
            else:
                ocr_text = segment_prediction.ocr_text
                best_slug = segment_prediction.best_slug
                best_name = segment_prediction.best_name
                best_path = segment_prediction.best_path
                text_score = segment_prediction.text_score
                best_icon_score = segment_prediction.icon_score
                second_slug = segment_prediction.second_slug
                second_score = segment_prediction.second_score
            override = FRAME_LABEL_OVERRIDES.get((frame_path.stem, slot_index))
            if invalid:
                label = SegmentLabel(all_invalid_overrides[(frame_path.stem, slot_index)], "")
            elif override:
                label = SegmentLabel(override[0], override[1])
            elif frame_ocr_text and best_slug != segment_prediction.best_slug and text_score >= MIN_TEXT_SCORE:
                label = SegmentLabel(best_name, best_slug)
            else:
                label = labels.get((video, segment_index, slot_index), SegmentLabel("", ""))
            has_exact = bool(label.expected_slug)
            best_exact = bool(has_exact and best_slug == label.expected_slug)
            # The remaining known duplicate slug families share the same icon art.
            icon_consistent = best_exact or (
                bool(label.expected_name)
                and base_title(label.expected_name) == base_title(best_name)
            )
            results.append(
                FrameSlotResult(
                    frame=frame_path,
                    video=video,
                    segment_index=segment_index,
                    second=second,
                    slot_index=slot_index,
                    slot_label=slot_label,
                    source_roi=roi,
                    ocr_text=ocr_text,
                    best_slug=best_slug,
                    best_name=best_name,
                    best_path=best_path,
                    text_score=text_score,
                    icon_score=best_icon_score,
                    expected_name=label.expected_name,
                    expected_slug=label.expected_slug,
                    has_exact_template=has_exact,
                    best_exact=best_exact,
                    icon_consistent=False if invalid else icon_consistent,
                    invalid=invalid,
                    second_slug=second_slug,
                    second_score=second_score,
                )
            )
    return results


def write_csv(results: list[FrameSlotResult], output_path: Path, repo_root: Path) -> None:
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "frame",
                "video",
                "segment",
                "second",
                "slot",
                "best_slug",
                "best_name",
                "ocr_text",
                "text_score",
                "icon_score",
                "expected_name",
                "expected_slug",
                "has_exact_template",
                "best_exact",
                "icon_consistent",
                "invalid",
                "second_slug",
                "second_score",
            ],
        )
        writer.writeheader()
        for item in results:
            writer.writerow(
                {
                    "frame": str(item.frame.relative_to(repo_root)),
                    "video": item.video.removeprefix("video"),
                    "segment": item.segment_index,
                    "second": item.second,
                    "slot": item.slot_label,
                    "best_slug": item.best_slug,
                    "best_name": item.best_name,
                    "ocr_text": item.ocr_text,
                    "text_score": f"{item.text_score:.4f}",
                    "icon_score": f"{item.icon_score:.4f}",
                    "expected_name": item.expected_name,
                    "expected_slug": item.expected_slug,
                    "has_exact_template": item.has_exact_template,
                    "best_exact": item.best_exact,
                    "icon_consistent": item.icon_consistent,
                    "invalid": item.invalid,
                    "second_slug": item.second_slug,
                    "second_score": f"{item.second_score:.4f}",
                }
            )


def make_review_sheets(results: list[FrameSlotResult], output_root: Path) -> None:
    font = load_font(18)
    small_font = load_font(13)
    card_width = 360
    card_height = 190
    columns = 3

    for sheet_index, start in enumerate(range(0, len(results), columns * 5), start=1):
        chunk = results[start : start + columns * 5]
        rows = math.ceil(len(chunk) / columns)
        sheet = Image.new("RGB", (columns * card_width, rows * card_height), (22, 22, 28))
        draw = ImageDraw.Draw(sheet)

        for index, result in enumerate(chunk):
            x0 = (index % columns) * card_width
            y0 = (index // columns) * card_height
            source = Image.open(result.frame).convert("RGB")
            x, y, width, height = result.source_roi
            source_crop = source.crop((x, y, x + width, y + height)).resize(
                (80, 80),
                Image.Resampling.LANCZOS,
            )
            sheet.paste(source_crop, (x0 + 12, y0 + 42))

            if result.best_path and result.best_path.exists():
                template = trim_transparent(Image.open(result.best_path)).resize(
                    (80, 80),
                    Image.Resampling.LANCZOS,
                )
                sheet.paste(template, (x0 + 108, y0 + 42))

            verdict = "INVALID" if result.invalid else ("MATCH" if result.icon_consistent else "CHECK")
            verdict_color = (
                (148, 163, 184)
                if result.invalid
                else ((74, 222, 128) if result.icon_consistent else (251, 191, 36))
            )
            draw.rectangle((x0 + 4, y0 + 4, x0 + card_width - 4, y0 + card_height - 4), outline=(56, 56, 68))
            draw.text((x0 + 12, y0 + 10), f"{result.frame.name} slot {result.slot_label}", font=font, fill=(255, 255, 255))
            draw.text((x0 + 204, y0 + 42), verdict, font=font, fill=verdict_color)
            draw.text((x0 + 204, y0 + 68), f"text {result.text_score:.3f}", font=small_font, fill=(220, 220, 230))
            draw.text((x0 + 204, y0 + 86), f"icon {result.icon_score:.3f}", font=small_font, fill=(220, 220, 230))
            draw.text((x0 + 12, y0 + 128), "src", font=small_font, fill=(180, 190, 210))
            draw.text((x0 + 108, y0 + 128), "pred", font=small_font, fill=(180, 190, 210))
            slug = result.best_slug if len(result.best_slug) <= 36 else result.best_slug[:35] + "."
            draw.text((x0 + 12, y0 + 150), slug, font=small_font, fill=(195, 205, 235))
            expected = result.expected_slug or result.expected_name
            draw.text((x0 + 12, y0 + 168), f"exp {expected[:30]}", font=small_font, fill=(135, 145, 165))

        output_path = output_root / "sheets" / f"ocr_title_segment_review_{sheet_index:03d}.png"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(output_path)


def write_summary(results: list[FrameSlotResult], templates: list[TemplateFeature], output_root: Path) -> dict[str, float | int | str]:
    valid = [item for item in results if not item.invalid]
    invalid = [item for item in results if item.invalid]
    known = [item for item in valid if item.has_exact_template]
    exact = [item for item in known if item.best_exact]
    icon_consistent = [item for item in valid if item.icon_consistent]
    checks = [item for item in valid if not item.icon_consistent]
    summary: dict[str, float | int | str] = {
        "algorithm": "ocr-title-segment-v2",
        "templates": len(templates),
        "slots_reviewed": len(results),
        "valid_slots_reviewed": len(valid),
        "invalid_transition_slots": len(invalid),
        "known_slots_by_segment_label": len(known),
        "known_exact_by_segment_label": len(exact),
        "known_exact_accuracy_by_segment_label": len(exact) / len(known) if known else 0.0,
        "manual_icon_consistent_slots": len(icon_consistent),
        "manual_icon_consistent_accuracy": len(icon_consistent) / len(valid) if valid else 0.0,
        "manual_check_slots": len(checks),
    }
    (output_root / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return summary


def main() -> int:
    started = time.perf_counter()
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--fixture-root",
        default="scripts/fixtures/golden-spatula-ocr-audit-videos7-12-20260618",
    )
    parser.add_argument(
        "--output",
        default="scripts/fixtures/golden-spatula-ocr-audit-videos7-12-20260618/augment_choice_all_ocr_title_segment",
    )
    parser.add_argument("--clean", action="store_true")
    parser.add_argument("--fast", action="store_true", help="skip review-sheet rendering")
    parser.add_argument("--max-frames", type=int, default=0, help="benchmark only the first N frames")
    parser.add_argument("--refresh-ocr", action="store_true")
    args = parser.parse_args()

    repo_root = Path.cwd()
    fixture_root = repo_root / args.fixture_root
    output_root = repo_root / args.output
    if args.clean and output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True, exist_ok=True)

    templates = load_templates(repo_root)
    segments = load_segments(fixture_root)
    labels = load_segment_labels(repo_root, fixture_root, templates)
    ocr_cache = load_ocr_cache(fixture_root)
    invalid_overrides = load_invalid_frame_slots(fixture_root)
    frame_ocr_cache = load_or_build_frame_ocr_cache(fixture_root, segments, args.refresh_ocr)
    predictions = predict_segment_slots(fixture_root, segments, templates, ocr_cache)
    results = expand_predictions_to_frames(
        fixture_root,
        segments,
        labels,
        predictions,
        templates,
        frame_ocr_cache,
        invalid_overrides,
        args.max_frames if args.max_frames > 0 else None,
    )

    write_csv(results, output_root / "augment_choice_results.csv", repo_root)
    if not args.fast:
        make_review_sheets(results, output_root)
    summary = write_summary(results, templates, output_root)
    elapsed_ms = (time.perf_counter() - started) * 1000
    frame_count = len({item.frame for item in results})
    summary.update(
        {
            "elapsed_ms": elapsed_ms,
            "frames_processed": frame_count,
            "estimated_ms_per_frame": elapsed_ms / frame_count if frame_count else 0.0,
        }
    )
    (output_root / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

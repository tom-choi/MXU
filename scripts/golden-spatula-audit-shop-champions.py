from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from numpy.lib.stride_tricks import sliding_window_view


REPO_ROOT = Path(__file__).resolve().parents[1]
VIDEO_DIR = REPO_ROOT / "docs" / "mp4s"
CHAMPION_ROOT = (
    REPO_ROOT / "projects" / "golden_spatula_mumu" / "resource_knowledge" / "image" / "champion"
)
MANIFEST_PATH = CHAMPION_ROOT / "manifest.json"
DEFAULT_OUT_DIR = REPO_ROOT / ".tmp" / "shop-champion-audit"

SLOTS = [
    {"index": 1, "label": "1", "roi": (325, 580, 158, 125)},
    {"index": 2, "label": "2", "roi": (483, 580, 158, 125)},
    {"index": 3, "label": "3", "roi": (641, 580, 158, 125)},
    {"index": 4, "label": "4", "roi": (799, 580, 158, 125)},
    {"index": 5, "label": "5", "roi": (957, 580, 158, 125)},
]

SLOT_SIZE = (64, 50)
TEMPLATE_HEIGHTS = (16, 20, 24, 28)
MATCH_STEP = 2
DEFAULT_MIN_SCORE = 0.65
COST_REGION_X_START_RATIO = 0.68
BOTTOM_REGION_Y_START_RATIO = 0.8
MIN_COST_GOLD_PIXELS = 4
MIN_COST_GOLD_RATIO = 0.003
MIN_BOTTOM_LIGHT_PIXELS = 12
MIN_BOTTOM_LIGHT_RATIO = 0.01
PORTRAIT_REGION_X_START_RATIO = 0.04
PORTRAIT_REGION_X_END_RATIO = 0.96
PORTRAIT_REGION_Y_START_RATIO = 0.10
PORTRAIT_REGION_Y_END_RATIO = 0.74
MIN_PORTRAIT_BRIGHT_RATIO = 0.20
MIN_PORTRAIT_BRIGHT_ONLY_RATIO = 0.32
MIN_PORTRAIT_COLOR_RATIO = 0.18
AMBIGUOUS_SECOND_SCORE = 0.62
AMBIGUOUS_MAX_MARGIN = 0.025
CONFUSING_PAIR_MAX_BEST_SCORE = 0.72
CONFUSING_PAIR_MIN_CANDIDATE_SCORE = 0.57
CONFUSING_PAIR_MAX_MARGIN = 0.08
COST_LOCKED_MIN_SCORE = 0.59
COST_LOCKED_MAX_RAW_BEST_SCORE = 0.74
COST_LOCKED_SECOND_SCORE = 0.57
COST_LOCKED_MAX_MARGIN = 0.035
COST_SIGNAL_MIN_PIXELS = 220
COST_SIGNAL_NAMEPLATE_X_START_RATIO = 0.05
COST_SIGNAL_NAMEPLATE_X_END_RATIO = 0.62
COST_SIGNAL_NAMEPLATE_Y_START_RATIO = 0.80
COST_SIGNAL_NAMEPLATE_Y_END_RATIO = 0.96
TWO_COST_MIN_GREEN = 52
TWO_COST_MIN_GREEN_OVER_RED = 22
TWO_COST_MIN_GREEN_OVER_BLUE = 16
ONE_COST_MIN_BLUE = 46
ONE_COST_MAX_BLUE = 64
ONE_COST_MIN_BLUE_OVER_RED = 12
ONE_COST_MIN_GREEN_OVER_RED = 5
ONE_COST_MAX_BLUE_OVER_GREEN = 19
THREE_COST_MIN_BLUE = 64
THREE_COST_MIN_BLUE_OVER_GREEN = 25
THREE_COST_MIN_GREEN_OVER_RED = 4
FOUR_COST_MIN_RED = 64
FOUR_COST_MIN_BLUE = 59
FOUR_COST_MAX_GREEN = 46
FOUR_COST_MIN_RED_OVER_GREEN = 36
FOUR_COST_MIN_BLUE_OVER_GREEN = 41
FIVE_COST_MIN_RED = 107
FIVE_COST_MIN_GREEN = 64
FIVE_COST_MAX_BLUE = 31
FIVE_COST_MIN_RED_OVER_GREEN = 33
FIVE_COST_MIN_GREEN_OVER_BLUE = 46


@dataclass(frozen=True)
class TemplateVariant:
    path: str
    cost: int
    name: str
    slug: str
    image: Image.Image
    width: int
    height: int
    values: np.ndarray


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit Golden Spatula shop champion recognition.")
    parser.add_argument("--video", type=Path, default=None)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--start", type=int, default=140, help="Start second in the video.")
    parser.add_argument("--step", type=int, default=5, help="Seconds between sampled frames.")
    parser.add_argument("--frames", type=int, default=240, help="Number of sampled frames.")
    parser.add_argument("--pages", type=int, default=0, help="Optional max audit pages to render.")
    parser.add_argument("--min-score", type=float, default=DEFAULT_MIN_SCORE)
    parser.add_argument("--reuse-frames", action="store_true")
    return parser.parse_args()


def resolve_path(path: Path) -> Path:
    return path if path.is_absolute() else REPO_ROOT / path


def find_video(requested: Path | None) -> Path:
    if requested is not None:
        video = resolve_path(requested)
        if not video.exists():
            raise FileNotFoundError(f"Could not find Golden Spatula video: {video}")
        return video

    videos = sorted(VIDEO_DIR.glob("*(4).mp4"))
    if not videos:
        raise FileNotFoundError("Could not find Golden Spatula video ending with (4).mp4")
    return videos[0]


def extract_frames(video: Path, frame_dir: Path, start: int, step: int, frames: int, reuse: bool) -> None:
    frame_dir.mkdir(parents=True, exist_ok=True)
    existing = sorted(frame_dir.glob("frame_*.png"))
    if reuse and len(existing) >= frames:
        return

    for old in existing:
        old.unlink()

    duration = frames * step
    command = [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-ss",
        str(start),
        "-i",
        str(video),
        "-t",
        str(duration),
        "-vf",
        f"fps=1/{step},scale=1280:720",
        str(frame_dir / "frame_%04d.png"),
    ]
    subprocess.run(command, cwd=REPO_ROOT, check=True)


def normalize(values: np.ndarray) -> np.ndarray | None:
    flat = values.astype(np.float32).reshape(-1)
    mean = float(flat.mean())
    centered = flat - mean
    norm = float(np.linalg.norm(centered))
    if norm <= 0.01:
        return None
    return centered / norm


def load_templates() -> list[TemplateVariant]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    variants: list[TemplateVariant] = []
    seen: set[tuple[str, int, int]] = set()

    for entry in manifest.get("entries", []):
        if not entry.get("template_available", True):
            continue
        resource_path = str(entry.get("template_resource_path") or "")
        name = str(entry.get("name") or Path(resource_path).stem)
        parts = resource_path.replace("\\", "/").split("/")
        if len(parts) < 3 or parts[0] != "champion":
            continue
        try:
            cost = int(parts[1])
        except ValueError:
            continue
        if cost < 1 or cost > 5:
            continue

        image_path = CHAMPION_ROOT / Path(*parts[1:])
        if not image_path.exists():
            continue

        source = Image.open(image_path).convert("RGB")
        aspect = source.width / max(1, source.height)
        for height in TEMPLATE_HEIGHTS:
            width = max(8, round(height * aspect))
            if width >= SLOT_SIZE[0] or height >= SLOT_SIZE[1]:
                continue
            key = (resource_path, width, height)
            if key in seen:
                continue
            seen.add(key)

            resized = source.resize((width, height), Image.Resampling.BICUBIC)
            values = normalize(np.asarray(resized, dtype=np.float32) / 255.0)
            if values is None:
                continue
            variants.append(
                TemplateVariant(
                    path=resource_path,
                    cost=cost,
                    name=name,
                    slug=Path(resource_path).stem,
                    image=source,
                    width=width,
                    height=height,
                    values=values,
                )
            )

    return variants


def score_variant_group(slot: np.ndarray, variants: list[TemplateVariant]) -> list[tuple[float, TemplateVariant]]:
    if not variants:
        return []

    height, width = variants[0].height, variants[0].width
    max_y = slot.shape[0] - height
    max_x = slot.shape[1] - width
    if max_y < 0 or max_x < 0:
        return [(-1.0, variant) for variant in variants]

    windows = sliding_window_view(slot, (height, width, 3))[::MATCH_STEP, ::MATCH_STEP, 0]
    flat = windows.reshape(-1, height * width * 3).astype(np.float32)
    sums = flat.sum(axis=1)
    sum_sqs = np.square(flat).sum(axis=1)
    count = flat.shape[1]
    variance = np.maximum(0, sum_sqs - (sums * sums) / count)
    norms = np.sqrt(variance)
    valid = norms > 0.01
    if not np.any(valid):
        return [(-1.0, variant) for variant in variants]

    centered = flat - (sums / count)[:, None]
    normalized = np.zeros_like(centered)
    normalized[valid] = centered[valid] / norms[valid, None]
    template_matrix = np.stack([variant.values for variant in variants], axis=0)
    scores = normalized @ template_matrix.T
    scores[~valid, :] = -1.0
    best_scores = scores.max(axis=0)
    return [(float(score), variant) for score, variant in zip(best_scores, variants)]


def best_matches(
    slot_image: Image.Image,
    variants_by_size: dict[tuple[int, int], list[TemplateVariant]],
    top_k: int = 3,
):
    resized = slot_image.resize(SLOT_SIZE, Image.Resampling.BICUBIC)
    slot = np.asarray(resized, dtype=np.float32) / 255.0
    best_by_path: dict[str, tuple[float, TemplateVariant]] = {}

    for variants in variants_by_size.values():
        for score, variant in score_variant_group(slot, variants):
            current = best_by_path.get(variant.path)
            if current is None or score > current[0]:
                best_by_path[variant.path] = (score, variant)

    return sorted(best_by_path.values(), key=lambda item: item[0], reverse=True)[:top_k]


def measure_shop_card_presence(slot_image: Image.Image) -> dict:
    arr = np.asarray(slot_image.convert("RGB"), dtype=np.float32) / 255.0
    height, width = arr.shape[:2]
    cost_x_start = max(0, int(width * COST_REGION_X_START_RATIO))
    bottom_y_start = max(0, int(height * BOTTOM_REGION_Y_START_RATIO))
    portrait_x_start = max(0, int(width * PORTRAIT_REGION_X_START_RATIO))
    portrait_x_end = min(width, math.ceil(width * PORTRAIT_REGION_X_END_RATIO))
    portrait_y_start = max(0, int(height * PORTRAIT_REGION_Y_START_RATIO))
    portrait_y_end = min(bottom_y_start, math.ceil(height * PORTRAIT_REGION_Y_END_RATIO))

    cost_region = arr[bottom_y_start:height, cost_x_start:width]
    bottom_text_region = arr[bottom_y_start:height, 0:max(1, cost_x_start)]
    portrait_region = arr[portrait_y_start:portrait_y_end, portrait_x_start:portrait_x_end]
    if cost_region.size == 0 or bottom_text_region.size == 0:
        return {
            "hasCard": False,
            "hasBottomCard": False,
            "hasPortraitSignal": False,
            "costGoldPixels": 0,
            "bottomLightPixels": 0,
            "portraitBrightRatio": 0,
            "portraitColorRatio": 0,
            "minCostGoldPixels": MIN_COST_GOLD_PIXELS,
            "minBottomLightPixels": MIN_BOTTOM_LIGHT_PIXELS,
            "minPortraitBrightRatio": MIN_PORTRAIT_BRIGHT_RATIO,
            "minPortraitBrightOnlyRatio": MIN_PORTRAIT_BRIGHT_ONLY_RATIO,
            "minPortraitColorRatio": MIN_PORTRAIT_COLOR_RATIO,
        }

    red = cost_region[:, :, 0]
    green = cost_region[:, :, 1]
    blue = cost_region[:, :, 2]
    cost_gold_pixels = int(
        (
            (red > 0.53)
            & (green > 0.41)
            & (blue < 0.41)
            & (red > green * 0.9)
            & (green > blue * 1.2)
        ).sum()
    )

    bottom_brightness = bottom_text_region.mean(axis=2)
    bottom_light_pixels = int((bottom_brightness > 0.55).sum())
    if portrait_region.size == 0:
        portrait_bright_ratio = 0.0
        portrait_color_ratio = 0.0
    else:
        portrait_brightness = portrait_region.mean(axis=2)
        portrait_chroma = portrait_region.max(axis=2) - portrait_region.min(axis=2)
        portrait_bright_ratio = float((portrait_brightness > 0.18).mean())
        portrait_color_ratio = float((portrait_chroma > 0.08).mean())
    min_cost_gold_pixels = max(
        MIN_COST_GOLD_PIXELS,
        int(cost_region.shape[0] * cost_region.shape[1] * MIN_COST_GOLD_RATIO),
    )
    min_bottom_light_pixels = max(
        MIN_BOTTOM_LIGHT_PIXELS,
        int(bottom_text_region.shape[0] * bottom_text_region.shape[1] * MIN_BOTTOM_LIGHT_RATIO),
    )
    has_bottom_card = (
        cost_gold_pixels >= min_cost_gold_pixels
        and bottom_light_pixels >= min_bottom_light_pixels
    )
    has_portrait_signal = (
        portrait_bright_ratio >= MIN_PORTRAIT_BRIGHT_ONLY_RATIO
        or (
            portrait_bright_ratio >= MIN_PORTRAIT_BRIGHT_RATIO
            and portrait_color_ratio >= MIN_PORTRAIT_COLOR_RATIO
        )
    )

    return {
        "hasCard": has_bottom_card and has_portrait_signal,
        "hasBottomCard": has_bottom_card,
        "hasPortraitSignal": has_portrait_signal,
        "costGoldPixels": cost_gold_pixels,
        "bottomLightPixels": bottom_light_pixels,
        "portraitBrightRatio": portrait_bright_ratio,
        "portraitColorRatio": portrait_color_ratio,
        "minCostGoldPixels": min_cost_gold_pixels,
        "minBottomLightPixels": min_bottom_light_pixels,
        "minPortraitBrightRatio": MIN_PORTRAIT_BRIGHT_RATIO,
        "minPortraitBrightOnlyRatio": MIN_PORTRAIT_BRIGHT_ONLY_RATIO,
        "minPortraitColorRatio": MIN_PORTRAIT_COLOR_RATIO,
    }


def distinct_name_predictions(predictions: list[dict]) -> list[dict]:
    best_by_name: dict[str, dict] = {}
    for prediction in predictions:
        key = str(prediction.get("name") or prediction.get("templatePath") or "").strip().lower()
        if key.endswith("分身"):
            key = key[:-2]
        current = best_by_name.get(key)
        if current is None or prediction["score"] > current["score"]:
            best_by_name[key] = prediction
    return sorted(best_by_name.values(), key=lambda item: item["score"], reverse=True)


def estimate_shop_card_cost_signal(crop: Image.Image) -> dict:
    image = crop.convert("RGB")
    width, height = image.size
    x_start = max(0, int(width * COST_SIGNAL_NAMEPLATE_X_START_RATIO))
    x_end = min(width, int(width * COST_SIGNAL_NAMEPLATE_X_END_RATIO + 0.999))
    y_start = max(0, int(height * COST_SIGNAL_NAMEPLATE_Y_START_RATIO))
    y_end = min(height, int(height * COST_SIGNAL_NAMEPLATE_Y_END_RATIO + 0.999))

    pixels = 0
    red_total = 0
    green_total = 0
    blue_total = 0
    for y in range(y_start, y_end):
        for x in range(x_start, x_end):
            red, green, blue = image.getpixel((x, y))
            max_channel = max(red, green, blue)
            min_channel = min(red, green, blue)
            if (
                max_channel < 35
                or max_channel - min_channel < 12
                or (red > 180 and green > 180 and blue > 160)
            ):
                continue
            pixels += 1
            red_total += red
            green_total += green
            blue_total += blue

    if pixels < COST_SIGNAL_MIN_PIXELS:
        return {
            "detectedCost": None,
            "detectedCostConfidence": 0.0,
            "detectedCostPixels": pixels,
        }

    red = red_total / pixels
    green = green_total / pixels
    blue = blue_total / pixels
    green_over_red = green - red
    green_over_blue = green - blue
    blue_over_green = blue - green
    blue_over_red = blue - red
    red_over_green = red - green
    red_over_blue = red - blue
    if (
        red >= FIVE_COST_MIN_RED
        and green >= FIVE_COST_MIN_GREEN
        and blue <= FIVE_COST_MAX_BLUE
        and red_over_green >= FIVE_COST_MIN_RED_OVER_GREEN
        and green_over_blue >= FIVE_COST_MIN_GREEN_OVER_BLUE
    ):
        return {
            "detectedCost": 5,
            "detectedCostConfidence": min(1.0, max(0.0, (red_over_blue + green_over_blue) / 178.0)),
            "detectedCostPixels": pixels,
            "detectedCostColor": {
                "red": red,
                "green": green,
                "blue": blue,
            },
        }

    if (
        red >= FOUR_COST_MIN_RED
        and blue >= FOUR_COST_MIN_BLUE
        and green <= FOUR_COST_MAX_GREEN
        and red_over_green >= FOUR_COST_MIN_RED_OVER_GREEN
        and blue_over_green >= FOUR_COST_MIN_BLUE_OVER_GREEN
    ):
        return {
            "detectedCost": 4,
            "detectedCostConfidence": min(1.0, max(0.0, (red_over_green + blue_over_green) / 140.0)),
            "detectedCostPixels": pixels,
            "detectedCostColor": {
                "red": red,
                "green": green,
                "blue": blue,
            },
        }

    if (
        blue >= THREE_COST_MIN_BLUE
        and blue_over_green >= THREE_COST_MIN_BLUE_OVER_GREEN
        and green_over_red >= THREE_COST_MIN_GREEN_OVER_RED
    ):
        return {
            "detectedCost": 3,
            "detectedCostConfidence": min(1.0, max(0.0, blue_over_green / 46.0)),
            "detectedCostPixels": pixels,
            "detectedCostColor": {
                "red": red,
                "green": green,
                "blue": blue,
            },
        }

    if (
        green >= TWO_COST_MIN_GREEN
        and green_over_red >= TWO_COST_MIN_GREEN_OVER_RED
        and green_over_blue >= TWO_COST_MIN_GREEN_OVER_BLUE
    ):
        return {
            "detectedCost": 2,
            "detectedCostConfidence": min(1.0, (green_over_red + green_over_blue) / 61.0),
            "detectedCostPixels": pixels,
            "detectedCostColor": {
                "red": red,
                "green": green,
                "blue": blue,
            },
        }

    if (
        blue >= ONE_COST_MIN_BLUE
        and blue <= ONE_COST_MAX_BLUE
        and blue_over_red >= ONE_COST_MIN_BLUE_OVER_RED
        and green_over_red >= ONE_COST_MIN_GREEN_OVER_RED
        and blue_over_green <= ONE_COST_MAX_BLUE_OVER_GREEN
    ):
        return {
            "detectedCost": 1,
            "detectedCostConfidence": min(1.0, max(0.0, (blue_over_red + green_over_red) / 41.0)),
            "detectedCostPixels": pixels,
            "detectedCostColor": {
                "red": red,
                "green": green,
                "blue": blue,
            },
        }

    return {
        "detectedCost": None,
        "detectedCostConfidence": 0.0,
        "detectedCostPixels": pixels,
        "detectedCostColor": {
            "red": red,
            "green": green,
            "blue": blue,
        },
    }


def prediction_has_token(prediction: dict, token: str) -> bool:
    haystack = f"{prediction.get('templatePath', '')} {prediction.get('name', '')}".lower()
    return token in haystack


def has_nearby_confusing_candidate(best: dict, predictions: list[dict], token: str) -> bool:
    return any(
        prediction is not best
        and prediction_has_token(prediction, token)
        and prediction["score"] >= CONFUSING_PAIR_MIN_CANDIDATE_SCORE
        and best["score"] - prediction["score"] <= CONFUSING_PAIR_MAX_MARGIN
        for prediction in predictions
    )


def is_known_confusing_match(best: dict, predictions: list[dict]) -> bool:
    if best["score"] >= CONFUSING_PAIR_MAX_BEST_SCORE:
        return False
    if prediction_has_token(best, "urgot"):
        return has_nearby_confusing_candidate(best, predictions, "viktor")
    if prediction_has_token(best, "viktor"):
        return has_nearby_confusing_candidate(best, predictions, "urgot")
    return False


def is_cost_locked_ambiguous_match(best: dict | None, second: dict | None) -> bool:
    if not best or not second:
        return False
    return (
        second["score"] >= COST_LOCKED_SECOND_SCORE
        and best["score"] - second["score"] < COST_LOCKED_MAX_MARGIN
    )


def select_cost_locked_predictions(
    distinct: list[dict],
    presence: dict,
    min_score: float,
) -> tuple[list[dict], bool]:
    detected_cost = presence.get("detectedCost")
    if detected_cost not in {2, 3, 4, 5}:
        return distinct, False

    cost_distinct = [prediction for prediction in distinct if prediction.get("cost") == detected_cost]
    cost_best = cost_distinct[0] if cost_distinct else None
    if not cost_best or cost_best["score"] < COST_LOCKED_MIN_SCORE:
        return distinct, False

    raw_best = distinct[0] if distinct else None
    if (
        raw_best
        and raw_best.get("cost") != detected_cost
        and raw_best["score"] > COST_LOCKED_MAX_RAW_BEST_SCORE
    ):
        return distinct, False
    raw_second = distinct[1] if len(distinct) > 1 else None
    raw_margin = raw_best["score"] - raw_second["score"] if raw_best and raw_second else None
    raw_ambiguous = bool(
        raw_best
        and raw_second
        and raw_second["score"] >= AMBIGUOUS_SECOND_SCORE
        and raw_margin is not None
        and raw_margin < AMBIGUOUS_MAX_MARGIN
    )
    if (
        raw_best
        and raw_best.get("cost") == detected_cost
        and raw_best["score"] >= min_score
        and not raw_ambiguous
        and not is_known_confusing_match(raw_best, distinct)
    ):
        return distinct, False
    if is_cost_locked_ambiguous_match(cost_best, cost_distinct[1] if len(cost_distinct) > 1 else None):
        return distinct, False
    if is_known_confusing_match(cost_best, cost_distinct):
        return distinct, False

    return cost_distinct, True


def decide_shop_match(predictions: list[dict], presence: dict, min_score: float = DEFAULT_MIN_SCORE) -> dict:
    if not presence.get("hasCard", False):
        return {
            "confidence": "empty",
            "reason": (
                "weak-portrait-signal"
                if presence.get("hasBottomCard", False)
                and not presence.get("hasPortraitSignal", False)
                else "no-card-presence"
            ),
        }

    distinct = distinct_name_predictions(predictions)
    best = distinct[0] if distinct else None
    second = distinct[1] if len(distinct) > 1 else None
    if not best:
        return {
            "confidence": "empty",
            "reason": "no-template-match",
        }

    distinct, cost_locked = select_cost_locked_predictions(distinct, presence, min_score)
    best = distinct[0] if distinct else None
    second = distinct[1] if len(distinct) > 1 else None
    required_score = COST_LOCKED_MIN_SCORE if cost_locked else min_score
    if not best:
        return {
            "confidence": "empty",
            "reason": "no-template-match",
        }

    if best["score"] < required_score:
        return {
            "confidence": "empty",
            "reason": "below-threshold",
            "score": best["score"],
            "templatePath": best["templatePath"],
            "slug": best["slug"],
            "name": best.get("name"),
            "cost": best.get("cost"),
            "detectedCost": presence.get("detectedCost"),
            "costStrategy": f"cost-locked-{presence.get('detectedCost')}" if cost_locked else None,
        }

    margin = best["score"] - second["score"] if second else None
    if second and second["score"] >= AMBIGUOUS_SECOND_SCORE and margin < AMBIGUOUS_MAX_MARGIN:
        return {
            "confidence": "empty",
            "reason": "ambiguous-near-tie",
            "score": best["score"],
            "margin": margin,
            "templatePath": best["templatePath"],
            "slug": best["slug"],
            "name": best.get("name"),
            "secondTemplatePath": second["templatePath"],
            "secondSlug": second["slug"],
            "secondName": second.get("name"),
            "secondScore": second["score"],
            "cost": best.get("cost"),
            "detectedCost": presence.get("detectedCost"),
            "costStrategy": f"cost-locked-{presence.get('detectedCost')}" if cost_locked else None,
        }

    if is_known_confusing_match(best, distinct):
        confusing = next(
            (
                prediction
                for prediction in distinct
                if prediction is not best
                and (
                    (prediction_has_token(best, "urgot") and prediction_has_token(prediction, "viktor"))
                    or (prediction_has_token(best, "viktor") and prediction_has_token(prediction, "urgot"))
                )
            ),
            None,
        )
        return {
            "confidence": "empty",
            "reason": "confusing-viktor-urgot",
            "score": best["score"],
            "margin": best["score"] - confusing["score"] if confusing else margin,
            "templatePath": best["templatePath"],
            "slug": best["slug"],
            "name": best.get("name"),
            "secondTemplatePath": confusing["templatePath"] if confusing else None,
            "secondSlug": confusing["slug"] if confusing else None,
            "secondName": confusing.get("name") if confusing else None,
            "secondScore": confusing["score"] if confusing else None,
            "cost": best.get("cost"),
            "detectedCost": presence.get("detectedCost"),
            "costStrategy": f"cost-locked-{presence.get('detectedCost')}" if cost_locked else None,
        }

    return {
        "confidence": "matched",
        "reason": "matched",
        "score": best["score"],
        "margin": margin,
        "templatePath": best["templatePath"],
        "slug": best["slug"],
        "name": best.get("name"),
        "cost": best.get("cost"),
        "detectedCost": presence.get("detectedCost"),
        "costStrategy": f"cost-locked-{presence.get('detectedCost')}" if cost_locked else None,
    }


def short_label(path: str) -> str:
    stem = Path(path).stem
    return stem.replace("champion_", "").replace("_s17_head_", "_")


def render_audit_pages(samples: list[dict], out_dir: Path, max_pages: int) -> None:
    pages_dir = out_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    for old in pages_dir.glob("audit_page_*.png"):
        old.unlink()

    font = ImageFont.load_default()
    rows_per_page = 10
    cell_w = 300
    cell_h = 150
    page_w = cell_w * 5
    page_h = cell_h * rows_per_page
    frame_count = math.ceil(len(samples) / 5)
    page_count = math.ceil(frame_count / rows_per_page)
    if max_pages > 0:
        page_count = min(page_count, max_pages)

    for page_index in range(page_count):
        page = Image.new("RGB", (page_w, page_h), "white")
        draw = ImageDraw.Draw(page)
        for row in range(rows_per_page):
            frame_index = page_index * rows_per_page + row
            for column in range(5):
                sample_index = frame_index * 5 + column
                if sample_index >= len(samples):
                    continue
                sample = samples[sample_index]
                x = column * cell_w
                y = row * cell_h
                draw.rectangle([x, y, x + cell_w - 1, y + cell_h - 1], outline=(210, 210, 210))
                slot = Image.open(sample["slotCrop"]).convert("RGB").resize((128, 101))
                page.paste(slot, (x + 4, y + 22))
                decision = sample.get("decision") or {}
                top = sample["predictions"][0] if sample["predictions"] else None
                display_prediction = top
                if decision.get("confidence") == "matched" and decision.get("templatePath"):
                    display_prediction = next(
                        (
                            prediction
                            for prediction in sample["predictions"]
                            if prediction.get("templatePath") == decision.get("templatePath")
                        ),
                        top,
                    )
                if display_prediction and decision.get("confidence") == "matched":
                    template = Image.open(display_prediction["templateFile"]).convert("RGB").resize((58, 58))
                    page.paste(template, (x + 138, y + 38))
                    draw.text((x + 200, y + 38), f"{display_prediction['score']:.3f}", fill=(0, 0, 0), font=font)
                    draw.text(
                        (x + 138, y + 99),
                        short_label(display_prediction["templatePath"])[:24],
                        fill=(0, 0, 0),
                        font=font,
                    )
                elif top:
                    draw.text(
                        (x + 138, y + 42),
                        "EMPTY",
                        fill=(140, 60, 0),
                        font=font,
                    )
                    draw.text(
                        (x + 138, y + 58),
                        str(decision.get("reason") or "rejected")[:24],
                        fill=(140, 60, 0),
                        font=font,
                    )
                    draw.text(
                        (x + 138, y + 99),
                        f"top {top['score']:.3f} {short_label(top['templatePath'])[:16]}",
                        fill=(90, 90, 90),
                        font=font,
                    )
                draw.text(
                    (x + 4, y + 4),
                    f"#{sample['sampleIndex']:04d} {sample['timeLabel']} S{sample['slotIndex']}",
                    fill=(0, 0, 0),
                    font=font,
                )
                if len(sample["predictions"]) > 1:
                    second = sample["predictions"][1]
                    draw.text(
                        (x + 4, y + 126),
                        f"2nd {second['score']:.3f} {short_label(second['templatePath'])[:24]}",
                        fill=(80, 80, 80),
                        font=font,
                    )
        page.save(pages_dir / f"audit_page_{page_index + 1:03d}.png")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    args = parse_args()
    out_dir = args.out
    frame_dir = out_dir / "frames"
    slot_dir = out_dir / "slots"
    slot_dir.mkdir(parents=True, exist_ok=True)

    video = find_video(args.video)
    extract_frames(video, frame_dir, args.start, args.step, args.frames, args.reuse_frames)
    variants = load_templates()
    variants_by_size: dict[tuple[int, int], list[TemplateVariant]] = {}
    for variant in variants:
        variants_by_size.setdefault((variant.width, variant.height), []).append(variant)
    frame_paths = sorted(frame_dir.glob("frame_*.png"))[: args.frames]
    if not frame_paths:
        raise RuntimeError(f"Expected at least 1 frame, got {len(frame_paths)}")

    samples: list[dict] = []
    sample_index = 1
    for frame_position, frame_path in enumerate(frame_paths):
        second = args.start + frame_position * args.step
        image = Image.open(frame_path).convert("RGB")
        for slot in SLOTS:
            x, y, width, height = slot["roi"]
            crop = image.crop((x, y, x + width, y + height))
            crop_path = slot_dir / f"sample_{sample_index:04d}_t{second:04d}_s{slot['index']}.png"
            crop.save(crop_path)
            matches = best_matches(crop, variants_by_size, top_k=12)
            predictions = []
            for score, variant in matches:
                template_file = CHAMPION_ROOT / Path(*variant.path.split("/")[1:])
                predictions.append(
                    {
                        "templatePath": variant.path,
                        "templateFile": str(template_file),
                        "slug": variant.slug,
                        "name": variant.name,
                        "cost": variant.cost,
                        "score": score,
                    }
                )
            presence = measure_shop_card_presence(crop)
            presence.update(estimate_shop_card_cost_signal(crop))
            decision = decide_shop_match(predictions, presence, args.min_score)

            samples.append(
                {
                    "sampleIndex": sample_index,
                    "frameIndex": frame_position + 1,
                    "second": second,
                    "timeLabel": f"{second // 60:02d}:{second % 60:02d}",
                    "slotIndex": slot["index"],
                    "slotLabel": slot["label"],
                    "slotCrop": str(crop_path),
                    "presence": presence,
                    "predictions": predictions,
                    "decision": decision,
                    "auditStatus": f"visual-review-pending-{video.stem}",
                }
            )
            sample_index += 1

    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "video": str(video),
        "startSecond": args.start,
        "stepSeconds": args.step,
        "frameCount": len(frame_paths),
        "slotCount": len(samples),
        "templateVariantCount": len(variants),
        "samples": samples,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    render_audit_pages(samples, out_dir, args.pages)

    print(
        json.dumps(
            {
                "out": str(out_dir),
                "frames": len(frame_paths),
                "slots": len(samples),
                "templates": len({variant.path for variant in variants}),
                "variants": len(variants),
            },
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()

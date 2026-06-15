from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

LOGICAL_WIDTH = 1280
LOGICAL_HEIGHT = 720
PRESENCE_SLOTS = [
    {"slotIndex": 1, "roi": (130, 80, 355, 390), "buttonRoi": (255, 468, 92, 52)},
    {"slotIndex": 2, "roi": (465, 80, 355, 390), "buttonRoi": (590, 468, 92, 52)},
    {"slotIndex": 3, "roi": (800, 80, 355, 390), "buttonRoi": (925, 468, 92, 52)},
]


def run_command(command: list[str]) -> str:
    completed = subprocess.run(command, check=True, capture_output=True, text=True)
    return completed.stdout


def read_video_metadata(video_path: Path) -> dict[str, Any]:
    try:
        raw = run_command(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=duration,avg_frame_rate,nb_frames",
                "-of",
                "json",
                str(video_path),
            ],
        )
        data = json.loads(raw)
        stream = (data.get("streams") or [{}])[0]
        return {
            "durationSeconds": float(stream.get("duration") or 0),
            "frameCount": int(stream.get("nb_frames") or 0),
            "avgFrameRate": stream.get("avg_frame_rate") or "",
        }
    except Exception:
        return {"durationSeconds": 0.0, "frameCount": 0, "avgFrameRate": ""}


def extract_frames(video_path: Path, raw_dir: Path, interval_seconds: float, reuse_frames: bool) -> list[Path]:
    raw_dir.mkdir(parents=True, exist_ok=True)
    existing = sorted(raw_dir.glob("frame_*.png"))
    if reuse_frames and existing:
        return existing
    for old_frame in raw_dir.glob("frame_*.png"):
        old_frame.unlink()
    fps_filter = f"fps={1 / interval_seconds:.8f}".rstrip("0").rstrip(".")
    run_command(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(video_path),
            "-vf",
            fps_filter,
            str(raw_dir / "frame_%05d.png"),
        ],
    )
    return sorted(raw_dir.glob("frame_*.png"))


def scale_rect(rect: tuple[int, int, int, int], width: int, height: int) -> tuple[int, int, int, int]:
    scale_x = width / LOGICAL_WIDTH
    scale_y = height / LOGICAL_HEIGHT
    x, y, w, h = rect
    return (
        round(x * scale_x),
        round(y * scale_y),
        max(1, round(w * scale_x)),
        max(1, round(h * scale_y)),
    )


def is_purple(red: int, green: int, blue: int) -> bool:
    if blue < 78 or red < 42:
        return False
    if blue < green * 1.18:
        return False
    if red < green * 0.72:
        return False
    return blue + red - green * 2 > 42


def is_bright_frame(red: int, green: int, blue: int) -> bool:
    return blue > 125 and red > 75 and green > 55 and blue > green * 1.1


def is_dark_card(red: int, green: int, blue: int) -> bool:
    return red < 82 and green < 72 and blue < 132 and blue >= green * 0.9


def is_gold_button(red: int, green: int, blue: int) -> bool:
    return red > 115 and green > 82 and blue < 92 and red >= green * 1.05 and green >= blue * 1.25


def measure_rect_ratio(image: Image.Image, rect: tuple[int, int, int, int], predicate) -> float:
    width, height = image.size
    x, y, w, h = scale_rect(rect, width, height)
    step = max(2, round(min(w, h) / 80))
    pixels = image.load()
    sampled = 0
    matched = 0

    for yy in range(max(0, y), min(height, y + h), step):
        for xx in range(max(0, x), min(width, x + w), step):
            red, green, blue = pixels[xx, yy][:3]
            sampled += 1
            if predicate(red, green, blue):
                matched += 1

    return matched / sampled if sampled else 0.0


def slot_signal(image: Image.Image, slot: dict[str, Any]) -> dict[str, Any]:
    x, y, w, _ = slot["roi"]
    inner_roi = (x + 72, y + 165, w - 144, 150)
    purple_ratio = measure_rect_ratio(image, slot["roi"], is_purple)
    bright_ratio = measure_rect_ratio(image, slot["roi"], is_bright_frame)
    dark_ratio = measure_rect_ratio(image, inner_roi, is_dark_card)
    gold_ratio = measure_rect_ratio(image, slot["buttonRoi"], is_gold_button)
    confidence = (
        min(1.0, purple_ratio / 0.14) * 0.24
        + min(1.0, bright_ratio / 0.055) * 0.14
        + min(1.0, dark_ratio / 0.34) * 0.32
        + min(1.0, gold_ratio / 0.22) * 0.30
    )
    return {
        "slotIndex": slot["slotIndex"],
        "purpleRatio": purple_ratio,
        "brightRatio": bright_ratio,
        "darkRatio": dark_ratio,
        "goldRatio": gold_ratio,
        "confidence": confidence,
        "visible": purple_ratio >= 0.04
        and bright_ratio >= 0.05
        and dark_ratio >= 0.22
        and gold_ratio >= 0.04
        and confidence >= 0.48,
    }


def detect_presence(image: Image.Image) -> dict[str, Any]:
    rgb_image = image.convert("RGB")
    slots = [slot_signal(rgb_image, slot) for slot in PRESENCE_SLOTS]
    confidence = sum(sorted((slot["confidence"] for slot in slots), reverse=True)[:3]) / max(1, len(slots))
    visible_slots = [slot for slot in slots if slot["visible"]]
    return {
        "visible": len(visible_slots) >= 2 and confidence >= 0.50,
        "confidence": confidence,
        "slots": slots,
    }


def draw_overlay(image: Image.Image, detection: dict[str, Any]) -> Image.Image:
    output = image.convert("RGB").copy()
    draw = ImageDraw.Draw(output)
    width, height = output.size
    for slot, signal in zip(PRESENCE_SLOTS, detection["slots"]):
        x, y, w, h = scale_rect(slot["roi"], width, height)
        color = (70, 210, 70) if signal["visible"] else (230, 80, 80)
        draw.rectangle((x, y, x + w, y + h), outline=color, width=3)
        draw.text((x + 8, y + 8), f"S{slot['slotIndex']} {signal['confidence']:.2f}", fill=color)
    draw.text(
        (24, 24),
        f"visible={detection['visible']} confidence={detection['confidence']:.2f}",
        fill=(255, 240, 50),
    )
    return output


def audit_video(
    video_path: Path,
    output_dir: Path,
    interval_seconds: float,
    max_saved: int,
    reuse_frames: bool,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    raw_dir = output_dir / "raw_frames"
    frames = extract_frames(video_path, raw_dir, interval_seconds, reuse_frames)
    metadata = read_video_metadata(video_path)

    samples: list[dict[str, Any]] = []
    saved = 0
    for index, frame_path in enumerate(frames):
        timestamp = index * interval_seconds
        with Image.open(frame_path) as image:
            detection = detect_presence(image)
            sample = {
                "frameIndex": index,
                "timestamp": timestamp,
                "visible": detection["visible"],
                "confidence": detection["confidence"],
                "slots": detection["slots"],
            }
            if detection["visible"] or detection["confidence"] >= 0.25:
                if saved < max_saved:
                    image_name = f"augment_presence_{saved + 1:03d}_{timestamp:07.2f}s.png"
                    draw_overlay(image, detection).save(output_dir / image_name)
                    sample["image"] = image_name
                    saved += 1
            samples.append(sample)

    visible = [sample for sample in samples if sample["visible"]]
    near = [sample for sample in samples if not sample["visible"] and sample["confidence"] >= 0.25]
    result = {
        "video": str(video_path),
        **metadata,
        "intervalSeconds": interval_seconds,
        "sampleCount": len(samples),
        "visibleCount": len(visible),
        "nearMissCount": len(near),
        "samples": samples,
    }
    (output_dir / "augment_presence_audit.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return result


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True, type=Path)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
    )
    parser.add_argument("--interval-seconds", type=float, default=1.0)
    parser.add_argument("--max-saved", type=int, default=80)
    parser.add_argument("--reuse-frames", action="store_true")
    args = parser.parse_args()

    output_dir = args.output_dir or Path(
        f"scripts/fixtures/golden-spatula-augment-presence-{args.video.stem}-audit"
    )

    result = audit_video(
        args.video,
        output_dir,
        args.interval_seconds,
        args.max_saved,
        args.reuse_frames,
    )
    print(f"Video: {result['video']}")
    print(f"Duration: {result['durationSeconds']:.1f}s")
    print(f"Samples: {result['sampleCount']}")
    print(f"Visible: {result['visibleCount']}")
    print(f"Near misses: {result['nearMissCount']}")
    print(f"Audit: {output_dir / 'augment_presence_audit.json'}")


if __name__ == "__main__":
    main()

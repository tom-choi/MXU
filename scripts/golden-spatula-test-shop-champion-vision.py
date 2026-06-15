from __future__ import annotations

import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path

from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[1]
AUDIT_SCRIPT = REPO_ROOT / "scripts" / "golden-spatula-audit-shop-champions.py"
FIXTURE_PATH = (
    REPO_ROOT / "scripts" / "fixtures" / "golden-spatula-shop-champions-video4-audit.json"
)
OUT_DIR = REPO_ROOT / ".tmp" / "shop-champion-vision-test"


def load_audit_module():
    spec = importlib.util.spec_from_file_location("golden_spatula_audit_shop_champions", AUDIT_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load audit script: {AUDIT_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def build_predictions(audit, crop: Image.Image, variants_by_size: dict) -> list[dict]:
    predictions = []
    for score, variant in audit.best_matches(crop, variants_by_size, top_k=12):
        predictions.append(
            {
                "templatePath": variant.path,
                "slug": variant.slug,
                "name": variant.name,
                "cost": variant.cost,
                "score": score,
            }
        )
    return predictions


def main() -> int:
    audit = load_audit_module()
    fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

    frame_dir = OUT_DIR / "frames"
    video = audit.find_video(None)
    audit.extract_frames(
        video,
        frame_dir,
        fixture["startSecond"],
        fixture["stepSeconds"],
        fixture["frameCount"],
        reuse=True,
    )

    variants = audit.load_templates()
    variants_by_size: dict[tuple[int, int], list] = {}
    for variant in variants:
        variants_by_size.setdefault((variant.width, variant.height), []).append(variant)

    failures: list[str] = []
    counts: Counter[str] = Counter()
    reason_counts: Counter[str] = Counter()
    slots_by_index = {slot["index"]: slot for slot in audit.SLOTS}

    for case in fixture["cases"]:
        frame_path = frame_dir / f"frame_{case['frameIndex']:04d}.png"
        frame = Image.open(frame_path).convert("RGB")
        slot = slots_by_index[case["slotIndex"]]
        x, y, width, height = slot["roi"]
        crop = frame.crop((x, y, x + width, y + height))

        predictions = build_predictions(audit, crop, variants_by_size)
        presence = audit.measure_shop_card_presence(crop)
        decision = audit.decide_shop_match(
            predictions,
            presence,
            fixture.get("minScore", audit.DEFAULT_MIN_SCORE),
        )
        expected = case["expected"]
        counts[decision["confidence"]] += 1
        reason_counts[decision["reason"]] += 1

        if decision["confidence"] != expected["confidence"]:
            failures.append(
                f"#{case['sampleIndex']} S{case['slotIndex']} confidence "
                f"{decision['confidence']} != {expected['confidence']}"
            )
            continue

        if decision["reason"] != expected["reason"]:
            failures.append(
                f"#{case['sampleIndex']} S{case['slotIndex']} reason "
                f"{decision['reason']} != {expected['reason']}"
            )
            continue

        if expected["confidence"] == "matched" and decision.get("templatePath") != expected.get(
            "templatePath"
        ):
            failures.append(
                f"#{case['sampleIndex']} S{case['slotIndex']} template "
                f"{decision.get('templatePath')} != {expected.get('templatePath')}"
            )

    summary = {
        "fixture": str(FIXTURE_PATH.relative_to(REPO_ROOT)),
        "cases": len(fixture["cases"]),
        "confidence": dict(counts),
        "reasons": dict(reason_counts),
        "failures": len(failures),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if failures:
        print("\n".join(failures[:20]))
        if len(failures) > 20:
            print(f"... {len(failures) - 20} more failures")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

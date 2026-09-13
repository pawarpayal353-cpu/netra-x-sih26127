"""
ANPR Engine — abstract interface + mock implementation.

Real deployment would swap MockANPREngine for an engine that runs a
YOLO-class vehicle detector, a plate detector, and PaddleOCR over real
frames. The interface below is deliberately framework-agnostic so that
swap requires no changes to any caller.
"""
import random
import string
from abc import ABC, abstractmethod

VEHICLE_TYPES = ["car", "motorcycle", "auto-rickshaw", "bus", "truck", "van"]

STATE_CODES = ["MH", "KA", "DL", "GJ", "TN", "UP", "RJ", "PB", "WB", "AP"]


class ANPREngine(ABC):
    @abstractmethod
    def process_frame(self, frame=None, plate_hint: str = None) -> dict:
        ...


def _random_plate() -> str:
    state = random.choice(STATE_CODES)
    rto = f"{random.randint(1, 99):02d}"
    letters = "".join(random.choices(string.ascii_uppercase, k=2))
    digits = f"{random.randint(1, 9999):04d}"
    return f"{state}{rto}{letters}{digits}"


class MockANPREngine(ANPREngine):
    """Produces realistic, plausible ANPR results without any model weights."""

    def process_frame(self, frame=None, plate_hint: str = None) -> dict:
        plate = plate_hint or _random_plate()
        base_conf = random.uniform(0.82, 0.99)
        return {
            "plate": plate,
            "confidence": round(base_conf, 3),
            "vehicle_type": random.choice(VEHICLE_TYPES),
            "quality": round(random.uniform(0.7, 0.98), 3),
        }

    def process_frame_sequence(self, plate: str, n_frames: int = 4) -> dict:
        """Simulate OCR across multiple frames of the same plate and fuse them."""
        readings = []
        for _ in range(n_frames):
            if random.random() < 0.18:
                # simulate an occasional misread of one character
                p = list(plate)
                idx = random.randrange(len(p))
                p[idx] = random.choice(string.ascii_uppercase + string.digits)
                reading = "".join(p)
            else:
                reading = plate
            conf = round(random.uniform(0.80, 0.99), 3)
            readings.append({"plate": reading, "confidence": conf})
        return fuse_ocr_readings(readings)


def fuse_ocr_readings(readings: list[dict]) -> dict:
    """
    Multi-frame confidence fusion.

    Groups OCR readings by plate string, sums (confidence-weighted) votes,
    and returns the winning plate with a fused confidence score that rewards
    both agreement across frames and individual-frame confidence.
    """
    if not readings:
        return {"plate": None, "confidence": 0.0, "frames": []}

    votes: dict[str, list[float]] = {}
    for r in readings:
        votes.setdefault(r["plate"], []).append(r["confidence"])

    best_plate, best_confs = max(votes.items(), key=lambda kv: (len(kv[1]), sum(kv[1])))
    agreement_ratio = len(best_confs) / len(readings)
    avg_conf = sum(best_confs) / len(best_confs)
    # Fused score: average confidence boosted by agreement across frames,
    # capped at 0.995 to avoid false certainty.
    fused = min(0.995, avg_conf * (0.6 + 0.4 * agreement_ratio) + 0.03 * (len(best_confs) - 1))
    return {
        "plate": best_plate,
        "confidence": round(fused, 3),
        "frames": readings,
        "agreement_ratio": round(agreement_ratio, 2),
    }


engine: ANPREngine = MockANPREngine()

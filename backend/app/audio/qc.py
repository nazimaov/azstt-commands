"""Automatic quality checks (TZ p.9). These only ever route a recording to `pending` or
`needs_review` — never `rejected` and never `approved`: both of those are exclusively a
human moderation decision (app/routers/admin.py), so an unusual accent or a quiet voice
never gets silently dropped, only flagged for a person to look at."""
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import soundfile as sf

SILENCE_RMS_THRESHOLD = 0.01  # on a [-1, 1] float signal — well below any real speech


@dataclass
class QcOutcome:
    status: str  # "pending" | "needs_review"
    duration_sec: float
    sample_rate: int | None
    details: dict = field(default_factory=dict)


def run_checks(converted_path: Path | None, min_duration_sec: float, max_duration_sec: float) -> QcOutcome:
    details: dict = {}
    if converted_path is None or not converted_path.exists():
        details["conversion_ok"] = False
        return QcOutcome(status="needs_review", duration_sec=0.0, sample_rate=None, details=details)
    details["conversion_ok"] = True

    try:
        info = sf.info(str(converted_path))
        data, sample_rate = sf.read(str(converted_path), dtype="float32")
    except Exception as e:
        details["readable"] = False
        details["error"] = str(e)
        return QcOutcome(status="needs_review", duration_sec=0.0, sample_rate=None, details=details)
    details["readable"] = True

    duration_sec = float(info.duration)
    details["duration_sec"] = duration_sec
    details["duration_nonzero"] = duration_sec > 0
    details["duration_within_limit"] = min_duration_sec <= duration_sec <= max_duration_sec

    rms = float(np.sqrt(np.mean(np.square(data)))) if data.size else 0.0
    details["rms"] = rms
    details["not_silent"] = rms >= SILENCE_RMS_THRESHOLD

    needs_review = not (details["duration_nonzero"] and details["duration_within_limit"] and details["not_silent"])
    return QcOutcome(
        status="needs_review" if needs_review else "pending",
        duration_sec=duration_sec,
        sample_rate=int(sample_rate),
        details=details,
    )

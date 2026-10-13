"""Dataset export (TZ p.11): a zip with converted audio, a CSV + JSONL manifest (one row
per recording), and a short README. Filenames never depend on the participant's name —
there isn't one to begin with (app/models.py's Participant has no PII), just the random
participant_id and recording_id already used for storage."""
import csv
import io
import json
import zipfile
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models import Phrase, PhraseVersion, Recording

MANIFEST_COLUMNS = [
    "recording_id", "participant_id", "command_code", "phrase_id", "phrase_version_id",
    "text", "audio_file", "duration_sec", "sample_rate", "status", "created_at",
]


@dataclass
class ExportResult:
    zip_bytes: bytes
    count: int


def _row(r: Recording) -> dict:
    pv: PhraseVersion = r.phrase_version
    phrase: Phrase = pv.phrase
    return {
        "recording_id": r.id,
        "participant_id": r.participant_id,
        "command_code": phrase.command.code,
        "phrase_id": phrase.id,
        "phrase_version_id": pv.id,
        "text": pv.text,
        "audio_file": f"audio/{r.id}.wav",
        "duration_sec": r.duration_sec,
        "sample_rate": r.sample_rate,
        "status": r.status,
        "created_at": r.created_at.isoformat(),
    }


def export_dataset(db: Session, status: str) -> ExportResult:
    recordings = (
        db.query(Recording)
        .filter(Recording.status == status, Recording.converted_path.isnot(None))
        .all()
    )
    rows = [_row(r) for r in recordings]

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        csv_buf = io.StringIO()
        writer = csv.DictWriter(csv_buf, fieldnames=MANIFEST_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
        zf.writestr("metadata.csv", csv_buf.getvalue())

        jsonl = "\n".join(json.dumps(row, ensure_ascii=False) for row in rows)
        zf.writestr("metadata.jsonl", jsonl)

        zf.writestr("README.md", (
            f"# AzSTT Commands dataset export (status={status})\n\n"
            f"{len(rows)} записей. `audio/<recording_id>.wav` — WAV PCM mono 16 kHz.\n"
            f"`metadata.csv` / `metadata.jsonl` — манифест, одна строка на запись.\n"
            f"Колонки: {', '.join(MANIFEST_COLUMNS)}.\n\n"
            f"Деление на train/val/test по `participant_id` — следующий шаг, не входит "
            f"в этот экспорт (см. README.md корня проекта, раздел ограничений).\n"
        ))

        for r in recordings:
            zf.write(r.converted_path, arcname=f"audio/{r.id}.wav")

    return ExportResult(zip_bytes=buf.getvalue(), count=len(rows))

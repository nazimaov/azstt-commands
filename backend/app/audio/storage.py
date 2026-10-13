"""Where recording files live on disk: audio_dir/<participant_id>/<recording_id>.<ext> for
the untouched original, and .../<recording_id>.wav for the converted copy. The original is
never overwritten by the conversion step (TZ p.8) — they are always two separate files."""
from pathlib import Path

ALLOWED_EXTENSIONS = {"webm", "ogg", "wav", "mp4", "m4a"}


class StorageError(Exception):
    pass


def guess_extension(content_type: str | None, filename: str | None) -> str:
    if filename and "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in ALLOWED_EXTENSIONS:
            return ext
    mapping = {
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/mp4": "m4a",
    }
    ext = mapping.get((content_type or "").split(";")[0].strip().lower())
    if not ext:
        raise StorageError(f"Неподдерживаемый тип аудио: {content_type!r}")
    return ext


def participant_dir(audio_dir: Path, participant_id: str) -> Path:
    d = audio_dir / participant_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def original_path(audio_dir: Path, participant_id: str, recording_id: str, ext: str) -> Path:
    return participant_dir(audio_dir, participant_id) / f"{recording_id}.{ext}"


def converted_path(audio_dir: Path, participant_id: str, recording_id: str) -> Path:
    return participant_dir(audio_dir, participant_id) / f"{recording_id}.converted.wav"


def save_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    tmp.replace(path)

"""Converts whatever the browser recorded (typically WebM/Opus) into WAV PCM mono 16kHz for
training, via the system `ffmpeg` binary (must be on PATH — see README). The original file
is never touched here; this only ever writes to a separate `converted_path`."""
import shutil
import subprocess
from pathlib import Path

TARGET_SAMPLE_RATE = 16000


class ConvertError(Exception):
    pass


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def convert_to_wav(src: Path, dest: Path, sample_rate: int = TARGET_SAMPLE_RATE) -> None:
    if not ffmpeg_available():
        raise ConvertError("ffmpeg не найден в PATH — установите его (winget install ffmpeg)")
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".tmp")
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", str(src), "-ac", "1", "-ar", str(sample_rate), "-sample_fmt", "s16",
         "-f", "wav", str(tmp)],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0 or not tmp.exists():
        tmp.unlink(missing_ok=True)
        raise ConvertError(f"ffmpeg не смог сконвертировать файл: {result.stderr[-500:]}")
    tmp.replace(dest)

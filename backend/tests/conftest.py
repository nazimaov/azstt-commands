import math
import struct
import sys
import wave
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402

TOKEN = "test-admin-token-0123456789abcdef"
ADMIN_HEADERS = {"Authorization": f"Bearer {TOKEN}"}


def write_tone(path: Path, freq: float = 440, seconds: float = 1.0, rate: int = 16000) -> bytes:
    """A short, clearly non-silent mono WAV tone — stands in for a real recorded phrase in
    tests that don't need actual speech, just a valid, audible audio file."""
    frames = b"".join(struct.pack("<h", int(12000 * math.sin(2 * math.pi * freq * n / rate)))
                      for n in range(int(rate * seconds)))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(frames)
    return path.read_bytes()


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        audio_dir=tmp_path / "audio",
        admin_token=TOKEN,
        max_upload_mb=15,
        max_duration_sec=8.0,
        min_duration_sec=0.2,
    )


@pytest.fixture
def app(settings):
    return create_app(settings)


@pytest.fixture
def client(app):
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c


@pytest.fixture
def tone_wav(tmp_path) -> bytes:
    return write_tone(tmp_path / "tone.wav", seconds=1.0)


@pytest.fixture
def silent_wav(tmp_path) -> bytes:
    path = tmp_path / "silence.wav"
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * 16000)  # 1s of digital silence
    return path.read_bytes()


def make_participant(client) -> str:
    r = client.post("/api/participants")
    assert r.status_code == 200
    participant_id = r.json()["id"]
    client.post(f"/api/participants/{participant_id}/consent",
               json={"collection": True, "training_use": True, "public_distribution": False})
    return participant_id


def first_task(client) -> dict:
    r = client.get("/api/tasks")
    assert r.status_code == 200
    items = r.json()["items"]
    assert items
    return items[0]

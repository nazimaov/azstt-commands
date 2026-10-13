from app.audio import qc
from tests.conftest import write_tone


def test_normal_tone_passes(tmp_path):
    path = tmp_path / "tone.wav"
    write_tone(path, seconds=1.0)
    outcome = qc.run_checks(path, min_duration_sec=0.2, max_duration_sec=8.0)
    assert outcome.status == "pending"
    assert outcome.details["not_silent"] is True
    assert outcome.details["duration_within_limit"] is True
    assert outcome.sample_rate == 16000


def test_silent_file_flagged(tmp_path):
    import wave
    path = tmp_path / "silence.wav"
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * 16000)
    outcome = qc.run_checks(path, min_duration_sec=0.2, max_duration_sec=8.0)
    assert outcome.status == "needs_review"
    assert outcome.details["not_silent"] is False


def test_too_long_flagged(tmp_path):
    path = tmp_path / "long.wav"
    write_tone(path, seconds=10.0)
    outcome = qc.run_checks(path, min_duration_sec=0.2, max_duration_sec=8.0)
    assert outcome.status == "needs_review"
    assert outcome.details["duration_within_limit"] is False


def test_too_short_flagged(tmp_path):
    path = tmp_path / "short.wav"
    write_tone(path, seconds=0.05)
    outcome = qc.run_checks(path, min_duration_sec=0.2, max_duration_sec=8.0)
    assert outcome.status == "needs_review"
    assert outcome.details["duration_within_limit"] is False


def test_missing_file_flagged(tmp_path):
    outcome = qc.run_checks(tmp_path / "does-not-exist.wav", min_duration_sec=0.2, max_duration_sec=8.0)
    assert outcome.status == "needs_review"
    assert outcome.details["conversion_ok"] is False


def test_none_path_flagged():
    outcome = qc.run_checks(None, min_duration_sec=0.2, max_duration_sec=8.0)
    assert outcome.status == "needs_review"

import csv
import io
import json
import zipfile

from tests.conftest import ADMIN_HEADERS, first_task, make_participant


def _upload_and_approve(client, tone_wav):
    participant_id = make_participant(client)
    task = first_task(client)
    rec = client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
        files={"audio": ("rec.wav", tone_wav, "audio/wav")},
    ).json()
    client.patch(f"/api/admin/recordings/{rec['id']}", headers=ADMIN_HEADERS, json={"status": "approved"})
    return rec, task


def test_export_only_includes_requested_status(client, tone_wav):
    rec, task = _upload_and_approve(client, tone_wav)

    r = client.get("/api/admin/export", headers=ADMIN_HEADERS, params={"status": "approved"})
    assert r.status_code == 200
    assert r.headers["x-export-count"] == "1"

    zf = zipfile.ZipFile(io.BytesIO(r.content))
    names = zf.namelist()
    assert "metadata.csv" in names
    assert "metadata.jsonl" in names
    assert "README.md" in names
    assert f"audio/{rec['id']}.wav" in names

    rows = list(csv.DictReader(io.StringIO(zf.read("metadata.csv").decode("utf-8"))))
    assert len(rows) == 1
    assert rows[0]["recording_id"] == rec["id"]
    assert rows[0]["text"] == task["text"]
    assert rows[0]["command_code"] == task["command_code"]

    jsonl_rows = [json.loads(line) for line in zf.read("metadata.jsonl").decode("utf-8").splitlines()]
    assert jsonl_rows[0]["recording_id"] == rec["id"]


def test_export_empty_for_unused_status(client):
    r = client.get("/api/admin/export", headers=ADMIN_HEADERS, params={"status": "rejected"})
    assert r.status_code == 200
    assert r.headers["x-export-count"] == "0"
    zf = zipfile.ZipFile(io.BytesIO(r.content))
    rows = list(csv.DictReader(io.StringIO(zf.read("metadata.csv").decode("utf-8"))))
    assert rows == []


def test_export_requires_admin_token(client):
    r = client.get("/api/admin/export", params={"status": "approved"})
    assert r.status_code == 401


def test_export_invalid_status_rejected(client):
    r = client.get("/api/admin/export", headers=ADMIN_HEADERS, params={"status": "bogus"})
    assert r.status_code == 400

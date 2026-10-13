from tests.conftest import first_task, make_participant


def test_tasks_include_seeded_commands(client):
    items = client.get("/api/tasks").json()["items"]
    codes = {i["command_code"] for i in items}
    assert {"play", "pause", "stop", "next", "previous"} <= codes


def test_participant_and_consent(client):
    participant_id = make_participant(client)
    assert participant_id

    r = client.post("/api/participants/does-not-exist/consent",
                    json={"collection": True, "training_use": True, "public_distribution": False})
    assert r.status_code == 404


def test_recording_requires_consent(client, tone_wav):
    r = client.post("/api/participants")
    participant_id = r.json()["id"]
    task = first_task(client)

    r = client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
        files={"audio": ("rec.wav", tone_wav, "audio/wav")},
    )
    assert r.status_code == 403


def test_recording_upload_success(client, tone_wav):
    participant_id = make_participant(client)
    task = first_task(client)

    r = client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
        files={"audio": ("rec.wav", tone_wav, "audio/wav")},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "pending"
    assert body["duration_sec"] > 0

    listed = client.get("/api/recordings", params={"participant_id": participant_id}).json()
    assert len(listed) == 1
    assert listed[0]["id"] == body["id"]


def test_multiple_recordings_of_same_phrase_allowed(client, tone_wav):
    """TZ p.10: must support several recordings of the same phrase, from the same or
    different participants."""
    participant_id = make_participant(client)
    task = first_task(client)

    for _ in range(2):
        r = client.post(
            "/api/recordings",
            params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
            files={"audio": ("rec.wav", tone_wav, "audio/wav")},
        )
        assert r.status_code == 200

    listed = client.get("/api/recordings", params={"participant_id": participant_id}).json()
    assert len(listed) == 2


def test_silent_recording_flagged_needs_review(client, silent_wav):
    participant_id = make_participant(client)
    task = first_task(client)

    r = client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
        files={"audio": ("rec.wav", silent_wav, "audio/wav")},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "needs_review"
    assert r.json()["qc_result"]["not_silent"] is False


def test_empty_file_rejected(client):
    participant_id = make_participant(client)
    task = first_task(client)

    r = client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
        files={"audio": ("rec.wav", b"", "audio/wav")},
    )
    assert r.status_code == 400


def test_missing_phrase_version_404(client, tone_wav):
    participant_id = make_participant(client)
    r = client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": "no-such-id"},
        files={"audio": ("rec.wav", tone_wav, "audio/wav")},
    )
    assert r.status_code == 404


def test_stats_reflect_recordings(client, tone_wav):
    before = client.get("/api/stats").json()
    participant_id = make_participant(client)
    task = first_task(client)
    client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
        files={"audio": ("rec.wav", tone_wav, "audio/wav")},
    )
    after = client.get("/api/stats").json()
    assert after["recordings_count"] == before["recordings_count"] + 1
    assert after["participants_count"] == before["participants_count"] + 1

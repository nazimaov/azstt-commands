from tests.conftest import ADMIN_HEADERS, first_task, make_participant


def test_admin_requires_token(client):
    r = client.get("/api/admin/commands")
    assert r.status_code == 401
    r = client.get("/api/admin/commands", headers={"Authorization": "Bearer wrong-token"})
    assert r.status_code == 401


def test_list_commands_includes_seed(client):
    r = client.get("/api/admin/commands", headers=ADMIN_HEADERS)
    assert r.status_code == 200
    codes = {c["code"] for c in r.json()}
    assert "play" in codes
    play = next(c for c in r.json() if c["code"] == "play")
    assert len(play["phrases"]) == 3
    assert all(p["versions"][0]["version_number"] == 1 for p in play["phrases"])


def test_create_command_with_phrases(client):
    r = client.post("/api/admin/commands", headers=ADMIN_HEADERS, json={
        "code": "shuffle",
        "title": "Случайное воспроизведение",
        "phrases": ["Qarışıq çal", "Təsadüfi"],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["code"] == "shuffle"
    assert len(body["phrases"]) == 2


def test_create_command_duplicate_code_rejected(client):
    client.post("/api/admin/commands", headers=ADMIN_HEADERS,
               json={"code": "dup", "title": "A", "phrases": []})
    r = client.post("/api/admin/commands", headers=ADMIN_HEADERS,
                    json={"code": "dup", "title": "B", "phrases": []})
    assert r.status_code == 400


def test_disable_command_removes_it_from_tasks(client):
    commands = client.get("/api/admin/commands", headers=ADMIN_HEADERS).json()
    play = next(c for c in commands if c["code"] == "play")

    client.patch(f"/api/admin/commands/{play['id']}", headers=ADMIN_HEADERS, json={"status": "disabled"})

    tasks = client.get("/api/tasks").json()["items"]
    assert all(t["command_code"] != "play" for t in tasks)


def test_edit_phrase_text_creates_new_version(client):
    commands = client.get("/api/admin/commands", headers=ADMIN_HEADERS).json()
    play = next(c for c in commands if c["code"] == "play")
    phrase = play["phrases"][0]

    r = client.patch(f"/api/admin/phrases/{phrase['id']}", headers=ADMIN_HEADERS,
                     json={"text": "Musiqini işə sal"})
    assert r.status_code == 200
    body = r.json()
    assert body["current_text"] == "Musiqini işə sal"
    assert len(body["versions"]) == 2
    assert body["versions"][0]["is_current"] is False
    assert body["versions"][1]["is_current"] is True
    assert body["versions"][1]["version_number"] == 2


def test_disable_phrase_removes_it_from_tasks(client):
    commands = client.get("/api/admin/commands", headers=ADMIN_HEADERS).json()
    play = next(c for c in commands if c["code"] == "play")
    phrase = play["phrases"][0]
    disabled_text = phrase["current_text"]

    client.patch(f"/api/admin/phrases/{phrase['id']}", headers=ADMIN_HEADERS, json={"enabled": False})

    tasks = client.get("/api/tasks").json()["items"]
    assert all(t["text"] != disabled_text for t in tasks)


def test_moderate_recording(client, tone_wav):
    participant_id = make_participant(client)
    task = first_task(client)
    rec = client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
        files={"audio": ("rec.wav", tone_wav, "audio/wav")},
    ).json()

    r = client.patch(f"/api/admin/recordings/{rec['id']}", headers=ADMIN_HEADERS,
                     json={"status": "approved"})
    assert r.status_code == 200
    assert r.json()["status"] == "approved"

    admin_list = client.get("/api/admin/recordings", headers=ADMIN_HEADERS,
                            params={"status": "approved"}).json()
    assert any(r["id"] == rec["id"] for r in admin_list)


def test_moderate_recording_invalid_status_rejected(client, tone_wav):
    participant_id = make_participant(client)
    task = first_task(client)
    rec = client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
        files={"audio": ("rec.wav", tone_wav, "audio/wav")},
    ).json()

    r = client.patch(f"/api/admin/recordings/{rec['id']}", headers=ADMIN_HEADERS,
                     json={"status": "bogus"})
    assert r.status_code == 400


def test_recording_audio_downloadable_by_admin(client, tone_wav):
    participant_id = make_participant(client)
    task = first_task(client)
    rec = client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
        files={"audio": ("rec.wav", tone_wav, "audio/wav")},
    ).json()

    r = client.get(f"/api/admin/recordings/{rec['id']}/audio", headers=ADMIN_HEADERS)
    assert r.status_code == 200
    assert len(r.content) > 0


def test_delete_recording_removes_files_and_row(client, tone_wav):
    participant_id = make_participant(client)
    task = first_task(client)
    rec = client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
        files={"audio": ("rec.wav", tone_wav, "audio/wav")},
    ).json()

    admin_rows = client.get("/api/admin/recordings", headers=ADMIN_HEADERS).json()
    row = next(r for r in admin_rows if r["id"] == rec["id"])
    assert row  # sanity: it exists before delete

    r = client.delete(f"/api/admin/recordings/{rec['id']}", headers=ADMIN_HEADERS)
    assert r.status_code == 200
    assert r.json()["ok"] is True

    admin_rows_after = client.get("/api/admin/recordings", headers=ADMIN_HEADERS).json()
    assert all(r["id"] != rec["id"] for r in admin_rows_after)

    # Audio endpoint should 404 now that both the row and the files on disk are gone.
    assert client.get(f"/api/admin/recordings/{rec['id']}/audio", headers=ADMIN_HEADERS).status_code == 404


def test_delete_recording_not_found(client):
    r = client.delete("/api/admin/recordings/no-such-id", headers=ADMIN_HEADERS)
    assert r.status_code == 404


def test_delete_recording_requires_admin_token(client, tone_wav):
    participant_id = make_participant(client)
    task = first_task(client)
    rec = client.post(
        "/api/recordings",
        params={"participant_id": participant_id, "phrase_version_id": task["phrase_version_id"]},
        files={"audio": ("rec.wav", tone_wav, "audio/wav")},
    ).json()

    r = client.delete(f"/api/admin/recordings/{rec['id']}")
    assert r.status_code == 401

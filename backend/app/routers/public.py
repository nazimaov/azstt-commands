"""Participant-facing API: no login, no PII — a participant is just a random id the
frontend generates once and keeps in localStorage (frontend/src/lib/participant.ts).
Recording a phrase always goes save-original -> convert -> quality-check -> DB row, in
that order, so a Recording row only ever exists once the file is actually on disk."""
import logging
import random
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.audio import convert, qc, storage
from app.config import Settings
from app.deps import get_db, get_settings
from app.models import Command, Consent, Participant, Phrase, PhraseVersion, Recording
from app.schemas import (ConsentIn, ConsentOut, ParticipantOut, PhraseTaskOut, RecordingOut,
                         StatsOut, TasksOut)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["public"])


def _get_participant(db: Session, participant_id: str) -> Participant:
    participant = db.get(Participant, participant_id)
    if participant is None:
        raise HTTPException(404, "Участник не найден")
    return participant


@router.post("/participants", response_model=ParticipantOut)
def create_participant(db: Session = Depends(get_db)):
    participant = Participant()
    db.add(participant)
    db.commit()
    return participant


@router.post("/participants/{participant_id}/consent", response_model=ConsentOut)
def give_consent(participant_id: str, body: ConsentIn, db: Session = Depends(get_db)):
    _get_participant(db, participant_id)
    consent = Consent(participant_id=participant_id, **body.model_dump())
    db.add(consent)
    db.commit()
    return consent


@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db)):
    return StatsOut(
        commands_count=db.query(Command).filter(Command.status == "active").count(),
        recordings_count=db.query(Recording).count(),
        pending_count=db.query(Recording).filter(Recording.status == "pending").count(),
        participants_count=db.query(Participant).count(),
    )


@router.get("/tasks", response_model=TasksOut)
def get_tasks(db: Session = Depends(get_db)):
    """Every enabled phrase's current wording, across active commands — the full MVP
    "session" (TZ p.5.1: picking a narrower command set is a future refinement, not
    required for the first version). Shuffled server-side so repeat visits vary the order."""
    phrases = (
        db.query(Phrase)
        .join(Command)
        .options(joinedload(Phrase.versions), joinedload(Phrase.command))
        .filter(Phrase.enabled.is_(True), Command.status == "active")
        .all()
    )
    items = []
    for phrase in phrases:
        current = phrase.current_version
        if current is None:
            continue
        items.append(PhraseTaskOut(
            phrase_version_id=current.id,
            command_code=phrase.command.code,
            command_title=phrase.command.title,
            text=current.text,
        ))
    random.shuffle(items)
    return TasksOut(items=items)


@router.get("/recordings", response_model=list[RecordingOut])
def list_recordings(participant_id: str, db: Session = Depends(get_db)):
    _get_participant(db, participant_id)
    rows = (
        db.query(Recording)
        .filter(Recording.participant_id == participant_id)
        .order_by(Recording.created_at.desc())
        .all()
    )
    return rows


@router.post("/recordings", response_model=RecordingOut)
async def upload_recording(
    participant_id: str,
    phrase_version_id: str,
    audio: UploadFile,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    participant = _get_participant(db, participant_id)
    phrase_version = db.get(PhraseVersion, phrase_version_id)
    if phrase_version is None:
        raise HTTPException(404, "Фраза не найдена")
    has_consent = (
        db.query(Consent)
        .filter(Consent.participant_id == participant.id, Consent.collection.is_(True))
        .first()
        is not None
    )
    if not has_consent:
        raise HTTPException(403, "Нет согласия на запись — сначала примите условия участия")

    data = await audio.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(413, f"Файл больше {settings.max_upload_mb} МБ")
    if not data:
        raise HTTPException(400, "Пустой файл записи")

    try:
        ext = storage.guess_extension(audio.content_type, audio.filename)
    except storage.StorageError as e:
        raise HTTPException(400, str(e))

    recording_id = uuid.uuid4().hex
    orig_path = storage.original_path(settings.audio_dir, participant.id, recording_id, ext)
    storage.save_bytes(orig_path, data)

    conv_path = storage.converted_path(settings.audio_dir, participant.id, recording_id)
    try:
        convert.convert_to_wav(orig_path, conv_path)
    except convert.ConvertError as e:
        log.warning("Конвертация записи %s не удалась: %s", recording_id, e)
        conv_path = None

    outcome = qc.run_checks(conv_path, settings.min_duration_sec, settings.max_duration_sec)

    recording = Recording(
        id=recording_id,
        participant_id=participant.id,
        phrase_version_id=phrase_version.id,
        original_path=str(orig_path),
        converted_path=str(conv_path) if conv_path else None,
        original_format=ext,
        duration_sec=outcome.duration_sec,
        sample_rate=outcome.sample_rate,
        status=outcome.status,
        qc_result=outcome.details,
    )
    db.add(recording)
    db.commit()
    return recording

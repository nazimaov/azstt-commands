"""Admin-only API (TZ p.7: command/phrase management, plus moderation and export). Every
route here requires the shared admin Bearer token (app/auth.py) — never mixed into
routers/public.py, which stays reachable by any anonymous participant."""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.auth import require_admin
from app.config import Settings
from app.deps import get_db, get_settings
from app.export import export_dataset
from app.models import COMMAND_STATUSES, RECORDING_STATUSES, Command, Phrase, PhraseVersion, Recording
from app.schemas import (CommandCreateIn, CommandOut, CommandUpdateIn, ModerationIn, PhraseCreateIn,
                         PhraseOut, PhraseUpdateIn, PhraseVersionOut)

def build_admin_router(settings: Settings) -> APIRouter:
    """Builds the admin router bound to this process's Settings — mirrors main.py's
    create_app() closure pattern (server/main.py) since the admin token to check against
    is only known once Settings is loaded, not at import time."""
    r = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[require_admin(settings)])

    def _phrase_out(phrase: Phrase, recordings_count: int) -> PhraseOut:
        current = phrase.current_version
        versions = sorted(phrase.versions, key=lambda v: v.version_number)
        return PhraseOut(
            id=phrase.id, enabled=phrase.enabled, current_text=current.text if current else None,
            recordings_count=recordings_count,
            versions=[PhraseVersionOut.model_validate(v, from_attributes=True) for v in versions],
        )

    def _command_out(db: Session, command: Command) -> CommandOut:
        phrases_out = []
        for phrase in sorted(command.phrases, key=lambda p: p.created_at):
            version_ids = [v.id for v in phrase.versions]
            count = db.query(Recording).filter(Recording.phrase_version_id.in_(version_ids)).count() if version_ids else 0
            phrases_out.append(_phrase_out(phrase, count))
        return CommandOut(id=command.id, code=command.code, title=command.title,
                          description=command.description, status=command.status, phrases=phrases_out)

    @r.get("/commands", response_model=list[CommandOut])
    def list_commands(db: Session = Depends(get_db)):
        commands = (
            db.query(Command)
            .options(joinedload(Command.phrases).joinedload(Phrase.versions))
            .order_by(Command.created_at)
            .all()
        )
        return [_command_out(db, c) for c in commands]

    @r.post("/commands", response_model=CommandOut)
    def create_command(body: CommandCreateIn, db: Session = Depends(get_db)):
        if db.query(Command).filter(Command.code == body.code).first():
            raise HTTPException(400, f"Команда с кодом '{body.code}' уже существует")
        command = Command(code=body.code, title=body.title, description=body.description)
        db.add(command)
        db.flush()
        for text in body.phrases:
            phrase = Phrase(command_id=command.id)
            db.add(phrase)
            db.flush()
            db.add(PhraseVersion(phrase_id=phrase.id, text=text, version_number=1, is_current=True))
        db.commit()
        db.refresh(command)
        return _command_out(db, command)

    @r.patch("/commands/{command_id}", response_model=CommandOut)
    def update_command(command_id: str, body: CommandUpdateIn, db: Session = Depends(get_db)):
        command = db.get(Command, command_id)
        if command is None:
            raise HTTPException(404, "Команда не найдена")
        if body.status is not None:
            if body.status not in COMMAND_STATUSES:
                raise HTTPException(400, f"status должен быть одним из: {', '.join(COMMAND_STATUSES)}")
            command.status = body.status
        if body.title is not None:
            command.title = body.title
        if body.description is not None:
            command.description = body.description
        db.commit()
        db.refresh(command)
        return _command_out(db, command)

    @r.post("/commands/{command_id}/phrases", response_model=PhraseOut)
    def add_phrase(command_id: str, body: PhraseCreateIn, db: Session = Depends(get_db)):
        command = db.get(Command, command_id)
        if command is None:
            raise HTTPException(404, "Команда не найдена")
        phrase = Phrase(command_id=command.id)
        db.add(phrase)
        db.flush()
        db.add(PhraseVersion(phrase_id=phrase.id, text=body.text, version_number=1, is_current=True))
        db.commit()
        db.refresh(phrase)
        return _phrase_out(phrase, 0)

    @r.patch("/phrases/{phrase_id}", response_model=PhraseOut)
    def update_phrase(phrase_id: str, body: PhraseUpdateIn, db: Session = Depends(get_db)):
        phrase = db.get(Phrase, phrase_id)
        if phrase is None:
            raise HTTPException(404, "Фраза не найдена")
        if body.enabled is not None:
            phrase.enabled = body.enabled
        if body.text is not None:
            current = phrase.current_version
            next_number = (current.version_number + 1) if current else 1
            if current is not None:
                current.is_current = False
            db.add(PhraseVersion(phrase_id=phrase.id, text=body.text, version_number=next_number, is_current=True))
        db.commit()
        db.refresh(phrase)
        version_ids = [v.id for v in phrase.versions]
        count = db.query(Recording).filter(Recording.phrase_version_id.in_(version_ids)).count() if version_ids else 0
        return _phrase_out(phrase, count)

    @r.get("/recordings")
    def list_recordings(status: str | None = None, db: Session = Depends(get_db)):
        q = db.query(Recording).options(
            joinedload(Recording.phrase_version).joinedload(PhraseVersion.phrase).joinedload(Phrase.command)
        )
        if status:
            q = q.filter(Recording.status == status)
        rows = q.order_by(Recording.created_at.desc()).limit(500).all()
        return [
            {
                "id": r.id,
                "participant_id": r.participant_id,
                "command_code": r.phrase_version.phrase.command.code,
                "text": r.phrase_version.text,
                "status": r.status,
                "duration_sec": r.duration_sec,
                "qc_result": r.qc_result,
                "rejection_reason": r.rejection_reason,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]

    @r.patch("/recordings/{recording_id}")
    def moderate_recording(recording_id: str, body: ModerationIn, db: Session = Depends(get_db)):
        recording = db.get(Recording, recording_id)
        if recording is None:
            raise HTTPException(404, "Запись не найдена")
        if body.status not in RECORDING_STATUSES:
            raise HTTPException(400, f"status должен быть одним из: {', '.join(RECORDING_STATUSES)}")
        recording.status = body.status
        recording.rejection_reason = body.rejection_reason if body.status == "rejected" else None
        db.commit()
        return {"ok": True, "status": recording.status}

    @r.delete("/recordings/{recording_id}")
    def delete_recording(recording_id: str, db: Session = Depends(get_db)):
        """Permanently removes a recording: both audio files from disk (original and
        converted, if present) and the DB row. Unlike moderation (PATCH, which only changes
        status), this cannot be undone — for discarding genuinely unwanted data (e.g. test
        recordings), not for routine rejection, which should use status=rejected instead."""
        recording = db.get(Recording, recording_id)
        if recording is None:
            raise HTTPException(404, "Запись не найдена")
        for path_str in (recording.original_path, recording.converted_path):
            if path_str:
                Path(path_str).unlink(missing_ok=True)
        db.delete(recording)
        db.commit()
        return {"ok": True}

    @r.get("/recordings/{recording_id}/audio")
    def recording_audio(recording_id: str, db: Session = Depends(get_db)):
        recording = db.get(Recording, recording_id)
        if recording is None:
            raise HTTPException(404, "Запись не найдена")
        path = Path(recording.converted_path or recording.original_path)
        if not path.exists():
            raise HTTPException(404, "Аудиофайл отсутствует на диске")
        return FileResponse(path)

    @r.get("/export")
    def export(status: str = "approved", db: Session = Depends(get_db)):
        if status not in RECORDING_STATUSES:
            raise HTTPException(400, f"status должен быть одним из: {', '.join(RECORDING_STATUSES)}")
        result = export_dataset(db, status)
        filename = f"azstt_dataset_{status}.zip"
        return StreamingResponse(
            iter([result.zip_bytes]),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"',
                    "X-Export-Count": str(result.count)},
        )

    return r

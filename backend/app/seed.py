"""Idempotent seed of the initial command/phrase set (TZ p.6) from seed_data/initial_commands.yaml.
Safe to call on every startup: skips any command whose `code` already exists, so it never
overwrites edits made later through the admin UI (app/routers/admin.py)."""
from pathlib import Path

import yaml
from sqlalchemy.orm import Session

from app.models import Command, Phrase, PhraseVersion

SEED_FILE = Path(__file__).resolve().parent.parent / "seed_data" / "initial_commands.yaml"


def seed_initial_commands(db: Session, seed_file: Path = SEED_FILE) -> int:
    entries = yaml.safe_load(seed_file.read_text(encoding="utf-8")) or []
    existing_codes = {c.code for c in db.query(Command).all()}
    created = 0
    for entry in entries:
        if entry["code"] in existing_codes:
            continue
        command = Command(code=entry["code"], title=entry["title"], description=entry.get("description"))
        db.add(command)
        db.flush()
        for text in entry.get("phrases", []):
            phrase = Phrase(command_id=command.id)
            db.add(phrase)
            db.flush()
            db.add(PhraseVersion(phrase_id=phrase.id, text=text, version_number=1, is_current=True))
        created += 1
    if created:
        db.commit()
    return created

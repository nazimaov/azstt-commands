"""ORM models. A Phrase's text lives in PhraseVersion, never mutated in place — editing
a phrase creates a new version row (is_current flips), so a Recording made against an
older wording stays linked to the exact text that was read, even after later edits."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

COMMAND_STATUSES = ("active", "disabled", "archived")
RECORDING_STATUSES = ("pending", "approved", "rejected", "needs_review")


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Command(Base):
    __tablename__ = "commands"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    phrases: Mapped[list["Phrase"]] = relationship(back_populates="command", cascade="all, delete-orphan")


class Phrase(Base):
    __tablename__ = "phrases"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    command_id: Mapped[str] = mapped_column(ForeignKey("commands.id"), index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    command: Mapped[Command] = relationship(back_populates="phrases")
    versions: Mapped[list["PhraseVersion"]] = relationship(back_populates="phrase", cascade="all, delete-orphan")

    @property
    def current_version(self) -> "PhraseVersion | None":
        return next((v for v in self.versions if v.is_current), None)


class PhraseVersion(Base):
    __tablename__ = "phrase_versions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    phrase_id: Mapped[str] = mapped_column(ForeignKey("phrases.id"), index=True)
    text: Mapped[str] = mapped_column(String(300))
    version_number: Mapped[int] = mapped_column(Integer)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    phrase: Mapped[Phrase] = relationship(back_populates="versions")
    recordings: Mapped[list["Recording"]] = relationship(back_populates="phrase_version")


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    consents: Mapped[list["Consent"]] = relationship(back_populates="participant", cascade="all, delete-orphan")
    recordings: Mapped[list["Recording"]] = relationship(back_populates="participant")


class Consent(Base):
    """One row per consent action. A participant may give consent more than once (e.g. after
    the terms text changes) — never overwritten, so there is always a durable record of what
    exactly was agreed to and when."""
    __tablename__ = "consents"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    participant_id: Mapped[str] = mapped_column(ForeignKey("participants.id"), index=True)
    collection: Mapped[bool] = mapped_column(Boolean, default=False)
    training_use: Mapped[bool] = mapped_column(Boolean, default=False)
    public_distribution: Mapped[bool] = mapped_column(Boolean, default=False)
    terms_version: Mapped[str] = mapped_column(String(32))
    given_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    participant: Mapped[Participant] = relationship(back_populates="consents")


class Recording(Base):
    __tablename__ = "recordings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    participant_id: Mapped[str] = mapped_column(ForeignKey("participants.id"), index=True)
    phrase_version_id: Mapped[str] = mapped_column(ForeignKey("phrase_versions.id"), index=True)
    original_path: Mapped[str] = mapped_column(String(500))
    converted_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    original_format: Mapped[str] = mapped_column(String(32))
    duration_sec: Mapped[float] = mapped_column(Float)
    sample_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    qc_result: Mapped[dict] = mapped_column(JSON, default=dict)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)

    participant: Mapped[Participant] = relationship(back_populates="recordings")
    phrase_version: Mapped[PhraseVersion] = relationship(back_populates="recordings")

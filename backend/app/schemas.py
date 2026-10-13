"""Pydantic request/response schemas, separate from the ORM models (app/models.py) so the
API shape can evolve independently of the storage schema."""
from datetime import datetime

from pydantic import BaseModel, Field


class ParticipantOut(BaseModel):
    id: str
    created_at: datetime


class ConsentIn(BaseModel):
    collection: bool
    training_use: bool
    public_distribution: bool
    terms_version: str = "v1"


class ConsentOut(ConsentIn):
    given_at: datetime


class PhraseTaskOut(BaseModel):
    """One recording task: a specific phrase wording the participant should read aloud."""
    phrase_version_id: str
    command_code: str
    command_title: str
    text: str


class TasksOut(BaseModel):
    items: list[PhraseTaskOut]


class RecordingOut(BaseModel):
    id: str
    phrase_version_id: str
    status: str
    duration_sec: float
    qc_result: dict
    created_at: datetime


class StatsOut(BaseModel):
    commands_count: int
    recordings_count: int
    pending_count: int
    participants_count: int


class PhraseVersionOut(BaseModel):
    id: str
    text: str
    version_number: int
    is_current: bool
    created_at: datetime


class PhraseOut(BaseModel):
    id: str
    enabled: bool
    current_text: str | None
    recordings_count: int
    versions: list[PhraseVersionOut]


class CommandOut(BaseModel):
    id: str
    code: str
    title: str
    description: str | None
    status: str
    phrases: list[PhraseOut]


class CommandCreateIn(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    phrases: list[str] = Field(default_factory=list, description="начальные фразы для этой команды")


class CommandUpdateIn(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None


class PhraseCreateIn(BaseModel):
    text: str = Field(min_length=1, max_length=300)


class PhraseUpdateIn(BaseModel):
    text: str | None = None
    enabled: bool | None = None


class ModerationIn(BaseModel):
    status: str
    rejection_reason: str | None = None

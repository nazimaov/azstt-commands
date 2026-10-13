"""Shared FastAPI dependencies, reading the Settings/session-factory that main.py's app
factory stores on app.state — keeps routers/*.py free of any direct wiring/construction."""
from collections.abc import Generator

from fastapi import Request
from sqlalchemy.orm import Session

from app.config import Settings


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_db(request: Request) -> Generator[Session, None, None]:
    db = request.app.state.session_factory()
    try:
        yield db
    finally:
        db.close()

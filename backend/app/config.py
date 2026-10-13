"""Settings loaded from environment variables / .env, dataclass-based — same shape as
server/settings.py in the main SvenAlice project, adapted for a multi-user web service
instead of a single-user desktop one (no YAML config file, just env vars)."""
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import dotenv_values

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent
ENV_FILE = PROJECT_DIR / ".env"
MIN_TOKEN_LENGTH = 16


class ConfigError(Exception):
    pass


def _env(key: str, default: str | None = None, env_file: Path = ENV_FILE) -> str | None:
    return os.environ.get(key) or dotenv_values(env_file).get(key) or default


@dataclass
class Settings:
    database_url: str
    audio_dir: Path
    admin_token: str
    max_upload_mb: int = 15
    max_duration_sec: float = 8.0
    min_duration_sec: float = 0.2
    host: str = "127.0.0.1"
    port: int = 8766
    cors_origins: list[str] = field(default_factory=list)


def load_settings(env_file: Path = ENV_FILE) -> Settings:
    admin_token = _env("AZSTT_ADMIN_TOKEN", env_file=env_file) or ""
    if len(admin_token) < MIN_TOKEN_LENGTH:
        raise ConfigError(
            f"Не задан AZSTT_ADMIN_TOKEN (минимум {MIN_TOKEN_LENGTH} символов) в {env_file}. "
            f"Скопируйте .env.example в .env и задайте случайную строку."
        )
    audio_dir = Path(_env("AZSTT_AUDIO_DIR", str(PROJECT_DIR / "data" / "audio"), env_file)).expanduser()
    database_url = _env("AZSTT_DATABASE_URL", f"sqlite:///{PROJECT_DIR / 'data' / 'azstt.db'}", env_file)
    cors = _env("AZSTT_CORS_ORIGINS", "", env_file) or ""
    return Settings(
        database_url=database_url,
        audio_dir=audio_dir,
        admin_token=admin_token,
        max_upload_mb=int(_env("AZSTT_MAX_UPLOAD_MB", "15", env_file)),
        max_duration_sec=float(_env("AZSTT_MAX_DURATION_SEC", "8.0", env_file)),
        min_duration_sec=float(_env("AZSTT_MIN_DURATION_SEC", "0.2", env_file)),
        host=_env("AZSTT_HOST", "127.0.0.1", env_file),
        port=int(_env("AZSTT_PORT", "8766", env_file)),
        cors_origins=[o.strip() for o in cors.split(",") if o.strip()],
    )

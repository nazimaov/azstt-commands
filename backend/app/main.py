"""FastAPI app factory for AzSTT Commands. Mirrors server/main.py's create_app() shape
(settings loaded once, app assembled in a factory so tests can inject their own tmp
Settings/engine) but for a separate, multi-user web service — see azstt-commands/README.md
for why this is not merged into the main SvenAlice server."""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import Settings, load_settings
from app.db import init_db, make_engine, make_session_factory
from app.routers import public
from app.routers.admin import build_admin_router
from app.seed import seed_initial_commands

log = logging.getLogger("azstt")
BACKEND_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = BACKEND_DIR.parent / "frontend" / "dist"


def create_app(settings: Settings, engine=None) -> FastAPI:
    engine = engine or make_engine(settings.database_url)
    session_factory = make_session_factory(engine)
    init_db(engine)
    with session_factory() as db:
        created = seed_initial_commands(db)
        if created:
            log.info("Начальный набор команд загружен: %d новых", created)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        log.info("AzSTT Commands backend готов: http://%s:%d", settings.host, settings.port)
        yield

    app = FastAPI(title="AzSTT Commands", lifespan=lifespan)
    app.state.settings = settings
    app.state.session_factory = session_factory

    if settings.cors_origins:
        app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                          allow_methods=["*"], allow_headers=["*"])

    app.include_router(public.router)
    app.include_router(build_admin_router(settings))

    @app.get("/api/health")
    def health():
        return {"ok": True}

    if FRONTEND_DIST.exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

        @app.get("/{full_path:path}")
        def spa(full_path: str):
            candidate = FRONTEND_DIST / full_path
            if full_path and candidate.is_file():
                return FileResponse(candidate)
            return FileResponse(FRONTEND_DIST / "index.html")

    return app


def main() -> None:
    import uvicorn

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    settings = load_settings()
    app = create_app(settings)
    uvicorn.run(app, host=settings.host, port=settings.port, log_config=None)


if __name__ == "__main__":
    main()

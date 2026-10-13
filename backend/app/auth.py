"""Admin auth: a single shared Bearer token, same pattern as server/main.py's require_token
in the main SvenAlice project — adequate for one maintainer moderating a pilot dataset,
not a multi-admin RBAC system (out of scope here)."""
import hmac

from fastapi import Depends, HTTPException, Request

from app.config import Settings


def require_admin(settings: Settings):
    def _check(request: Request) -> None:
        header = request.headers.get("authorization", "")
        token = header[7:] if header.lower().startswith("bearer ") else ""
        if not hmac.compare_digest(token.encode(), settings.admin_token.encode()):
            raise HTTPException(status_code=401, detail="Неверный или отсутствующий admin-токен")
    return Depends(_check)

# Запускает backend (FastAPI/uvicorn). Если frontend собран (frontend\dist), backend
# раздаёт его тоже — отдельный frontend-процесс для продакшн-режима не нужен.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\backend"
& ".\.venv\Scripts\python.exe" -m app.main

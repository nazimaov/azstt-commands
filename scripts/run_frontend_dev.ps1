# Dev-режим фронтенда (горячая перезагрузка), с проксированием /api на backend
# (см. frontend/vite.config.ts). Backend нужно запустить отдельно (run_backend.ps1).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\frontend"
npm run dev

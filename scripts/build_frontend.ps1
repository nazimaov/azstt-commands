# Продакшн-сборка фронтенда в frontend\dist — backend раздаёт её сам (app/main.py).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\frontend"
npm run build

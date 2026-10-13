# Установка AzSTT Commands: backend (venv + зависимости) и frontend (npm install).
# Запускать из корня azstt-commands: .\scripts\install.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "== Backend: создаю виртуальное окружение =="
Set-Location "$root\backend"
python -m venv .venv
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\python.exe" -m pip install -r requirements-dev.txt

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Warning "ffmpeg не найден в PATH. Конвертация записей работать не будет. Установите: winget install ffmpeg"
}

Write-Host "== Frontend: npm install =="
Set-Location "$root\frontend"
npm install

if (-not (Test-Path "$root\.env")) {
    Write-Host "== Создаю .env со случайным admin-токеном =="
    Copy-Item "$root\.env.example" "$root\.env"
    $token = -join ((48..57) + (97..102) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    (Get-Content "$root\.env") -replace "AZSTT_ADMIN_TOKEN=.*", "AZSTT_ADMIN_TOKEN=$token" | Set-Content "$root\.env"
    Write-Host "Admin-токен сохранён в $root\.env — он понадобится для входа в /admin"
}

Set-Location $root
Write-Host "Готово. Запуск: .\scripts\run_backend.ps1 и .\scripts\run_frontend_dev.ps1 (или build_frontend.ps1 для продакшн-сборки)."

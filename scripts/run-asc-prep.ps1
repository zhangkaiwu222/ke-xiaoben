# One-shot ASC prep — run from repo root: powershell -File scripts\run-asc-prep.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

Write-Host '=== Screenshot assets (local) ===' -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'make-ipad-screenshots.ps1')
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'make-iphone-duo-screenshots.ps1')
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'make-imessage-screenshots.ps1')

Write-Host '=== ASC API ===' -ForegroundColor Cyan
node (Join-Path $PSScriptRoot 'asc-screenshots-fix.mjs')
$env:ASC_REVIEW_PHONE = '+8618872533626'
node (Join-Path $PSScriptRoot 'asc-version-metadata.mjs')
node (Join-Path $PSScriptRoot 'asc-review-contact.mjs')
node (Join-Path $PSScriptRoot 'asc-version-bind.mjs')
node (Join-Path $PSScriptRoot 'asc-status.mjs')

Write-Host "`nDone. Refresh Edge version page and click 添加以供审核." -ForegroundColor Green
Write-Host "Optional: remove stuck iMessage uploads → node scripts/asc-screenshots-fix.mjs --delete"

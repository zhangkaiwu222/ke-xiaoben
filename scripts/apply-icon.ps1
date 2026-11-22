# Resize source image to 1024 PNG for Expo icon + splash
param(
  [string]$Source = (Join-Path $PSScriptRoot '..\assets\ke-xiaoben-icon-source.png')
)
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\assets'
$iconPath = Join-Path $outDir 'icon.png'
$splashPath = Join-Path $outDir 'splash-icon.png'

if (-not (Test-Path $Source)) { throw "Source not found: $Source" }

$img = [System.Drawing.Image]::FromFile((Resolve-Path $Source))
$size = 1024
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
# Full-bleed icon (source is square app artwork)
$g.DrawImage($img, 0, 0, $size, $size)
$g.Dispose()
$img.Dispose()

$bmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($splashPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Wrote $iconPath and $splashPath"

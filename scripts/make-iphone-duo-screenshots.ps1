# iPhone Duo App Store screenshots (portrait)
# Outer: 1398 x 2034 | Inner: 2007 x 2853
Add-Type -AssemblyName System.Drawing

$Bg = [System.Drawing.Color]::FromArgb(255, 15, 18, 22)
$baseOut = Join-Path $PSScriptRoot '..\store\iphone-duo-screenshots'
$outerDir = Join-Path $baseOut 'outer'
$innerDir = Join-Path $baseOut 'inner'
foreach ($d in @($outerDir, $innerDir)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

$assetDir = 'C:\Users\zhang\.cursor\projects\c-Users-zhang-Desktop-ke-xiaoben\assets'
if (-not (Test-Path $assetDir)) {
  $assetDir = Join-Path $PSScriptRoot '..\store\ipad-13-screenshots'
}
$sources = @(
  @{ In = Join-Path $assetDir 'ef398916-850e-4a9e-889a-5d2f601dd09b-4421d973-d8e9-4e2c-906a-7f07e1391958.png'; Base = '01-home' },
  @{ In = Join-Path $assetDir 'ef286d32-6775-490c-a993-9937dfe38d9c-1cd96dec-dce7-4941-af7d-f9553fcb1240.png'; Base = '02-students' },
  @{ In = Join-Path $assetDir '768e0c00-a6fe-4b21-914d-8325a312d77b-84146e0f-f2d6-449d-95f8-a9ea458b12bf.png'; Base = '03-pro' }
)

function Export-FitCanvas {
  param([string]$InPath, [string]$OutPath, [int]$W, [int]$H)
  $src = [System.Drawing.Image]::FromFile($InPath)
  try {
    $scale = [Math]::Min($W / $src.Width, $H / $src.Height)
    $nw = [int][Math]::Round($src.Width * $scale)
    $nh = [int][Math]::Round($src.Height * $scale)
    $x = ($W - $nw) / 2
    $y = ($H - $nh) / 2
    $canvas = New-Object System.Drawing.Bitmap $W, $H
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear($Bg)
    $g.DrawImage($src, $x, $y, $nw, $nh)
    $g.Dispose()
    $canvas.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    Write-Host "OK $OutPath (${W}x${H})"
  } finally {
    $src.Dispose()
  }
}

$targets = @(
  @{ Dir = $outerDir; W = 1398; H = 2034; Label = 'outer' },
  @{ Dir = $innerDir; W = 2007; H = 2853; Label = 'inner' }
)

foreach ($item in $sources) {
  if (-not (Test-Path -LiteralPath $item.In)) {
    Write-Error "Missing: $($item.In)"
    continue
  }
  foreach ($t in $targets) {
    $out = Join-Path $t.Dir "$($item.Base).png"
    Export-FitCanvas -InPath $item.In -OutPath $out -W $t.W -H $t.H
  }
}

Write-Host "Output: $((Resolve-Path $baseOut).Path)"

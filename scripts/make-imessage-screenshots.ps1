# iMessage App screenshots — use iPhone 6.7" portrait (1290 x 2796), common for Messages store.
Add-Type -AssemblyName System.Drawing

$W = 1290
$H = 2796
$Bg = [System.Drawing.Color]::FromArgb(255, 15, 18, 22)
$outDir = Join-Path $PSScriptRoot '..\store\imessage-screenshots'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$assetDir = 'C:\Users\zhang\.cursor\projects\c-Users-zhang-Desktop-ke-xiaoben\assets'
$sources = @(
  @{ In = Join-Path $assetDir 'ef398916-850e-4a9e-889a-5d2f601dd09b-4421d973-d8e9-4e2c-906a-7f07e1391958.png'; Out = '01-home.png' },
  @{ In = Join-Path $assetDir 'ef286d32-6775-490c-a993-9937dfe38d9c-1cd96dec-dce7-4941-af7d-f9553fcb1240.png'; Out = '02-students.png' },
  @{ In = Join-Path $assetDir '768e0c00-a6fe-4b21-914d-8325a312d77b-84146e0f-f2d6-449d-95f8-a9ea458b12bf.png'; Out = '03-pro.png' }
)

foreach ($item in $sources) {
  if (-not (Test-Path -LiteralPath $item.In)) { Write-Error "Missing $($item.In)"; continue }
  $outPath = Join-Path $outDir $item.Out
  $src = [System.Drawing.Image]::FromFile($item.In)
  try {
    $scale = [Math]::Min($W / $src.Width, $H / $src.Height)
    $nw = [int][Math]::Round($src.Width * $scale)
    $nh = [int][Math]::Round($src.Height * $scale)
    $x = ($W - $nw) / 2
    $y = ($H - $nh) / 2
    $canvas = New-Object System.Drawing.Bitmap $W, $H
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear($Bg)
    $g.DrawImage($src, $x, $y, $nw, $nh)
    $g.Dispose()
    $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    Write-Host "OK $outPath"
  } finally { $src.Dispose() }
}
Write-Host "Output: $((Resolve-Path $outDir).Path)"

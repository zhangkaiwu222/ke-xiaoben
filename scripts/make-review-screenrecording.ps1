# Build iPhone-style review video from store inner screenshots (fallback / supplement)
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$OutDir = Join-Path $Root 'store\review-recording'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$W = 886
$H = 1920
$Fps = 30
$Tmp = Join-Path $OutDir '_segments'
if (Test-Path $Tmp) { Remove-Item -Recurse -Force $Tmp }
New-Item -ItemType Directory -Force -Path $Tmp | Out-Null

$shots = @(
  @{ File = '01-home.png'; Sec = 22; Zoom = '1.08' },
  @{ File = '02-students.png'; Sec = 24; Zoom = '1.12' },
  @{ File = '01-home.png'; Sec = 18; Zoom = '1.05' },
  @{ File = '03-pro.png'; Sec = 28; Zoom = '1.10' },
  @{ File = '03-pro.png'; Sec = 20; Zoom = '1.15' }
)
$inner = Join-Path $Root 'store\iphone-duo-screenshots\inner'
$icon = Join-Path $Root 'assets\splash-icon.png'

function New-Segment([string]$InputPath, [int]$Sec, [string]$ZoomEnd, [string]$OutPath) {
  $frames = $Sec * $Fps
  $z = "min(zoom+0.0008,$ZoomEnd)"
  $vf = "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0f1216,zoompan=z='$z':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${Fps}"
  Invoke-Ffmpeg @('-y', '-loop', '1', '-i', $InputPath, '-vf', $vf, '-t', "$Sec", '-pix_fmt', 'yuv420p', $OutPath)
  if (-not (Test-Path $OutPath)) { throw "ffmpeg failed: $OutPath" }
  Write-Host "Segment $OutPath"
}

function Invoke-Ffmpeg([string[]]$FfmpegArgs) {
  $logOut = Join-Path $env:TEMP "ke-xiaoben-ffmpeg-out.log"
  $logErr = Join-Path $env:TEMP "ke-xiaoben-ffmpeg-err.log"
  $proc = Start-Process -FilePath ffmpeg -ArgumentList $FfmpegArgs -Wait -PassThru -NoNewWindow `
    -RedirectStandardOutput $logOut -RedirectStandardError $logErr
  if ($proc.ExitCode -ne 0) {
    $err = Get-Content $logErr -Raw -ErrorAction SilentlyContinue
    throw "ffmpeg exit $($proc.ExitCode): $err"
  }
}

# Launch splash (icon)
$launch = Join-Path $Tmp '00-launch.mp4'
$launchVf = "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0f1216"
Invoke-Ffmpeg @('-y', '-loop', '1', '-i', $icon, '-vf', $launchVf, '-t', '3', '-pix_fmt', 'yuv420p', $launch)

$idx = 1
foreach ($s in $shots) {
  $in = Join-Path $inner $s.File
  if (-not (Test-Path $in)) { throw "Missing $in" }
  New-Segment -InputPath $in -Sec $s.Sec -ZoomEnd $s.Zoom -OutPath (Join-Path $Tmp ("{0:D2}.mp4" -f $idx))
  $idx++
}

$list = Join-Path $Tmp 'concat.txt'
@(
  "file '$launch'"
  (1..($shots.Count) | ForEach-Object { "file '$(Join-Path $Tmp ("{0:D2}.mp4" -f $_))'" })
) -join "`n" | Set-Content -Encoding ascii $list

$raw = Join-Path $OutDir '_raw_concat.mp4'
Invoke-Ffmpeg @('-y', '-f', 'concat', '-safe', '0', '-i', $list, '-c', 'copy', $raw)

$mp4 = Join-Path $OutDir '课消本-AppReview-界面演示.mp4'
Invoke-Ffmpeg @('-y', '-i', $raw, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', $mp4)
$mov = Join-Path $OutDir '课消本-AppReview-界面演示.mov'
Invoke-Ffmpeg @('-y', '-i', $mp4, '-c', 'copy', $mov)

Remove-Item -Recurse -Force $Tmp
Remove-Item -Force $raw -ErrorAction SilentlyContinue
Write-Host "OK $mp4"
Write-Host "OK $mov"

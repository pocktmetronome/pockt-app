$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$outDir = Join-Path $root '.tmp-bar-qa'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$bgPath = Join-Path $root 'assets\skins\bar\background-v1.png'

function Contain($vw, $vh) {
  $scale = [Math]::Min($vw / 940.0, $vh / 1672.0)
  $w = 940.0 * $scale
  $h = 1672.0 * $scale
  [pscustomobject]@{ x = ($vw - $w) / 2.0; y = ($vh - $h) / 2.0; w = $w; h = $h }
}

$TEMPO = @{ x = 0.5; y = 0.904; visW = 0.36; visH = 0.066 }
$STRIP = @{ x = 0.5; y = 0.82; visW = 0.9; visH = 0.08 }

function TempoVis($vw, $vh) {
  $world = Contain $vw $vh
  $width = $TEMPO.visW * $world.w
  $height = $TEMPO.visH * $world.h
  $left = $world.x + $TEMPO.x * $world.w - $width / 2.0
  $top = $world.y + $TEMPO.y * $world.h - $height / 2.0
  [pscustomobject]@{ left = $left; top = $top; width = $width; height = $height }
}

function StripVis($vw, $vh) {
  $world = Contain $vw $vh
  $width = $STRIP.visW * $world.w
  $height = $STRIP.visH * $world.h
  $left = $world.x + $STRIP.x * $world.w - $width / 2.0
  $top = $world.y + $STRIP.y * $world.h - $height / 2.0
  [pscustomobject]@{ left = $left; top = $top; width = $width; height = $height }
}

function DrawScene($path, $vw, $vh, $levels, $bpm, $hits) {
  $bmp = New-Object System.Drawing.Bitmap ([int]$vw, [int]$vh)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(10, 7, 5))
  $world = Contain $vw $vh
  $bg = [System.Drawing.Image]::FromFile($bgPath)
  $g.DrawImage($bg, [single]$world.x, [single]$world.y, [single]$world.w, [single]$world.h)
  $bg.Dispose()

  $strip = StripVis $vw $vh
  $smoked = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 8, 5, 3))
  $g.FillRectangle($smoked, [single]$strip.left, [single]$strip.top, [single]$strip.width, [single]$strip.height)
  $smoked.Dispose()
  $edge = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(200, 176, 122, 58), 1.5)
  $g.DrawRectangle($edge, [single]$strip.left, [single]$strip.top, [single]$strip.width, [single]$strip.height)
  $edge.Dispose()

  $size = [Math]::Round([Math]::Min(34.0, [Math]::Max(28.0, 0.082 * $world.w)))
  $lane = $strip.width / 4.0
  $font = New-Object System.Drawing.Font 'Segoe UI', ([Math]::Max(11.0, $size * 0.38)), ([System.Drawing.FontStyle]::Bold)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  for ($i = 0; $i -lt 4; $i++) {
    $level = $levels[$i]
    $cx = $strip.left + $lane * $i + ($lane - $size) / 2.0
    $cy = $strip.top + ($strip.height - $size) / 2.0
    $well = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235, 12, 8, 5))
    $g.FillEllipse($well, [single]$cx, [single]$cy, [single]$size, [single]$size)
    $well.Dispose()
    if ($level -gt 0) {
      $fills = @(0.32, 0.58, 1.0)
      $fillH = $size * $fills[$level - 1]
      $fill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 214, 160, 78))
      if ($level -ge 3) {
        $g.FillEllipse($fill, [single]$cx, [single]$cy, [single]$size, [single]$size)
      } else {
        $g.SetClip((New-Object System.Drawing.RectangleF ([single]$cx, [single]($cy + $size - $fillH), [single]$size, [single]$fillH)))
        $g.FillEllipse($fill, [single]$cx, [single]$cy, [single]$size, [single]$size)
        $g.ResetClip()
      }
      $fill.Dispose()
    }
    $ring = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(235, 214, 168, 96), 2.0)
    $g.DrawEllipse($ring, [single]$cx, [single]$cy, [single]$size, [single]$size)
    $ring.Dispose()
    $num = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($(if ($level -le 0) { 160 } else { 245 }), 246, 226, 186))
    $g.DrawString("$($i + 1)", $font, $num, (New-Object System.Drawing.RectangleF ([single]$cx, [single]$cy, [single]$size, [single]$size)), $sf)
    $num.Dispose()
    if ($hits) {
      $hitL = $strip.left + $lane * $i
      $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 80, 200, 255), 1.2)
      $g.DrawRectangle($pen, [single]$hitL, [single]$strip.top, [single]$lane, [single]$strip.height)
      $pen.Dispose()
    }
  }
  $font.Dispose()

  $tempo = TempoVis $vw $vh
  $plaque = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(210, 48, 28, 16))
  $g.FillRectangle($plaque, [single]$tempo.left, [single]$tempo.top, [single]$tempo.width, [single]$tempo.height)
  $plaque.Dispose()
  $face = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 92, 58, 24))
  $g.FillRectangle($face, [single]$tempo.left, [single]$tempo.top, [single]$tempo.width, [single]$tempo.height)
  $face.Dispose()
  $fontSize = [Math]::Max(10.0, $tempo.height * 0.42)
  $bpmFont = New-Object System.Drawing.Font 'Segoe UI', $fontSize, ([System.Drawing.FontStyle]::Bold)
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 196, 138))
  $g.DrawString("$bpm", $bpmFont, $textBrush, (New-Object System.Drawing.RectangleF ([single]$tempo.left, [single]$tempo.top, [single]$tempo.width, [single]$tempo.height)), $sf)
  $bpmFont.Dispose()
  $textBrush.Dispose()

  if ($hits) {
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(200, 255, 180, 60), 1.4)
    $g.DrawRectangle($pen, [single]($tempo.left - 10), [single]$tempo.top, [single]($tempo.width + 20), [single]$tempo.height)
    $pen.Dispose()
  }

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

DrawScene (Join-Path $outDir 'qa-entry-stopped.png') 393 852 @(2,2,2,2) 120 $false
DrawScene (Join-Path $outDir 'qa-stopped-after-play.png') 393 852 @(2,2,2,2) 120 $false
DrawScene (Join-Path $outDir 'qa-states-0.png') 393 852 @(0,0,0,0) 120 $false
DrawScene (Join-Path $outDir 'qa-states-1.png') 393 852 @(1,1,1,1) 120 $false
DrawScene (Join-Path $outDir 'qa-states-2.png') 393 852 @(2,2,2,2) 120 $false
DrawScene (Join-Path $outDir 'qa-states-3.png') 393 852 @(3,3,3,3) 120 $false
DrawScene (Join-Path $outDir 'qa-states-mixed.png') 393 852 @(0,1,2,3) 120 $false
DrawScene (Join-Path $outDir 'qa-bpm-40.png') 393 852 @(2,2,2,2) 40 $false
DrawScene (Join-Path $outDir 'qa-bpm-120.png') 393 852 @(2,2,2,2) 120 $false
DrawScene (Join-Path $outDir 'qa-bpm-400.png') 393 852 @(2,2,2,2) 400 $false
DrawScene (Join-Path $outDir 'qa-hits.png') 393 852 @(0,1,2,3) 120 $true
Write-Host "QA renders written to $outDir"

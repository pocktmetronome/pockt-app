$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'assets\beatline\2.0\beatline_final_master.png'
$outDir = Join-Path $root 'scripts\beatline-preflight-shots'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$master = [System.Drawing.Image]::FromFile($src)
$W = $master.Width
$H = $master.Height

$slots = @{
  bpm        = @{ x = 0.335; y = 0.438; w = 0.33; h = 0.078 }
  tempo      = @{ x = 0.22;  y = 0.568; w = 0.56; h = 0.042 }
  meter      = @{ x = 0.118; y = 0.178; w = 0.155; h = 0.028 }
  subd       = @{ x = 0.07;  y = 0.214; w = 0.20; h = 0.028 }
  sound      = @{ x = 0.73;  y = 0.214; w = 0.20; h = 0.028 }
  rail       = @{ x = 0.208; y = 0.756; w = 0.572; h = 0.044 }
  volume     = @{ x = 0.29;  y = 0.868; w = 0.42; h = 0.028 }
  play       = @{ x = 0.77;  y = 0.808; w = 0.195; h = 0.112 }
  tap        = @{ x = 0.035; y = 0.808; w = 0.195; h = 0.112 }
  rhythm     = @{ x = 0.07;  y = 0.152; w = 0.145; h = 0.072 }
  soundBtn   = @{ x = 0.785; y = 0.152; w = 0.145; h = 0.072 }
  settings   = @{ x = 0.44;  y = 0.932; w = 0.12; h = 0.04 }
}

function New-Rect($slot) {
  return New-Object System.Drawing.RectangleF (
    [single]($slot.x * $W),
    [single]($slot.y * $H),
    [single]($slot.w * $W),
    [single]($slot.h * $H)
  )
}

function New-RectI($slot) {
  $r = New-Rect $slot
  return New-Object System.Drawing.Rectangle ([int]$r.X), ([int]$r.Y), ([int]$r.Width), ([int]$r.Height)
}

function Get-TempoName([int]$bpm) {
  if ($bpm -lt 40) { return 'GRAVE' }
  if ($bpm -lt 60) { return 'LARGO' }
  if ($bpm -lt 76) { return 'ADAGIO' }
  if ($bpm -lt 109) { return 'ANDANTE' }
  if ($bpm -lt 120) { return 'MODERATO' }
  if ($bpm -lt 138) { return 'ALLEGRETTO' }
  if ($bpm -lt 156) { return 'ALLEGRO' }
  if ($bpm -lt 176) { return 'VIVACE' }
  if ($bpm -lt 200) { return 'PRESTO' }
  return 'PRESTISSIMO'
}

function Draw-Cover($g, $slot, $color) {
  $g.FillRectangle((New-Object System.Drawing.SolidBrush $color), (New-RectI $slot))
}

function Draw-Label($g, $slot, $text, $size, $color) {
  $rect = New-Rect $slot
  $font = New-Object System.Drawing.Font 'Segoe UI', $size, ([System.Drawing.FontStyle]::Bold)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $recess = New-Object System.Drawing.RectangleF ($rect.X + 0.7), ($rect.Y + 0.9), $rect.Width, $rect.Height
  $ridge = New-Object System.Drawing.RectangleF ($rect.X - 0.5), ($rect.Y - 0.7), $rect.Width, $rect.Height
  $g.DrawString($text, $font, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(140, 12, 9, 7))), $recess, $fmt)
  $g.DrawString($text, $font, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(46, 214, 204, 186))), $ridge, $fmt)
  $g.DrawString($text, $font, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 122, 113, 100))), $rect, $fmt)
  $font.Dispose()
}

function Get-RailSeats([int]$count) {
  $a = 0.125; $b = 0.375; $c = 0.625; $d = 0.875
  if ($count -eq 2) { return @($a, $d) }
  if ($count -eq 3) { return @($a, (($b + $c) / 2), $d) }
  if ($count -eq 4) { return @($a, $b, $c, $d) }
  if ($count -eq 6) {
    $left = ($a + $b) / 2
    $right = ($c + $d) / 2
    $spread = ($b - $a) * 0.32
    return @(
      ($left - $spread), $left, ($left + $spread),
      ($right - $spread), $right, ($right + $spread)
    )
  }
  $spread = ($b - $a) * 0.22
  $out = @()
  foreach ($socket in @($a, $b, $c, $d)) {
    $out += ($socket - $spread), $socket, ($socket + $spread)
  }
  return $out
}

function Draw-Rail($g, $count, $groups, $active, $strengths) {
  $rect = New-RectI $slots.rail
  $seats = Get-RailSeats $count
  $cluster = $count -ge 6
  $bead = if ($count -ge 12) { 10 } elseif ($cluster) { 12 } else { [Math]::Max(14, [int]($rect.Height * 0.7)) }
  for ($i = 0; $i -lt $seats.Count; $i++) {
    $cx = $rect.X + [int]($rect.Width * $seats[$i])
    $cy = $rect.Y + [int]($rect.Height / 2)
    $s = if ($strengths -and $strengths.Count -gt $i) { $strengths[$i] } else { 2 }
    $fill = switch ($s) {
      0 { [System.Drawing.Color]::FromArgb(255, 42, 44, 40) }
      1 { [System.Drawing.Color]::FromArgb(160, 61, 255, 122) }
      2 { [System.Drawing.Color]::FromArgb(210, 61, 255, 122) }
      default { [System.Drawing.Color]::FromArgb(255, 61, 255, 122) }
    }
    $dot = [int]($bead * (0.28 + 0.22 * $s))
    if ($cluster) {
      $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 42, 44, 40))), ($cx - [int]($bead / 2)), ($cy - [int]($bead / 2)), $bead, $bead)
    }
    if ($s -gt 0) {
      $g.FillEllipse((New-Object System.Drawing.SolidBrush $fill), ($cx - [int]($dot / 2)), ($cy - [int]($dot / 2)), $dot, $dot)
    }
    if ($i -eq $active) {
      $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 61, 255, 122)), 2
      $g.DrawEllipse($pen, ($cx - [int]($bead / 2) - 3), ($cy - [int]($bead / 2) - 3), ($bead + 6), ($bead + 6))
      $pen.Dispose()
    }
  }
}

function Draw-Volume($g, $amount) {
  $rect = New-RectI $slots.volume
  $thumb = 22
  $travel = $rect.Width - 24 - $thumb
  $tx = $rect.X + 12 + [int]($travel * $amount)
  $ty = $rect.Y + [int](($rect.Height - $thumb) / 2)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 124, 120, 114))), $tx, $ty, $thumb, $thumb)
}

function Draw-Press($g, $slot) {
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 8, 6, 4))), (New-RectI $slot))
}

function Save-State($name, $bpm, $meter, $subd, $sound, $count, $groups, $active, $strengths, $vol, $playing, $press) {
  $bmp = New-Object System.Drawing.Bitmap $W, $H
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.DrawImage($master, 0, 0, $W, $H)
  $bpmFont = New-Object System.Drawing.Font 'Segoe UI', 36, ([System.Drawing.FontStyle]::Regular)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString("$bpm", $bpmFont, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 240, 215, 138))), (New-Rect $slots.bpm), $fmt)
  $bpmFont.Dispose()
  Draw-Label $g $slots.tempo (Get-TempoName $bpm) 11 ([System.Drawing.Color]::FromArgb(255, 216, 203, 184))
  Draw-Label $g $slots.meter $meter 9 ([System.Drawing.Color]::FromArgb(255, 196, 183, 164))
  Draw-Label $g $slots.subd $subd 9 ([System.Drawing.Color]::FromArgb(255, 196, 183, 164))
  Draw-Label $g $slots.sound $sound 9 ([System.Drawing.Color]::FromArgb(255, 196, 183, 164))
  Draw-Rail $g $count $groups $active $strengths
  Draw-Volume $g $vol
  $play = New-RectI $slots.play
  $cx = $play.X + [int]($play.Width / 2)
  $cy = $play.Y + [int]($play.Height / 2)
  $ink = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 230, 212, 168))
  if ($playing) {
    $g.FillRectangle($ink, ($cx - 8), ($cy - 11), 5, 22)
    $g.FillRectangle($ink, ($cx + 3), ($cy - 11), 5, 22)
  } else {
    $pts = @(
      (New-Object System.Drawing.Point ($cx - 6), ($cy - 10)),
      (New-Object System.Drawing.Point ($cx - 6), ($cy + 10)),
      (New-Object System.Drawing.Point ($cx + 10), $cy)
    )
    $g.FillPolygon($ink, $pts)
  }
  $ink.Dispose()
  if ($press) { Draw-Press $g $slots[$press] }
  $dest = Join-Path $outDir "$name.png"
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Output $dest
}

Save-State '01_idle_120_44' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(3,2,2,2) 0.8 $false $null
Save-State '02_playing_beat1' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 0 @(3,2,2,2) 0.8 $true $null
Save-State '03_strength_0' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(0,2,2,2) 0.8 $false $null
Save-State '04_strength_1' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(1,2,2,2) 0.8 $false $null
Save-State '05_strength_2' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(2,2,2,2) 0.8 $false $null
Save-State '06_strength_3' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(3,2,2,2) 0.8 $false $null
Save-State '07_low_bpm' 20 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(3,2,2,2) 0.8 $false $null
Save-State '08_high_bpm' 400 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(3,2,2,2) 0.8 $false $null
Save-State '09_6_8' 120 '6 / 8' 'Eighths' 'ACOUSTIC' 6 2 -1 @(3,2,2,3,2,2) 0.8 $false $null
Save-State '10_12_8' 120 '12 / 8' 'Eighths' 'ACOUSTIC' 12 4 -1 @(3,2,2,3,2,2,3,2,2,3,2,2) 0.8 $false $null
Save-State '18_2_4' 120 '2 / 4' 'Quarter' 'ACOUSTIC' 2 1 -1 @(3,2) 0.8 $false $null
Save-State '19_3_4' 120 '3 / 4' 'Quarter' 'ACOUSTIC' 3 1 -1 @(3,2,2) 0.8 $false $null
Save-State '11_volume_0' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(3,2,2,2) 0.0 $false $null
Save-State '12_volume_100' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(3,2,2,2) 1.0 $false $null
Save-State '13_pressed_play' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(3,2,2,2) 0.8 $false 'play'
Save-State '14_pressed_tap' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(3,2,2,2) 0.8 $false 'tap'
Save-State '15_pressed_rhythm' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(3,2,2,2) 0.8 $false 'rhythm'
Save-State '16_pressed_sound' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(3,2,2,2) 0.8 $false 'soundBtn'
Save-State '17_pressed_settings' 120 '4 / 4' 'Quarter' 'ACOUSTIC' 4 1 -1 @(3,2,2,2) 0.8 $false 'settings'

$master.Dispose()
Write-Output "WROTE $($outDir)"

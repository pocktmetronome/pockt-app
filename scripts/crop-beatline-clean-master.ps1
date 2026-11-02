$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'POCKT_2_0_REFERENCE\BEATLINE_2_0\BEATLINE_2_0_CLEAN_MASTER.png'
$dest = Join-Path $root 'assets\beatline\2.0\beatline_final_master.png'

$full = [System.Drawing.Bitmap]::FromFile($src)
Write-Output "source $($full.Width) x $($full.Height)"

# Same phone-screen crop used for the previous 1024 master.
$crop = New-Object System.Drawing.Rectangle 236, 44, 552, 868
if ($crop.Right -gt $full.Width -or $crop.Bottom -gt $full.Height) {
  throw "crop $crop exceeds $($full.Width)x$($full.Height)"
}

$bmp = New-Object System.Drawing.Bitmap $crop.Width, $crop.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($full, (New-Object System.Drawing.Rectangle 0, 0, $crop.Width, $crop.Height), $crop, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$full.Dispose()

$tmp = Join-Path $env:TEMP 'beatline_clean_crop.png'
$bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Copy-Item -Force $tmp $dest
Remove-Item $tmp
Write-Output "WROTE $dest $($crop.Width) x $($crop.Height)"

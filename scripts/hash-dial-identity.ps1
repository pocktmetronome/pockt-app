$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..
$files = @(
  'lib/pockt-dial-scale.ts',
  'components/classic/DialRoom.tsx',
  'modules/pockt-dial/android/build.gradle',
  'modules/pockt-dial/android/src/main/AndroidManifest.xml',
  'modules/pockt-dial/android/src/main/java/expo/modules/pocktdial/PocktDialModule.kt',
  'modules/pockt-dial/android/src/main/java/expo/modules/pocktdial/PocktDialView.kt',
  'modules/pockt-dial/expo-module.config.json',
  'modules/pockt-dial/index.ts',
  'modules/pockt-dial/ios/PocktDial.podspec',
  'modules/pockt-dial/ios/PocktDialFace.swift',
  'modules/pockt-dial/ios/PocktDialModule.swift',
  'modules/pockt-dial/ios/PocktDialShader.metal',
  'modules/pockt-dial/ios/PocktDialTuning.swift',
  'modules/pockt-dial/ios/PocktDialView.swift',
  'modules/pockt-dial/ios/Resources/env_rgbm.png',
  'modules/pockt-dial/ios/Resources/knob_albedo.png',
  'modules/pockt-dial/ios/Resources/knob_aniso.png',
  'modules/pockt-dial/ios/Resources/knob_ao.png',
  'modules/pockt-dial/ios/Resources/knob_normal.png',
  'modules/pockt-dial/ios/Resources/knob_rough.png',
  'modules/pockt-dial/ios/Resources/static_beauty.png',
  'modules/pockt-dial/ios/Resources/static_normal.png',
  'modules/pockt-dial/package.json',
  'modules/pockt-dial/src/PocktDialView.tsx',
  'modules/pockt-dial/src/PocktDialView.web.tsx',
  'modules/pockt-dial/src/types.ts'
)
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('# POCKT 3 Phase 2 — SHA-256 of git blobs at pockt3-baseline-A (identical on HEAD)')
foreach ($f in $files) {
  $tmp = Join-Path $env:TEMP ('p3-' + [guid]::NewGuid().ToString('N'))
  & git show ('pockt3-baseline-A:' + $f) | Out-Null
  $blobA = (& git rev-parse ('pockt3-baseline-A:' + $f)).Trim()
  $blobH = (& git rev-parse ('HEAD:' + $f)).Trim()
  if ($blobA -ne $blobH) { throw "BLOB MISMATCH $f" }
  cmd /c "git cat-file -p $blobA > `"$tmp`""
  $hash = (Get-FileHash -Algorithm SHA256 -Path $tmp).Hash.ToLower()
  Remove-Item $tmp
  $lines.Add("$hash  $f  gitblob=$blobA")
  Write-Output "$hash  $f"
}
$dest = 'assets-src/pockt-3-docs/DIAL_IDENTITY_HASHES.txt'
$lines | Set-Content -Encoding ascii $dest
Write-Output "WROTE $($files.Count) hashes to $dest"

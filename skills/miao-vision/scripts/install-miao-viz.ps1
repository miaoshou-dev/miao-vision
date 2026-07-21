$ErrorActionPreference = "Stop"

$SkillDir = Split-Path -Parent $PSScriptRoot
$Repository = if ($env:MIAO_VISION_RELEASE_REPOSITORY) { $env:MIAO_VISION_RELEASE_REPOSITORY } else { "miaoshou-dev/miao-vision" }

if ($env:PROCESSOR_ARCHITECTURE -notmatch 'AMD64') {
  throw "Unsupported Windows architecture: $env:PROCESSOR_ARCHITECTURE"
}

$Asset = "miao-viz-windows-x64.exe"
$BaseUrl = "https://github.com/$Repository/releases/latest/download"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("miao-viz-install-" + [guid]::NewGuid())

try {
  New-Item -ItemType Directory -Path $TempDir | Out-Null
  $Download = Join-Path $TempDir $Asset
  $Checksums = Join-Path $TempDir "checksums.txt"
  Invoke-WebRequest "$BaseUrl/$Asset" -OutFile $Download
  Invoke-WebRequest "$BaseUrl/miao-viz-checksums.txt" -OutFile $Checksums

  $ChecksumLine = Get-Content $Checksums | Where-Object { $_ -match "^[0-9a-fA-F]{64}\s+$([regex]::Escape($Asset))$" } | Select-Object -First 1
  if (-not $ChecksumLine) { throw "No checksum found for $Asset" }
  $Expected = ($ChecksumLine -split '\s+')[0].ToLowerInvariant()
  $Actual = (Get-FileHash -Algorithm SHA256 $Download).Hash.ToLowerInvariant()
  if ($Expected -ne $Actual) { throw "Checksum verification failed for $Asset" }

  $BinDir = Join-Path $SkillDir "bin"
  New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
  $Destination = Join-Path $BinDir "miao-viz.exe"
  Move-Item -Force $Download $Destination
  & $Destination --version
} finally {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $TempDir
}

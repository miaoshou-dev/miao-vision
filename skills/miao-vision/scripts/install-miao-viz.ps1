$ErrorActionPreference = "Stop"

$SkillDir = Split-Path -Parent $PSScriptRoot
$Repository = if ($env:MIAO_VISION_RELEASE_REPOSITORY) { $env:MIAO_VISION_RELEASE_REPOSITORY } else { "miaoshou-dev/miao-vision" }
$Compatibility = Get-Content (Join-Path $SkillDir "cli-compatibility.json") -Raw | ConvertFrom-Json
$MiaoHome = if ($env:MIAO_VISION_HOME) { $env:MIAO_VISION_HOME } else { Join-Path $HOME ".miao-vision" }

if ($env:PROCESSOR_ARCHITECTURE -notmatch 'AMD64') {
  throw "Unsupported Windows architecture: $env:PROCESSOR_ARCHITECTURE"
}

$Asset = "miao-viz-windows-x64.exe"
$BaseUrl = "https://github.com/$Repository/releases/download/$($Compatibility.releaseTag)"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("miao-viz-install-" + [guid]::NewGuid())
$Staged = $null

try {
  $BinDir = Join-Path $MiaoHome "bin"
  $Destination = Join-Path $BinDir "miao-viz.exe"
  if (Test-Path $Destination) {
    $Existing = & node (Join-Path $PSScriptRoot "check-miao-viz.mjs") --candidate $Destination --require-recommended --print-path 2>$null
  }
  if ($LASTEXITCODE -eq 0 -and $Existing) {
    Write-Output "Using recommended miao-viz $($Compatibility.recommendedCliVersion) at $Destination"
    exit 0
  }

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

  New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
  $Staged = Join-Path $BinDir (".miao-viz-" + [guid]::NewGuid() + ".exe")
  Copy-Item $Download $Staged
  & node (Join-Path $PSScriptRoot "check-miao-viz.mjs") --candidate $Staged --require-recommended --print-path | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Downloaded CLI failed version or capability verification; existing CLI was preserved." }
  Move-Item -Force $Staged $Destination
  $Staged = $null
  Write-Output "Installed miao-viz at $Destination"
  & $Destination --version
} finally {
  if ($Staged) { Remove-Item -Force -ErrorAction SilentlyContinue $Staged }
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $TempDir
}

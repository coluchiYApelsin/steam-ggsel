param([string]$SteamPath = 'C:\Program Files (x86)\Steam')
$ErrorActionPreference = 'Stop'
$artifact = Join-Path $PSScriptRoot 'dist\steam-ggsel.star'
if (!(Test-Path -LiteralPath $artifact -PathType Leaf)) { throw 'Build dist/steam-ggsel.star first using BUILD.cmd.' }
$plugins = Join-Path $SteamPath 'millennium\plugins'
if (!(Test-Path -LiteralPath $plugins -PathType Container)) { throw 'Millennium plugins directory not found.' }
$destination = Join-Path $plugins 'steam-ggsel.star'
if (Test-Path -LiteralPath $destination) {
    $backup = Join-Path $PSScriptRoot ('diagnostics\installed-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.star')
    New-Item -ItemType Directory -Force (Split-Path $backup) | Out-Null
    Copy-Item -LiteralPath $destination -Destination $backup
}
Copy-Item -LiteralPath $artifact -Destination $destination
Write-Output "Installed: $destination"
Write-Output 'Enable Steam GGSEL Prices in Millennium. Reload the store page after updating.'

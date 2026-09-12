$ErrorActionPreference = 'Stop'

$requiredNode = '22.22.2'
$corepackCache = 'D:\app\nvm\corepack-cache'

if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
    throw 'NVM for Windows was not found.'
}

nvm use $requiredNode
if ($LASTEXITCODE -ne 0) {
    throw "Could not switch Node. Run: nvm install $requiredNode"
}

$runningApp = Get-Process -Name 'absurd-invention-lab' -ErrorAction SilentlyContinue
if ($runningApp) {
    throw 'The app is already running. Exit it normally, then run this script again.'
}

$env:COREPACK_HOME = $corepackCache
# Keep the debug executable portable when the Windows VC runtime is incomplete.
$env:RUSTFLAGS = '-C target-feature=+crt-static'
Write-Host 'Starting desktop dev mode. Changes reload automatically; press Ctrl+C to stop.'
corepack pnpm run desktop

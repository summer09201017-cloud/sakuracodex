param(
  [string]$SiteName,
  [string]$TeamSlug
)

$ErrorActionPreference = "Stop"

if (-not $env:NETLIFY_AUTH_TOKEN) {
  throw "Missing NETLIFY_AUTH_TOKEN environment variable."
}

$workspace = Split-Path -Parent $PSScriptRoot
$npx = "C:\Program Files\nodejs\npx.cmd"

if (-not (Test-Path $npx)) {
  throw "npx was not found at $npx"
}

$arguments = @(
  "netlify-cli@24.8.1",
  "deploy",
  "--prod",
  "--no-build",
  "--dir",
  $workspace,
  "--auth",
  $env:NETLIFY_AUTH_TOKEN,
  "--json"
)

if ($SiteName) {
  $arguments += @("--create-site", $SiteName)
}

if ($TeamSlug) {
  $arguments += @("--team", $TeamSlug)
}

& $npx @arguments

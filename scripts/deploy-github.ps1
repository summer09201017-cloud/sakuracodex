param(
  [string]$RepoName = "sakura-tail",
  [string]$Owner,
  [string]$Branch = "main",
  [string]$CommitMessage = "Deploy sakura tail app"
)

$ErrorActionPreference = "Stop"

if (-not $env:GITHUB_TOKEN) {
  throw "Missing GITHUB_TOKEN environment variable."
}

$workspace = Split-Path -Parent $PSScriptRoot
$token = $env:GITHUB_TOKEN
$headers = @{
  Accept                 = "application/vnd.github+json"
  Authorization          = "Bearer $token"
  "X-GitHub-Api-Version" = "2022-11-28"
  "User-Agent"           = "codex-deployer"
}

function Invoke-GitHubJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [object]$Body
  )

  if ($null -ne $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body ($Body | ConvertTo-Json -Depth 8) -ContentType "application/json; charset=utf-8"
  }

  return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
}

function Get-RemoteFileSha {
  param(
    [string]$RepoOwner,
    [string]$Repo,
    [string]$Path,
    [string]$Ref
  )

  $encodedPath = [Uri]::EscapeDataString($Path).Replace("%2F", "/")
  $uri = "https://api.github.com/repos/$RepoOwner/$Repo/contents/$encodedPath?ref=$Ref"

  try {
    $response = Invoke-GitHubJson -Method GET -Uri $uri
    return $response.sha
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 404) {
      return $null
    }

    throw
  }
}

function Ensure-Repository {
  param(
    [string]$RepoOwner,
    [string]$Repo
  )

  $checkUri = "https://api.github.com/repos/$RepoOwner/$Repo"

  try {
    Invoke-GitHubJson -Method GET -Uri $checkUri | Out-Null
    return
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -ne 404) {
      throw
    }
  }

  $createBody = @{
    name        = $Repo
    description = "Sakura tail interactive PWA"
    homepage    = ""
    private     = $false
    auto_init   = $false
  }

  Invoke-GitHubJson -Method POST -Uri "https://api.github.com/user/repos" -Body $createBody | Out-Null
}

if (-not $Owner) {
  $me = Invoke-GitHubJson -Method GET -Uri "https://api.github.com/user"
  $Owner = $me.login
}

Ensure-Repository -RepoOwner $Owner -Repo $RepoName

$files = Get-ChildItem -Path $workspace -File -Recurse | Where-Object {
  $relative = $_.FullName.Substring($workspace.Length + 1).Replace("\", "/")
  $relative -notmatch "^\.netlify/" -and
  $relative -notmatch "^node_modules/" -and
  $relative -notmatch "^\.git/" -and
  $relative -notmatch "^Thumbs\.db$" -and
  $relative -notmatch "^Desktop\.ini$"
}

foreach ($file in $files) {
  $relativePath = $file.FullName.Substring($workspace.Length + 1).Replace("\", "/")
  $sha = Get-RemoteFileSha -RepoOwner $Owner -Repo $RepoName -Path $relativePath -Ref $Branch
  $contentBytes = [System.IO.File]::ReadAllBytes($file.FullName)
  $contentBase64 = [Convert]::ToBase64String($contentBytes)

  $body = @{
    message = "$CommitMessage ($relativePath)"
    content = $contentBase64
    branch  = $Branch
  }

  if ($sha) {
    $body.sha = $sha
  }

  $encodedPath = [Uri]::EscapeDataString($relativePath).Replace("%2F", "/")
  $uri = "https://api.github.com/repos/$Owner/$RepoName/contents/$encodedPath"
  Invoke-GitHubJson -Method PUT -Uri $uri -Body $body | Out-Null
  Write-Host "Uploaded $relativePath"
}

Write-Host "GitHub push complete: https://github.com/$Owner/$RepoName"

# Black-box tests for guard.ps1. Synthetic files only. Never executes git push.
$ErrorActionPreference = 'Continue'
$script:Pass = 0
$script:Fail = 0
$script:Gaps = New-Object System.Collections.Generic.List[string]
$script:Roots = New-Object System.Collections.Generic.List[string]
$script:Template = (-join ([char]0x5B78,[char]0x751F,[char]0x540D,[char]0x55AE,[char]0x7BC4,[char]0x672C)) + '.csv'
$Guard = Join-Path $PSScriptRoot 'guard.ps1'
$Runner = Join-Path $env:TEMP 'hook-guard-runner.ps1'

@'
param(
  [Parameter(Mandatory = $true)][string]$Guard,
  [Parameter(Mandatory = $true)][string]$JsonPath
)
$json = [System.IO.File]::ReadAllText($JsonPath)
$json | & $Guard
'@ | Set-Content -LiteralPath $Runner -Encoding ASCII

function Remove-Tree {
  param([string]$Path)
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return }
  Get-ChildItem -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object { $_.Attributes = 'Normal' }
  Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue
}

function New-Repo {
  param([string]$Branch)
  $repo = Join-Path $env:TEMP ('hookguard-' + [guid]::NewGuid().ToString('n'))
  New-Item -ItemType Directory -Path $repo | Out-Null
  [void]$script:Roots.Add($repo)
  & git -c color.ui=false init -b $Branch $repo 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    & git -c color.ui=false init $repo 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'git init failed' }
    & git -c color.ui=false -C $repo checkout -B $Branch 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'git branch failed' }
  }
  & git -c color.ui=false -C $repo config user.email 'hook-test@example.com'
  & git -c color.ui=false -C $repo config user.name 'hook-test'
  return $repo
}

function Write-RepoFile {
  param([string]$Repo, [string]$Name, [string]$Content)
  $path = Join-Path $Repo ($Name -replace '/', '\')
  $parent = Split-Path -Parent $path
  if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($path, $Content, $utf8)
}

function Commit-File {
  param([string]$Repo, [string]$Name, [string]$Content)
  Write-RepoFile $Repo $Name $Content
  & git -c color.ui=false -C $Repo add -- $Name
  if ($LASTEXITCODE -ne 0) { throw 'setup add failed' }
  & git -c color.ui=false -C $Repo commit -m 'setup' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'setup commit failed' }
}

function Set-Upstream {
  param([string]$Repo, [string]$UpstreamBranch)
  $bare = Join-Path $env:TEMP ('hookbare-' + [guid]::NewGuid().ToString('n'))
  [void]$script:Roots.Add($bare)
  & git -c color.ui=false init --bare $bare | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'bare init failed' }
  $fetchOut = & git -c color.ui=false -C $bare fetch $Repo ('HEAD:refs/heads/' + $UpstreamBranch) 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw ('local fetch failed ' + $fetchOut) }
  & git -c color.ui=false -C $Repo remote add origin $bare
  if ($LASTEXITCODE -ne 0) { throw 'remote add failed' }
  & git -c color.ui=false -C $Repo fetch origin 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'fetch failed' }
  & git -c color.ui=false -C $Repo branch -u ("origin/" + $UpstreamBranch) | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'upstream failed' }
}

function New-Shell {
  param([string]$Command, [string]$Cwd)
  return @{ hook_event_name = 'beforeShellExecution'; command = $Command; cwd = $Cwd; sandbox = $false }
}

function Invoke-GuardRaw {
  param($Payload, [string]$Mode)
  $json = $Payload | ConvertTo-Json -Compress -Depth 8
  $jsonFile = [System.IO.Path]::GetTempFileName()
  $outFile = [System.IO.Path]::GetTempFileName()
  $errFile = [System.IO.Path]::GetTempFileName()
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($jsonFile, $json, $utf8)
  if ($Mode -eq 'file') {
    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Guard)
    $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Wait -PassThru -NoNewWindow -RedirectStandardInput $jsonFile -RedirectStandardOutput $outFile -RedirectStandardError $errFile
  } else {
    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Runner, '-Guard', $Guard, '-JsonPath', $jsonFile)
    $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Wait -PassThru -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError $errFile
  }
  $text = [System.IO.File]::ReadAllText($outFile)
  $err = [System.IO.File]::ReadAllText($errFile)
  Remove-Item -LiteralPath $jsonFile, $outFile, $errFile -Force -ErrorAction SilentlyContinue
  $line = @($text -split '\r?\n' | Where-Object { $_ -match '^\{' } | Select-Object -Last 1)
  if (-not $line) {
    return @{ permission = 'NO-OUTPUT'; user_message = ($err + $text) }
  }
  return ($line | ConvertFrom-Json)
}

function Assert-Perm {
  param([string]$Label, $Payload, [string]$Expected, [string]$Mode = 'pipe', [switch]$Gap)
  $obj = Invoke-GuardRaw $Payload $Mode
  $actual = [string]$obj.permission
  if ($actual -eq $Expected) {
    $script:Pass++
    if ($Gap) { [void]$script:Gaps.Add($Label) }
    Write-Output ("PASS " + $Label)
  } else {
    $script:Fail++
    $detail = ''
    if ($obj.user_message) { $detail = ' msg=' + [string]$obj.user_message }
    Write-Output ("FAIL " + $Label + " expected " + $Expected + " got " + $actual + $detail)
  }
}

try {
  $feature = New-Repo 'feature'
  Commit-File $feature 'ok.txt' 'ok'
  Set-Upstream $feature 'feature'
  $master = New-Repo 'master'
  Commit-File $master 'ok.txt' 'ok'
  $dirty = New-Repo 'feature'
  Commit-File $dirty 'ok.txt' 'ok'
  Write-RepoFile $dirty 'students.csv' "synthetic,row`n"
  Write-RepoFile $dirty '.env' "FAKE=1`n"
  Write-RepoFile $dirty 'notes.txt' "password synthetic`n"
  Write-RepoFile $dirty ('docs/' + $script:Template) "sample`n"
  Write-RepoFile $dirty ('docs/not-' + $script:Template) "sample`n"
  $tracked = New-Repo 'feature'
  Commit-File $tracked 'students.csv' "synthetic,row`n"
  Commit-File $tracked 'ok.txt' 'ok'
  Write-RepoFile $tracked 'students.csv' "synthetic,row`nmore`n"
  Write-RepoFile $tracked 'ok-only.txt' 'later'
  $cleanEdit = New-Repo 'feature'
  Commit-File $cleanEdit 'ok.txt' 'ok'
  Write-RepoFile $cleanEdit 'ok.txt' 'changed'
  $ignored = New-Repo 'feature'
  Commit-File $ignored 'ok.txt' 'ok'
  Write-RepoFile $ignored '.gitignore' ".env`n"
  Write-RepoFile $ignored '.env' "FAKE=1`n"
  $tracksMaster = New-Repo 'feature'
  Commit-File $tracksMaster 'ok.txt' 'ok'
  Set-Upstream $tracksMaster 'master'
  $empty = Join-Path $env:TEMP ('hookempty-' + [guid]::NewGuid().ToString('n'))
  New-Item -ItemType Directory -Path $empty | Out-Null
  [void]$script:Roots.Add($empty)
  $before = (& git -c color.ui=false -C $dirty status --porcelain | Out-String)

  Assert-Perm 'allow status' (New-Shell 'git status' $feature) 'allow'
  Assert-Perm 'allow diff' (New-Shell 'git diff' $feature) 'allow'
  Assert-Perm 'allow commit message mentions node' (New-Shell 'git commit -m "do not run node here"' $feature) 'allow'
  Assert-Perm 'allow explicit safe file while csv exists' (New-Shell 'git add ok.txt' $dirty) 'allow'
  Assert-Perm 'allow roster template by exact name' (New-Shell ('git add docs/' + $script:Template) $dirty) 'allow'
  Assert-Perm 'allow push feature' (New-Shell 'git push -u origin feature' $feature) 'allow'
  Assert-Perm 'allow compound status and feature push' (New-Shell 'git status && git push -u origin feature' $feature) 'allow'
  Assert-Perm 'allow quoted commit message that mentions master' (New-Shell 'git commit -m "do not push origin master"' $feature) 'allow'
  Assert-Perm 'allow echo text that mentions a push' (New-Shell 'echo git push origin master' $feature) 'allow'
  Assert-Perm 'allow default push when upstream is feature' (New-Shell 'git push' $feature) 'allow'
  Assert-Perm 'allow add dot when only safe files exist' (New-Shell 'git add .' $cleanEdit) 'allow'
  Assert-Perm 'allow commit -a when only safe file changed' (New-Shell 'git commit -a -m "edit"' $cleanEdit) 'allow'
  Assert-Perm 'allow empty command' (New-Shell '' $feature) 'allow'
  Assert-Perm 'stdin file mode allow status' (New-Shell 'git status' $feature) 'allow' 'file'

  Assert-Perm 'deny push origin master' (New-Shell 'git push origin master' $feature) 'deny'
  Assert-Perm 'deny push origin main' (New-Shell 'git push origin main' $feature) 'deny'
  Assert-Perm 'deny push quoted master' (New-Shell "git push origin 'master'" $feature) 'deny'
  Assert-Perm 'deny HEAD:master' (New-Shell 'git push origin HEAD:master' $feature) 'deny'
  Assert-Perm 'deny quoted HEAD:master' (New-Shell 'git push origin "HEAD:master"' $feature) 'deny'
  Assert-Perm 'deny plus refspec to main' (New-Shell 'git push origin +feature:refs/heads/main' $feature) 'deny'
  Assert-Perm 'deny force master' (New-Shell 'git push --force origin master' $feature) 'deny'
  Assert-Perm 'deny short force master' (New-Shell 'git push -f origin master' $feature) 'deny'
  Assert-Perm 'deny force-with-lease master' (New-Shell 'git push --force-with-lease origin master' $feature) 'deny'
  Assert-Perm 'deny lease ref master while dest is feature' (New-Shell 'git push --force-with-lease=refs/heads/master origin feature' $feature) 'deny'
  Assert-Perm 'deny push --all' (New-Shell 'git push --all origin' $feature) 'deny'
  Assert-Perm 'deny push --mirror' (New-Shell 'git push --mirror' $feature) 'deny'
  Assert-Perm 'deny delete master' (New-Shell 'git push --delete origin master' $feature) 'deny'
  Assert-Perm 'deny empty source delete master' (New-Shell 'git push origin :master' $feature) 'deny'
  Assert-Perm 'deny bare push when HEAD is master' (New-Shell 'git push' $master) 'deny'
  Assert-Perm 'deny bare push when feature tracks master' (New-Shell 'git push' $tracksMaster) 'deny'
  Assert-Perm 'deny push origin when feature tracks master' (New-Shell 'git push origin' $tracksMaster) 'deny'
  Assert-Perm 'deny compound push master' (New-Shell 'git status && git push origin master' $feature) 'deny'
  Assert-Perm 'deny pipe into push master' (New-Shell 'git status | git push origin master' $feature) 'deny'
  Assert-Perm 'deny newline compound push master' (New-Shell "git status`ngit push origin master" $feature) 'deny'
  Assert-Perm 'deny cmd quoted push' (New-Shell 'cmd /c "git push origin master"' $feature) 'deny'
  Assert-Perm 'deny cmd unquoted push' (New-Shell 'cmd /c git push origin master' $feature) 'deny'
  Assert-Perm 'deny powershell -Command push' (New-Shell 'powershell -NoProfile -Command "git push origin master"' $feature) 'deny'
  $encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes('git push origin master'))
  Assert-Perm 'deny encoded push' (New-Shell ('powershell -EncodedCommand ' + $encoded) $feature) 'deny'
  Assert-Perm 'deny git -C push master' (New-Shell ('git -C "' + $master + '" push origin master') $feature) 'deny'
  Assert-Perm 'deny git -c then push master' (New-Shell 'git -c advice.pushUpdateRejected=false push origin master' $feature) 'deny'
  Assert-Perm 'deny master main as two refspecs' (New-Shell 'git push master main' $feature) 'deny'

  Assert-Perm 'deny named csv' (New-Shell 'git add students.csv' $dirty) 'deny'
  Assert-Perm 'deny named env' (New-Shell 'git add .env' $dirty) 'deny'
  Assert-Perm 'deny env.local name' (New-Shell 'git add .env.local' $dirty) 'deny'
  Assert-Perm 'deny credentials name' (New-Shell 'git add credentials.json' $dirty) 'deny'
  Assert-Perm 'deny xlsx name' (New-Shell 'git add grades.xlsx' $dirty) 'deny'
  Assert-Perm 'deny lookalike roster name' (New-Shell ('git add docs/not-' + $script:Template) $dirty) 'deny'
  Assert-Perm 'deny add dot when csv exists' (New-Shell 'git add .' $dirty) 'deny'
  Assert-Perm 'deny add -A' (New-Shell 'git add -A' $dirty) 'deny'
  Assert-Perm 'deny add --all' (New-Shell 'git add --all' $dirty) 'deny'
  Assert-Perm 'deny add directory' (New-Shell 'git add docs' $dirty) 'deny'
  Assert-Perm 'deny interactive add' (New-Shell 'git add -p' $dirty) 'deny'
  Assert-Perm 'deny add outside a repo' (New-Shell 'git add .' $empty) 'deny'
  Assert-Perm 'deny commit -a of tracked csv' (New-Shell 'git commit -a -m "edit"' $tracked) 'deny'
  Assert-Perm 'deny add -u of tracked csv' (New-Shell 'git add -u' $tracked) 'deny'

  Assert-Perm 'deny sheets append' (New-Shell 'curl.exe -s -X POST https://sheets.googleapis.com/v4/spreadsheets/FAKE-TEST-ID/values/Sheet1:append' $feature) 'deny'
  Assert-Perm 'deny sheets batchUpdate' (New-Shell 'Invoke-RestMethod -Method Post -Uri https://sheets.googleapis.com/v4/spreadsheets/FAKE-TEST-ID:batchUpdate' $feature) 'deny'
  Assert-Perm 'allow sheets GET' (New-Shell 'curl.exe -s https://sheets.googleapis.com/v4/spreadsheets/FAKE-TEST-ID/values/Sheet1' $feature) 'allow'
  Assert-Perm 'deny ruleset PUT' (New-Shell 'gh api -X PUT repos/example.test/rulesets/1' $feature) 'deny'
  Assert-Perm 'allow ruleset GET' (New-Shell 'gh api repos/example.test/rulesets/1' $feature) 'allow'
  Assert-Perm 'deny npm' (New-Shell 'npm test' $feature) 'deny'
  Assert-Perm 'deny npx' (New-Shell 'npx playwright test' $feature) 'deny'
  Assert-Perm 'deny node' (New-Shell 'node server.js' $feature) 'deny'
  Assert-Perm 'deny docker' (New-Shell 'docker build .' $feature) 'deny'
  Assert-Perm 'deny clasp push' (New-Shell 'clasp push' $feature) 'deny'
  Assert-Perm 'ask gh pr merge' (New-Shell 'gh pr merge 49' $feature) 'ask'
  Assert-Perm 'ask REST merge PUT' (New-Shell 'gh api -X PUT repos/example/repo/pulls/49/merge' $feature) 'ask'
  Assert-Perm 'allow GET merge URL without PUT' (New-Shell 'gh api repos/example/repo/pulls/49/merge' $feature) 'allow'

  $after = (& git -c color.ui=false -C $dirty status --porcelain | Out-String)
  if ($before -eq $after) {
    $script:Pass++
    Write-Output 'PASS status check does not stage files'
  } else {
    $script:Fail++
    Write-Output 'FAIL status check does not stage files'
  }

  Assert-Perm 'allow mcp create_pull_request base master' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'create_pull_request'
    tool_input = @{ owner = 'example'; repo = 'example'; title = 't'; head = 'feature'; base = 'master' }
  } 'allow'
  Assert-Perm 'allow mcp update_pull_request close' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'update_pull_request'
    tool_input = @{ owner = 'example'; repo = 'example'; pullNumber = 49; state = 'closed'; base = 'master' }
  } 'allow'
  Assert-Perm 'ask mcp merge object' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'merge_pull_request'
    tool_input = @{ owner = 'example'; repo = 'example'; pullNumber = 49; merge_method = 'squash' }
  } 'ask'
  Assert-Perm 'ask mcp merge string input' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'merge_pull_request'
    tool_input = '{"owner":"example","repo":"example","pullNumber":49}'
  } 'ask'
  Assert-Perm 'ask prefixed merge tool' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'plugin-github-github/merge_pull_request'
    tool_input = @{ owner = 'example'; repo = 'example'; pullNumber = 49 }
  } 'ask'
  Assert-Perm 'deny preToolUse MCP merge because ask is not enforced' @{
    hook_event_name = 'preToolUse'
    tool_name = 'MCP:merge_pull_request'
    tool_input = @{ owner = 'example'; repo = 'example'; pullNumber = 49 }
  } 'deny'
  Assert-Perm 'allow mcp push_files feature object' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'push_files'
    tool_input = @{ owner = 'example'; repo = 'example'; branch = 'feature'; message = 't'; files = @(@{ path = 'a.txt'; content = 'x' }) }
  } 'allow'
  Assert-Perm 'allow mcp push_files feature string' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'push_files'
    tool_input = '{"owner":"example","repo":"example","branch":"feature","message":"t","files":[{"path":"a.txt","content":"x"}]}'
  } 'allow'
  Assert-Perm 'deny mcp push_files master object' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'push_files'
    tool_input = @{ owner = 'example'; repo = 'example'; branch = 'master'; message = 't'; files = @(@{ path = 'a.txt'; content = 'x' }) }
  } 'deny'
  Assert-Perm 'deny mcp push_files main string' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'push_files'
    tool_input = '{"owner":"example","repo":"example","branch":"main","message":"t","files":[]}'
  } 'deny'
  Assert-Perm 'deny mcp push_files missing branch' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'push_files'
    tool_input = '{"owner":"example","repo":"example","message":"t","files":[]}'
  } 'deny'
  Assert-Perm 'deny mcp push_files unreadable input' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'push_files'
    tool_input = 'not-json'
  } 'deny'
  Assert-Perm 'deny mcp create_or_update_file master' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'create_or_update_file'
    tool_input = @{ owner = 'example'; repo = 'example'; path = 'a.txt'; content = 'x'; message = 't'; branch = 'master' }
  } 'deny'
  Assert-Perm 'deny mcp delete_file main' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'delete_file'
    tool_input = @{ owner = 'example'; repo = 'example'; path = 'a.txt'; message = 't'; branch = 'main' }
  } 'deny'
  Assert-Perm 'allow mcp get_file_contents' @{
    hook_event_name = 'beforeMCPExecution'
    tool_name = 'get_file_contents'
    tool_input = @{ owner = 'example'; repo = 'example'; path = 'README.md' }
  } 'allow'
  Assert-Perm 'allow preToolUse MCP read' @{
    hook_event_name = 'preToolUse'
    tool_name = 'MCP:get_file_contents'
    tool_input = @{ owner = 'example'; repo = 'example'; path = 'README.md' }
  } 'allow'

  $messageProbe = Invoke-GuardRaw (New-Shell 'git push origin master' $feature) 'pipe'
  $hasNonAscii = $false
  foreach ($ch in @([string]$messageProbe.user_message).ToCharArray()) {
    if ([int]$ch -gt 127) { $hasNonAscii = $true }
  }
  if ($messageProbe.permission -eq 'deny' -and $hasNonAscii) {
    $script:Pass++
    Write-Output 'PASS deny message is loaded as non-ASCII text'
  } else {
    $script:Fail++
    Write-Output 'FAIL deny message is loaded as non-ASCII text'
  }

  Assert-Perm 'gap force feature is not blocked' (New-Shell 'git push --force origin feature' $feature) 'allow' -Gap
  Assert-Perm 'gap force-with-lease feature is not blocked' (New-Shell 'git push --force-with-lease origin feature' $feature) 'allow' -Gap
  Assert-Perm 'gap amend is not a content scan' (New-Shell 'git commit --amend -m "edit"' $tracked) 'allow' -Gap
  Assert-Perm 'gap file contents are not scanned' (New-Shell 'git add notes.txt' $dirty) 'allow' -Gap
  Assert-Perm 'gap ignored env is not listed by add dot' (New-Shell 'git add .' $ignored) 'allow' -Gap
  Assert-Perm 'deny force add of ignored env' (New-Shell 'git add -f .' $ignored) 'deny'
  Assert-Perm 'gap script.google.com POST is not classified' (New-Shell 'curl.exe -s -X POST https://script.google.com/macros/s/FAKE/exec' $feature) 'allow' -Gap
  Assert-Perm 'gap python -c hidden push is not unwrapped' (New-Shell 'python -c "import os; os.system(''git push origin master'')"' $feature) 'allow' -Gap

  Write-Output ('PASSED ' + $script:Pass)
  Write-Output ('FAILED ' + $script:Fail)
  Write-Output 'UNPROTECTED'
  foreach ($gap in $script:Gaps) { Write-Output ('- ' + $gap) }
  if ($script:Fail -gt 0) { exit 1 }
  exit 0
} finally {
  foreach ($root in $script:Roots) { Remove-Tree $root }
  Remove-Item -LiteralPath $Runner -Force -ErrorAction SilentlyContinue
}

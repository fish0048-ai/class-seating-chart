# Seating-chart agent guard. Project hook only; do not copy sheet rules into other repos.
# Cursor on Windows pipes the hook JSON into this script. $input is the official channel.
$ErrorActionPreference = 'Stop'

function Write-Decision {
  param([string]$Permission, [string]$UserMessage, [string]$AgentMessage)
  $obj = [ordered]@{ permission = $Permission }
  if ($UserMessage) { $obj.user_message = $UserMessage }
  if ($AgentMessage) { $obj.agent_message = $AgentMessage }
  $json = $obj | ConvertTo-Json -Compress
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [Console]::OutputEncoding = $utf8
  [Console]::Out.WriteLine($json)
  exit 0
}

function Get-CurrentBranch {
  param([string]$Cwd)
  if (-not $Cwd) { return '' }
  $out = & git -C $Cwd rev-parse --abbrev-ref HEAD 2>$null
  if ($LASTEXITCODE -ne 0) { return '' }
  return ([string]($out | Select-Object -First 1)).Trim()
}

function Test-ProtectedBranchName {
  param([string]$Name)
  $n = $Name -replace '^refs/heads/', ''
  return $n -eq 'master' -or $n -eq 'main'
}

function Split-ShellParts {
  param([string]$Command)
  return [regex]::Split($Command, '\s*(?:&&|\|\||;)\s*')
}

function Test-BannedRuntime {
  param([string]$Part)
  return $Part.Trim() -match '^(?i)(npm|npx|node|docker)(\.exe|\.cmd)?(\s|$)'
}

function Test-RulesetMutation {
  param([string]$Part)
  if ($Part -notmatch '(?i)(rulesets?\b|branches/[^ \t''"]+/protection)') { return $false }
  return $Part -match '(?i)(-Method\s+(Put|Patch|Delete|Post)\b|-X\s+(PUT|PATCH|DELETE|POST)\b|--method\s+(PUT|PATCH|DELETE|POST)\b|\bMethod\s*[:=]\s*[''"]?(put|patch|delete|post))'
}

function Test-SheetWrite {
  param([string]$Part)
  $ids = '13VrWBx6hoKpUON_JNxIrynH_gyRV8HnhUt0MMscjkWg|1AES93Jv8l65YI2LQ-scVRPqYSLFxtVOD-UqIU99gQSA'
  if ($Part -notmatch $ids) { return $false }
  return $Part -match '(?i)(batchUpdate|values[\./:]append|values[\./:]update|spreadsheets\.values|:batchUpdate)'
}

function Test-MergeRequest {
  param([string]$Part)
  if ($Part -match '(?i)\bgh\s+pr\s+merge\b') { return $true }
  if ($Part -match '(?i)/pulls/\d+/merge\b' -and $Part -match '(?i)(-Method\s+Put\b|-X\s+PUT\b|--method\s+PUT\b)') { return $true }
  return $false
}

function Test-SensitiveAdd {
  param([string]$Part)
  if ($Part -notmatch '(?i)^git(\.exe)?\s+(-C\s+\S+\s+)?add\b') { return $false }
  if ($Part -match '(?i)(^|[\s''"])(\.env(\.\w+)?|credentials[^\\/\s''"]*|client_secret[^\\/\s''"]*|token\.json|[^\s''"]+\.(xls|xlsx))([\s''"]|$)') { return $true }
  $csv = [regex]::Matches($Part, '(?i)[^\s''"]+\.csv')
  foreach ($m in $csv) {
    if ($m.Value -notmatch '學生名單範本\.csv$') { return $true }
  }
  return $false
}

function Test-PushDecision {
  param([string]$Part, [string]$Cwd)
  $rest = $Part.Trim()
  if ($rest -notmatch '(?i)^git(\.exe)?\s+') { return $null }
  $rest = $rest -replace '(?i)^git(\.exe)?\s+', ''
  if ($rest -match '(?i)^-C\s+(\S+)\s+(.*)$') {
    $Cwd = $Matches[1]
    $rest = $Matches[2]
  }
  if ($rest -notmatch '(?i)^push\b') { return $null }
  $argText = ($rest -replace '(?i)^push\b', '').Trim()
  $tokens = @()
  if ($argText) { $tokens = @($argText -split '\s+' | Where-Object { $_ -ne '' }) }
  $force = $false
  $pushAll = $false
  $delete = $false
  $positional = @()
  foreach ($token in $tokens) {
    if ($token -match '(?i)^(--force|--force-with-lease|-f)$') { $force = $true; continue }
    if ($token -match '(?i)^(--all|--mirror)$') { $pushAll = $true; continue }
    if ($token -match '(?i)^--delete$') { $delete = $true; continue }
    if ($token -match '^-') { continue }
    $positional += $token
  }
  if ($pushAll) { return 'deny-all' }
  $destinations = @()
  if ($positional.Count -eq 0) {
    $destinations = @('HEAD')
  } elseif ($positional[0] -match ':') {
    $destinations = $positional
  } else {
    if ($positional.Count -gt 1) { $destinations = @($positional | Select-Object -Skip 1) }
    else { $destinations = @('HEAD') }
  }
  $branch = ''
  foreach ($dest in $destinations) {
    $src = ''
    $dst = $dest
    if ($dest -match '^(?<src>\+?[^:]*):(?<dst>.+)$') {
      $src = $Matches.src
      $dst = $Matches.dst
      if ($src.StartsWith('+')) { $force = $true }
    }
    $dst = $dst -replace '^\+', ''
    if ($dst -eq 'HEAD') {
      if (-not $branch) { $branch = Get-CurrentBranch $Cwd }
      if (-not $branch) { return 'deny-unknown' }
      $dst = $branch
    }
    $protected = Test-ProtectedBranchName $dst
    if ($delete -and $protected) { return 'deny-protected' }
    if ($protected -and $force) { return 'deny-force' }
    if ($protected) { return 'deny-protected' }
  }
  return 'allow'
}

try {
  $chunks = New-Object System.Collections.Generic.List[string]
  foreach ($item in $input) { [void]$chunks.Add([string]$item) }
  $raw = $chunks -join "`n"
  if ([string]::IsNullOrWhiteSpace($raw)) {
    $raw = [Console]::In.ReadToEnd()
  }
  if ([string]::IsNullOrWhiteSpace($raw)) { Write-Decision 'allow' '' '' }
  $payload = $raw | ConvertFrom-Json
  $event = [string]$payload.hook_event_name
  $cwd = [string]$payload.cwd

  if ($event -eq 'beforeMCPExecution') {
    $tool = [string]$payload.tool_name
    $toolInput = [string]$payload.tool_input
    if ($tool -eq 'merge_pull_request') {
      Write-Decision 'ask' '這個操作會合併 Pull Request。請先確認再允許。' '合併 PR 需要使用者在畫面上允許。不要自行合併。'
    }
    if ($toolInput -match '(?i)"(branch|base|ref)"\s*:\s*"(master|main)"' -and $tool -match '(?i)^(push_files|create_or_update_file|delete_file|create_branch)$') {
      if ($tool -ne 'create_branch') {
        Write-Decision 'deny' '已擋下對 master 或 main 的直接寫入。' '請改在功能分支作業，並開 Pull Request。不要推送或修改 master/main。'
      }
    }
    if ($toolInput -match '(?i)(rulesets?|branch protection)' -and $toolInput -match '(?i)"(method|http_method)"\s*:\s*"(PUT|PATCH|DELETE|POST)"') {
      Write-Decision 'deny' '已擋下變更 GitHub Ruleset 或分支保護的操作。' '不要停用或修改 Ruleset。保護規則要由使用者在 GitHub 設定頁處理。'
    }
    Write-Decision 'allow' '' ''
  }

  $command = [string]$payload.command
  if ([string]::IsNullOrWhiteSpace($command)) { Write-Decision 'allow' '' '' }

  foreach ($part in (Split-ShellParts $command)) {
    $text = $part.Trim()
    if (-not $text) { continue }
    if (Test-BannedRuntime $text) {
      Write-Decision 'deny' '這台電腦不使用本機 Node.js、npm、npx 或 Docker。' '不要安裝或執行 node、npm、npx、docker。測試改走 GitHub Actions。'
    }
    if ($text -match '(?i)^clasp(\.exe)?\s+(push|deploy|create)\b') {
      Write-Decision 'deny' '已擋下會改到正式 Apps Script 的 clasp 操作。' '不要用 clasp 推送或部署 Code.gs。後端要由老師在 Apps Script 手動部署。'
    }
    if (Test-RulesetMutation $text) {
      Write-Decision 'deny' '已擋下變更 GitHub Ruleset 或分支保護的操作。' '不要停用或修改 Ruleset。'
    }
    if (Test-SheetWrite $text) {
      Write-Decision 'deny' '已擋下對正式課表或成績庫的寫入。' '課表只讀。不要把測試寫進正式 Google 試算表或成績庫。'
    }
    if (Test-SensitiveAdd $text) {
      Write-Decision 'deny' '已擋下把憑證或學生資料加入 Git。' '不要 git add .env、憑證、xlsx，或學生個資 CSV。範本 csv 除外。'
    }
    if (Test-MergeRequest $text) {
      Write-Decision 'ask' '這個指令會合併 Pull Request。請先確認再允許。' '合併需要使用者明確允許。未獲允許就不要合併。'
    }
    $push = Test-PushDecision $text $cwd
    if ($push -eq 'deny-protected' -or $push -eq 'deny-force' -or $push -eq 'deny-all' -or $push -eq 'deny-unknown') {
      Write-Decision 'deny' '已擋下對 master 或 main 的推送，以及強制推送受保護分支。' '請推送功能分支並建立 Pull Request。不要推送 master/main，也不要強制推送受保護分支。'
    }
  }

  Write-Decision 'allow' '' ''
} catch {
  Write-Decision 'deny' '安全檢查無法完成，已先擋下這次操作。' ('hook 錯誤：' + $_.Exception.Message)
}

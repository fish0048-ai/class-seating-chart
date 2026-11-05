# Seating-chart agent guard. Auxiliary only; GitHub Ruleset remains the real boundary.
# Cursor on Windows runs this through PowerShell and pipes JSON into $input.
# Gaps that this script does not claim to close are asserted in guard.tests.ps1.
$ErrorActionPreference = 'Stop'
$script:CanAsk = $true
$script:RosterTemplateName = (-join ([char]0x5B78,[char]0x751F,[char]0x540D,[char]0x55AE,[char]0x7BC4,[char]0x672C)) + '.csv'
$script:Messages = $null

function M {
  param([string]$Key)
  if ($script:Messages -and $script:Messages.PSObject.Properties[$Key]) {
    return [string]$script:Messages.PSObject.Properties[$Key].Value
  }
  return $Key
}

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

function Write-Gate {
  param([string]$Permission, [string]$UserMessage, [string]$AgentMessage)
  if (-not $script:CanAsk -and $Permission -eq 'ask') {
    Write-Decision 'deny' $UserMessage ($AgentMessage + ' ask is not enforced on this hook, so the action is denied.')
  }
  Write-Decision $Permission $UserMessage $AgentMessage
}

function Split-Args {
  param([string]$Text, [ref]$Result)
  $list = New-Object System.Collections.Generic.List[string]
  if ($Text) {
    foreach ($m in [regex]::Matches($Text, '("([^"]*)"|''([^'']*)''|\S+)' )) {
      $raw = $m.Value
      if (($raw.StartsWith('"') -and $raw.EndsWith('"')) -or ($raw.StartsWith("'") -and $raw.EndsWith("'"))) {
        [void]$list.Add($raw.Substring(1, $raw.Length - 2))
      } else {
        [void]$list.Add($raw)
      }
    }
  }
  $Result.Value = $list.ToArray()
}

function Split-ShellParts {
  param([string]$Command, [ref]$Result)
  $parts = New-Object System.Collections.Generic.List[string]
  if (-not $Command) { $Result.Value = $parts.ToArray(); return }
  $buf = New-Object System.Text.StringBuilder
  $quote = $null
  $chars = $Command.ToCharArray()
  $i = 0
  while ($i -lt $chars.Length) {
    $c = $chars[$i]
    if ($quote) {
      [void]$buf.Append($c)
      if ($c -eq $quote) { $quote = $null }
      $i += 1
      continue
    }
    if ($c -eq '"' -or $c -eq "'") {
      $quote = $c
      [void]$buf.Append($c)
      $i += 1
      continue
    }
    $two = $i + 1 -lt $chars.Length
    if ($c -eq "`r" -or $c -eq "`n" -or $c -eq ';') {
      $piece = $buf.ToString().Trim()
      if ($piece) { [void]$parts.Add($piece) }
      [void]$buf.Clear()
      if ($c -eq "`r" -and $two -and $chars[$i + 1] -eq "`n") { $i += 1 }
      $i += 1
      continue
    }
    if ($two -and (($c -eq '&' -and $chars[$i + 1] -eq '&') -or ($c -eq '|' -and $chars[$i + 1] -eq '|'))) {
      $piece = $buf.ToString().Trim()
      if ($piece) { [void]$parts.Add($piece) }
      [void]$buf.Clear()
      $i += 2
      continue
    }
    if ($c -eq '|') {
      $piece = $buf.ToString().Trim()
      if ($piece) { [void]$parts.Add($piece) }
      [void]$buf.Clear()
      $i += 1
      continue
    }
    [void]$buf.Append($c)
    $i += 1
  }
  $piece = $buf.ToString().Trim()
  if ($piece) { [void]$parts.Add($piece) }
  $Result.Value = $parts.ToArray()
}

function Unwrap-Part {
  param([string]$Text, [int]$Depth = 0)
  if ($Depth -gt 4) { return $Text.Trim() }
  $t = $Text.Trim()
  if ($t -match '(?i)^(?:&\s+)?(?:powershell|pwsh)(\.exe)?\b.*(?:-EncodedCommand|-enc)\s+([A-Za-z0-9+/=]+)') {
    try {
      $bytes = [Convert]::FromBase64String($Matches[2])
      $decoded = [System.Text.Encoding]::Unicode.GetString($bytes).Trim()
      if ($decoded) { return (Unwrap-Part $decoded ($Depth + 1)) }
    } catch { }
  }
  if ($t -match '(?i)^(?:&\s+)?cmd(\.exe)?\s+/c\s+"(.*)"\s*$') { return (Unwrap-Part $Matches[2] ($Depth + 1)) }
  if ($t -match '(?i)^(?:&\s+)?cmd(\.exe)?\s+/c\s+(.+)$') { return (Unwrap-Part $Matches[2] ($Depth + 1)) }
  if ($t -match '(?i)^(?:&\s+)?(?:powershell|pwsh)(\.exe)?\b.*-Command\s+"(.*)"\s*$') { return (Unwrap-Part $Matches[2] ($Depth + 1)) }
  if ($t -match '(?i)^(?:&\s+)?(?:powershell|pwsh)(\.exe)?\b.*-Command\s+(.+)$') { return (Unwrap-Part $Matches[2] ($Depth + 1)) }
  if ($t -match '(?i)^(?:&\s+)?(?:bash|sh)(\.exe)?\b.*\s-c\s+"(.*)"\s*$') { return (Unwrap-Part $Matches[2] ($Depth + 1)) }
  if ($t -match "(?i)^(?:&\s+)?(?:bash|sh)(\.exe)?\b.*\s-c\s+'(.*)'\s*$") { return (Unwrap-Part $Matches[2] ($Depth + 1)) }
  if ($t -match '(?i)^&\s+(.+)$') { return (Unwrap-Part $Matches[1] ($Depth + 1)) }
  return $t
}

function Expand-Parts {
  param([string]$Command, [int]$Depth = 0)
  $sink = New-Object System.Collections.Generic.List[string]
  Add-ExpandedParts $Command $Depth $sink
  return ,$sink
}

function Add-ExpandedParts {
  param([string]$Command, [int]$Depth, $Sink)
  if ($Depth -gt 6) { [void]$Sink.Add($Command); return }
  $pieces = $null
  Split-ShellParts $Command ([ref]$pieces)
  foreach ($part in $pieces) {
    $text = Unwrap-Part ([string]$part)
    if (-not $text) { continue }
    if ($text.Trim() -ne ([string]$part).Trim()) {
      Add-ExpandedParts $text ($Depth + 1) $Sink
    } else {
      [void]$Sink.Add($text)
    }
  }
}

function Test-ProtectedBranchName {
  param([string]$Name)
  if (-not $Name) { return $false }
  $n = $Name.Trim() -replace '^\+', ''
  $n = $n -replace '^(?i)refs/heads/', ''
  return ($n -eq 'master' -or $n -eq 'main')
}

function Get-GitInvocation {
  param([string]$Text, [string]$Cwd)
  $m = [regex]::Match($Text, '(?i)(?:^|&\s+)git(\.exe)?\s+(.*)$')
  if (-not $m.Success) { return $null }
  $tokens = $null
  Split-Args $m.Groups[2].Value ([ref]$tokens)
  $i = 0
  while ($i -lt $tokens.Count) {
    $token = [string]$tokens[$i]
    if ($token -ceq '-c' -or $token -ceq '--config') {
      if ($i + 1 -ge $tokens.Count) { return $null }
      $i += 2
      continue
    }
    if ($token.StartsWith('-c') -or $token.StartsWith('--config=')) { $i += 1; continue }
    if ($token -ceq '-C') {
      if ($i + 1 -ge $tokens.Count) { return $null }
      $Cwd = [string]$tokens[$i + 1]
      $i += 2
      continue
    }
    if ($token.StartsWith('-C') -and $token.Length -gt 2) { $Cwd = $token.Substring(2); $i += 1; continue }
    if ($token -ceq '--git-dir' -or $token -ceq '--work-tree') { $i += 2; continue }
    if ($token.StartsWith('--git-dir=') -or $token.StartsWith('--work-tree=')) { $i += 1; continue }
    if ($token.StartsWith('-')) { $i += 1; continue }
    break
  }
  if ($i -ge $tokens.Count) { return $null }
  $rest = New-Object System.Collections.Generic.List[string]
  for ($k = $i + 1; $k -lt $tokens.Count; $k++) { [void]$rest.Add([string]$tokens[$k]) }
  return @{ Cwd = $Cwd; Command = [string]$tokens[$i]; Args = $rest }
}

function Invoke-GitText {
  param([string[]]$GitArgs)
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $out = & git @GitArgs 2>$null
    return @{ Code = $LASTEXITCODE; Out = $out }
  } finally {
    $ErrorActionPreference = $previous
  }
}

function Get-CurrentBranch {
  param([string]$Cwd)
  if (-not $Cwd) { return '' }
  $result = Invoke-GitText @('-c', 'color.ui=false', '-C', $Cwd, 'rev-parse', '--abbrev-ref', 'HEAD')
  if ($result.Code -ne 0) { return '' }
  return ([string](@($result.Out) | Select-Object -First 1)).Trim()
}

function Get-UpstreamBranch {
  param([string]$Cwd)
  if (-not $Cwd) { return '' }
  $result = Invoke-GitText @('-c', 'color.ui=false', '-C', $Cwd, 'rev-parse', '--abbrev-ref', '@{upstream}')
  if ($result.Code -ne 0) { return '' }
  $name = ([string](@($result.Out) | Select-Object -First 1)).Trim()
  if ($name -match '/([^/]+)$') { return $Matches[1] }
  return $name
}

function Get-Remotes {
  param([string]$Cwd)
  if (-not $Cwd) { return @() }
  $result = Invoke-GitText @('-c', 'color.ui=false', '-C', $Cwd, 'remote')
  if ($result.Code -ne 0) { return @() }
  return @(@($result.Out) | ForEach-Object { $_.ToString().Trim() } | Where-Object { $_ })
}

function Test-RepositoryToken {
  param([string]$Token, [string[]]$Remotes, [string]$Cwd)
  if (-not $Token) { return $false }
  if ($Remotes -contains $Token) { return $true }
  if ($Token -match '://' -or $Token -match '(?i)\.git$' -or $Token -match '^[^/\s]+@[^/\s]+:') { return $true }
  if ($Token -match '^[.]{1,2}[/\\]' -or $Token -match '^[A-Za-z]:[/\\]' -or $Token.StartsWith('/') -or $Token.StartsWith('\')) { return $true }
  if ($Cwd) {
    $candidate = Join-Path $Cwd $Token
    if (Test-Path -LiteralPath $candidate -PathType Container) { return $true }
  }
  return $false
}

function Test-BannedRuntime {
  param([string]$Part)
  return $Part.Trim() -match '^(?i)(npm|npx|node|docker)(\.exe|\.cmd)?(\s|$)'
}

function Test-RulesetMutation {
  param([string]$Part)
  if (-not $Part) { return $false }
  if ($Part -notmatch '(?i)(rulesets?\b|branches/[^ \t''"]+/protection)') { return $false }
  return $Part -match '(?i)(-Method\s+(Put|Patch|Delete|Post)\b|-X\s+(PUT|PATCH|DELETE|POST)\b|--method\s+(PUT|PATCH|DELETE|POST)\b|\bMethod\s*[:=]\s*[''"]?(put|patch|delete|post))'
}

function Test-SheetWrite {
  param([string]$Part)
  if ($Part -notmatch '(?i)sheets\.googleapis\.com') { return $false }
  return $Part -match '(?i)(batchUpdate|:append\b|:update\b|values:append|-Method\s+(Put|Post|Patch|Delete)\b|-X\s+(PUT|POST|PATCH|DELETE)\b|--method\s+(PUT|POST|PATCH|DELETE)\b)'
}

function Test-SensitivePath {
  param([string]$Path)
  $name = ([string]$Path -replace '\\', '/').Trim().Trim('"')
  if (-not $name) { return $false }
  if ($name -match '(?i)(^|/)(\.env($|\.[^/]+)|token\.json|client_secret[^/]*|credentials[^/]*)$') { return $true }
  if ($name -match '(?i)\.(xls|xlsx)$') { return $true }
  $base = ($name -split '/')[-1]
  if ($name -match '(?i)\.csv$' -and ($base -cne $script:RosterTemplateName)) { return $true }
  return $false
}

function ConvertFrom-GitPath {
  param([string]$Path)
  $p = $Path.Trim()
  if ($p.StartsWith('"') -and $p.EndsWith('"') -and $p.Length -ge 2) {
    $p = $p.Substring(1, $p.Length - 2) -replace '\\"', '"'
  }
  return ($p -replace '\\', '/')
}

function Get-StatusCandidates {
  param([string]$Cwd, [string[]]$Flags, [string[]]$Paths)
  $trackedOnly = $false
  $allFlag = $false
  $includeIgnored = $false
  foreach ($flag in $Flags) {
    if ($flag -in @('-f', '--force')) { $includeIgnored = $true }
    if ($flag -in @('-u', '--update') -or $flag -match '^-[^-]*u') { $trackedOnly = $true }
    if ($flag -in @('-A', '--all') -or $flag -match '^-[^-]*A') { $allFlag = $true }
  }
  $gitArgs = @('-c', 'color.ui=false', '-c', 'core.quotepath=false', '-C', $Cwd, 'status', '--porcelain=v1', '-uall')
  if ($includeIgnored) { $gitArgs += '--ignored=matching' }
  $gitArgs += '--'
  foreach ($path in $Paths) { $gitArgs += $path }
  $previousEncoding = [Console]::OutputEncoding
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [Console]::OutputEncoding = $utf8
  try {
    $result = Invoke-GitText $gitArgs
    $out = $result.Out
    $code = $result.Code
  } finally {
    [Console]::OutputEncoding = $previousEncoding
  }
  $found = New-Object System.Collections.Generic.List[string]
  $unparsed = $false
  foreach ($line in @($out)) {
    $trim = ([string]$line).TrimEnd()
    if (-not $trim) { continue }
    if ($trim -notmatch '^(..)\s(.*)$') { $unparsed = $true; continue }
    $xy = $Matches[1]
    $path = $Matches[2]
    if ($xy -eq '!!' -and -not $includeIgnored) { continue }
    if ($trackedOnly -and -not $allFlag -and $xy -eq '??') { continue }
    if ($path -match '^(.*) -> (.*)$') { $path = $Matches[2] }
    [void]$found.Add((ConvertFrom-GitPath $path))
  }
  return @{ Code = $code; Paths = @($found.ToArray()); Unparsed = $unparsed }
}

function Test-AddDecision {
  param($Invocation)
  if ($null -eq $Invocation -or $Invocation.Command -ne 'add') { return $null }
  $addArgs = @($Invocation.Args)
  foreach ($arg in $addArgs) {
    if ($arg -in @('-p', '--patch', '-i', '--interactive')) { return 'deny-interactive' }
  }
  $flags = New-Object System.Collections.Generic.List[string]
  $paths = New-Object System.Collections.Generic.List[string]
  $i = 0
  while ($i -lt $addArgs.Count) {
    $arg = [string]$addArgs[$i]
    if ($arg -eq '--') {
      for ($j = $i + 1; $j -lt $addArgs.Count; $j++) { [void]$paths.Add([string]$addArgs[$j]) }
      break
    }
    if ($arg -match '^(--chmod|--pathspec-from-file)$') { $i += 2; continue }
    if ($arg.StartsWith('-')) { [void]$flags.Add($arg); $i += 1; continue }
    [void]$paths.Add($arg)
    $i += 1
  }
  foreach ($path in $paths) {
    if (Test-SensitivePath $path) { return 'deny-named' }
  }
  $broad = $false
  foreach ($flag in $flags) {
    if ($flag -in @('-A', '--all', '-u', '--update') -or $flag -match '^-[^-]*[Au]') { $broad = $true }
  }
  if ($paths.Count -eq 0) { $broad = $true }
  foreach ($path in $paths) {
    if ($path -in @('.', './', ':') -or $path.Contains('*') -or $path.Contains('?')) { $broad = $true }
    if ($Invocation.Cwd -and (Test-Path -LiteralPath (Join-Path $Invocation.Cwd $path) -PathType Container)) { $broad = $true }
  }
  if (-not $broad) { return 'allow' }
  if (-not $Invocation.Cwd -or -not (Test-Path -LiteralPath (Join-Path $Invocation.Cwd '.git'))) { return 'deny-unverified' }
  $scan = Get-StatusCandidates $Invocation.Cwd @($flags.ToArray()) @($paths.ToArray())
  if ($scan.Code -ne 0 -or $scan.Unparsed) { return 'deny-unverified' }
  foreach ($path in @($scan.Paths)) {
    if (Test-SensitivePath $path) { return 'deny-listed' }
  }
  return 'allow'
}

function Test-CommitAllDecision {
  param($Invocation)
  if ($null -eq $Invocation -or $Invocation.Command -ne 'commit') { return $null }
  $tracksAll = $false
  foreach ($arg in @($Invocation.Args)) {
    $text = [string]$arg
    if ($text -eq '--amend') { continue }
    if ($text -eq '--all' -or $text -eq '-a' -or $text -match '^-[^-]*a') { $tracksAll = $true }
  }
  if (-not $tracksAll) { return $null }
  if (-not $Invocation.Cwd -or -not (Test-Path -LiteralPath (Join-Path $Invocation.Cwd '.git'))) { return 'deny-unverified' }
  $scan = Get-StatusCandidates $Invocation.Cwd @('-u') @()
  if ($scan.Code -ne 0 -or $scan.Unparsed) { return 'deny-unverified' }
  foreach ($path in @($scan.Paths)) {
    if (Test-SensitivePath $path) { return 'deny-listed' }
  }
  return 'allow'
}

function Test-PushTextFallback {
  param([string]$Text)
  if ($Text.Trim() -notmatch '(?i)^git(\.exe)?\s+push\b') { return $false }
  if ($Text -match '(?i)(^|\s)(--all|--mirror)(\s|$)') { return $true }
  if ($Text -match '(?i)--force-with-lease=(?:\S*[/])?(master|main)([\s''":]|$)') { return $true }
  if ($Text -match '(?i)(?:^|[\s''"=:])\+?(?:HEAD:|refs/heads/)?(master|main)(?:$|[\s''";|&])') { return $true }
  return $false
}

function Test-PushDecision {
  param($Invocation)
  if ($null -eq $Invocation -or $Invocation.Command -ne 'push') { return $null }
  $force = $false
  $pushAll = $false
  $delete = $false
  $leaseProtected = $false
  $positional = New-Object System.Collections.Generic.List[string]
  foreach ($arg in @($Invocation.Args)) {
    $text = [string]$arg
    if ($text -eq '--force' -or $text -like '--force=*' -or $text -eq '--force-with-lease' -or $text -like '--force-with-lease=*') {
      $force = $true
      if ($text -like '--force-with-lease=*') {
        $lease = $text.Substring('--force-with-lease='.Length)
        $leaseRef = ($lease -split ':')[0]
        if (Test-ProtectedBranchName $leaseRef) { $leaseProtected = $true }
      }
      continue
    }
    if ($text -match '^-[^-]*f') { $force = $true }
    if ($text -in @('--all', '--mirror')) { $pushAll = $true; continue }
    if ($text -eq '--delete') { $delete = $true; continue }
    if ($text.StartsWith('-')) { continue }
    [void]$positional.Add($text)
  }
  if ($pushAll -or $leaseProtected) { return 'deny-protected' }
  $destinations = New-Object System.Collections.Generic.List[string]
  if ($positional.Count -eq 0) {
    [void]$destinations.Add('HEAD')
  } else {
    $start = 0
    $first = [string]$positional[0]
    $firstIsRef = $first.Contains(':') -or $first.StartsWith('+') -or $first.StartsWith('refs/') -or $first -eq 'HEAD'
    if (-not $firstIsRef -and (Test-RepositoryToken $first @(Get-Remotes $Invocation.Cwd) $Invocation.Cwd)) { $start = 1 }
    for ($i = $start; $i -lt $positional.Count; $i++) { [void]$destinations.Add([string]$positional[$i]) }
    if ($destinations.Count -eq 0) { [void]$destinations.Add('HEAD') }
  }
  $branch = ''
  $upstream = ''
  foreach ($dest in $destinations) {
    $dst = [string]$dest
    if ($dest -match '^(?<src>\+?[^:]*):(?<dst>.*)$') {
      if ($Matches.src.StartsWith('+')) { $force = $true }
      $dst = $Matches.dst
    }
    $dst = $dst -replace '^\+', ''
    if ($dst -eq 'HEAD' -or $dst -eq '') {
      if (-not $branch) { $branch = Get-CurrentBranch $Invocation.Cwd }
      if (-not $upstream) { $upstream = Get-UpstreamBranch $Invocation.Cwd }
      if (-not $branch -and -not $upstream) { return 'deny-unknown' }
      if (Test-ProtectedBranchName $branch) { return $(if ($force) { 'deny-force' } else { 'deny-protected' }) }
      if (Test-ProtectedBranchName $upstream) { return $(if ($force) { 'deny-force' } else { 'deny-protected' }) }
      continue
    }
    if ($delete -and (Test-ProtectedBranchName $dst)) { return 'deny-protected' }
    if (Test-ProtectedBranchName $dst) { return $(if ($force) { 'deny-force' } else { 'deny-protected' }) }
  }
  return 'allow'
}

function Test-MergeRequest {
  param([string]$Part)
  if ($Part -match '(?i)\bgh\s+pr\s+merge\b') { return $true }
  if ($Part -match '(?i)/pulls/\d+/merge\b' -and $Part -match '(?i)(-Method\s+Put\b|-X\s+PUT\b|--method\s+PUT\b)') { return $true }
  return $false
}

function Get-McpToolName {
  param([string]$Tool)
  if ($Tool -match '^(?i)MCP:(.+)$') { return $Matches[1] }
  return $Tool
}

function Test-McpTool {
  param([string]$Tool, [string]$Expected)
  $name = Get-McpToolName $Tool
  if ($name -eq $Expected) { return $true }
  return $name -match ('(?i)(?:^|[./:_-])' + [regex]::Escape($Expected) + '$')
}

function Get-McpObject {
  param($Value)
  if ($null -eq $Value) { return $null }
  if ($Value -is [string]) {
    $text = $Value.Trim()
    if ($text.StartsWith('{') -or $text.StartsWith('[')) {
      try {
        $parsed = $text | ConvertFrom-Json
        if ($parsed -is [string]) { return (Get-McpObject $parsed) }
        return $parsed
      } catch { return $null }
    }
    return $null
  }
  return $Value
}

function Get-McpField {
  param($Value, [string]$Name)
  $obj = Get-McpObject $Value
  if ($obj -and $obj.PSObject.Properties[$Name]) { return ([string]$obj.PSObject.Properties[$Name].Value).Trim() }
  $text = [string]$Value
  $match = [regex]::Match($text, '(?i)"' + [regex]::Escape($Name) + '"\s*:\s*"([^"]+)"')
  if ($match.Success) { return $match.Groups[1].Value.Trim() }
  return ''
}

function Invoke-ToolGuard {
  param($Payload)
  $tool = [string]$Payload.tool_name
  $toolInput = $Payload.tool_input
  if (Test-McpTool $tool 'merge_pull_request') {
    Write-Gate 'ask' (M 'mergeAskUser') (M 'mergeAskAgent')
  }
  if ((Test-McpTool $tool 'push_files') -or (Test-McpTool $tool 'create_or_update_file') -or (Test-McpTool $tool 'delete_file')) {
    $branch = Get-McpField $toolInput 'branch'
    if (-not $branch) {
      Write-Gate 'deny' (M 'branchUnknownUser') (M 'branchUnknownAgent')
    }
    if (Test-ProtectedBranchName $branch) {
      Write-Gate 'deny' (M 'writeProtectedUser') (M 'writeProtectedAgent')
    }
  }
  $inputText = ''
  if ($toolInput -is [string]) { $inputText = $toolInput }
  elseif ($null -ne $toolInput) { $inputText = ($toolInput | ConvertTo-Json -Compress -Depth 8) }
  if (Test-RulesetMutation $inputText) {
    Write-Gate 'deny' (M 'rulesetMcpUser') (M 'rulesetMcpAgent')
  }
  Write-Gate 'allow' '' ''
}

try {
  $messagePath = Join-Path $PSScriptRoot 'guard-messages.json'
  $script:Messages = [System.IO.File]::ReadAllText($messagePath) | ConvertFrom-Json
  $chunks = New-Object System.Collections.Generic.List[string]
  foreach ($item in $input) { [void]$chunks.Add([string]$item) }
  $raw = $chunks -join "`n"
  if ([string]::IsNullOrWhiteSpace($raw)) { $raw = [Console]::In.ReadToEnd() }
  if ([string]::IsNullOrWhiteSpace($raw)) { Write-Gate 'allow' '' '' }
  $payload = $raw | ConvertFrom-Json
  $event = [string]$payload.hook_event_name
  $cwd = [string]$payload.cwd
  if ($event -eq 'preToolUse') { $script:CanAsk = $false }

  if ($event -eq 'beforeMCPExecution' -or $event -eq 'preToolUse') {
    $toolName = Get-McpToolName ([string]$payload.tool_name)
    if ($toolName -eq 'Shell') {
      $cwdFromTool = Get-McpField $payload.tool_input 'working_directory'
      if ($cwdFromTool) { $cwd = $cwdFromTool }
      $payload | Add-Member -NotePropertyName command -NotePropertyValue (Get-McpField $payload.tool_input 'command') -Force
    } else {
      Invoke-ToolGuard $payload
    }
  }

  $command = [string]$payload.command
  if ([string]::IsNullOrWhiteSpace($command)) { Write-Gate 'allow' '' '' }

  $parts = Expand-Parts $command
  if ($parts -is [string]) {
    $onlyPart = $parts
    $parts = New-Object System.Collections.Generic.List[string]
    [void]$parts.Add($onlyPart)
  }
  foreach ($part in $parts) {
    $text = [string]$part
    if (-not $text) { continue }
    if (Test-BannedRuntime $text) {
      Write-Gate 'deny' (M 'runtimeUser') (M 'runtimeAgent')
    }
    if ($text -match '(?i)(?:^|\s)clasp(\.exe)?\s+(push|deploy|create)\b') {
      Write-Gate 'deny' (M 'claspUser') (M 'claspAgent')
    }
    if (Test-RulesetMutation $text) {
      Write-Gate 'deny' (M 'rulesetUser') (M 'rulesetAgent')
    }
    if (Test-SheetWrite $text) {
      Write-Gate 'deny' (M 'sheetUser') (M 'sheetAgent')
    }
    $git = Get-GitInvocation $text $cwd
    $add = Test-AddDecision $git
    if ($add -like 'deny-*') {
      Write-Gate 'deny' (M 'addUser') (M 'addAgent')
    }
    $commitAll = Test-CommitAllDecision $git
    if ($commitAll -like 'deny-*') {
      Write-Gate 'deny' (M 'commitUser') (M 'commitAgent')
    }
    if (Test-MergeRequest $text) {
      Write-Gate 'ask' (M 'mergeShellUser') (M 'mergeShellAgent')
    }
    $push = Test-PushDecision $git
    if ($push -like 'deny-*' -or (Test-PushTextFallback $text)) {
      Write-Gate 'deny' (M 'pushUser') (M 'pushAgent')
    }
  }

  Write-Gate 'allow' '' ''
} catch {
  Write-Decision 'deny' (M 'hookFailUser') ((M 'hookErrorPrefix') + $_.Exception.Message)
}

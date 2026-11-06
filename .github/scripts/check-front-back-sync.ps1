# 前後端同步檢查：只讀檔案、比對名稱，不呼叫後端、不寫入任何資料。
# 只能確認成對的函式與設定都還在、名稱對得上；兩邊邏輯是否相同仍要人工對照。
param(
  [string]$Root = (Join-Path $PSScriptRoot '..\..')
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

$Root = (Resolve-Path -LiteralPath $Root).Path
$problems = New-Object System.Collections.Generic.List[string]
$passes = New-Object System.Collections.Generic.List[string]

function Read-Utf8 {
  param([string]$RelativePath)
  $path = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function Get-QuotedList {
  param([string]$Text)
  $items = New-Object System.Collections.Generic.List[string]
  foreach ($m in [regex]::Matches($Text, '[''"]([^''"]+)[''"]')) { [void]$items.Add($m.Groups[1].Value) }
  return ,$items.ToArray()
}

function Get-TopLevelFunctionBody {
  param([string]$Text, [string]$Name)
  $m = [regex]::Match($Text, '(?m)^function\s+' + [regex]::Escape($Name) + '\s*\(')
  if (-not $m.Success) { return $null }
  $rest = $Text.Substring($m.Index)
  $next = [regex]::Match($rest.Substring(1), '(?m)^function\s+')
  if ($next.Success) { return $rest.Substring(0, $next.Index + 1) }
  return $rest
}

function Test-FunctionDefined {
  param([string]$Text, [string]$Name)
  if (-not $Text) { return $false }
  return [regex]::IsMatch($Text, '(?m)^\s*function\s+' + [regex]::Escape($Name) + '\s*\(')
}

function Compare-AsSet {
  param([string[]]$A, [string[]]$B)
  $left = @($A | ForEach-Object { $_.Trim().ToLowerInvariant() } | Sort-Object -Unique)
  $right = @($B | ForEach-Object { $_.Trim().ToLowerInvariant() } | Sort-Object -Unique)
  return (($left -join '|') -eq ($right -join '|'))
}

$codeGs = Read-Utf8 'Code.gs'
$configJs = Read-Utf8 'docs\config.js'
$apiJs = Read-Utf8 'docs\api.js'
$statusDoc = Read-Utf8 'docs\專案現況.md'
$frontFiles = @{}
$docsDir = Join-Path $Root 'docs'
if (Test-Path -LiteralPath $docsDir) {
  Get-ChildItem -LiteralPath $docsDir -Filter '*.js' -File | Where-Object { $_.Name -ne 'config.example.js' } | ForEach-Object {
    $frontFiles[$_.Name] = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
  }
}

foreach ($required in @(@('Code.gs', $codeGs), @('docs/config.js', $configJs), @('docs/api.js', $apiJs), @('docs/專案現況.md', $statusDoc))) {
  if ($null -eq $required[1]) { [void]$problems.Add('找不到檔案：' + $required[0]) }
}

# 1. 教師信箱
if ($configJs -and $codeGs) {
  $front = [regex]::Match($configJs, 'teacherEmails\s*:\s*\[([^\]]*)\]')
  $back = [regex]::Match($codeGs, 'TEACHER_EMAILS\s*=\s*\[([^\]]*)\]')
  if (-not $front.Success) { [void]$problems.Add('docs/config.js 找不到 teacherEmails 清單') }
  if (-not $back.Success) { [void]$problems.Add('Code.gs 找不到 TEACHER_EMAILS 清單') }
  if ($front.Success -and $back.Success) {
    $fe = Get-QuotedList $front.Groups[1].Value
    $be = Get-QuotedList $back.Groups[1].Value
    if ($fe.Count -eq 0 -or $be.Count -eq 0) {
      [void]$problems.Add('教師信箱清單是空的（config.js ' + $fe.Count + ' 個，Code.gs ' + $be.Count + ' 個）')
    } elseif (Compare-AsSet $fe $be) {
      [void]$passes.Add('教師信箱一致（' + $fe.Count + ' 個）')
    } else {
      [void]$problems.Add('教師信箱不一致：config.js = ' + ($fe -join ', ') + '；Code.gs = ' + ($be -join ', '))
    }
  }
}

# 2. 前端呼叫的後端動作都要有 case
if ($codeGs) {
  $handler = Get-TopLevelFunctionBody $codeGs 'handleRequest_'
  if (-not $handler) {
    [void]$problems.Add('Code.gs 找不到 handleRequest_')
  } else {
    $backActions = @{}
    foreach ($m in [regex]::Matches($handler, 'case\s+''(\w+)''\s*:')) { $backActions[$m.Groups[1].Value] = $true }
    foreach ($m in [regex]::Matches($handler, 'action\s*===\s*''(\w+)''')) { $backActions[$m.Groups[1].Value] = $true }
    $frontActions = @{}
    $callPattern = '(?:postOnce_|postAction|jsonpGet|CloudStore\.request|CloudStore\.classroomWork|CloudStore\.handoutCheck)\(\s*''(\w+)'''
    foreach ($name in $frontFiles.Keys) {
      foreach ($m in [regex]::Matches($frontFiles[$name], $callPattern)) {
        $action = $m.Groups[1].Value
        if (-not $frontActions.ContainsKey($action)) { $frontActions[$action] = $name }
      }
    }
    if ($backActions.Count -eq 0) { [void]$problems.Add('handleRequest_ 裡讀不到任何 case，無法比對後端動作') }
    if ($frontActions.Count -eq 0) { [void]$problems.Add('docs/*.js 讀不到任何後端動作呼叫，無法比對') }
    $missing = @($frontActions.Keys | Where-Object { -not $backActions.ContainsKey($_) } | Sort-Object)
    foreach ($action in $missing) {
      [void]$problems.Add('前端 ' + $frontActions[$action] + ' 呼叫後端動作「' + $action + '」，但 Code.gs handleRequest_ 沒有這個 case')
    }
    if ($backActions.Count -gt 0 -and $frontActions.Count -gt 0 -and $missing.Count -eq 0) {
      [void]$passes.Add('後端動作都有對應（前端 ' + $frontActions.Count + ' 個，後端 ' + $backActions.Count + ' 個）')
    }
  }
}

# 3. 成績類別清單
if ($apiJs -and $codeGs) {
  $front = [regex]::Match($apiJs, 'GRADE_BOOK_KEYS_\s*=\s*\[([^\]]*)\]')
  $body = Get-TopLevelFunctionBody $codeGs 'removeCloudDeletedCols_'
  $back = $null
  if ($body) { $back = [regex]::Match($body, '\[((?:\s*''\w+''\s*,?)+)\]\.forEach') }
  if (-not $front.Success) { [void]$problems.Add('docs/api.js 找不到 GRADE_BOOK_KEYS_') }
  if (-not $back -or -not $back.Success) { [void]$problems.Add('Code.gs removeCloudDeletedCols_ 裡找不到成績類別清單') }
  if ($front.Success -and $back -and $back.Success) {
    $fk = Get-QuotedList $front.Groups[1].Value
    $bk = Get-QuotedList $back.Groups[1].Value
    if (Compare-AsSet $fk $bk) {
      [void]$passes.Add('成績類別一致（' + ($fk -join ', ') + '）')
    } else {
      [void]$problems.Add('成績類別不一致：api.js = ' + ($fk -join ', ') + '；Code.gs = ' + ($bk -join ', '))
    }
  }
}

# 4. 文件表格列出的成對函式都要存在
if ($statusDoc) {
  $section = [regex]::Match($statusDoc, '(?s)<!--\s*sync-pairs:start\s*-->(.*?)<!--\s*sync-pairs:end\s*-->')
  if (-not $section.Success) {
    [void]$problems.Add('docs/專案現況.md 找不到 sync-pairs 標記，無法讀取成對規則')
  } else {
    $pairCount = 0
    foreach ($line in ($section.Groups[1].Value -split '\r?\n')) {
      $trim = $line.Trim()
      if (-not $trim.StartsWith('|')) { continue }
      $cells = @($trim.Trim('|').Split('|') | ForEach-Object { $_.Trim() })
      if ($cells.Count -lt 3) { continue }
      $sides = @()
      foreach ($cell in @($cells[1], $cells[2])) {
        $ticks = @([regex]::Matches($cell, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value })
        if ($ticks.Count -ne 2) { $sides = $null; break }
        $sides += ,@($ticks[0], $ticks[1])
      }
      if ($null -eq $sides -or $sides.Count -ne 2) { continue }
      $pairCount += 1
      foreach ($side in $sides) {
        $file = $side[0]
        $fn = $side[1]
        $text = $null
        if ($file -eq 'Code.gs') { $text = $codeGs } elseif ($frontFiles.ContainsKey($file)) { $text = $frontFiles[$file] }
        if ($null -eq $text) {
          [void]$problems.Add('成對規則「' + $cells[0] + '」指到不存在的檔案：' + $file)
        } elseif (-not (Test-FunctionDefined $text $fn)) {
          [void]$problems.Add('成對規則「' + $cells[0] + '」：' + $file + ' 找不到函式 ' + $fn)
        }
      }
    }
    if ($pairCount -eq 0) {
      [void]$problems.Add('sync-pairs 表格讀不到任何成對函式（每格要是 `檔名` `函式名`）')
    } else {
      [void]$passes.Add('成對函式表共 ' + $pairCount + ' 組')
    }
  }
}

foreach ($p in $passes) { Write-Output ('通過：' + $p) }
foreach ($p in $problems) { Write-Output ('問題：' + $p) }
if ($problems.Count -gt 0) {
  Write-Output ('前後端同步檢查失敗，共 ' + $problems.Count + ' 個問題。')
  exit 1
}
Write-Output '前後端同步檢查通過。這只確認名稱與設定對得上，兩邊邏輯是否相同仍要人工對照。'
exit 0

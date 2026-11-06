# 前後端同步檢查的自我測試：用暫存資料夾裡的假專案（合成資料），故意弄壞一處，確認檢查真的會失敗。
$ErrorActionPreference = 'Stop'
$Checker = Join-Path $PSScriptRoot 'check-front-back-sync.ps1'
$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$script:Pass = 0
$script:Fail = 0
$script:Roots = New-Object System.Collections.Generic.List[string]

$BaseFiles = @{
  'docs\config.js' = @'
window.SEAT_CONFIG = {
  teacherEmails: ['teacher-a@example.test', 'teacher-b@example.test']
};
'@
  'docs\cloud.js' = @'
(function (global) {
  function postOnce_(action, body) { return action; }
  function postAction(action, body) { return action; }
  global.CloudStore = {
    verifyAuth: function () { return postAction('verifyAuth', {}); },
    getStore: function () { return postOnce_('getStore', {}); },
    putStore: function (store) { return postAction('putStore', { store: store }); }
  };
})(window);
'@
  'docs\api.js' = @'
(function () {
  var GRADE_BOOK_KEYS_ = ['yellow', 'exams', 'homeworks'];
  function pushCloud_(store) { return store; }
  function mergeConduct_(a, b) { return a; }
})();
'@
  'docs\config.example.js' = @'
window.SEAT_CONFIG = { teacherEmails: ['only-example@example.test'] };
'@
  'Code.gs' = @'
const TEACHER_EMAILS = ['TEACHER-B@example.test', 'teacher-a@example.test'];

function handleRequest_(req) {
  var action = String(req.action || 'getStore');
  if (action === 'verifyAuth') {
    return { ok: true };
  }
  switch (action) {
    case 'getStore':
      return {};
    case 'putStore':
      return {};
    case 'repairGroups':
      return {};
    default:
      return { ok: false };
  }
}

function putCloudStore(store) {
  return store;
}

function removeCloudDeletedCols_(book) {
  ['yellow', 'exams', 'homeworks'].forEach(function (key) {
    book[key] = book[key] || [];
  });
  return book;
}

function mergeCloudConduct_(local, remote) {
  return local;
}
'@
  'docs\專案現況.md' = @'
# 測試用現況

<!-- sync-pairs:start -->
| 規則 | 前端 | 後端 | 不一致會怎樣 |
| --- | --- | --- | --- |
| 上傳前保護 | `api.js` `pushCloud_` | `Code.gs` `putCloudStore` | 資料被清掉 |
| 常規紀錄合併 | `api.js` `mergeConduct_` | `Code.gs` `mergeCloudConduct_` | 紀錄復活 |
<!-- sync-pairs:end -->
'@
}

function New-FakeProject {
  param([hashtable]$Overrides, [string[]]$Remove)
  $root = Join-Path ([System.IO.Path]::GetTempPath()) ('sync-check-' + [guid]::NewGuid().ToString('n'))
  [void]$script:Roots.Add($root)
  $utf8 = New-Object System.Text.UTF8Encoding $false
  foreach ($rel in $BaseFiles.Keys) {
    if ($Remove -and ($Remove -contains $rel)) { continue }
    $content = $BaseFiles[$rel]
    if ($Overrides -and $Overrides.ContainsKey($rel)) { $content = & $Overrides[$rel] $content }
    $path = Join-Path $root $rel
    $dir = Split-Path -Parent $path
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($path, $content, $utf8)
  }
  return $root
}

function Invoke-Checker {
  param([string]$Root)
  $outFile = [System.IO.Path]::GetTempFileName()
  $errFile = [System.IO.Path]::GetTempFileName()
  $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Checker, '-Root', $Root)
  $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Wait -PassThru -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError $errFile
  $text = [System.IO.File]::ReadAllText($outFile, [System.Text.Encoding]::UTF8) + [System.IO.File]::ReadAllText($errFile, [System.Text.Encoding]::UTF8)
  Remove-Item -LiteralPath $outFile, $errFile -Force -ErrorAction SilentlyContinue
  return @{ Code = $proc.ExitCode; Text = $text }
}

function Assert-Result {
  param([string]$Label, [string]$Root, [int]$ExpectedCode, [string]$MustContain)
  $r = Invoke-Checker $Root
  $ok = ($r.Code -eq $ExpectedCode)
  if ($ok -and $MustContain -and ($r.Text -notlike ('*' + $MustContain + '*'))) { $ok = $false }
  if ($ok) {
    $script:Pass++
    Write-Output ('PASS ' + $Label)
  } else {
    $script:Fail++
    Write-Output ('FAIL ' + $Label + ' (exit ' + $r.Code + ', expected ' + $ExpectedCode + ')')
    Write-Output $r.Text
  }
}

try {
  # 正向
  Assert-Result '一致的假專案會通過' (New-FakeProject) 0 '前後端同步檢查通過'
  Assert-Result '真正的倉庫會通過' $RepoRoot 0 '前後端同步檢查通過'

  # 邊界：這些差異不算錯
  Assert-Result '教師信箱大小寫與順序不同仍通過' (New-FakeProject) 0 '教師信箱一致'
  Assert-Result '後端多出前端沒用到的動作仍通過' (New-FakeProject) 0 '後端動作都有對應'
  Assert-Result 'config.example.js 的範例信箱不納入比對' (New-FakeProject) 0 '教師信箱一致'

  # 反向：每一種漂移都要被抓到
  Assert-Result '教師信箱少一個會失敗' (New-FakeProject @{
    'Code.gs' = { param($t) $t.Replace("'TEACHER-B@example.test', ", '') }
  }) 1 '教師信箱不一致'

  Assert-Result '前端呼叫後端沒有的動作會失敗' (New-FakeProject @{
    'docs\cloud.js' = { param($t) $t.Replace("postOnce_('getStore', {})", "postOnce_('getStoreFake', {})") }
  }) 1 'getStoreFake'

  Assert-Result '後端刪掉前端還在用的動作會失敗' (New-FakeProject @{
    'Code.gs' = { param($t) $t.Replace("    case 'putStore':`n      return {};`n", '').Replace("    case 'putStore':`r`n      return {};`r`n", '') }
  }) 1 'putStore'

  Assert-Result '後端成對函式改名會失敗' (New-FakeProject @{
    'Code.gs' = { param($t) $t.Replace('function mergeCloudConduct_(', 'function mergeCloudConductOld_(') }
  }) 1 'mergeCloudConduct_'

  Assert-Result '前端成對函式被刪掉會失敗' (New-FakeProject @{
    'docs\api.js' = { param($t) $t.Replace('  function pushCloud_(store) { return store; }', '') }
  }) 1 'pushCloud_'

  Assert-Result '成績類別兩邊不同會失敗' (New-FakeProject @{
    'docs\api.js' = { param($t) $t.Replace("['yellow', 'exams', 'homeworks']", "['yellow', 'exams', 'homeworks', 'essays']") }
  }) 1 '成績類別不一致'

  Assert-Result '表格標記被刪掉會失敗，不會默默通過' (New-FakeProject @{
    'docs\專案現況.md' = { param($t) $t.Replace('<!-- sync-pairs:start -->', '') }
  }) 1 'sync-pairs'

  Assert-Result '表格格式錯到讀不到任何一組會失敗' (New-FakeProject @{
    'docs\專案現況.md' = { param($t) $t.Replace('`api.js` `pushCloud_`', 'pushCloud_').Replace('`api.js` `mergeConduct_`', 'mergeConduct_') }
  }) 1 '讀不到任何成對函式'

  Assert-Result '表格指到不存在的檔案會失敗' (New-FakeProject @{
    'docs\專案現況.md' = { param($t) $t.Replace('`api.js` `mergeConduct_`', '`missing.js` `mergeConduct_`') }
  }) 1 'missing.js'

  Assert-Result '教師信箱清單是空的會失敗' (New-FakeProject @{
    'docs\config.js' = { param($t) "window.SEAT_CONFIG = { teacherEmails: [] };" }
  }) 1 '教師信箱清單是空的'

  Assert-Result '缺少 Code.gs 會失敗' (New-FakeProject -Remove @('Code.gs')) 1 '找不到檔案'

  Write-Output ('PASSED ' + $script:Pass)
  Write-Output ('FAILED ' + $script:Fail)
  if ($script:Fail -gt 0) { exit 1 }
  exit 0
} finally {
  foreach ($root in $script:Roots) { Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue }
}

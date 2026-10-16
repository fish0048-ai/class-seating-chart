# 課堂測分貝（安靜監測）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在座位表工具列加「測分貝」面板，用本機麥克風做綠／黃／紅安靜監測（相對音量），門檻可調並存這台裝置。

**Architecture:** 比照既有 `#timerPanel`／`toggleTimerPanel` 模式。按「開始」才 `getUserMedia`＋`AnalyserNode` 算 RMS，映射 0～100 後對照門檻上色；停止與離頁關閉麥克風。不寫雲端。

**Tech Stack:** vanilla JS in `docs/app.js`、Web Audio API、`localStorage`；無新依賴。

**Spec:** `docs/superpowers/specs/2026-10-16-noise-meter-design.md`

## Global Constraints

- 正式碼只改 `docs/`；不必改 `Code.gs`
- 不錄音、不上傳、不寫 `store`／Apps Script
- 腳本順序：`config.js` → `cloud.js` → `api.js` → `auth.js` → `app.js`
- 改 `app.js` 後必須確認座位卡仍顯示
- Commit 繁體中文 `<type>: <主旨>`；完成後 push
- UI 必須註明「相對參考，非專業分貝計；不會錄音或上傳」
- 收合面板不自動停麥克風；明確「停止」或離頁才關

## File map

| 檔案 | 職責 |
| --- | --- |
| `docs/index.html` | 工具列按鈕＋`#noisePanel` |
| `docs/styles.css` | 面板與綠黃紅色塊 |
| `docs/app.js` | 開關、RMS、門檻、localStorage、清理 |
| `docs/專案現況.md` | 功能說明 |

---

### Task 1: 面板 UI（尚不開麥克風）

**Files:**
- Modify: `docs/index.html`（定時按鈕旁、timerPanel 後）
- Modify: `docs/styles.css`
- Modify: `docs/app.js`（展開／收合、門檻滑桿寫入 App 狀態與 localStorage）

**Interfaces:**
- Produces:
  - `#btnNoise`、`#noisePanel`、`#noiseLevelFace`、`#noiseStatus`、`#noiseThreshold`、`#btnNoiseStart`、`#btnNoiseStop`、`#btnNoiseHide`
  - `App.noiseOpen`、`App.noiseThreshold`（30～90，預設 60）
  - `NOISE_LS_KEY = 'class-seating-noise-threshold'`
  - `toggleNoisePanel()`、`hideNoisePanel()`、`renderNoiseUi()`（此任務色塊固定顯示「尚未開始」）

- [ ] **Step 1: HTML**

在 `btnTimer` 後插入：

```html
<button type="button" class="tool" id="btnNoise" aria-pressed="false">測分貝</button>
```

在 `#timerPanel` 結束標籤後插入：

```html
<section id="noisePanel" class="noise-panel" hidden aria-label="課堂測分貝">
  <div id="noiseLevelFace" class="noise-face noise-level-idle" data-noise-level="idle">
    <p class="noise-label">課堂音量</p>
    <div id="noiseDisplay" class="noise-display" aria-live="polite">—</div>
    <p id="noiseStatus" class="noise-status">按開始後會使用麥克風（相對參考）</p>
  </div>
  <div class="noise-controls">
    <label class="noise-threshold-label">太吵門檻
      <input id="noiseThreshold" type="range" min="30" max="90" value="60" />
      <span id="noiseThresholdVal">60</span>
    </label>
    <p class="hint noise-privacy">相對參考，非專業分貝計；不會錄音或上傳。不同麥克風請調整門檻。</p>
    <div class="noise-actions">
      <button type="button" class="tool primary" id="btnNoiseStart">開始</button>
      <button type="button" class="tool" id="btnNoiseStop" disabled>停止</button>
      <button type="button" class="tool" id="btnNoiseHide">收合</button>
    </div>
  </div>
</section>
```

- [ ] **Step 2: CSS**

參考 `.timer-panel` 風格新增（頂層，勿塞進無關 `@media`）：

```css
.noise-panel { /* 與 timer-panel 類似的 padding／圓角／邊框 */ }
.noise-panel[hidden] { display: none; }
.noise-face {
  text-align: center;
  padding: 16px;
  border-radius: 16px;
  transition: background 0.2s, color 0.2s;
}
.noise-level-idle { background: #eef2f5; color: #334; }
.noise-level-green { background: #d8f5d8; color: #146c2e; }
.noise-level-yellow { background: #fff3cd; color: #7a4d00; }
.noise-level-red { background: #fde8e8; color: #8a1f1f; }
.noise-display { font-size: 2.4rem; font-weight: 800; }
.noise-controls { margin-top: 12px; display: grid; gap: 10px; }
.noise-threshold-label { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.noise-actions { display: flex; flex-wrap: wrap; gap: 8px; }
```

- [ ] **Step 3: app.js 狀態與面板開關**

在 `App` 初始化附近加：

```javascript
noiseOpen: false,
noiseRunning: false,
noiseThreshold: 60,
noiseScore: 0, // 0~100 smoothed
noiseLevel: 'idle' // idle|green|yellow|red
```

`els` 註冊 `btnNoise`、`noisePanel` 等。讀門檻：

```javascript
function readNoiseThreshold_() {
  try {
    var n = Number(localStorage.getItem('class-seating-noise-threshold'));
    if (isFinite(n)) return Math.max(30, Math.min(90, Math.round(n)));
  } catch (e) {}
  return 60;
}
function saveNoiseThreshold_(n) {
  App.noiseThreshold = Math.max(30, Math.min(90, Math.round(Number(n) || 60)));
  try { localStorage.setItem('class-seating-noise-threshold', String(App.noiseThreshold)); } catch (e) {}
}
```

`renderNoiseUi`：同步面板 hidden、`btnNoise` aria-pressed、滑桿值、顯示文字（此任務未 running 時為「—」／「尚未開始」）、開始／停止 disabled。

`toggleNoisePanel`／`hideNoisePanel`：只切 `App.noiseOpen`，**不要**停麥克風（Task 2 才有 mic；此任務預留註解即可）。

綁定：`btnNoise` click → toggle；`btnNoiseHide` → hide；`noiseThreshold` input → save＋更新 `#noiseThresholdVal`。

啟動時 `App.noiseThreshold = readNoiseThreshold_()`。

- [ ] **Step 4: 驗證 UI**

用 seat-check `base` 或瀏覽器：有「測分貝」按鈕、可展開／收合、滑桿改數字、座位卡仍在。開始／停止按鈕此任務可先 toast「下一版接麥克風」或留空等 Task 2——**Prefer：按鈕先綁空函式 stub `startNoiseMeter`／`stopNoiseMeter`，Task 2 填實作**。

- [ ] **Step 5: Commit**

```bash
git add docs/index.html docs/styles.css docs/app.js
git commit -m "feat: 新增測分貝面板（展開收合與門檻設定）"
git push origin master
```

---

### Task 2: 麥克風監測、顏色、清理與文件

**Files:**
- Modify: `docs/app.js`（填實 `startNoiseMeter`／`stopNoiseMeter`／動畫迴圈）
- Modify: `docs/專案現況.md`

**Interfaces:**
- Consumes: Task 1 的 DOM、`App.noise*`、`renderNoiseUi`
- Produces:
  - `noiseAudio_ = { ctx, stream, analyser, raf, data }`（模組內 var）
  - `rmsToScore_(rms) -> 0..100`
  - `scoreToLevel_(score, red) -> 'green'|'yellow'|'red'`（黃線＝紅×0.7）
  - 離頁 `pagehide`／`visibility` 可選：隱藏時不停亦可，但 `pagehide` 必須 `stopNoiseMeter`

- [ ] **Step 1: 對應公式（實作於 app.js）**

```javascript
function rmsToScore_(rms) {
  // rms ~ 0..1；dBFS = 20*log10(rms)；映射約 -60..0 → 0..100
  if (!rms || rms <= 0) return 0;
  var db = 20 * Math.log10(rms);
  var score = (db + 60) * (100 / 60);
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

function scoreToLevel_(score, red) {
  red = Math.max(30, Math.min(90, Number(red) || 60));
  var yellow = red * 0.7;
  if (score >= red) return 'red';
  if (score >= yellow) return 'yellow';
  return 'green';
}

var LEVEL_TEXT = {
  idle: '尚未開始',
  green: '安靜',
  yellow: '有點吵',
  red: '太吵了'
};
```

平滑：`App.noiseScore = App.noiseScore * 0.8 + score * 0.2`（開始時可先賦值）。

- [ ] **Step 2: start／stop**

```javascript
function stopNoiseMeter() {
  if (noiseAudio_ && noiseAudio_.raf) cancelAnimationFrame(noiseAudio_.raf);
  if (noiseAudio_ && noiseAudio_.stream) {
    noiseAudio_.stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
  }
  if (noiseAudio_ && noiseAudio_.ctx) {
    try { noiseAudio_.ctx.close(); } catch (e) {}
  }
  noiseAudio_ = null;
  App.noiseRunning = false;
  App.noiseLevel = 'idle';
  App.noiseScore = 0;
  renderNoiseUi();
}

function startNoiseMeter() {
  if (App.noiseRunning) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('這個瀏覽器不支援麥克風測分貝');
    return;
  }
  App.noiseOpen = true;
  navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  }).then(function (stream) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    var ctx = new Ctx();
    var source = ctx.createMediaStreamSource(stream);
    var analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    // 不要 connect 到 destination，避免回授
    var data = new Float32Array(analyser.fftSize);
    noiseAudio_ = { ctx: ctx, stream: stream, analyser: analyser, raf: 0, data: data };
    App.noiseRunning = true;
    App.noiseScore = 0;
    renderNoiseUi();
    function tick() {
      if (!noiseAudio_ || !App.noiseRunning) return;
      noiseAudio_.analyser.getFloatTimeDomainData(noiseAudio_.data);
      var sum = 0;
      for (var i = 0; i < noiseAudio_.data.length; i++) {
        var v = noiseAudio_.data[i];
        sum += v * v;
      }
      var rms = Math.sqrt(sum / noiseAudio_.data.length);
      var instant = rmsToScore_(rms);
      App.noiseScore = App.noiseScore * 0.8 + instant * 0.2;
      App.noiseLevel = scoreToLevel_(App.noiseScore, App.noiseThreshold);
      renderNoiseUi();
      noiseAudio_.raf = requestAnimationFrame(tick);
    }
    noiseAudio_.raf = requestAnimationFrame(tick);
    toast('測分貝已開始');
  }).catch(function () {
    toast('請允許麥克風後再按開始');
    stopNoiseMeter();
  });
}
```

`hideNoisePanel`：**只** `App.noiseOpen = false; renderNoiseUi();`（不呼叫 stop）。

`pagehide`（或既有 unload 旁）加 `stopNoiseMeter()`。

`renderNoiseUi` 補：依 `noiseLevel` 切 `noise-level-*` class；`#noiseDisplay` 顯示 `Math.round(App.noiseScore)` 或 idle 時「—」；`#noiseStatus` 用 `LEVEL_TEXT`；開始／停止 disabled 狀態。

- [ ] **Step 3: 文件**

`docs/專案現況.md` 上課模式條列加：

```markdown
- **測分貝**：工具列展開面板；開始後用本機麥克風做綠／黃／紅安靜監測（相對音量，可調門檻；不錄音、不上雲端）
```

- [ ] **Step 4: 驗證**

1. seat-check `base`：`seatCards > 0`、無 JS error；DOM 有 `#noisePanel`  
2. 若環境有 mic／HTTPS：手動開始→色塊變化→停止後麥克風關  
3. 拒絕權限：有 toast、頁面不掛  
4. 重新整理：門檻仍在  

無頭 Chrome 通常沒有真麥克風；至少驗證 UI 與無錯誤。手動 mic 測在報告註明已測／未測。

- [ ] **Step 5: Commit**

```bash
git add docs/app.js docs/專案現況.md docs/styles.css
git commit -m "feat: 測分貝可監測課堂音量並以綠黃紅提醒"
git push origin master
```

---

## Spec coverage

| Spec | Task |
| --- | --- |
| 工具列＋定時式面板 | 1 |
| 綠黃紅＋狀態文字 | 2 |
| 開始／停止、門檻滑桿、localStorage | 1+2 |
| 隱私說明 | 1 |
| getUserMedia＋RMS、不接 destination | 2 |
| 收合不停、停止／離頁關 mic | 2 |
| 不改 Code.gs、不寫 store | 全計畫 |
| 專案現況 | 2 |
| 座位卡仍在 | 每任務驗證 |

## Self-review

- 無 TBD
- 黃線＝紅×0.7 與 spec 一致
- `stopNoiseMeter` 命名 Task 1 stub／Task 2 實作一致

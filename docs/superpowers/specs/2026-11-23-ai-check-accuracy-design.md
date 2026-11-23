# AI 檢查作業：提升判讀準確度

日期：2026-11-23  
狀態：已實作  
相關：AI 檢查作業（`Code.gs` `handoutCheckPrompt_`／`aiVerdict_`／`callGemini_`）

## 目標

減少「有寫完卻判沒寫完」「有原因卻判缺原因」「清楚卻判看不清」等誤判；在老師已有 Google AI Pro 的前提下，用較強模型，並採「沒把握寧可給通過」。

## 決策

| 項目 | 決定 |
| --- | --- |
| 方向 | 換強模型＋收緊「未通過」條件（方案 1） |
| 沒把握時 | 寧可多標「通過」，少冤枉學生 |
| 樣張對照 | 這次不做，之後可另開 |
| 評分答案對錯 | 不做（維持只查寫完／錯題原因／清楚） |

## 模型

呼叫順序：

1. 指令碼屬性 `GEMINI_MODEL`（手動覆寫時優先）  
2. `gemini-2.5-pro`  
3. 備援：`gemini-2.5-flash` → `gemini-flash-latest`（及現有可用備援）

`AI_MODEL_OK` 仍會記住上次成功的模型；Pro 可用時應以 Pro 為主。老師有 Google AI Pro／付費金鑰。

## 判定原則

| 情況 | 結果 |
| --- | --- |
| 明顯空白／沒寫完 | 未通過 |
| 明顯有錯題且沒寫錯誤原因 | 未通過 |
| 明顯不是這份講義／完全看不清 | 未通過 |
| 字跡或角度讓 AI 沒把握 | **通過**（`note` 可註「把握較低」；不再用「需確認」擋分數） |
| 其餘看完沒明顯問題 | 通過 |

分數規則不變：有繳交才算分；僅「未通過」扣 10（`AI_CHECK_ERROR_PENALTY`）。

## 實作範圍

### `Code.gs` `handoutCheckPrompt_`

- 硬規則：看不清、拿不定 → `all_answered`／`corrections_ok` 仍為 true；`confident=false`；不要猜空白或缺原因  
- 只有「很確定」才填 `missing`／`wrong_without_reason`  
- 例題／好題示例仍要寫；已印好答案處不用寫  
- 仍不評分答案對錯；只回 JSON

### `Code.gs` `aiVerdict_`

- `confident === false` 且未觸發未通過條件 → 狀態 **通過**（不再「需確認」）  
- 可自動在 `note` 補「把握較低，建議抽查」（若 note 尚未提及）  
- 工作表／舊列若仍有「需確認」，前端顯示邏輯保留，不強制清庫

### `Code.gs` `AI_MODELS_`／`callGemini_`

- 預設清單改為 Pro 優先，再 flash 備援  
- `GEMINI_MODEL` 仍可覆寫

### 文件

- `docs/專案現況.md`：補 Pro 優先、沒把握當通過

## 不做

- 不上傳空白樣張／標準頁對照  
- 不改 Classroom 繳交／缺交判斷、不改寫入 Classroom 流程  
- 不改遲交扣分公式

## 驗證

1. Apps Script `testGemini`：金鑰與模型可用  
2. 部署新版 `Code.gs` 後，挑一份講義「全部重新檢查」或「檢查新繳交的」  
3. 對照先前常誤判的幾位：應多為通過；整頁空白仍未通過  
4. 若有前端文案微調，雲端 Playwright 通過  

## 部署

改 `Code.gs` 後：貼上 Apps Script → 管理部署 → 編輯現有 → 新版本（`/exec` 不變）。可選設 `GEMINI_MODEL=gemini-2.5-pro`。

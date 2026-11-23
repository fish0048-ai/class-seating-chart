# AI 檢查準確度 Implementation Plan

> **For agentic workers:** Use executing-plans / implement task-by-task. Steps use checkbox syntax.

**Goal:** Pro 模型優先；沒把握給通過；只在很確定時未通過。

**Architecture:** 改 `Code.gs` 模型清單、提示詞、`aiVerdict_`；更新 `專案現況.md`。

**Tech Stack:** Apps Script + Gemini API

## Global Constraints

- 對照 `docs/superpowers/specs/2026-11-23-ai-check-accuracy-design.md`
- 改 Code.gs 後提醒部署
- Commit 繁中；經 PR 合併

---

### Task 1: 模型、提示詞、verdict

**Files:** `Code.gs`, `docs/專案現況.md`, spec 狀態改已實作

- [ ] `AI_MODELS_` → `['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash']`
- [ ] `callGemini_` 順序：`GEMINI_MODEL` → `AI_MODELS_` → `AI_MODEL_OK`（避免舊 flash 快取蓋掉 Pro）
- [ ] `handoutCheckPrompt_` 加「沒把握當有寫完／有原因」硬規則
- [ ] `aiVerdict_`：`confident === false` → 通過；note 補把握較低
- [ ] 更新專案現況模型／需確認描述；spec 狀態「已實作」
- [ ] PR 合併並提醒部署

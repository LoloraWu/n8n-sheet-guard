# Workflow B/C 重設計規劃（全分頁掃描 + AI 判斷 + 分頁快取）

本文件整理自 `專案開發計畫書：LINE 填寫自動化監測助理.md` 與你在討論中補充的需求，目標是讓：

- Workflow B（Dashboard 即時查詢）能對「使用者註冊的每個 spreadsheet」做「**所有分頁(tab)掃描**」
- 因為「每個 sheet / 每個 tab 格式可能不同」，改用 AI 做「欄位語意推論 + 缺漏判定」
- 採用「**保險（寧可少報缺）**」策略：對 AI 不確定欄位（如備註）不算 missing，但提供提醒文字
- Workflow C（Cron 推播）與 B **共用同一套掃描/判定邏輯**，避免 Dashboard 與推播不一致

---

## 1. 需求摘要（User Scenarios 對應）

### 情境 A：註冊/設定（LIFF Register）
- 使用者只會提供 **Google Sheet 連結**（不指定分頁）。
- 後端必須：
  - 從 URL 解析 `spreadsheetId`
  - 驗證是否可存取（權限檢查）
  - 寫入 `Master_Sync`：`Target_Sheet_IDs`、`Aliases`…等

### 情境 C：Dashboard 即時查詢（LIFF Dashboard）
- 使用者打開 Dashboard 時呼叫 Workflow B
- 後端必須對所有 tabs 做判斷，回傳：
  - 今日狀態（summary）
  - 缺漏清單（reports）：**同一個 tab 若有 3 個欄位未填 → 產生 3 筆 report item**
  - 對於不確定欄位（備註類）提供 advisories（提醒使用者自行檢查）

### 情境 B：定時推播（Cron）
Workflow C 每天 21/22/23 點掃描，判斷邏輯必須與 B 一致。

---

## 2. 目前 repo 現況與缺口（需要補）

### 2.1 Workflow A（User Register）目前解析錯誤
前端 `frontend/src/views/Register.vue` 送：

- `sheetUrls: [{ name, url, tags }]`

但 `backend/workflow-a-user-api*.json` 目前使用 `sheetUrls.map(s => s.id)` 當 spreadsheetId，會拿不到正確的 `Target_Sheet_IDs`。

### 2.2 Workflow B 目前不符合「全分頁掃描」
`backend/workflow-b-report-api.json` 目前只讀單一分頁（config 的 `sheet_name` 或預設 `Sheet1`），無法處理「同一 spreadsheet 多 tab、格式各異」。

---

## 3. 掃描範圍（已確認）

- **只掃使用者註冊的 spreadsheet**（`Target_Sheet_IDs`）
- 每個 spreadsheet **掃所有 tab**
- 防呆排除：
  - `hidden` tabs 一律不掃
  - tab 名稱剛好叫 `Master_Sync` 一律不掃（避免有人把 DB 分頁放進監測 sheet）

---

## 4. Report 輸出格式（人類可讀 + 可展開）

### 4.1 一行摘要（Dashboard 預設顯示）
範例：

- `12/01｜哈拉版玩家留言｜未填：一般留言(D4)｜原因：找到「Sin」在今日列，但該欄為空`

### 4.2 展開卡片（詳細）
- **Sheet**：`【蔚藍星球國王很忙】第二期12月專案`（附連結）
- **Tab**：`哈拉版玩家留言`
- **Missing**：`一般留言（D4）`（欄位名 + cellRef）
- **AI 說明**：`在 2025/12/01 對應 Sin 的資料列中，「一般留言」為空，判定未填`

### 4.3 不確定欄位的提醒（advisories）
採用「保險少報缺」：不確定欄位不算 missing，但會提示：

- `欄位註記為「備註」，請自行檢查是否缺漏。`

---

## 5. 分頁快取（sheetId + tabName key）要存什麼

快取存於 `Master_Sync.Sheet_Configs`（JSON 字串），key 使用：

- `"<spreadsheetId>::<tabName>"`

### 5.1 變動偵測方式
- **結構變動（欄位/表頭/欄序）**：靠 `headerFingerprint` 偵測
  - 若 header 變動 → 視為 config 失效 → 重新跑 AI schema inference
- **內容變動（今天有人填了）**：每次掃描都會讀到最新資料，不靠快取

### 5.2 建議快取 schema（示意）
```json
{
  "1abcDEF::哈拉版玩家留言": {
    "tabName": "哈拉版玩家留言",
    "tabSheetId": 123456789,

    "headerRowIndex": 1,
    "headerRange": "A1:AZ1",
    "headerFingerprint": "hdr:v1:colcount=26:...",

    "fieldSemantics": {
      "date": { "confidence": "high", "byHeader": "日期", "column": "A" },
      "name": { "confidence": "high", "byHeader": "LINE_ID", "column": "B" },
      "category": { "confidence": "medium", "byHeader": "分類", "column": "C" },

      "checkableHigh": [
        { "byHeader": "一般留言", "column": "D", "confidence": "high" },
        { "byHeader": "連結", "column": "E", "confidence": "high" }
      ],
      "checkableAdvisory": [
        { "byHeader": "備註", "column": "F", "confidence": "low" }
      ]
    },

    "ai": {
      "schemaPromptVersion": "schema-v2",
      "statusPromptVersion": "status-v3",
      "model": "gpt-4o-mini"
    },
    "updatedAt": "2026-01-08T12:34:56Z"
  }
}
```

---

## 6. Workflow B 設計（Dashboard 即時查詢）

### Input
- `GET /report-status?userId=...`

### Steps（高層）
1. 讀 `Master_Sync` 取 user（aliases、Target_Sheet_IDs、Sheet_Configs）
2. 對每個 spreadsheetId：
   - `spreadsheets.get` 列出 tabs（title、sheetId、hidden）
3. 對每個 tab：
   - 讀取 tab 資料（優先整張）
   - 若 tab 太大，觸發「自動降級讀取」（見 §8）
   - 計算 headerFingerprint，若快取不存在或變動 → AI 做 schema inference → 回寫快取
   - AI 做 status inference：找今日 + 別名匹配列，針對 `checkableHigh` 檢查缺漏
   - 對 `checkableAdvisory` 只輸出提醒，不算 missing
4. 彙總回傳：
   - `summary`（missing count、tabs scanned、warnings）
   - `reports[]`（每個缺漏欄位 1 筆）
   - `advisories[]`（每個 tab 0~N 筆提醒）

### Output（建議維持前端已使用格式）
```json
{
  "success": true,
  "data": {
    "summary": { "total": 12, "missing": 3, "completed": 9, "allCompleted": false },
    "reports": [
      {
        "headline": "12/01｜哈拉版玩家留言｜未填：一般留言(D4)｜原因：找到「Sin」在今日列，但該欄為空",
        "sheetTitle": "【蔚藍星球國王很忙】第二期12月專案",
        "sheetUrl": "https://docs.google.com/spreadsheets/d/1abcDEF",
        "tabName": "哈拉版玩家留言",
        "tabUrl": "https://docs.google.com/spreadsheets/d/1abcDEF/edit#gid=123456789",
        "missingFieldName": "一般留言",
        "cellRef": "D4",
        "category": "巴哈姆特討論區-一般留言",
        "aiSummary": "在 2025/12/01 對應 Sin 的資料列中，「一般留言」為空，判定未填"
      }
    ],
    "advisories": [
      {
        "sheetTitle": "【蔚藍星球國王很忙】第二期12月專案",
        "tabName": "哈拉版玩家留言",
        "note": "欄位註記為「備註」，請自行檢查是否缺漏。"
      }
    ],
    "warnings": []
  },
  "error": null
}
```

---

## 7. Workflow C 設計（Cron 推播）

Workflow C 重用 B 的掃描/判斷流程（列 tabs → 讀資料 → schema cache → status inference），差異是：

- 只在 `reports[].status == missing` 時推播
- 推播內容以缺漏 items 為主，並可在最後附上 advisories 的摘要提醒

---

## 8. 重要：你選「整張都讀」的風險與保護機制

整張讀取在大型 tab（成千上萬列）會產生兩個問題：

1. Google Sheets API 讀取時間/額度
2. 丟給 LLM 的 token/cost 會爆炸

因此要加「**自動降級**」：\n
- 先取得 tab 的 usedRange cells 估算（或利用 gridProperties + 實際讀取回來的範圍）\n
- 超過上限（例如 50k 或 100k cells）時改為：\n
  - 讀表頭區（例如 `A1:AZ10`）\n
  - 再讀最後 N 列（例如最後 200 列）\n
  - 並在回應加 `warnings[]`：\n
    - `Tab 資料量過大，已改用『表頭+尾端』抽樣掃描，可能漏掉較早的今日資料。`\n
\n
> 這樣能兼顧你的偏好（優先整張），又避免系統在極端資料量下直接不可用。\n

---

## 9. 實作清單（要改哪些 workflow 檔）

- `backend/workflow-a-user-api-deploy.json`\n
  - 解析 `sheetUrls[].url` 抽 `spreadsheetId`\n
  - 權限驗證（最少讀 metadata 或讀 A1）\n
\n
- `backend/workflow-b-report-api.json`\n
  - 列出 tabs（Sheets API `spreadsheets.get`）\n
  - 逐 tab 讀取資料（整張優先 + 降級）\n
  - AI schema inference + per-tab cache（headerFingerprint）\n
  - AI status inference（輸出 per-missing-field reports + advisories）\n
\n
- `backend/workflow-c-cron-notifier.json`\n
  - 同步改成全 tab 掃描 + 共用 cache/降級策略\n
\n
（可選）Pending_Alias 流程需要額外 workflow（LINE postback）才能完成。\n

---

## 10. 驗收（用情境測）

1. 註冊只貼 spreadsheet URL：`Target_Sheet_IDs` 寫入正確，且不可讀時回明確錯誤\n
2. Dashboard：同一 tab 缺 3 欄位 → 看到 3 筆 report items；同時顯示 advisories\n
3. Cron 推播：與 Dashboard 判斷一致；遇到超大 tab 有 warnings 而不會整個失敗\n



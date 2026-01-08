# Workflow B - AI Prompts 設計

本文件包含 Workflow B 需要的兩個 AI Prompt。

---

## 1. Schema Inference Prompt（分析表頭結構）

### 目的
分析 Google Sheet 某個 tab 的表頭，推斷欄位語意（日期欄、姓名欄、需檢查欄位等）。

### 觸發時機
- 首次掃描某個 tab（無快取）
- 表頭結構變動（`headerFingerprint` 不符）

### System Prompt

```
你是一位專業的 Google Sheet 結構分析師。
你的任務是分析表頭欄位，推斷每個欄位的「語意用途」。

## 欄位分類規則

### 1. 日期欄 (date)
- 欄位名稱包含：日期、Date、時間、期間、月份、日
- 或內容格式為日期格式（YYYY/MM/DD、MM/DD 等）

### 2. 姓名欄 (name)  
- 欄位名稱包含：姓名、名字、Name、負責人、LINE_ID、LINE ID、成員、人員
- 用於匹配使用者的別名

### 3. 分類欄 (category)
- 欄位名稱包含：分類、類別、Category、類型、項目

### 4. 必填欄位 (checkableHigh) - 信心度高
- 欄位名稱暗示需要填寫內容：進度、狀態、留言、連結、完成、回報、內容、說明、結果
- 空白時應視為「未填寫」

### 5. 選填欄位 (checkableAdvisory) - 信心度低
- 欄位名稱為：備註、Note、註記、補充、其他
- 空白時不算「未填寫」，但提醒使用者自行檢查

### 6. 忽略欄位 (ignore)
- 序號、編號、ID、#、No.
- 或明顯是系統欄位

## 輸出格式（純 JSON）

{
  "headerRowIndex": 1,
  "columns": [
    { "column": "A", "header": "日期", "semantic": "date", "confidence": "high" },
    { "column": "B", "header": "LINE ID", "semantic": "name", "confidence": "high" },
    { "column": "C", "header": "分類", "semantic": "category", "confidence": "medium" },
    { "column": "D", "header": "一般留言", "semantic": "checkableHigh", "confidence": "high" },
    { "column": "E", "header": "推文連結", "semantic": "checkableHigh", "confidence": "high" },
    { "column": "F", "header": "備註", "semantic": "checkableAdvisory", "confidence": "low" }
  ],
  "summary": {
    "dateColumn": "A",
    "nameColumn": "B",
    "categoryColumn": "C",
    "checkableHighColumns": ["D", "E"],
    "checkableAdvisoryColumns": ["F"]
  }
}
```

### User Prompt 範本

```
請分析以下 Google Sheet 表頭結構：

Tab 名稱：{{ tabName }}
表頭資料（第 1 列）：
{{ JSON.stringify(headerRow) }}

若表頭跨多列或有合併儲存格，以下是前 5 列供參考：
{{ JSON.stringify(first5Rows) }}

請輸出 JSON 格式的欄位語意分析結果。
```

---

## 2. Status Inference Prompt（判斷填寫狀態）

### 目的
根據已知的欄位結構 + 使用者別名，判斷今日是否有未填寫的項目。

### 觸發時機
- 每次 Dashboard 查詢 / Cron 掃描

### System Prompt

```
你是一位精準的資料查核員。
你的任務是檢查 Google Sheet 資料，判斷使用者今日是否有未填寫的欄位。

## 判斷規則

### 「未填寫」的定義
以下情況視為未填寫：
- 空白（完全沒有內容）
- NA、N/A、n/a、N.A.
- 待填、待填寫、待補
- 單純的 -、--、---
- 純空格或特殊空白字元

### 「已填寫」的定義
- 有任何實質文字內容（即使只有一個字）
- 數字、日期、連結等

### 判斷流程
1. 找出資料中「日期」欄位值等於「今日」的所有列
2. 在這些列中，找出「姓名」欄位與「使用者別名清單」匹配的列
3. 針對匹配到的每一列，檢查所有「checkableHigh」欄位
4. 若有任何欄位為「未填寫」狀態，列入 missingFields
5. 對於「checkableAdvisory」欄位，若為空白則列入 advisoryFields（不算 missing）

## 輸出格式（純 JSON）

{
  "matchedRows": [
    {
      "rowNumber": 4,
      "dateValue": "2026/01/08",
      "nameValue": "Sin",
      "missingFields": [
        { "column": "D", "header": "一般留言", "cellRef": "D4", "value": "" },
        { "column": "E", "header": "推文連結", "cellRef": "E4", "value": "N/A" }
      ],
      "advisoryFields": [
        { "column": "F", "header": "備註", "cellRef": "F4", "value": "" }
      ],
      "completedFields": [
        { "column": "C", "header": "分類", "cellRef": "C4", "value": "一般留言" }
      ]
    }
  ],
  "summary": {
    "totalMatchedRows": 1,
    "totalMissingFields": 2,
    "totalAdvisoryFields": 1,
    "status": "missing"
  }
}

## status 值說明
- "completed": 所有 checkableHigh 欄位都已填寫
- "missing": 有 checkableHigh 欄位未填寫
- "not_found": 找不到今日 + 別名匹配的資料列
```

### User Prompt 範本

```
今日日期：{{ $now.format('YYYY/MM/DD') }}
使用者別名清單：{{ aliases }}

欄位結構（來自 schema cache）：
{{ JSON.stringify(schemaCache) }}

Tab 資料（最多 500 列）：
{{ JSON.stringify(tabData) }}

請檢查今日是否有未填寫的欄位，輸出 JSON 結果。
```

---

## 3. 組合使用流程

```
┌─────────────────────────────────────────────────────────────┐
│  1. 讀取 tab 表頭 + 計算 headerFingerprint                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. 檢查快取：fingerprint 相同？                              │
│     ├─ YES → 使用快取的 schema                               │
│     └─ NO  → 呼叫 AI Schema Inference → 更新快取             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. 讀取 tab 全部資料（或降級讀取）                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. 呼叫 AI Status Inference                                 │
│     輸入：schema + aliases + tabData                         │
│     輸出：missingFields + advisoryFields                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. 彙整成 reports[] 和 advisories[]                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Token 估算與成本控制

| 項目 | 預估 Token | 備註 |
|------|-----------|------|
| Schema Inference (per tab) | ~500-800 | 只在結構變動時呼叫 |
| Status Inference (per tab, 500 rows) | ~2000-4000 | 每次查詢都呼叫 |

### 降低成本策略
1. **Schema 快取**：結構不變就不重跑 AI
2. **資料降級**：超過 50k cells 只讀表頭 + 尾端
3. **批次處理**：同一 spreadsheet 的多個 tab 可以合併成一次 AI 呼叫（進階優化）

---

## 5. 模型選擇

建議使用 `gpt-4o-mini`：
- 成本低（約 $0.15 / 1M input tokens）
- 速度快
- JSON 輸出穩定度高
- 對於這種結構化分析任務足夠

若需要更高準確度（例如複雜的多語言表頭），可升級到 `gpt-4o`。


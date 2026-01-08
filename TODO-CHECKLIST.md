# 📋 部署待辦清單

## 📁 專案結構

```
n8n-sheet-guard/
├── 📋 TODO-CHECKLIST.md              ← 🔴 你在這裡！部署待辦清單
├── 📄 WORKFLOW_BC_REDESIGN_PLAN.md   ← 設計紀錄（參考用）
├── 📄 專案開發計畫書：LINE 填寫自動化監測助理.md  ← 原始需求
│
├── backend/
│   ├── workflow-a-user-api-v2.json      ← 要匯入 n8n
│   ├── workflow-b-report-api-v2.json    ← 要匯入 n8n
│   ├── workflow-c-cron-notifier-v2.json ← 要匯入 n8n
│   ├── workflow-health-check.json
│   ├── AI_PROMPTS.md                    ← AI Prompt 設計
│   ├── workflow-diagrams.md             ← 流程圖
│   └── README.md                        ← 後端說明
│
└── frontend/
    ├── src/views/Dashboard.vue  ← 記得改 USE_MOCK = false
    ├── src/views/Register.vue
    └── env-example.txt          ← 複製成 .env
```

---

## 1️⃣ n8n 憑證設定（Google Sheets OAuth2）✅ 已完成

### ✅ 已建立憑證
- **憑證名稱**：`n8n-sheet-guard-master`
- **憑證 ID**：`OwuGUbqIn3C7jgEQ`

### 使用到的 Workflow / Node
| Workflow | Node 名稱 |
|----------|----------|
| workflow-a-user-api-v2 | Check User Exists, Append New User, Update Existing User, Get User Profile |
| workflow-b-report-api-v2 | Get User Config, Get Spreadsheet Metadata, Read Tab Data, Read Tail Data |
| workflow-c-cron-notifier-v2 | Get All Users, Get Spreadsheet Metadata, Read Tab Data |

---

## 2️⃣ n8n 環境變數設定

### 自架 n8n 設定方式

在你的 `docker-compose.yml` 或啟動指令中加入：

```yaml
environment:
  - MASTER_SYNC_SHEET_ID=1Nn3tyYmGxioF6p_4i9vc6ABCn0NnsJu72FHC_Xlozxg
  - GEMINI_API_KEY=你的Gemini_API_Key
  - LINE_CHANNEL_ACCESS_TOKEN=你的LINE_Token
  - LIFF_ID=你的LIFF_ID
```

或在 n8n UI → **Settings** → **Variables** 新增。

### 取得 Gemini API Key
1. 前往 [Google AI Studio](https://aistudio.google.com/apikey)
2. 點 "Get API Key" → "Create API Key"
3. 複製 Key

---

## 3️⃣ LINE 設定 ✅ 已完成

### ✅ 已設定
- Messaging API channel 已建立
- `LINE_CHANNEL_ACCESS_TOKEN` 已寫入 .env

---

## 4️⃣ 前端設定

### 建立 .env
在 `frontend/` 目錄建立 `.env`：
```env
VITE_LIFF_ID=你的LIFF_ID
VITE_API_BASE_URL=https://你的n8n網址/webhook
```

### 關閉 Mock 模式
編輯 `frontend/src/views/Dashboard.vue`，第 4 行：
```javascript
const USE_MOCK = false;  // 改成 false
```

---

## 5️⃣ 匯入 Workflows

### 📊 推送狀態

| Workflow | 狀態 | 說明 |
|----------|------|------|
| **Workflow A** | ✅ 已推上去 | ID: `dhIQb8lkUjpCvz1R` |
| **Workflow B** | ⏳ 需手動匯入 | 20+ nodes，太大無法透過 MCP |
| **Workflow C** | ⏳ 需手動匯入 | 20+ nodes，太大無法透過 MCP |

### 📌 Workflow A 接下來要做的

Workflow A 已推上去但還沒啟用，你需要：

1. 進入 n8n → 找到 **"Workflow A - User API (v2)"**
2. 點進去 → 設定 **Google Sheets 憑證**（每個 Google Sheets node 都要設，選 `n8n-sheet-guard-master`）
3. **啟用** Workflow（右上角 Toggle）

### 📌 Workflow B & C 手動匯入步驟

1. 進入 n8n → **Workflows** → **Import from File**
2. 選擇 `backend/workflow-b-report-api-v2.json`
3. 點擊 **Import**
4. 設定每個 Google Sheets node 的憑證（選 `n8n-sheet-guard-master`）
5. **啟用** Workflow
6. 重複上述步驟匯入 `backend/workflow-c-cron-notifier-v2.json`

---

## 6️⃣ Master_Sync 欄位

確認你的 Google Sheet 有這些欄位：

| 欄位 | 說明 |
|------|------|
| Line_UID | LINE 使用者 ID |
| Real_Name | 真實姓名 |
| Aliases | 別名（逗號分隔）|
| Target_Sheet_IDs | 監測的 Sheet ID（逗號分隔）|
| **Sheet_Urls_JSON** | 完整 URL 資訊（JSON）← **新增** |
| Sheet_Configs | Schema 快取（JSON）|
| Created_At | 建立時間 |
| Updated_At | 更新時間 |

---

## 7️⃣ 測試

### 測試 Workflow A（註冊）
```bash
curl -X POST https://你的n8n/webhook/user-register \
  -H "Content-Type: application/json" \
  -d '{"userId":"TEST","realName":"測試","aliases":["小測"],"sheetUrls":[{"name":"測試","url":"https://docs.google.com/spreadsheets/d/xxx"}]}'
```

### 測試 Workflow B（查詢）
```bash
curl "https://你的n8n/webhook/report-status?userId=TEST"
```

---

## ✅ 完成清單

- [x] n8n Google Sheets OAuth2 憑證（ID: `OwuGUbqIn3C7jgEQ`）
- [ ] n8n 環境變數：MASTER_SYNC_SHEET_ID
- [ ] n8n Gemini 憑證或環境變數（憑證已建：`n8n-sheet-guard-gemini`，但 workflow 用的是環境變數，需二選一）
- [x] n8n 環境變數：LINE_CHANNEL_ACCESS_TOKEN
- [ ] n8n 環境變數：LIFF_ID
- [x] 匯入 workflow-a-user-api-v2.json（ID: `dhIQb8lkUjpCvz1R`，需設定憑證+啟用）
- [ ] 匯入 workflow-b-report-api-v2.json
- [ ] 匯入 workflow-c-cron-notifier-v2.json
- [x] Master_Sync 新增 Sheet_Urls_JSON 欄位
- [x] 前端 VITE_LIFF_ID
- [x] 前端 VITE_API_BASE_URL（`https://lorawu.app.n8n.cloud/webhook`）
- [x] 關閉 Dashboard.vue Mock 模式
- [ ] 測試 API


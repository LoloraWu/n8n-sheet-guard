# n8n 後端系統

## 📂 檔案清單

| 檔案 | 說明 |
|------|------|
| `workflow-a-user-api-v2.json` | 使用者註冊/查詢 API |
| `workflow-b-report-api-v2.json` | 報表狀態查詢 API（全分頁掃描 + Gemini AI）|
| `workflow-c-cron-notifier-v2.json` | 每日定時推播（21/22/23 點）|
| `workflow-health-check.json` | 健康檢查端點 |
| `AI_PROMPTS.md` | AI Prompt 設計說明 |
| `workflow-diagrams.md` | 流程圖（Mermaid）|

---

## 🔌 API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/webhook/user-register` | 註冊/更新使用者 |
| GET | `/webhook/user-profile?userId=xxx` | 取得使用者資料 |
| GET | `/webhook/report-status?userId=xxx` | 取得報表填寫狀態 |

---

## 📊 Master_Sync 欄位

| 欄位 | 說明 |
|------|------|
| Line_UID | LINE 使用者 ID |
| Real_Name | 真實姓名 |
| Aliases | 別名（逗號分隔）|
| Target_Sheet_IDs | 監測的 Sheet ID（逗號分隔）|
| Sheet_Urls_JSON | 完整 URL 資訊（JSON）|
| Sheet_Configs | Schema 快取（JSON）|
| Created_At | 建立時間 |
| Updated_At | 更新時間 |

---

## ⚙️ 環境變數

| 變數 | 說明 |
|------|------|
| `MASTER_SYNC_SHEET_ID` | Master_Sync 的 Google Sheet ID |
| `GEMINI_API_KEY` | Gemini AI API Key |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API Token |
| `LIFF_ID` | LINE LIFF ID |

---

## 🔐 憑證

在 n8n 中建立 **Google Sheets OAuth2** 憑證，命名為：
```
n8n-sheet-guard-master
```

---

## 📖 詳細部署說明

請參考根目錄的 `TODO-CHECKLIST.md`

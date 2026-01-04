# n8n 後端系統

## 資料庫設計 (Master_Sync Google Sheet)

### 欄位結構

| 欄位 | 說明 | 範例 |
|------|------|------|
| A: Line_UID | LINE 唯一識別碼 | U8429abc... |
| B: Real_Name | 使用者真實姓名 | 張大明 |
| C: Aliases | 別名清單 (逗號分隔) | 張大明,小張,大明 |
| D: Target_Sheet_IDs | 關注報表 ID (逗號分隔) | 1abc,2def |
| E: Sheet_Configs | 欄位配置 JSON | {"1abc":{"name_column":"B"...}} |
| F: Created_At | 建立時間 | 2024-01-04 10:00:00 |
| G: Updated_At | 最後更新時間 | 2024-01-04 15:30:00 |
| H: Last_Check_Time | 最後推播時間 | 2024-01-04 21:05:00 |

---

## API 端點設計

### 統一回應格式

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### 端點清單

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/health | 健康檢查 |
| POST | /api/user/register | 註冊/更新使用者 |
| GET | /api/user/profile | 取得使用者資料 |
| GET | /api/report/status | 取得報表填寫狀態 |

---

## Workflow 架構

### Workflow A: 使用者資料管理 API
- Webhook 接收 POST/GET 請求
- 驗證 LINE User ID
- 讀寫 Master_Sync Google Sheet
- AI 解析新增 Sheet 的欄位結構

### Workflow B: 報表狀態查詢 API
- Webhook 接收 GET 請求
- 讀取使用者關注的 Sheet
- AI 判定填寫狀態
- 回傳狀態清單

### Workflow C: 每日定時推播
- Cron 觸發 (21, 22, 23 點)
- 遍歷所有使用者
- 檢查填寫狀態
- LINE Push Message 通知

---

## 檔案清單

### 正式版 Workflow（使用 Webhook/Cron 觸發）
| 檔案 | 說明 |
|------|------|
| `workflow-a-user-api.json` | 使用者註冊/查詢 API |
| `workflow-b-report-api.json` | 報表狀態查詢 API |
| `workflow-c-cron-notifier.json` | 每日定時推播系統 |
| `workflow-health-check.json` | 健康檢查端點 |

### 測試版 Workflow（使用 Manual Trigger）
| 檔案 | 說明 |
|------|------|
| `test-workflow-a.json` | 測試使用者 API（含模擬資料） |
| `test-workflow-b.json` | 測試報表狀態 API（Mock 判定） |
| `test-workflow-c.json` | 測試推播系統（不實際發送 LINE） |

---

## 快速測試指南

### Step 1: 建立 Master_Sync Google Sheet

1. 建立新的 Google Sheet
2. 將第一個分頁命名為 `Master_Sync`
3. 在第一行加入標題：
   ```
   Line_UID | Real_Name | Aliases | Target_Sheet_IDs | Sheet_Configs | Created_At | Updated_At | Last_Check_Time
   ```
4. 複製 Sheet ID（從 URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`）

### Step 2: 設定 n8n 環境變數

在 n8n 的 Settings > Variables 中新增：
- `MASTER_SYNC_SHEET_ID`: 你的 Google Sheet ID

### Step 3: 設定 Google Sheets 憑證

1. 在 n8n 的 Credentials 中新增 Google Sheets OAuth2
2. 確保帳號有權限讀寫 Master_Sync Sheet

### Step 4: 匯入測試 Workflow

1. 進入 n8n
2. 點擊 Import > From File
3. 選擇 `test-workflow-a.json`
4. 修改 "Mock Request Data" 節點中的測試資料
5. 點擊 "Execute Workflow" 按鈕執行

### 測試流程建議

1. **先測 Workflow A** - 建立測試使用者資料
2. **再測 Workflow B** - 確認可以讀取使用者設定
3. **最後測 Workflow C** - 確認推播邏輯正確（不會實際發送）

---

## 部署步驟（正式環境）

1. 在 Google Cloud Console 建立專案並啟用 Sheets API
2. 建立 OAuth 憑證並下載 JSON
3. 在 n8n 中新增 Google Sheets 憑證
4. 建立 LINE Messaging API Channel
5. 在 n8n 中新增 LINE HTTP Header Auth 憑證
   - Header Name: `Authorization`
   - Header Value: `Bearer {你的 Channel Access Token}`
6. 設定 OpenAI API 憑證（用於 AI 判定）
7. 匯入正式版 workflow JSON 檔案
8. 啟用所有 workflow

---

## 常見問題

### Q: Google Sheets 讀取失敗？
A: 確認憑證有權限，並檢查 Sheet ID 是否正確。

### Q: Workflow B 的 AI 判定不準確？
A: 可調整 AI Prompt 或降低 temperature 值。

### Q: LINE 推播沒有收到？
A: 確認 LINE User ID 正確，且已加入官方帳號好友。

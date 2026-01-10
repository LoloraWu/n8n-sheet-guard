# 待辦清單

> 最後更新：2026-01-10 (修復註冊狀態同步、儀表板顯示問題)

---

## 📊 整體進度

| 區塊 | 狀態 | 說明 |
|------|:----:|------|
| 前端 UI | ✅ | Register.vue、Dashboard.vue、ReminderSettings.vue 完成 |
| 前端 API | ✅ | api.js 含 userApi、reportApi、reminderApi |
| 前端 Router | ✅ | 三頁路由 + TabBar 導航完成 |
| Workflow A (User API) | ✅ | v2 程式碼完成，含 reminder API |
| Workflow B (Report API) | ✅ | 程式碼完成 |
| Workflow C (Cron) | ✅ | 程式碼完成，改為每小時整點 + Reminder 篩選 |
| Workflow D (LINE Bot) | ✅ | 程式碼完成，7 個指令 |
| Sheet URL 驗證 | ✅ | 前後端程式碼完成 |
| **自訂提醒時間** | ✅ | **前後端程式碼全部完成** |
| 文件整理 | ✅ | README、REQUIREMENTS、TODO 完成 |

### ⚠️ 待部署項目

**所有程式碼已完成，需要手動部署到 n8n 和 Vercel：**

| 項目 | 檔案 | 動作 | 狀態 |
|------|------|------|:----:|
| Google Sheets | Master_Sync | 新增 `Reminder_Enabled`, `Reminder_Times` 欄位 | ✅ |
| Workflow A | `backend/workflow-a-user-api-v2.json` | 匯入 n8n | ✅ |
| Workflow B | `backend/workflow-b-report-api-v2.json` | 匯入 n8n | ✅ |
| Workflow C | `backend/workflow-c-cron-notifier-v2.json` | 匯入 n8n | ✅ |
| Workflow D | `backend/workflow-d-line-bot-commands.json` | 匯入 n8n | ⏳ 需重新部署（v3 修復） |
| 前端 | `frontend/` | `npm run build && npx vercel --prod` | ⏳ 需重新部署 |

---

## 已完成

### 核心功能
- [x] n8n 憑證設定（n8n-sheet-guard-master）
- [x] Workflow A (User API) - 已部署、測試通過
- [x] Workflow B (Report API) - 已部署、測試通過
- [x] Workflow C (Cron Notifier) - 已部署
- [x] 前端 Dashboard 頁面
- [x] 前端 Register 頁面
- [x] 前端部署到 Vercel
- [x] LIFF 整合

### 設定值
- [x] MASTER_SYNC_SHEET_ID
- [x] GEMINI_API_KEY
- [x] LINE_CHANNEL_ACCESS_TOKEN
- [x] LIFF_ID

### 設定頁面優化（v2）- 程式碼完成
- [x] Register.vue 首次/非首次 UI 提示（醒目提示框）
- [x] Register.vue 預設值邏輯（LINE Display Name）
- [x] Register.vue 回填邏輯（有 realName/aliases 即回填）
- [x] Register.vue 下拉選單格式（真實標題 + 縮短 URL）
- [x] Workflow A 註冊時呼叫 Google API 抓取報表真實標題
- [x] Workflow A available-sheets API 回傳格式調整

### Workflow D - LINE Bot 指令（程式碼全部完成）
- [x] `/my-status` - 查看自己的註冊資料
- [x] `/help` - 顯示可用指令列表
- [x] `/clear-me` - 清空自己資料（含 YES 確認提示）
- [x] `/list-usr` - 列出所有使用者（管理者）
- [x] `/check-usr {userId}` - 查看特定使用者詳情（管理者）
- [x] `/del-usr {userId}` - 刪除指定使用者（管理者）
- [x] `/clear-all` - 清空所有資料（含 YES 確認提示，管理者）

---

## 待完成

### 🚀 高優先：部署（程式碼已全部完成）

| # | 任務 | 說明 | 狀態 |
|---|------|------|:----:|
| 1 | **Google Sheets 新增欄位** | Master_Sync 加入 `Reminder_Enabled` (I欄) 和 `Reminder_Times` (J欄) | ✅ 已完成 |
| 2 | **部署 Workflow A** | 匯入 `backend/workflow-a-user-api-v2.json` (含 reminder API) | ✅ 已部署 |
| 3 | **部署 Workflow C** | 匯入 `backend/workflow-c-cron-notifier-v2.json` (每小時整點 + 測試 API) | ✅ 已部署 |
| 4 | **部署前端** | `cd frontend && npm run build && npx vercel --prod` | ⏳ 待部署 |
| 5 | 端對端測試 | 測試提醒設定 → 儲存 → 用測試 API 驗證 → 收到 LINE 提醒 | ⏳ 待測試 |

### ✅ 已完成的程式碼功能

#### Workflow D - LINE Bot 指令
| 指令 | 功能 | 狀態 |
|------|------|:----:|
| `/my-status` | 查看自己註冊資料 | ✅ |
| `/help` | 顯示可用指令列表 | ✅ |
| `/clear-me` | 清空自己資料 + YES 確認 | ✅ |
| `/list-usr` | 列出所有使用者（管理者）| ✅ |
| `/check-usr {userId}` | 查看特定使用者詳情（管理者）| ✅ |
| `/del-usr {userId}` | 刪除指定使用者（管理者）| ✅ |
| `/clear-all` | 清空所有資料 + YES 確認（管理者）| ✅ |

#### Google Sheet URL 即時驗證
| 功能 | 狀態 |
|------|:----:|
| Workflow A `POST /validate-sheet` API | ✅ |
| Register.vue 驗證按鈕 + 狀態顯示 | ✅ |
| 錯誤處理（無權限、格式錯誤）| ✅ |

#### 自訂提醒時間
| 功能 | 狀態 |
|------|:----:|
| ReminderSettings.vue 頁面 | ✅ |
| api.js reminderApi | ✅ |
| Workflow A `GET/POST /reminder-settings` | ✅ |
| Workflow C 每小時整點 + Reminder 篩選 | ✅ |

**API 規格**：
```
POST /webhook/validate-sheet
Body: { "url": "https://docs.google.com/spreadsheets/d/xxx/..." }

成功回應:
{
  "success": true,
  "data": {
    "valid": true,
    "spreadsheetId": "xxx",
    "title": "表單真實標題",
    "tabCount": 3
  }
}

失敗回應:
{
  "success": false,
  "error": "無法存取此表單，請確認已設定「知道連結的人都可以檢視」"
}
```

### 低優先（可選功能）
| # | 任務 | 說明 | 狀態 |
|---|------|------|:----:|
| 6 | 設定摘要區塊 | 儀表板加入「目前設定摘要」| ⏳ 可選 |

---

## 🆕 新功能：自訂提醒時間

### 功能概述

讓使用者透過 LIFF 頁面自訂報表檢查提醒時間（最多 3 個），系統每小時整點檢查並發送 LINE 提醒。

### 設計決策（已確認）

| 項目 | 決定 |
|------|------|
| 時間選項 | 24 小時整點（00:00 ~ 23:00，共 24 個選項） |
| 最多時間數 | 3 個 |
| 預設狀態 | 關閉（用戶需自行開啟並設定時間） |
| Tab 順序 | 個人設定 \| 表單進度 \| 提醒設定 |
| 觸發機制 | n8n 每小時整點檢查，比對用戶設定的時間 |
| 提醒格式 | 與現有進度追蹤一致（見 REQUIREMENTS.md 情境 B） |

---

### 🎨 前端任務

| # | 任務 | 檔案 | 說明 | 狀態 |
|---|------|------|------|:----:|
| F1 | 建立提醒設定頁面 | `frontend/src/views/ReminderSettings.vue` | 新建檔案，包含開關、時間選擇、儲存功能 | ✅ 完成 |
| F2 | 更新路由設定 | `frontend/src/router/index.js` | 新增 `/reminder` 路由 | ✅ 完成 |
| F3 | 更新底部導航 | `frontend/src/components/TabBar.vue` | 新增第三個 tab「提醒設定」(icon: clock-o) | ✅ 完成 |
| F4 | 新增 API 服務 | `frontend/src/services/api.js` | 新增 `reminderApi.getSettings()` 和 `reminderApi.updateSettings()` | ✅ 完成 |

#### F1 詳細規格：ReminderSettings.vue

**頁面結構**：
```
Header (漸層背景 from-indigo-600 to-violet-600)
├── 標題：提醒設定
└── 副標題：自訂報表檢查時間

Content
├── 狀態卡片
│   ├── 未註冊 → 引導註冊（與 Dashboard 相同）
│   └── 已註冊 → 顯示設定表單
│
├── 設定區塊（白色圓角卡片）
│   ├── 總開關（van-switch）
│   │   └── 標籤：啟用自動提醒
│   │
│   ├── 時間列表（當開關開啟時顯示）
│   │   ├── 時間 1：[09:00 ▼] [🗑️]
│   │   ├── 時間 2：[14:00 ▼] [🗑️]
│   │   └── 時間 3：[21:00 ▼] [🗑️]
│   │
│   ├── [+ 新增提醒時間] 按鈕（未滿 3 個時顯示）
│   │
│   └── 提示文字：「系統會在設定的時間檢查您的表單並發送 LINE 提醒」
│
└── [儲存設定] 按鈕（漸層 indigo-violet）

TabBar (底部導航)
```

**時間選擇器**：
- 使用 `van-picker` 實作下拉選單
- 選項：00:00, 01:00, 02:00, ... 23:00（共 24 個）
- 已選擇的時間不可重複選擇

**狀態處理**：
- Loading：顯示載入動畫
- 未註冊：顯示「請先完成設定」卡片 + 前往註冊按鈕
- 已註冊無設定：開關預設關閉，時間列表為空
- 已註冊有設定：回填開關狀態和時間

---

### ⚙️ 後端任務

| # | 任務 | 檔案 | 說明 | 狀態 |
|---|------|------|------|:----:|
| B1 | 新增 GET /reminder-settings | `backend/workflow-a-user-api-v2.json` | 取得使用者提醒設定 | ✅ |
| B2 | 新增 POST /reminder-settings | `backend/workflow-a-user-api-v2.json` | 更新使用者提醒設定 | ✅ |
| B3 | 修改 Cron 觸發時間 | `backend/workflow-c-cron-notifier-v2.json` | 從固定 21/22/23 改為每小時整點 | ✅ |
| B4 | 修改用戶篩選邏輯 | `backend/workflow-c-cron-notifier-v2.json` | 檢查 Reminder_Enabled 和當前時間是否在 Reminder_Times 中 | ✅ |

#### B1 詳細規格：GET /reminder-settings

**新增節點**：
1. `Webhook Reminder Settings GET` - 接收 GET 請求
2. `Get User for Reminder` - 從 Master_Sync 讀取使用者
3. `Format Reminder Response` - 格式化回應
4. `Respond Reminder Settings` - 回傳 JSON

**回應格式**：
```json
// 成功
{ "success": true, "data": { "enabled": true, "times": ["09:00", "14:00"] } }

// 使用者不存在
{ "success": false, "error": "使用者不存在，請先完成註冊" }
```

#### B2 詳細規格：POST /reminder-settings

**新增節點**：
1. `Webhook Reminder Settings POST` - 接收 POST 請求
2. `Validate Reminder Data` - 驗證資料（最多 3 個時間）
3. `Update Reminder Settings` - 更新 Master_Sync 的 Reminder_Enabled 和 Reminder_Times
4. `Respond Reminder Update` - 回傳結果

**驗證邏輯**：
```javascript
// times 陣列最多 3 個
if (times.length > 3) return error("最多只能設定 3 個提醒時間");

// 每個時間必須是有效格式 HH:00
const validTime = /^([01]?[0-9]|2[0-3]):00$/;
for (const t of times) {
  if (!validTime.test(t)) return error("時間格式錯誤");
}
```

#### B3/B4 詳細規格：修改 Workflow C

**Cron 觸發修改**：
```json
// 原本
{ "expression": "0 21,22,23 * * *" }

// 改為
{ "expression": "0 * * * *" }  // 每小時整點
```

**Filter Valid Users 節點修改**：
```javascript
// 新增篩選邏輯
const currentHour = new Date().toLocaleString('zh-TW', { 
  timeZone: 'Asia/Taipei', 
  hour: '2-digit', 
  hour12: false 
}) + ':00';

return users.filter(user => {
  // 必須啟用提醒
  if (user.Reminder_Enabled !== 'TRUE') return false;
  
  // 必須有設定時間
  let times = [];
  try {
    times = JSON.parse(user.Reminder_Times || '[]');
  } catch (e) {
    return false;
  }
  
  // 當前時間必須在設定的時間中
  return times.includes(currentHour);
});
```

---

### 🔗 整合任務

| # | 任務 | 說明 | 狀態 |
|---|------|------|:----:|
| I1 | Master_Sync 新增欄位 | 在 Google Sheets 新增 Reminder_Enabled 和 Reminder_Times 欄位 | ✅ 已完成 |
| I2 | 部署 Workflow A | 匯入更新的 workflow-a-user-api-v2.json | ✅ 已部署 |
| I3 | 部署 Workflow C | 匯入更新的 workflow-c-cron-notifier-v2.json | ✅ 已部署 |
| I4 | 部署前端 | `npm run build && npx vercel --prod` | ⏳ |
| I5 | 端對端測試 | 測試完整流程：設定 → 儲存 → 用測試 API → 收到提醒 | ⏳ |

#### I1 詳細規格：Master_Sync 新增欄位 ✅ 已完成

在 Google Sheets 的 Master_Sync 工作表新增兩個欄位：

| 欄位名稱 | 位置 | 預設值 | 說明 | 狀態 |
|----------|------|--------|------|:----:|
| Reminder_Enabled | I 欄 | FALSE | 是否啟用提醒 | ✅ |
| Reminder_Times | J 欄 | [] | 提醒時間 JSON 陣列 | ✅ |

---

### 測試檢查清單

#### 前端測試
- [ ] 未註冊用戶進入提醒設定頁 → 顯示「請先完成設定」
- [ ] 已註冊用戶進入 → 顯示設定表單
- [ ] 開關預設關閉
- [ ] 開啟開關後顯示時間列表
- [ ] 新增時間（下拉選單 24 個選項）
- [ ] 刪除已設定的時間
- [ ] 最多只能新增 3 個時間
- [ ] 已選時間不可重複選擇
- [ ] 儲存成功顯示 Toast
- [ ] 重新進入頁面回填設定

#### 後端測試
- [ ] GET /reminder-settings - 未註冊使用者回傳錯誤
- [ ] GET /reminder-settings - 已註冊使用者回傳設定
- [ ] POST /reminder-settings - 成功更新設定
- [ ] POST /reminder-settings - 超過 3 個時間回傳錯誤
- [ ] Workflow C 每小時整點執行
- [ ] Workflow C 只對 Reminder_Enabled=TRUE 且當前時間符合的用戶推播

---

## 🧪 測試用 API：手動觸發提醒

### 測試 Webhook

Workflow C 新增了測試用的 Webhook，可以傳入模擬時間，**不用等整點**就能測試提醒功能。

**Endpoint**：
```
GET /webhook/test-reminder?hour=HH:00
```

**使用範例**：
```bash
# 測試 09:00 的提醒
curl "https://lorawu.app.n8n.cloud/webhook/test-reminder?hour=09:00"

# 測試 14:00 的提醒
curl "https://lorawu.app.n8n.cloud/webhook/test-reminder?hour=14:00"

# 測試 21:00 的提醒
curl "https://lorawu.app.n8n.cloud/webhook/test-reminder?hour=21:00"

# 或直接在瀏覽器打開
https://lorawu.app.n8n.cloud/webhook/test-reminder?hour=09:00
```

### 測試流程

1. **設定提醒時間**：在前端 LIFF 頁面設定提醒時間（如 09:00、21:00）
2. **直接觸發測試**：用瀏覽器或 curl 呼叫 `/webhook/test-reminder?hour=09:00`
3. **檢查 LINE**：如果有未填欄位，會立刻收到 LINE 推播

### 測試情境

| 情境 | 呼叫 | 預期結果 |
|------|------|----------|
| 時間符合 | `?hour=09:00` (使用者有設定 09:00) | ✅ 收到推播 |
| 時間不符 | `?hour=10:00` (使用者沒設定 10:00) | ❌ 不推播 |
| 提醒關閉 | 任意 hour | ❌ 不推播 |
| 無未填欄位 | 任意 hour | ❌ 不推播（因為沒有缺漏）|

### Console Log 說明

在 n8n 的執行 log 中會看到：
```
🧪 TEST MODE: Using test hour: 09:00
✅ User U9db30529...: Time matches! Will send reminder.
Filtered users count: 1
```

### 與正式 Cron 的差異

| 項目 | Cron 觸發 | Test Webhook |
|------|-----------|--------------|
| 觸發方式 | 每小時整點自動執行 | 手動呼叫 |
| 時間來源 | 台北時區當前時間 | URL 參數 `hour` |
| 適用情境 | 正式環境 | 開發測試 |
| Log 標記 | `⏰ PRODUCTION MODE` | `🧪 TEST MODE` |

---

## 指令規格對照表

| 指令 | 權限 | 功能 | 二次確認 | 實作狀態 |
|------|------|------|:--------:|:--------:|
| `/my-status` | 所有人 | 查看自己的註冊資料 | 否 | ✅ 完成 |
| `/clear-me` | 所有人 | 清空自己的註冊資料 | YES | ✅ 完成 |
| `/help` | 所有人 | 顯示可用指令列表 | 否 | ✅ 完成 |
| `/list-usr` | 管理者 | 列出所有使用者（摘要）| 否 | ✅ 完成 |
| `/check-usr {userId}` | 管理者 | 查看特定使用者詳情 | 否 | ✅ 完成 |
| `/del-usr {userId}` | 管理者 | 刪除指定使用者 | 否 | ✅ 完成 |
| `/clear-all` | 管理者 | 清空所有使用者資料 | YES | ✅ 完成 |

---

## 🔧 手動部署步驟指南

### Step 1: 重新部署 Workflow A
```
1. 開啟 n8n (https://lorawu.app.n8n.cloud)
2. 找到現有 Workflow A → 停用或刪除
3. Import → 上傳 `backend/workflow-a-user-api-v2.json`
4. 確認 Google OAuth2 憑證已綁定（n8n-sheet-guard-master）
5. 啟用 Workflow
```

### Step 2: 部署 Workflow D（LINE Bot 指令）
```
1. 開啟 n8n
2. Import → 上傳 `backend/workflow-d-line-bot-commands.json`
3. 確認 Google OAuth2 憑證已綁定（n8n-sheet-guard-master）
4. 建立 LINE Channel Token 憑證：
   - Credentials → Add Credential → Header Auth
   - Name: "LINE Channel Token"
   - Header Name: "Authorization"
   - Header Value: "Bearer YOUR_LINE_CHANNEL_ACCESS_TOKEN"
5. 啟用 Workflow
6. 複製 Webhook URL
```

### Step 3: 設定 LINE Webhook
```
1. 開啟 LINE Developers Console
2. 選擇對應的 Provider & Channel
3. Messaging API → Webhook URL → 貼上 n8n Webhook URL
4. 啟用 Use webhook
5. 驗證 Webhook 連線
```

---

## 部署資訊

### 線上服務
| 服務 | URL |
|------|-----|
| 前端 | https://n8n-sheet-guard.vercel.app |
| LIFF | https://liff.line.me/2008820860-ESw51iC9 |
| n8n API | https://lorawu.app.n8n.cloud/webhook |

### 管理者 LINE userId
```
U9db30529ea43839f12dfc20588d3a421
```

### LINE Webhook URL（已設定 ✅）
```
https://lorawu.app.n8n.cloud/webhook/line-webhook
```

---

## 測試檢查清單

### 前端測試
- [ ] 新使用者進入設定頁，顯示首次提示（黃色醒目框）
- [ ] 新使用者預設值為 LINE Display Name
- [ ] 關注報表預設為空
- [ ] 下拉選單顯示其他人的報表（真實標題 + 縮短 URL）
- [ ] 已註冊使用者進入設定頁，回填資料並顯示綠色提示

### LINE Bot 測試（Workflow D）- 僅管理者可用
- [ ] 一般使用者輸入指令 → 回覆「請使用選單中的設定功能」
- [ ] `/help` - 顯示管理者指令列表
- [ ] `/my-status` - 查看管理者自己的註冊資料
- [ ] `/list-usr` - 列出所有使用者
- [ ] `/check-usr {userId}` - 查看特定使用者詳情
- [ ] `/del-usr {userId}` - 刪除指定使用者
- [ ] `/clear-me` - 清空管理者自己資料（需 YES 確認）
- [ ] `/clear-all` - 清空所有資料（需 YES 確認）

---

## 🐛 本次修復（2026-01-10 v3 - /clear-all 與 /del-usr 刪除問題）

### 問題描述
`/clear-all` 和 `/del-usr` 指令顯示成功但實際上沒有刪除資料。原因是 Google Sheets 有空白列時，n8n 的 `delete` 操作無法正確找到目標資料列。

### 根本原因
- Google Sheet `Master_Sync` 中有大量空白列（如第2-100列為空，實際資料在第101列）
- n8n Google Sheets node 的 `delete` 操作使用 `lookupColumn`/`lookupValue` 過濾器時，無法正確處理有空白列的情況

### 解決方案
改用 **HTTP Request** 直接呼叫 **Google Sheets API `batchUpdate`** 以 `deleteDimension` 刪除指定列：

1. **`/clear-all`** 流程重構：
   - 新增 `Get Sheet Info` 節點：取得 sheetId 和 rowCount
   - 修改 `Prepare Clear All` 節點：建立 batchUpdate 刪除請求
   - 新增 `Delete All Rows` 節點：呼叫 API 刪除第2列到最後一列

2. **`/del-usr`** 流程重構：
   - 新增 `Read All Users (del)` 節點：讀取所有使用者（包含 row_number）
   - 新增 `Find User Row` 節點：用 Line_UID 找到目標並取得其 row_number
   - 新增 `User Found?` 節點：判斷是否找到使用者
   - 新增 `Get Sheet Info (del)` 節點：取得 sheetId
   - 新增 `Prepare Delete User` 節點：建立單列刪除請求
   - 新增 `Delete User Row` 節點：呼叫 API 刪除指定列

### 修改的檔案

| 檔案 | 修改內容 |
|------|----------|
| `backend/workflow-d-line-bot-commands.json` | 重構 /clear-all 和 /del-usr 刪除邏輯，改用 HTTP Request 呼叫 Google Sheets API |

### Google Sheets API 使用方式

```javascript
// batchUpdate 刪除列請求
POST https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}:batchUpdate
{
  "requests": [{
    "deleteDimension": {
      "range": {
        "sheetId": 0,           // 從 sheets.properties 取得
        "dimension": "ROWS",
        "startIndex": 1,        // 0-indexed（所以 1 = 第2列）
        "endIndex": rowCount    // 刪除到最後
      }
    }
  }]
}
```

---

## 🐛 本次修復（2026-01-10 v2 - 註冊狀態與儀表板）

### 問題描述
1. **註冊成功後提醒設定頁還是顯示「未註冊」** - 頁面間狀態不同步
2. **進度儀錶板沒有正確顯示缺漏項目** - 狀態判斷邏輯問題
3. **未註冊/已註冊 UI 文案混亂** - 需要統一

### 解決方案：共享狀態 Store

新增 `frontend/src/stores/userState.js` - 使用 Vue 的 `reactive()` 實現跨頁面即時狀態同步。

### 修改的檔案

| 檔案 | 修改內容 |
|------|----------|
| `frontend/src/stores/userState.js` | **新增** - 共享使用者狀態 store |
| `frontend/src/views/Register.vue` | 註冊成功時呼叫 `userState.setRegistered()` |
| `frontend/src/views/ReminderSettings.vue` | 使用 `userState.state.isRegistered` 判斷註冊狀態 |
| `frontend/src/views/Dashboard.vue` | 使用共享狀態、新增「已註冊但無表單」狀態 |

### UI 文案統一

| 狀態 | 標題 | 副標題 |
|------|------|--------|
| 未註冊 | 首次使用 | 請填寫資料以啟用監測功能 |
| 已註冊 | 您已註冊 | 可以更改以下資料 |
| 已註冊無表單 | 尚未設定關注表單 | 請前往「個人設定」加入表單 |

### userState Store API

```javascript
import { userState } from '@/stores/userState';

// 讀取狀態（唯讀）
userState.state.isRegistered  // boolean
userState.state.userId        // string
userState.state.realName      // string

// 設定已註冊
userState.setRegistered({
  userId: 'U123...',
  realName: '王小明',
  aliases: ['小明'],
  sheetUrls: [...]
});

// 設定未註冊
userState.setUnregistered();

// 重置
userState.reset();
```

---

## 🐛 之前修復（2026-01-10 整合檢查）

| 檔案 | 問題 | 修復 |
|------|------|------|
| `frontend/src/views/Register.vue` | `DEV_MOCK = true` 導致頁面顯示假資料 | 改為 `DEV_MOCK = false` |
| `backend/workflow-health-check.json` | API 路徑 `api/health` 與前端不一致 | 改為 `health` |
| `backend/workflow-a-user-api-v2.json` | HTTP Request 使用錯誤的 `"authentication": "oAuth2"` | 改為 `"predefinedCredentialType"` + `"nodeCredentialType": "googleSheetsOAuth2Api"` |
| `backend/workflow-b-report-api-v2.json` | 同上（3 個節點） | 同上 |
| `backend/workflow-c-cron-notifier-v2.json` | 同上（2 個節點） | 同上 |

---

## 本次修改摘要（2026-01-10）

### Workflow A 新增功能（自訂提醒時間 API）
1. **GET /reminder-settings** - 取得使用者提醒設定
   - 新增 4 個節點：Webhook → Get User → Format Response → Respond
   - 回傳 `{ enabled, times }` 格式
2. **POST /reminder-settings** - 更新使用者提醒設定
   - 新增 8 個節點：Webhook → Validate → If Valid → Find User → If Exists → Update → Response
   - 驗證邏輯：最多 3 個時間、格式必須是 HH:00
   - 更新 Master_Sync 的 `Reminder_Enabled` 和 `Reminder_Times` 欄位

### Workflow C 修改（每小時整點檢查）
1. **Cron 觸發時間**：從 `0 21,22,23 * * *` 改為 `0 * * * *`（每小時整點）
2. **Filter Valid Users 邏輯**：
   - 新增 `Reminder_Enabled` 檢查（必須為 TRUE）
   - 新增 `Reminder_Times` 比對（當前小時必須在陣列中）
   - 加入詳細 console.log 方便偵錯

---

### Register.vue 修改（2026-01-09）
1. **首次進入提示**：新增黃色醒目提示框「歡迎！請完成註冊」
2. **非首次進入提示**：綠色提示「以下是您目前的註冊資料，可進行修改」
3. **回填邏輯優化**：只要有 realName 或 aliases 就回填，不再僅依賴 sheetUrls
4. **下拉選單格式**：顯示「{真實標題} (...{ID後8碼})」

### Workflow A 修改
1. **新增 `Get Sheet Title` 節點**：呼叫 Google Sheets API 取得報表真實標題
2. **新增流程分支**：區分有 Sheet / 無 Sheet 兩種情況
3. **`Collect All Sheets` 節點**：回傳的 name 現在是真實標題

### Workflow D 修改（LINE Bot 指令）
1. **完整重寫**：使用 Switch 節點做指令路由，取代多層 IF 判斷
2. **指令命名**：更新為 `/list-usr`、`/del-usr`、`/clear-all`
3. **新增 7 個指令**：
   - `/my-status` - 查看自己註冊資料
   - `/help` - 顯示可用指令（管理者看到更多）
   - `/clear-me` - 清空自己資料（含 YES 確認）
   - `/list-usr` - 列出所有使用者
   - `/check-usr {userId}` - 查看特定使用者詳情
   - `/del-usr {userId}` - 刪除指定使用者
   - `/clear-all` - 清空所有資料（含 YES 確認）
4. **管理者驗證**：白名單 userId 檢查
5. **未知指令處理**：回覆提示輸入 /help

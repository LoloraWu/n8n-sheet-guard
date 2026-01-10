# 需求規格書：LINE x n8n x AI 跨表填寫狀態監測助理

> 最後更新：2026-01-10 (新增「前端 UI/UX 設計規範」響應式設計原則)

---

## 1. 專案願景

解決多個跨部門或跨團隊 Google Sheets 協作時，成員容易遺漏填寫的問題。透過 LINE Bot 主動提醒和 LIFF Web App 提供即時查詢介面。

---

## 2. 使用情境 (User Scenarios)

### 情境 A：使用者註冊與設定 (LIFF Register)

使用者透過 LINE OA 圖文選單進入設定頁面：

1. **首次進入（新使用者）**
   - 顯示醒目提示：「歡迎！請完成以下註冊資料以啟用填寫監測功能」
   - 預設值：
     - 真實姓名：LINE Display Name
     - 別名：LINE Display Name
     - 關注報表：空（使用者自行新增）
   
2. **非首次進入（已註冊使用者）**
   - 顯示提示：「以下是您目前的註冊資料，可進行修改」
   - 回填已儲存的真實姓名、別名、關注報表

3. **關注報表設定**
   - 手動輸入：使用者貼上 Google Sheet URL
   - **即時驗證**：輸入 URL 後可按「驗證」按鈕確認表單是否有效
     - 驗證項目：URL 格式、讀取權限、取得真實標題
     - 成功：顯示 ✅ 和表單真實標題
     - 失敗：顯示 ❌ 和錯誤原因（如「無法存取」）
   - 下拉選單：顯示其他使用者已設定的報表
     - 格式：`{Sheet 真實標題} ({縮短 URL})`
     - 真實標題來源：後端呼叫 Google Sheets API 自動抓取

### 情境 B：定時自動提醒 (Cron Push)

系統**每小時整點**自動執行，檢查哪些使用者設定了該時段的提醒：

1. 讀取所有使用者的提醒設定（Reminder_Enabled、Reminder_Times）
2. 篩選出當前小時符合的使用者
3. AI 判斷每個報表的填寫狀態
4. 若有未填寫項目，透過 LINE 推播通知

```
📋 小明，今日有 2 項未填寫：

📊 【蔚藍星球國王很忙】第二期12月專案
  • 哈拉版玩家留言：一般留言
  • 每日簽到表：今日進度

💡 另有 1 項選填欄位請自行檢查

前往填寫 👉 https://liff.line.me/xxx
```

### 情境 E：自訂提醒時間 (LIFF Reminder Settings)

使用者透過 LINE OA 圖文選單進入提醒設定頁面：

1. **未註冊使用者**
   - 顯示「請先完成設定」提示（與 Dashboard 相同）
   - 提供按鈕導向「個人設定」頁面

2. **已註冊使用者**
   - 顯示提醒功能開關（預設關閉）
   - 可新增最多 3 個提醒時間
   - 使用下拉選單選擇時間（整點：00:00 ~ 23:00，共 24 個選項）
   - 儲存後立即生效，下次該時間到達時會收到提醒

3. **UI 元件**
   - 總開關：van-switch
   - 時間選擇：van-picker（下拉選單）
   - 已設定時間：列表顯示，可刪除
   - 新增按鈕：最多 3 個時間

4. **設定範例**
   ```
   提醒功能：開啟
   提醒時間：
   • 09:00  [刪除]
   • 14:00  [刪除]
   • 21:00  [刪除]
   [+ 新增時間] (已滿 3 個則隱藏)
   [儲存設定]
   ```

### 情境 C：即時查詢儀表板 (LIFF Dashboard)

使用者透過 LINE OA 圖文選單進入儀表板：

1. 顯示今日狀態摘要（如「⚠️ 2 項未完成」或「✅ 全部完成」）
2. 列出每個關注報表的填寫狀況
3. 展開顯示缺漏欄位詳情
4. 一鍵跳轉到對應 Google Sheet

### 情境 D：LINE Bot 管理指令

透過 LINE 訊息發送指令進行管理操作。

---

## 3. LINE Bot 指令規格

### 一般使用者

一般使用者**不能使用 LINE 指令**，只能透過 LIFF 設定頁面操作。
若一般使用者嘗試輸入指令，系統回覆：「請使用選單中的「設定」功能來管理您的資料。」

### 管理者指令（僅限白名單 userId）

| 指令 | 功能 | 二次確認 |
|------|------|----------|
| `/list-usr` | 列出所有已註冊使用者（摘要：姓名+userId前10碼+報表數）| 否 |
| `/check-usr {userId}` | 查看特定使用者完整詳情（姓名、所有別名、所有報表、註冊時間）| 否 |
| `/del-usr {userId}` | 刪除指定使用者的所有資料（含關注報表）| 否 |
| `/clear-all` | 清空所有使用者資料 | 需回覆 YES |

### 管理者白名單設計

- 採用**靜態名單**，在 Workflow D 的 Code 節點中定義
- 支援多位管理者：`const ADMIN_IDS = ['U9db30529ea43839f12dfc20588d3a421', ...]`
- 修改需編輯 workflow JSON 並重新部署

### 指令回應範例

**`/my-status`**
```
📋 你的註冊資料
姓名：小明
別名：Sin, 阿明
關注報表：
• 每日進度表
• 哈拉版玩家留言
```

**`/list-usr`**
```
👥 已註冊使用者（共 3 人）
1. 小明 (U1234...) - 2 個報表
2. 小華 (U5678...) - 1 個報表
3. 阿強 (U9abc...) - 3 個報表
```

**`/check-usr U1234567890abcdef`**
```
📋 使用者詳情

姓名：小明
別名：小明, Sin, Tommy
關注報表：
• 每日進度表
• 哈拉版玩家留言
註冊時間：2026-01-05 10:00
最後更新：2026-01-09 15:30
```

**`/help`**
```
📖 可用指令：
/my-status - 查看你的註冊資料
/clear-me - 清空你的註冊資料
/help - 顯示此說明

👑 管理者專用：
/list-usr - 列出所有使用者
/check-usr {userId} - 查看特定使用者詳情
/del-usr {userId} - 刪除指定使用者
/clear-all - 清空所有資料
```

---

## 4. 系統架構

### 技術棧

| 組件 | 技術選型 |
|------|----------|
| 自動化引擎 | n8n Workflow (n8n Cloud) |
| 前端框架 | Vue 3 + Vite |
| UI 元件庫 | Vant UI + TailwindCSS |
| LINE 整合 | LIFF SDK v2 |
| 前端託管 | Vercel |
| 資料庫 | Google Sheets (Master_Sync) |
| AI 引擎 | Gemini API |

### Workflow 架構

```
Workflow A: 使用者 API
├── POST /webhook/user-register      # 註冊/更新使用者
├── GET  /webhook/user-profile       # 取得使用者資料
├── GET  /webhook/available-sheets   # 取得可選報表列表
├── POST /webhook/validate-sheet     # 驗證 Google Sheet URL 是否有效
├── GET  /webhook/reminder-settings  # 取得使用者提醒設定
└── POST /webhook/reminder-settings  # 更新使用者提醒設定

Workflow B: 報表狀態 API
└── GET  /webhook/report-status      # 取得報表填寫狀態

Workflow C: 定時推播
├── Cron 每小時整點                   # 檢查使用者設定並推播
└── GET  /webhook/test-reminder       # 測試用：手動觸發提醒（可傳入模擬時間）

Workflow D: LINE Bot 指令
└── POST /webhook/line-webhook       # 接收 LINE 訊息
```

---

## 5. 資料模型 (Master_Sync)

| 欄位 | 說明 | 範例 |
|------|------|------|
| Line_UID | LINE 使用者 ID | U8429... |
| Real_Name | 真實姓名 | 張大明 |
| Aliases | 別名（逗號分隔）| 張大明,小張,大明,Tommy |
| Target_Sheet_IDs | 監測的 Sheet ID（逗號分隔）| ID_1,ID_2 |
| Sheet_Urls_JSON | 完整報表資訊（JSON）| 見下方 |
| Sheet_Configs | Schema 快取（JSON）| 見下方 |
| **Reminder_Enabled** | 是否啟用自訂提醒 | TRUE / FALSE |
| **Reminder_Times** | 提醒時間（JSON 陣列）| ["09:00","14:00","21:00"] |
| Created_At | 建立時間 | 2026-01-05 10:00:00 |
| Updated_At | 更新時間 | 2026-01-09 15:30:00 |
| Last_Check_Time | 最後推播檢查時間 | 2026-01-09 21:05:00 |

### Reminder_Times 格式

```json
["09:00", "14:00", "21:00"]
```

- 陣列最多 3 個元素
- 每個元素為 HH:00 格式（整點）
- 可選時間：00:00 ~ 23:00（共 24 個選項）
- 空陣列 `[]` 表示未設定提醒時間
- 新使用者預設：`Reminder_Enabled = FALSE`、`Reminder_Times = []`

### Sheet_Urls_JSON 格式

```json
[
  {
    "name": "Google Sheet 真實標題",
    "url": "https://docs.google.com/spreadsheets/d/xxx",
    "spreadsheetId": "xxx"
  }
]
```

### Sheet_Configs 格式（Schema 快取）

```json
{
  "spreadsheetId::tabName": {
    "tabName": "哈拉版玩家留言",
    "headerRowIndex": 1,
    "headerFingerprint": "hdr:v1:...",
    "fieldSemantics": {
      "date": { "column": "A", "confidence": "high" },
      "name": { "column": "B", "confidence": "high" },
      "checkableHigh": [
        { "header": "一般留言", "column": "D" }
      ],
      "checkableAdvisory": [
        { "header": "備註", "column": "F" }
      ]
    },
    "updatedAt": "2026-01-08T12:34:56Z"
  }
}
```

### Pending_Confirmations 工作表

用於存儲 `/clear-me` 和 `/clear-all` 的二次確認狀態。

| 欄位 | 說明 | 範例 |
|------|------|------|
| User_ID | 發起確認的使用者 LINE ID | U9db30529... |
| Action | 待確認的動作 | clear-me / clear-all |
| Timestamp | 請求時間戳（毫秒）| 1736505600000 |

**確認機制流程**：
1. 使用者輸入 `/clear-me` 或 `/clear-all`
2. 系統寫入待確認記錄到 `Pending_Confirmations`
3. 回覆確認訊息，提示在 5 分鐘內回覆 YES
4. 使用者回覆 `YES`
5. 系統檢查 `Pending_Confirmations` 是否有該使用者的記錄
6. 檢查時間戳是否在 5 分鐘內
7. 執行對應的刪除操作
8. 清除 `Pending_Confirmations` 中的記錄

---

## 6. AI 判定邏輯

### Schema Inference（首次掃描 / 結構變動時）

分析表頭欄位，推斷語意：
- **日期欄 (date)**：日期、Date、時間
- **姓名欄 (name)**：姓名、LINE_ID、負責人
- **必填欄位 (checkableHigh)**：進度、留言、連結
- **選填欄位 (checkableAdvisory)**：備註、Note

### Status Inference（每次掃描）

判斷今日填寫狀態：
1. 找出日期 = 今日的所有列
2. 找出姓名與使用者別名匹配的列
3. 檢查 checkableHigh 欄位是否為空
4. 輸出 missing/completed 狀態

### 「未填寫」的定義

以下情況視為未填寫：
- 空白
- NA、N/A、n/a
- 待填、待填寫
- `-`、`--`
- 純空格

---

## 7. 報表輸出格式

### Dashboard 回應格式

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 12,
      "missing": 3,
      "completed": 9,
      "allCompleted": false
    },
    "reports": [
      {
        "headline": "12/01｜哈拉版玩家留言｜未填：一般留言(D4)",
        "sheetTitle": "【蔚藍星球國王很忙】第二期12月專案",
        "sheetUrl": "https://docs.google.com/spreadsheets/d/xxx",
        "tabName": "哈拉版玩家留言",
        "missingFieldName": "一般留言",
        "cellRef": "D4",
        "aiSummary": "在今日對應 Sin 的資料列中，「一般留言」為空"
      }
    ],
    "advisories": [
      {
        "tabName": "哈拉版玩家留言",
        "note": "欄位「備註」為空，請自行檢查是否需要填寫。"
      }
    ]
  }
}
```

---

## 8. API 規格補充

### POST /webhook/validate-sheet

驗證 Google Sheet URL 是否有效（格式正確 + 可存取）。

**Request**
```json
{
  "url": "https://docs.google.com/spreadsheets/d/1aBgdTRiDAJYR.../edit?..."
}
```

**Response - 成功**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "spreadsheetId": "1aBgdTRiDAJYR...",
    "title": "【蔚藍星球國王很忙】第二期12月專案",
    "tabCount": 5
  }
}
```

**Response - 失敗（無權限）**
```json
{
  "success": false,
  "error": "無法存取此表單，請確認已設定「知道連結的人都可以檢視」"
}
```

**Response - 失敗（URL 格式錯誤）**
```json
{
  "success": false,
  "error": "無效的 Google Sheet URL"
}
```

### GET /webhook/reminder-settings

取得使用者的提醒設定。

**Request**
```
GET /webhook/reminder-settings?userId=U1234567890abcdef
```

**Response - 成功（已註冊使用者）**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "times": ["09:00", "14:00", "21:00"]
  }
}
```

**Response - 成功（未設定提醒）**
```json
{
  "success": true,
  "data": {
    "enabled": false,
    "times": []
  }
}
```

**Response - 失敗（使用者不存在）**
```json
{
  "success": false,
  "error": "使用者不存在，請先完成註冊"
}
```

### POST /webhook/reminder-settings

更新使用者的提醒設定。

**Request**
```json
{
  "userId": "U1234567890abcdef",
  "enabled": true,
  "times": ["09:00", "14:00", "21:00"]
}
```

**驗證規則**：
- `times` 陣列最多 3 個元素
- 每個時間必須是有效的整點格式（HH:00）
- 若 `enabled` 為 false，可不傳 `times` 或傳空陣列

**Response - 成功**
```json
{
  "success": true,
  "data": {
    "message": "提醒設定已更新",
    "enabled": true,
    "times": ["09:00", "14:00", "21:00"]
  }
}
```

**Response - 失敗（超過上限）**
```json
{
  "success": false,
  "error": "最多只能設定 3 個提醒時間"
}
```

### GET /webhook/test-reminder（測試用）

手動觸發提醒功能的測試 API，可傳入模擬時間，不用等整點。

**Request**
```
GET /webhook/test-reminder?hour=09:00
```

**參數說明**：
- `hour`：模擬的時間，格式為 `HH:00`（如 `09:00`、`14:00`、`21:00`）

**行為說明**：
1. 讀取所有使用者
2. 篩選 `Reminder_Enabled = TRUE` 且 `Reminder_Times` 包含傳入的 `hour` 的使用者
3. 對符合條件的使用者執行完整的表單掃描流程
4. 若有未填欄位，發送 LINE 推播

**使用範例**：
```bash
# 測試 09:00 的提醒
curl "https://lorawu.app.n8n.cloud/webhook/test-reminder?hour=09:00"

# 或直接在瀏覽器打開
https://lorawu.app.n8n.cloud/webhook/test-reminder?hour=09:00
```

**測試流程**：
1. 在前端設定提醒時間（如 09:00）
2. 呼叫 `/webhook/test-reminder?hour=09:00`
3. 若有未填欄位，立刻收到 LINE 推播

**與 Cron 的差異**：
| 項目 | Cron 觸發 | Test Webhook |
|------|-----------|--------------|
| 時間來源 | 台北時區當前時間 | URL 參數 `hour` |
| 適用情境 | 正式環境 | 開發測試 |

---

## 9. 安全性設計

1. **管理者驗證**：LINE userId 白名單
2. **危險操作保護**：`/clear-me` 和 `/clear-all` 需二次確認（回覆 YES）
3. **非指令訊息**：忽略不回覆，避免誤觸發
4. **權限檢查**：註冊報表時驗證 Google Sheet 是否可存取

---

## 10. 穩定性設計

| 問題 | 解決方案 |
|------|----------|
| 日期格式混亂 | AI 語意比對，支援 2024/1/1、1-1、1月1日 等格式 |
| Sheet 結構變動 | 用 headerFingerprint 偵測變動，自動重新分析 |
| API 頻率限制 | Wait Node 延遲 + Split In Batches 分批處理 |
| 大型 Sheet | 自動降級：超過 50k cells 改讀表頭 + 尾端 |

---

## 11. 前端 UI/UX 設計規範

### 響應式設計原則

本專案的 LIFF 頁面主要在 **LINE 內建瀏覽器**（行動裝置窄螢幕）中使用，須遵循以下設計原則：

#### 輸入區塊佈局

| 元件組合 | ❌ 避免 | ✅ 建議 |
|---------|--------|--------|
| 輸入框 + 按鈕 | 水平並排（按鈕擠在右邊） | 垂直堆疊，按鈕全寬 |
| 多個操作按鈕 | 水平並排 | 垂直堆疊或換行 |
| 長文字 + 標籤 | 同行擠壓 | 標題一行，說明文字換行 |

```
❌ 不建議（手機體驗差）：
[___輸入內容___] [按鈕]  ← 按鈕小又難點擊

✅ 建議（手機體驗好）：
[______輸入內容______]
[______全寬按鈕______]  ← 按鈕大好點擊
```

#### 按鈕設計規範

- **主要操作按鈕**：全寬 (`w-full`)，高度至少 `py-2.5` (約 40px)
- **次要操作按鈕**：可縮小但仍需保證點擊區域 ≥ 44x44px
- **按鈕間距**：`gap-2` 或 `mb-2`

#### 卡片內容佈局

- **標題列**：標題 + badge 數字標籤應分開，避免文字過長擠壓
- **操作列**：如「前往填寫」按鈕，建議獨立一行全寬顯示
- **文字截斷**：使用 `truncate` 或 `break-all` 處理長文字

#### 頁面結構

```
┌─────────────────────────┐
│     Header (漸層背景)     │
├─────────────────────────┤
│   Status Card (狀態卡)   │
├─────────────────────────┤
│                         │
│    Section Cards        │
│    (各區塊卡片)          │
│                         │
├─────────────────────────┤
│   Submit Button (全寬)   │
├─────────────────────────┤
│      TabBar (固定底部)    │
└─────────────────────────┘
```

### 各頁面 UI 規範

#### Register.vue（個人設定）

| 區塊 | 輸入元件 | 按鈕佈局 |
|------|---------|---------|
| 基本資料 | van-field | - |
| 身分別名 | input + 新增按鈕 | **垂直堆疊，按鈕全寬** |
| 關注表單 - 快速選擇 | picker + 加入按鈕 | **按鈕全寬** |
| 關注表單 - 手動輸入 | input + 驗證 + 加入 | **垂直堆疊，按鈕全寬** |

#### Dashboard.vue（進度儀表板）

| 區塊 | 佈局說明 |
|------|---------|
| Sheet Header | 標題一行 + 狀態標籤與按鈕一行 |
| Missing Item | 欄位名一行 + 「前往分頁填寫」按鈕全寬一行 |
| Advisory Item | 欄位名一行 + 說明一行 + 按鈕全寬一行 |

#### ReminderSettings.vue（提醒設定）

| 區塊 | 佈局說明 |
|------|---------|
| 時間列表 | 時間顯示 + 刪除按鈕同行（刪除按鈕有足夠點擊區域）|
| 新增時間 | 按鈕全寬 |
| 儲存設定 | 按鈕全寬 |

### TailwindCSS 常用 class

```css
/* 全寬按鈕 */
.w-full.py-2.5.rounded-xl

/* 垂直堆疊 */
.flex.flex-col.gap-2

/* 文字截斷 */
.truncate          /* 單行截斷加 ... */
.break-all         /* 長 URL 自動換行 */

/* 最小點擊區域 */
.p-2               /* 增加 padding 確保 44px */

/* 彈性換行 */
.flex.flex-wrap.gap-2
```

---

## 12. 環境配置

### n8n 環境變數

| 變數 | 說明 |
|------|------|
| MASTER_SYNC_SHEET_ID | Master_Sync 的 Google Sheet ID |
| GEMINI_API_KEY | Gemini AI API Key |
| LINE_CHANNEL_ACCESS_TOKEN | LINE Messaging API Token |
| LIFF_ID | LINE LIFF ID |

### 前端環境變數

| 變數 | 說明 |
|------|------|
| VITE_LIFF_ID | LINE LIFF ID |
| VITE_API_BASE_URL | n8n Webhook Base URL |

---

## 13. 歷史文件

以下文件已移至 `docs/legacy/` 作為參考：

- `WORKFLOW_BC_REDESIGN_PLAN.md` - Workflow B/C 重設計規劃
- `專案開發計畫書：LINE 填寫自動化監測助理.md` - 原始需求文件
- `專案計畫書_LINE_n8n_AI_監測助理_互動展示.html` - 互動展示 HTML


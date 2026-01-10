# 專案計畫書：LINE x n8n x AI 跨表填寫狀態監測助理

## 1. 專案願景與使用情境 (User Scenarios)

### 1.1 使用情境描述

本系統旨在解決多個跨部門或跨團隊 Google Sheets 協作時，成員容易遺漏填寫的問題。

#### 情境 A：新使用者加入與身分初始化 (LIFF Web App)

當使用者第一次加入 LINE 官方帳號 (OA) 時，系統不再透過對話引導，而是請使用者使用圖文選單。

1.  **進入設定頁面：**
    *   **動作：** 使用者點擊 LINE OA 圖文選單中的「個人設定 / 註冊」按鈕。
    *   **跳轉：** 開啟 LIFF (LINE Front-end Framework) 網頁應用程式。
    *   **授權：** LIFF 自動取得使用者 LINE User ID (無需手動輸入)。

2.  **填寫註冊資訊 (Form)：**
    *   **基本資料：** 網頁表單欄位填寫「真實姓名」。
    *   **身分別名：** 透過動態欄位 (Tags Input) 新增多個別名（例如：張大明, 大明, 小張, Tommy）。
    *   **關注報表：** 使用者貼上多個 Google Sheet 網址，並可針對每個連結設定標籤（例如「每日進度表」、「簽到表」）。
    *   **提交：** 點擊「儲存設定」。前端將透過 API 將資料送至後端 (n8n) 進行權限驗證與寫入資料庫。

#### 情境 B：自動提醒 (定時觸發 - Push)

此情境維持由後端自動執行，不需使用者操作。

晚上 21 點，n8n 系統自動掃描資料庫中所有使用者的關注報表。系統發現當天日期有一列的名字是「小張」，但後方的「進度欄」是空的。系統對照資料庫發現「小張」是「張大明」的別名，於是彙整遺漏狀況，發送一則 LINE 訊息給張大明：

```text
[提醒] 您今日尚有 2 份報表未填寫，請確認：
1. 報表A (每日進度) - 點此前往
2. 報表B (簽到表) - 點此前往
```

**提醒規則：** 每天晚上 21, 22, 23 點各檢查一次，只要仍未填寫就會再次提醒。

#### 情境 C：關注報表儀表板 (LIFF Dashboard)

使用者想隨時確認自己今天的填寫狀況，不再需要打字詢問。

1.  **查看報表：**
    *   **動作：** 使用者點擊 LINE OA 圖文選單中的「我的填寫進度」按鈕。
    *   **跳轉：** 開啟 LIFF 網頁，進入「關注報表」頁面。
2.  **資料呈現：**
    *   網頁呼叫後端 API，即時抓取最新分析結果。
    *   **視覺化回饋：** 畫面顯示「今日狀態：⚠️ 2 項未完成」或「✅ 全部完成」。
    *   **詳細清單：** 列出每個關注報表的填寫狀況 (Pass/Fail) 與詳細內容。

#### 情境 D：資料管理與修改 (LIFF Settings)

1.  **即時修改：**
    *   在 LIFF 設定頁面中，使用者可以隨時新增/刪除別名，或移除不再關注的報表。
    *   所有修改在按下「更新」後即時同步至後端資料庫。

---

## 2. 核心架構與技術棧

| 組件 | 技術選型 |
|------|----------|
| 自動化引擎 (Backend) | **n8n Workflow** (取代傳統後端 Server / API Logic) <br> - 透過 Webhook 接收前端請求 <br> - 負責商業邏輯與資料庫讀寫 |
| 前端框架 (Frontend Core) | **Vue 3** (Composition API) + **Vite** (Build Tool) |
| 前端介面 (UI Library) | **Vant UI** (Mobile Components) + **TailwindCSS** (Utility CSS) |
| 前端整合 (Integration) | **LINE LIFF SDK** (v2) |
| 託管服務 (Hosting) | **Vercel** (Serverless Frontend Deployment) |
| 核心資料庫 (DB) | **Google Sheets** (分頁名：Master_Sync) |
| 大腦邏輯 (AI) | AI Node (GPT-4o 或 Claude 3.5 Sonnet) |

### 2.1 資料流向架構 (Data Flow)

```mermaid
graph LR
    User((User)) -->|1. 操作介面| Frontend[Vercel Frontend\n(Static HTML/JS)]
    Frontend -->|2. API 請求 (Fetch)| Backend[n8n Webhook\n(Backend Logic)]
    Backend <-->|3. 讀寫資料| DB[(Google Sheets\nDatabase)]
    Backend -->|4. 推播通知| LineAPI[LINE Messaging API]
    LineAPI -->|5. 訊息| User
```

1.  **前端 (Vercel)**：託管靜態 HTML/CSS/JS 檔案。這裡是使用者的瀏覽器在執行程式碼。
2.  **後端 (n8n)**：前端 JS 會發送 API 請求給 n8n Webhook。n8n 負責商業邏輯運算。
3.  **資料庫 (Google Sheet)**：n8n 接收請求後，去讀寫 Google Sheet。

### 2.2 前端技術策略 (Frontend Tech Stack)

採用 **Mobile-First** 策略，確保 LIFF 在手機上有最佳體驗：

1.  **Vue 3 (Framework)**
    *   負責核心邏輯與資料綁定 (v-model)，處理複雜的動態表單互動。

2.  **Vant UI (Component Library)**
    *   **用途**：專為手機網頁設計的元件庫。
    *   **優勢**：提供各類 App 等級的原生組件 (e.g., `van-field` 輸入框, `van-toast` 提示窗, `van-cell` 列表)，省去大量手刻 CSS 時間。

3.  **TailwindCSS (Utility CSS)**
    *   **用途**：微調版面細節 (Spacing, Typography, Colors)。
    *   **優勢**：當 Vant 預設樣式不完全符合需求時，可透過 Utility Classes 快速覆寫，無需維護龐大的 CSS 檔案。

---

## 3. 資料模型設計 (Master_Sync Table)

| 欄位名稱 | 說明 | 範例 |
|----------|------|------|
| Line_UID | LINE 唯一的 ID (不可變) | U8429... |
| Real_Name | 使用者註冊的正式姓名 | 張大明 |
| Aliases | 已確認的別名 (逗號分隔) | 張大明,小張,大明,Tommy |
| Pending_Alias | 待確認的暫存別名 (用於情境 C) | 老張 |
| Target_Sheet_IDs | 關注的試算表 ID 清單 (逗號分隔) | ID_1, ID_2 |
| Sheet_Configs | 各 Sheet 的欄位配置 (JSON 格式) | 見下方說明 |
| Last_Check_Time | 最後一次推播提醒的時間 | 2024-10-27 21:05 |

### 3.1 Sheet_Configs 欄位格式

首次設定 Sheet 時，AI 會分析欄位結構並存儲配置，避免每次監測都重新解析：

```json
{
  "ID_1": {
    "name_column": "B",
    "date_column": "A",
    "progress_column": "D",
    "sheet_name": "每日進度表"
  },
  "ID_2": {
    "name_column": "A",
    "date_column": "C",
    "progress_column": "E",
    "sheet_name": "簽到表"
  }
}
```

---

## 4. 三大 Workflow 詳細設計

### Workflow A (API)：使用者資料管理 (LIFF Backend)

**觸發方式：** n8n Webhook Node (接收來自 LIFF 下的 API 請求)。

1.  **POST /api/user/register (或 update)：**
    *   接收 JSON Payload：`{ userId, realName, aliases: [], sheetUrls: [] }`。
    *   **權限驗證：** 檢查 Sheet URL 是否可公開讀取。
    *   **AI 解析 (Optional)：** 若首次新增 Sheet，觸發 AI 分析欄位結構 (Sheet Config)。
    *   **DB 寫入：** 更新 Google Sheet (Master_Sync)。
    *   **回傳：** JSON `{ success: true, message: "設定已儲存" }`。

2.  **GET /api/user/profile：**
    *   依據 querystring `?userId=...` 查詢 Master_Sync。
    *   回傳使用者目前的設定資料 (供 LIFF 前端回填表單)。

### Workflow B (API)：即時報表查詢 (LIFF Dashboard Backend)

**觸發方式：** n8n Webhook Node (GET /api/report/status)。

1.  **觸發：** LIFF 前端載入 Dashboard 時呼叫。
2.  **處理流程：**
    *   讀取該 User ID 對應的 `Target_Sheet_IDs`。
    *   循環讀取各 Sheet (使用 Cache 的 Config)。
    *   判定填寫狀態 (邏輯同核心監測)。
3.  **回傳：** JSON 格式的詳細報告清單，供前端渲染列表。

### 介面規格 (Interface Specifications) - 前後端對接合約

請後端工程師依照此格式回傳資料，以符合前端預期：

#### 1. POST /webhook/user-register
**前端發送 (Payload):**
```json
{
  "userId": "U12345678",
  "realName": "王小明",
  "aliases": ["小明", "Ming"],
  "sheetUrls": [
    { "name": "每日報表", "url": "https://..." }
  ]
}
```
**預期回應:**
```json
{
  "status": "success",
  "message": "設定已儲存"
}
```

#### 2. GET /webhook/report-status?userId=U1234...
**預期回應:**
```json
{
  "reports": [
    {
      "name": "每日報表",
      "status": "pending", // 或 "completed"
      "lastCheck": "2024-01-05 10:00",
      "url": "https://..."
    }
  ]
}
```

### Workflow C (Cron)：自動推播系統 (Notifier)

此流程保持不變，作為唯一的「主動推播」機制。

1.  **觸發：** Cron (21, 22, 23 點)。
2.  **流程：**
    *   掃描所有使用者 -> 執行監測。
    *   若有 `status == missing` -> 呼叫 LINE Messaging API (Push Message)。
    *   **訊息內容：** 除了文字提醒，可附加 LIFF URL Button：「點此查看詳情」。

---

## 5. 填寫狀態判定規則

### 5.1 「未填寫」的定義

以下情況皆視為「未填寫」：
- 儲存格為空白
- 儲存格內容為 `NA`、`N/A`、`n/a`
- 儲存格內容為 `待填`、`待填寫`
- 儲存格內容為 `-`、`--`
- 儲存格內容為純空格

### 5.2 「已填寫」的定義

除上述情況外，任何有實質內容的儲存格皆視為已填寫。

---

## 6. 訊息格式設計

### 6.1 提醒訊息格式

```
您今日尚有 {N} 份報表未填寫：
1. {報表名稱A} - {連結A}
2. {報表名稱B} - {連結B}
```

### 6.2 權限失效訊息格式

```
您今日尚有 1 份報表未填寫：
1. 報表A - https://...

另外，以下報表無法存取，請確認權限設定：
- 報表X
```

### 6.3 全部完成訊息格式

```
太棒了！您目前關注的報表皆已完成填寫。
```

---

## 7. 思考漏洞補強方案 (Robustness)

### 漏洞 1：日期格式混亂 (AI 語意比對)

- **細節：** 不同 Sheet 的日期可能寫為 2024/1/1、1-1、1月1日。
- **方案：** 在 AI Node 的輸入端提供 System_Date。要求 AI 執行「模糊日期匹配」，只要語意上是指「今天」或符合系統日期的行數，皆視為目標資料。

### 漏洞 2：Sheet 結構變動 (欄位配置快取)

- **細節：** 管理者可能隨意移動欄位順序或修改標題。
- **方案：**
  - **首次設定時**：AI 分析 Sheet 結構，辨識欄位位置，存入 Sheet_Configs。
  - **日常監測時**：直接使用已存儲的欄位配置，不再重新解析。
  - **配置失效時**：若讀取失敗，提示使用者重新設定該報表。

### 漏洞 3：API 頻率限制與穩定性

- **細節：** 若一位使用者關注 10 個 Sheet，且有 100 位使用者，短時間會產生大量請求。
- **方案：**
  1. 在 Loop 之間加入 Wait Node（延遲 1 秒）。
  2. 使用 Split In Batches 節點進行分組處理。
  3. 開啟節點的 Continue on Fail，確保單一 Sheet 報錯不會崩潰整個 Workflow。

---

## 8. MVP 範圍定義

### 8.1 MVP 包含功能

- [x] **LIFF 前端頁面**：註冊/設定頁面、報表 Dashboard 頁面。
- [x] **n8n API Backend**：處理使用者資料 CRUD、即時報表狀態查詢。
- [x] **定時提醒 Workflow**：每日定時掃描並推播。
- [x] **Sheet 欄位配置快取**：首次存入時解析。

### 8.2 MVP 暫不實作

- [ ] 複雜的聊天機器人 (Chatbot) 對話邏輯 (已全面改用 LIFF)。
- [ ] 權限失效自動移除 (維持通知提醒)。
- [ ] 多語言支援。

---

## 9. 實作檢查清單 (Role-Based Checklist)

為了便於多人協作，以下任務依據角色分工拆分。

> **最後更新：2026-01-08**

### 🟢 前端工程師 (Frontend Team) - 負責人：Antigravity
*   **核心職責**：Vercel 託管、LIFF SDK 整合、Vue 頁面開發。
*   **目前進度**：✅ Phase 3 整合完成，前後端對接完成
*   **文件**：已建立 `frontend/README.md` 說明架構與執行方式。

#### Phase 1: 環境與基礎建設
- [x] **Hosting**: 建立 GitHub Repository 並連結 Vercel 取得 HTTPS 網址 (Local Repo Ready)
- [x] **LINE Login**: 於 LINE Developers 建立 Login Channel (取得 LIFF ID)
- [x] **LIFF Config**: 將 Vercel 網址填入 LIFF Endpoint URL
- [x] **Dev Check**: 建立 Hello World 頁面確認 LIFF init 成功

#### Phase 2: 頁面開發
- [x] **UI Framework**: 初始化 Vue 3 + Vite + Vant UI + TailwindCSS
- [x] **Page 1 (Register)**: 開發註冊表單，測試 POST `/api/user/register` (UI Ready)
- [x] **Page 2 (Dashboard)**: 開發報表儀表板，測試 GET `/api/report/status` (UI Ready)

#### Phase 3: 整合與部署 ✅ 完成
- [x] **API Client**: 將前端 Mock API 替換為真實 `axios` 請求 ✅
- [x] **Deployment**: 部署至 Vercel 正式環境 (https://n8n-sheet-guard.vercel.app)

---

### 🔵 後端工程師 (Backend Team) - 負責人：ClaudeCode
*   **核心職責**：GCP 設定、n8n 邏輯、Google Sheets 資料庫、Messaging API 推播。
*   **目前進度**：✅ Phase 1 & 2 完成，已部署至 n8n 雲端

#### Phase 1: 環境與基礎建設 ✅ 完成
- [x] **GCP**: 啟用 Google Sheets/Drive API，下載 OAuth Credentials JSON ✅
- [x] **LINE Messaging**: 建立 Messaging API Channel (取得 Token/Secret) ✅
- [x] **n8n Auth**: 在 n8n 完成 Google 與 LINE 的憑證連線 ✅
- [x] **DB Init**: 建立 `Master_Sync` Google Sheet 並設定好欄位 ✅

#### Phase 2: 邏輯與 API 開發
- [x] **AI Prompts**: 測試並固化「欄位解析」與「狀態判定」的 Prompt ✅
- [x] **Workflow A (API)**: 實作 User Register/Profile 接口 ✅ **已部署到 n8n 雲端**
- [x] **Workflow B (API)**: 實作 Report Status 接口 ✅ **已部署到 n8n 雲端**
- [x] **Workflow C (Cron)**: 實作每日排程與 LINE Push Message 邏輯 ✅ **已部署到 n8n 雲端**
- [x] **Error Handling**: 處理權限不足或 API 失敗的例外狀況 ✅

#### 後端產出檔案 (位於 `backend/` 目錄)

| 檔案 | 說明 | 狀態 |
|------|------|------|
| `workflow-a-user-api.json` | 使用者 API (Webhook) | ✅ 完成 |
| `workflow-b-report-api.json` | 報表狀態 API (Webhook) | ✅ 完成 |
| `workflow-c-cron-notifier.json` | 定時推播 (Cron 21,22,23點) | ✅ 完成 |
| `workflow-health-check.json` | 健康檢查端點 | ✅ 完成 |
| `test-workflow-a.json` | 手動測試版 - 使用者 API | ✅ 完成 |
| `test-workflow-b.json` | 手動測試版 - 報表狀態 | ✅ 完成 |
| `test-workflow-c.json` | 手動測試版 - 推播系統 | ✅ 完成 |
| `後端先行手動測.md` | 測試步驟指南 | ✅ 完成 |

#### 後端 API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/health` | 健康檢查 |
| POST | `/api/user/register` | 註冊/更新使用者 |
| GET | `/api/user/profile?userId=xxx` | 取得使用者資料 |
| GET | `/api/report/status?userId=xxx` | 取得報表填寫狀態 |

#### 下一步待辦 ✅ 已完成
- [x] 實際匯入 n8n 並測試（參考 `後端先行手動測.md`）✅
- [x] 設定 Google Sheets 憑證 ✅
- [x] 設定環境變數 `MASTER_SYNC_SHEET_ID` ✅
- [x] 與前端串接測試 ✅

---

## 10. AI 判定邏輯 (Prompt 範例)

### 10.1 欄位結構解析 Prompt（首次設定用）

```
你是一位資料結構分析專家。請分析以下 Google Sheet 的前 10 行數據，辨識出：
1. 哪一欄最可能是「姓名」欄位
2. 哪一欄最可能是「日期」欄位
3. 哪一欄最可能是「填寫內容/進度」欄位

數據來源：{{$sheet_data}}

請輸出 JSON 格式：
{
  "name_column": "B",
  "date_column": "A",
  "progress_column": "D",
  "confidence": "high" | "medium" | "low",
  "reasoning": "簡短說明判斷依據"
}
```

### 10.2 填寫狀態判定 Prompt（日常監測用）

```
你是一位精準的資料查核員。

系統日期：{{$today}}
使用者別名清單：{{$aliases}}
欄位配置：姓名欄={{$name_col}}，日期欄={{$date_col}}，進度欄={{$progress_col}}
數據來源：{{$sheet_data}}

請執行以下分析：
1. 找出數據中所有日期語意等同於「系統日期」的行
2. 檢查這些行的「姓名欄」是否與「別名清單」匹配
3. 針對匹配成功的行，判斷「進度欄」是否為未填寫狀態
   - 未填寫定義：空白、NA、N/A、待填、待填寫、-、-- 或純空格

輸出 JSON 格式：
{
  "status": "missing" | "completed",
  "found_name": "匹配到的姓名",
  "progress_value": "進度欄的實際內容",
  "row_number": 5
}
```

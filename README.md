# LINE x n8n x AI 跨表填寫狀態監測助理

自動化解決 Google Sheets 協作遺漏問題的 LINE Bot 系統。結合 LINE 的即時性、n8n 的自動化流程以及 AI 的語意理解，打造無縫的填寫提醒體驗。

## 系統架構

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   LINE OA   │────▶│  n8n Cloud  │────▶│Google Sheets│
│  (使用者)   │◀────│  (後端邏輯)  │◀────│  (資料庫)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       │            │  Gemini AI  │
       │            │  (智慧判斷)  │
       │            └─────────────┘
       │
       ▼
┌─────────────┐
│ LIFF Web App│
│ (設定/儀表板)│
└─────────────┘
```

## 功能概覽

| 功能 | 說明 |
|------|------|
| 使用者註冊 | 透過 LIFF 設定真實姓名、別名、關注報表 |
| 智慧掃描 | AI 自動識別日期、姓名欄位，判斷填寫狀態 |
| 儀表板 | 即時查看今日填寫進度 |
| 定時推播 | 每天 21/22/23 點自動提醒未填寫項目 |
| LINE 指令 | 透過指令管理使用者資料 |

## 專案結構

```
n8n-sheet-guard/
├── README.md              # 本文件
├── REQUIREMENTS.md        # 完整需求規格
├── TODO.md                # 待辦清單
├── TROUBLESHOOTING.md     # 問題排除紀錄
├── docs/
│   └── legacy/            # 歷史文件存檔
├── backend/               # n8n Workflow JSON 檔案
│   ├── workflow-a-user-api-v2.json      # 使用者 API
│   ├── workflow-b-report-api-v2.json    # 報表狀態 API
│   ├── workflow-c-cron-notifier-v2.json # 定時推播
│   ├── workflow-d-line-bot-commands.json # LINE Bot 指令
│   └── AI_PROMPTS.md                     # AI Prompt 設計
└── frontend/              # Vue 3 前端應用
    ├── src/views/Dashboard.vue  # 儀表板頁面
    └── src/views/Register.vue   # 設定頁面
```

## 快速開始

### 前端開發

```bash
cd frontend
npm install
npm run dev
```

### 部署

**前端 (Vercel)**
```bash
cd frontend
npm run build
npx vercel --prod
```

**後端 (n8n)**
1. 匯入 `backend/workflow-*.json` 到 n8n
2. 設定 Google Sheets OAuth2 憑證
3. 設定環境變數（見 `backend/env-example.txt`）

## 線上服務

| 服務 | URL |
|------|-----|
| 前端 (Vercel) | https://n8n-sheet-guard.vercel.app |
| LIFF | https://liff.line.me/2008820860-ESw51iC9 |
| n8n API Base | https://lorawu.app.n8n.cloud/webhook |

## 相關文件

- [完整需求規格](./REQUIREMENTS.md)
- [待辦清單](./TODO.md)
- [問題排除](./TROUBLESHOOTING.md)
- [後端說明](./backend/README.md)
- [前端說明](./frontend/README.md)


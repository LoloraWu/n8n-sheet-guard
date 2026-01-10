# 🔧 問題排除紀錄

## Workflow A - User API 問題

### 問題 1：Google Sheets Update 節點錯誤
**錯誤訊息**：`Could not get parameter: columns.matchingColumns`

**原因**：Google Sheets Update 節點需要指定 `matchingColumns` 參數來知道用哪個欄位匹配要更新的列。

**解決方案**：在 Update 節點的 columns 設定中加入：
```json
"matchingColumns": ["Line_UID"]
```

---

### 問題 2：Google Sheets Filter 沒有生效
**症狀**：查詢 `userId=TEST123` 但返回所有用戶資料（6 筆）

**原因**：n8n Google Sheets 節點的 filter 功能在某些情況下不會正確過濾。

**解決方案**：加入一個 **Code 節點** 手動過濾：
```javascript
const allUsers = $input.all();
const targetUserId = '要找的 userId';
const matchedUser = allUsers.find(item => item.json.Line_UID === targetUserId);
```

---

### 問題 3：判斷用戶是否存在的邏輯錯誤
**症狀**：新用戶走到 Update 分支，而不是 Append 分支

**原因**：
1. `$input.all().length === 0` 判斷錯誤（空結果也會返回 1 個項目）
2. `$json.Line_UID` 返回的是字串，不是布林值

**解決方案**：
1. 加 Code 節點明確判斷：`const userExists = !!(matchedUser)`
2. 用 `!!` 確保返回布林值

---

### 問題 4：重複的 Spreadsheet URL 沒有去重
**症狀**：用戶輸入兩個指向同一個 spreadsheet 的 URL（例如一個帶 `gid` 參數），系統會當成兩個獨立的報表

**原因**：`Parse Sheet URLs` 節點沒有對 `spreadsheetId` 做去重

**解決方案**：使用 Map 以 `spreadsheetId` 為 key 去重：
```javascript
const sheetsMap = new Map();
for (const sheet of sheetUrls) {
  const spreadsheetId = extractSpreadsheetId(sheet.url);
  if (sheetsMap.has(spreadsheetId)) {
    // 合併 tags，保留第一個的 name
    const existing = sheetsMap.get(spreadsheetId);
    existing.tags = [...new Set([...existing.tags, ...newTags])];
  } else {
    sheetsMap.set(spreadsheetId, { ... });
  }
}
const parsedSheets = Array.from(sheetsMap.values());
```

同時，URL 會被標準化為 `https://docs.google.com/spreadsheets/d/{id}` 格式。

---

### 問題 5：Update 節點沒有輸出
**錯誤訊息**：`No output data returned`

**原因**：Google Sheets Update 節點找不到匹配的列時不會返回任何資料。

**解決方案**：
1. 在節點設定中加入 `alwaysOutputData: true`
2. 或在後面加一個 Code 節點來準備回應

---

### 問題 6：Google Sheets Append/Update 節點 schema 錯誤（間歇性）
**錯誤訊息**：`Could not get parameter: columns.schema`

**症狀**：儲存設定時「常常」（不是每次）顯示伺服器連線失敗

**原因**：Google Sheets 節點使用 `mappingMode: "defineBelow"` 時，n8n 需要**在執行時**動態從 Google Sheets API 取得欄位結構 (schema)。如果 Google API 連線不穩定、超時或有速率限制，就會導致此錯誤。

**解決方案**：將 `mappingMode` 從 `"defineBelow"` 改為 `"autoMapInputData"`，讓 n8n 直接根據輸入資料的 key 名稱對應表單欄位，不需要動態取得 schema。

**步驟**：
1. 修改 Code 節點的輸出，讓 key 名稱與 Google Sheets 欄位名稱一致：
```javascript
// 原本
return [{
  json: {
    userId: parsedData.userId,
    realName: parsedData.realName,
    timestamp: '...'
  }
}];

// 改為（key 與表單欄位一致）
return [{
  json: {
    Line_UID: parsedData.userId,
    Real_Name: parsedData.realName,
    Updated_At: '...'
  }
}];
```

2. 修改 Google Sheets 節點的 columns 設定：
```json
// 原本
"columns": {
  "mappingMode": "defineBelow",
  "value": {
    "Line_UID": "={{ $json.userId }}",
    "Real_Name": "={{ $json.realName }}"
  }
}

// 改為
"columns": {
  "mappingMode": "autoMapInputData",
  "value": {}
}
```

**受影響的節點**：
- `Append New User`
- `Update Existing User`
- `Append New User (No Sheets)`
- `Update User (No Sheets)`
- `Update Reminder Settings`

**注意**：如果是 `appendOrUpdate` 操作（如 Workflow D），需要用 `defineBelow` + 明確的 `schema` 陣列來解決（見 Workflow D 問題 1）。

---

## Workflow B - Report API 問題

### 問題 1：同樣的 Filter 問題
跟 Workflow A 一樣，Google Sheets filter 沒生效。

**解決方案**：加入 `Filter User` Code 節點手動過濾。

---

### 問題 2：HTTP Request 節點認證問題
**錯誤訊息**：`Cannot read properties of undefined (reading 'status')`

**原因**：HTTP Request 節點呼叫 Google Sheets API 但沒有設定 OAuth2 憑證。

**解決方案**：
1. 在 HTTP Request 節點選 **Predefined Credential Type**
2. Credential Type 選 **Google Sheets OAuth2 API**
3. 選擇 `n8n-sheet-guard-master` 憑證

---

### 問題 3：Merge 節點沒有輸出
**錯誤訊息**：`No output data returned`

**原因**：Merge 節點用 "All Possible Combinations" 模式，當一個分支是空的，輸出也是空的。

**解決方案**：把 Merge 節點的 **Mode** 改成 **Append**

受影響的節點：
- `Merge Data Paths`
- `Merge Schema Paths`

---

## Workflow D - LINE Bot Commands 問題

### 問題 1：Google Sheets appendOrUpdate 節點缺少 schema
**錯誤訊息**：`Could not get parameter: columns.schema`

**原因**：Google Sheets 節點 v4.5 的 `appendOrUpdate` 操作使用 `resourceMapper` 類型，需要在 `columns` 中提供：
1. `schema` - 欄位結構定義
2. `matchingColumns` - 用於匹配的欄位（決定是 append 還是 update）

**解決方案**：在 columns 設定中加入 schema 和 matchingColumns：
```json
"columns": {
  "mappingMode": "defineBelow",
  "schema": [
    { "id": "User_ID", "displayName": "User_ID", "required": false, "defaultMatch": true, "canBeUsedToMatch": true, "type": "string" },
    { "id": "Action", "displayName": "Action", "required": false, "defaultMatch": false, "canBeUsedToMatch": false, "type": "string" },
    { "id": "Timestamp", "displayName": "Timestamp", "required": false, "defaultMatch": false, "canBeUsedToMatch": false, "type": "string" }
  ],
  "value": {
    "User_ID": "={{ ... }}",
    "Action": "clear-me",
    "Timestamp": "={{ Date.now() }}"
  },
  "matchingColumns": ["User_ID"]
}
```

受影響的節點：
- `Save Pending (clear-me)`
- `Save Pending (clear-all)`

---

### 問題 2：Google Sheets Read 節點空結果不輸出
**症狀**：執行 `/clear-all` 後 `/list-usr` 沒有任何反應

**原因**：Google Sheets Read 節點在沒有數據時不會輸出任何項目，導致後續節點不會被執行。

**解決方案**：為所有 Read 節點添加 `alwaysOutputData: true`：
```json
"alwaysOutputData": true
```

受影響的節點：
- `Get My Status` - /my-status 查詢用戶
- `Get Pending Confirmation` - YES 確認查詢
- `Get All Users (list)` - /list-usr 列出所有用戶
- `Get All Users (clear-all)` - /clear-all 獲取所有用戶
- `Get Target User (check)` - /check-usr 查詢指定用戶

---

## Workflow B/C - Report API 問題

### 問題 1：中文日期格式「X月X日」未被識別
**症狀**：Sheet 中有未填寫欄位但沒有被偵測到

**原因**：Gemini prompt 原本只支援 `YYYY/MM/DD`、`MM/DD`、`M/D` 格式，不支援中文格式如「1月10日」。

**解決方案**：更新 Gemini Status Inference prompt，增加日期格式支援：
- `M月D日`（如 `1月10日`）
- `MM月DD日`（如 `01月10日`）
- `YYYY-MM-DD`

### 問題 2：LINE ID 欄位未被識別為姓名欄
**症狀**：別名在 LINE ID 欄位，但沒有匹配到

**原因**：Schema Inference 沒有把「LINE ID」識別為可匹配別名的欄位。

**解決方案**：更新 Gemini Schema Inference prompt：
1. 把「LINE ID」加入 name 類型的關鍵字
2. 支援多個 nameCol（nameCols 陣列）
3. 提示 AI 注意第一列可能是大標題，實際表頭在第二列

### 問題 3：Sheet 第一列是大標題導致表頭識別錯誤
**症狀**：例如第一列是「巴哈姆特討論區-一般留言」，第二列才是真正表頭

**解決方案**：在 Schema Inference prompt 中加入提示，讓 AI 識別這種結構。

---

## 通用注意事項

### ⚠️ HTTP Request 節點認證設定

**重要**：HTTP Request 節點呼叫 Google API 時，必須使用正確的認證設定！

**❌ 錯誤的設定**（會導致認證失敗）：
```json
"authentication": "oAuth2"
```

**✅ 正確的設定**：
```json
"authentication": "predefinedCredentialType",
"nodeCredentialType": "googleSheetsOAuth2Api"
```

**受影響的節點**（所有 Workflow）：
- `Validate Sheet Access` (Workflow A)
- `Get Spreadsheet Metadata` (Workflow B & C)
- `Read Tab Data` (Workflow B & C)
- `Read Tail Data` (Workflow B)

**n8n UI 設定步驟**：
1. 點擊 HTTP Request 節點
2. Authentication → **Predefined Credential Type**
3. Credential Type → **Google Sheets OAuth2 API**
4. 選擇 **n8n-sheet-guard-master**

```
Authentication: Predefined Credential Type
Credential Type: Google Sheets OAuth2 API
Credential: n8n-sheet-guard-master
```

**已修復**（2026-01-10）：所有 workflow JSON 已更新為正確的認證設定。

---

### n8n Google Sheets 節點的限制

1. **Filter 功能不可靠**：建議用 Code 節點手動過濾
2. **Update 節點需要 matchingColumns**：否則會報錯
3. **空結果處理**：即使沒有匹配，節點也會輸出一個空項目

### PowerShell vs Bash 指令差異

Windows PowerShell 的 `curl` 是 `Invoke-WebRequest` 的別名，語法不同。

**正確的 PowerShell 指令**：
```powershell
Invoke-RestMethod -Uri "URL" -Method POST -ContentType "application/json" -Body (@{key="value"} | ConvertTo-Json -Depth 3)
```

---

## 最終解決方案架構

### Workflow A 流程
```
Webhook → Validate → Parse URLs → Check User Exists → 
  ↓
Code (Filter User + Prepare Data) → IF (userExists) →
  ↓ true                              ↓ false
Update Existing User              Append New User
  ↓                                   ↓
     → Prepare Response → Respond Success
```

### Workflow B 流程
```
Webhook → Get User Config → Code (Filter User) → IF (exists) →
  ↓ true                                           ↓ false
Prepare Scan → Get Metadata → Extract Tabs →    Respond Not Found
Read Tab → Merge Data → Calculate Fingerprint →
IF (needs schema) → Gemini Schema → Parse →
Merge Schema → Gemini Status → Build Reports →
Aggregate All → Respond Status
```


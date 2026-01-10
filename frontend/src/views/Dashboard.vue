<script setup>
import { ref, onMounted, computed } from 'vue';
import liff from '@line/liff';
import { reportApi } from '@/services/api';
import { userState } from '@/stores/userState';

// ============ Mock Mode ============
const USE_MOCK = false; // 設為 true 使用假資料預覽

// ============ 開發模式：本地測試用 ============
// 設定一個測試用的 userId，這樣不需要 LIFF 登入也能測試
const DEV_MODE = false; // 上線前改成 false
const DEV_USER_ID = 'TEST123'; // 測試用 userId

const MOCK_RESPONSE = {
  success: true,
  data: {
    summary: {
      total: 5,
      missing: 4,
      completed: 1,
      allCompleted: false,
      tabsScanned: 3
    },
    reports: [
      {
        id: 'rpt-1',
        headline: '01/08｜哈拉版玩家留言｜未填：一般留言(D4)',
        spreadsheetId: '1abc123',
        sheetTitle: '【蔚藍星球國王很忙】第二期12月專案',
        sheetUrl: 'https://docs.google.com/spreadsheets/d/1abc123',
        tabName: '哈拉版玩家留言',
        tabUrl: 'https://docs.google.com/spreadsheets/d/1abc123#gid=123',
        missingFieldName: '一般留言',
        cellRef: 'D4',
        category: '巴哈姆特討論區',
        aiSummary: '在 2025/01/08 對應 Sin 的資料列中，「一般留言」欄位為空白，判定未填寫'
      },
      {
        id: 'rpt-2',
        headline: '01/08｜哈拉版玩家留言｜未填：推文連結(E4)',
        spreadsheetId: '1abc123',
        sheetTitle: '【蔚藍星球國王很忙】第二期12月專案',
        sheetUrl: 'https://docs.google.com/spreadsheets/d/1abc123',
        tabName: '哈拉版玩家留言',
        tabUrl: 'https://docs.google.com/spreadsheets/d/1abc123#gid=123',
        missingFieldName: '推文連結',
        cellRef: 'E4',
        category: '巴哈姆特討論區',
        aiSummary: '在 2025/01/08 對應 Sin 的資料列中，「推文連結」欄位為空白，判定未填寫'
      },
      {
        id: 'rpt-3',
        headline: '01/08｜每日簽到表｜未填：今日進度(C12)',
        spreadsheetId: '1abc123',
        sheetTitle: '【蔚藍星球國王很忙】第二期12月專案',
        sheetUrl: 'https://docs.google.com/spreadsheets/d/1abc123',
        tabName: '每日簽到表',
        tabUrl: 'https://docs.google.com/spreadsheets/d/1abc123#gid=456',
        missingFieldName: '今日進度',
        cellRef: 'C12',
        category: '',
        aiSummary: '找到別名「Sin」在今日列，但「今日進度」欄為 N/A，視為未填寫'
      },
      {
        id: 'rpt-4',
        headline: '01/08｜工作日誌｜未填：完成事項(B8)',
        spreadsheetId: '2xyz789',
        sheetTitle: '2025年團隊工作追蹤',
        sheetUrl: 'https://docs.google.com/spreadsheets/d/2xyz789',
        tabName: '工作日誌',
        tabUrl: 'https://docs.google.com/spreadsheets/d/2xyz789#gid=0',
        missingFieldName: '完成事項',
        cellRef: 'B8',
        category: '每日回報',
        aiSummary: '在 2025/01/08 的資料列中，「完成事項」欄位為「-」，依規則判定為未填寫'
      }
    ],
    advisories: [
      {
        sheetTitle: '【蔚藍星球國王很忙】第二期12月專案',
        tabName: '哈拉版玩家留言',
        tabUrl: 'https://docs.google.com/spreadsheets/d/1abc123#gid=123',
        fieldName: '備註',
        cellRef: 'F4',
        note: '此欄位為選填，請自行檢查是否需要填寫'
      },
      {
        sheetTitle: '2025年團隊工作追蹤',
        tabName: '工作日誌',
        tabUrl: 'https://docs.google.com/spreadsheets/d/2xyz789#gid=0',
        fieldName: '補充說明',
        cellRef: 'D8',
        note: '此欄位為選填，請視需要填寫'
      }
    ],
    warnings: [],
    lastCheckTime: new Date().toISOString()
  }
};

// ============ State ============
const loading = ref(false);
const error = ref(null);
const lastUpdated = ref(null);

// 新的 API 回傳結構
const summary = ref({
  total: 0,
  missing: 0,
  completed: 0,
  allCompleted: true,
  tabsScanned: 0
});

// 缺漏項目（每個缺漏欄位一筆）
const reports = ref([]);
// 提醒（備註類欄位，不算 missing）
const advisories = ref([]);
// 警告（掃描降級等）
const warnings = ref([]);

// 展開的 sheet 清單
const expandedSheets = ref([]);
// 展開的 tab 清單（格式：`${sheetId}::${tabName}`）
const expandedTabs = ref([]);
// 展開的單筆 report（看詳細卡片）
const expandedReportIds = ref([]);

// ============ Helpers ============
const getLiffUserId = async () => {
  // 開發模式：直接回傳測試 userId
  if (DEV_MODE) {
    console.log('🔧 開發模式：使用測試 userId =', DEV_USER_ID);
    return DEV_USER_ID;
  }
  
  if (!liff.isLoggedIn()) return null;
  try {
    const context = liff.getContext();
    if (context?.userId) return context.userId;
    const profile = await liff.getProfile();
    return profile.userId;
  } catch (e) {
    console.warn('Could not get user ID:', e);
    return null;
  }
};

// ============ Computed ============
// 判斷用戶是否需要設定（未註冊或未設定表單）
const needsSetup = computed(() => {
  // 載入中不算
  if (loading.value) return false;
  
  // 檢查共享狀態是否有註冊記錄（即時同步）
  const sharedRegistered = userState.state.isRegistered;
  
  // 有錯誤且共享狀態無註冊記錄時，需要設定
  if (error.value && !sharedRegistered) return true;
  
  // 若共享狀態有註冊但 tabsScanned 為 0，可能是還沒設定表單
  // 若沒有 error 但 tabsScanned 為 0 且無共享狀態註冊記錄，需要設定
  if (summary.value.tabsScanned === 0 && !sharedRegistered) return true;
  
  return false;
});

// 是否有有效資料（已註冊且有掃描結果）
const hasValidData = computed(() => {
  return !loading.value && !error.value && summary.value.tabsScanned > 0;
});

// 是否已註冊但無表單
const isRegisteredNoSheets = computed(() => {
  const sharedRegistered = userState.state.isRegistered;
  return !loading.value && !error.value && sharedRegistered && summary.value.tabsScanned === 0;
});

const statusText = computed(() => {
  if (loading.value) return '載入中...';
  if (needsSetup.value) return '⚙️ 首次使用';
  if (isRegisteredNoSheets.value) return '📋 無關注表單';
  if (summary.value.allCompleted && summary.value.missing === 0) {
    return '✓ 全部完成';
  }
  return `${summary.value.missing} 項待填`;
});

const statusBgClass = computed(() => {
  if (loading.value) return 'bg-slate-500';
  if (needsSetup.value) return 'bg-slate-600';
  if (isRegisteredNoSheets.value) return 'bg-amber-500';
  return summary.value.allCompleted ? 'bg-green-600' : 'bg-orange-500';
});

const lastUpdatedText = computed(() => {
  if (!lastUpdated.value) return '尚未更新';
  // 顯示台北時間（完整日期 + 時間）
  return lastUpdated.value.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
});

// 把 reports + advisories 分組成 Sheet -> Tab -> Items
const groupedReports = computed(() => {
  const sheets = {};

  // 處理缺漏項目
  for (const r of reports.value) {
    const sheetKey = r.spreadsheetId || r.sheetId || 'unknown';
    const tabKey = r.tabName || '分頁1';

    if (!sheets[sheetKey]) {
      sheets[sheetKey] = {
        sheetId: sheetKey,
        sheetTitle: r.sheetTitle || '未命名表單',
        sheetUrl: r.sheetUrl || `https://docs.google.com/spreadsheets/d/${sheetKey}`,
        tabs: {},
        missingCount: 0,
        advisoryCount: 0
      };
    }

    if (!sheets[sheetKey].tabs[tabKey]) {
      sheets[sheetKey].tabs[tabKey] = {
        tabName: tabKey,
        tabUrl: r.tabUrl || sheets[sheetKey].sheetUrl,
        items: [],
        advisories: [],
        missingCount: 0
      };
    }

    sheets[sheetKey].tabs[tabKey].items.push(r);
    sheets[sheetKey].tabs[tabKey].missingCount++;
    sheets[sheetKey].missingCount++;
  }

  // 處理 advisories（請自行檢查項目）- 放到對應的 Tab 底下
  for (const adv of advisories.value) {
    // 找到對應的 sheet
    let targetSheet = null;
    for (const sheetKey of Object.keys(sheets)) {
      if (sheets[sheetKey].sheetTitle === adv.sheetTitle) {
        targetSheet = sheets[sheetKey];
        break;
      }
    }

    // 如果沒找到對應的 sheet，建立一個新的
    if (!targetSheet && adv.sheetTitle) {
      const newSheetKey = `adv-${adv.sheetTitle}`;
      sheets[newSheetKey] = {
        sheetId: newSheetKey,
        sheetTitle: adv.sheetTitle,
        sheetUrl: '',
        tabs: {},
        missingCount: 0,
        advisoryCount: 0
      };
      targetSheet = sheets[newSheetKey];
    }

    if (targetSheet) {
      const tabKey = adv.tabName || '分頁1';
      if (!targetSheet.tabs[tabKey]) {
        targetSheet.tabs[tabKey] = {
          tabName: tabKey,
          tabUrl: '',
          items: [],
          advisories: [],
          missingCount: 0
        };
      }
      targetSheet.tabs[tabKey].advisories.push(adv);
      targetSheet.advisoryCount++;
    }
  }

  // 轉成 array 方便 v-for
  return Object.values(sheets).map(sheet => ({
    ...sheet,
    tabs: Object.values(sheet.tabs)
  }));
});

// 有無任何資料
const hasData = computed(() => {
  return reports.value.length > 0 || advisories.value.length > 0;
});

// ============ Actions ============
const toggleSheet = (sheetId) => {
  const idx = expandedSheets.value.indexOf(sheetId);
  if (idx >= 0) {
    expandedSheets.value.splice(idx, 1);
  } else {
    expandedSheets.value.push(sheetId);
  }
};

const toggleTab = (sheetId, tabName) => {
  const key = `${sheetId}::${tabName}`;
  const idx = expandedTabs.value.indexOf(key);
  if (idx >= 0) {
    expandedTabs.value.splice(idx, 1);
  } else {
    expandedTabs.value.push(key);
  }
};

const toggleReportDetail = (reportId) => {
  const idx = expandedReportIds.value.indexOf(reportId);
  if (idx >= 0) {
    expandedReportIds.value.splice(idx, 1);
  } else {
    expandedReportIds.value.push(reportId);
  }
};

const isSheetExpanded = (sheetId) => expandedSheets.value.includes(sheetId);
const isTabExpanded = (sheetId, tabName) => expandedTabs.value.includes(`${sheetId}::${tabName}`);
const isReportExpanded = (reportId) => expandedReportIds.value.includes(reportId);

// ============ API Call ============
const checkStatus = async () => {
  loading.value = true;
  error.value = null;

  try {
    let response;

    if (USE_MOCK) {
      // Mock 模式：模擬延遲後返回假資料
      await new Promise(resolve => setTimeout(resolve, 800));
      response = MOCK_RESPONSE;
    } else {
      // 真實 API 模式
      const userId = await getLiffUserId();

      if (!userId) {
        error.value = '無法取得使用者資訊，請重新登入';
        return;
      }

      response = await reportApi.getStatus(userId);
    }

    if (response && response.success) {
      const data = response.data;
      
      // 同步共享狀態（若有掃描到表單表示已註冊）
      if (data.summary?.tabsScanned > 0) {
        userState.setRegistered({ userId });
      }

      // 新格式直接對應
      summary.value = data.summary || {
        total: 0,
        missing: 0,
        completed: 0,
        allCompleted: true,
        tabsScanned: 0
      };

      // reports：每個缺漏欄位一筆
      // 如果後端還是舊格式（每張 sheet 一筆），做向下相容轉換
      if (data.reports && data.reports.length > 0) {
        // 檢查是否為新格式（有 headline 或 missingFieldName）
        const isNewFormat = data.reports[0].headline || data.reports[0].missingFieldName;

        if (isNewFormat) {
          // 新格式：直接用
          reports.value = data.reports.map((r, idx) => ({
            id: r.id || `report-${idx}`,
            headline: r.headline || buildHeadline(r),
            spreadsheetId: r.spreadsheetId || r.sheetId,
            sheetTitle: r.sheetTitle || r.sheetName || '未命名表單',
            sheetUrl: r.sheetUrl || `https://docs.google.com/spreadsheets/d/${r.spreadsheetId || r.sheetId}`,
            tabName: r.tabName || '分頁1',
            tabUrl: r.tabUrl || r.sheetUrl,
            missingFieldName: r.missingFieldName || r.fieldName || '未知欄位',
            cellRef: r.cellRef || '',
            category: r.category || '',
            aiSummary: r.aiSummary || r.reason || ''
          }));
        } else {
          // 舊格式向下相容：每張 sheet 一筆，裡面可能有 missingItems[]
          reports.value = [];
          data.reports.forEach((oldReport, sheetIdx) => {
            const sheetId = oldReport.sheetId || `sheet-${sheetIdx}`;
            const sheetName = oldReport.sheetName || `表單 ${sheetIdx + 1}`;
            const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;

            if (oldReport.status === 'missing') {
              // 如果有 missingItems 陣列
              const items = oldReport.missingItems || (oldReport.reason ? [oldReport.reason] : ['未知原因']);
              items.forEach((item, itemIdx) => {
                reports.value.push({
                  id: `${sheetId}-${itemIdx}`,
                  headline: `${sheetName}｜${typeof item === 'string' ? item : item.fieldName || '未知'}`,
                  spreadsheetId: sheetId,
                  sheetTitle: sheetName,
                  sheetUrl: sheetUrl,
                  tabName: oldReport.tabName || '分頁1',
                  tabUrl: sheetUrl,
                  missingFieldName: typeof item === 'string' ? item : (item.fieldName || '未知欄位'),
                  cellRef: typeof item === 'object' ? item.cellRef : '',
                  category: '',
                  aiSummary: typeof item === 'object' ? item.reason : oldReport.reason || ''
                });
              });
            }
          });

          // 重算 summary
          summary.value.missing = reports.value.length;
          summary.value.allCompleted = reports.value.length === 0;
        }
      } else {
        reports.value = [];
      }

      // advisories
      advisories.value = data.advisories || [];

      // warnings
      warnings.value = data.warnings || [];

      // 使用 API 回傳的 lastCheckTime，若無則用前端時間
      lastUpdated.value = data.lastCheckTime ? new Date(data.lastCheckTime) : new Date();

      // Sheets 和 Tabs 現在預設全部展開，不需要手動控制

    } else {
      error.value = response?.error || '無法取得表單狀態';
    }
  } catch (err) {
    console.error('API Error:', err);
    error.value = err.message || '連線失敗，請稍後再試';
  } finally {
    loading.value = false;
  }
};

// 建立 headline
const buildHeadline = (r) => {
  const date = new Date().toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
  const tab = r.tabName || '';
  const field = r.missingFieldName || r.fieldName || '未知';
  const cell = r.cellRef ? `(${r.cellRef})` : '';
  return `${date}｜${tab}｜未填：${field}${cell}`;
};

// ============ Lifecycle ============
onMounted(() => {
  checkStatus();
});
</script>

<template>
  <div class="pb-24 min-h-screen bg-slate-50">
    <!-- Header with Status -->
    <div
      class="text-white px-5 pt-6 pb-10"
      :class="[
        loading ? 'bg-gradient-to-br from-slate-500 to-slate-600' :
        needsSetup ? 'bg-gradient-to-br from-slate-600 to-slate-700' :
        isRegisteredNoSheets ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
        (summary.allCompleted && summary.missing === 0)
          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
          : 'bg-gradient-to-br from-indigo-600 to-violet-600'
      ]"
    >
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold tracking-tight">表單進度儀表板</h1>
        <button
          class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
          :disabled="loading"
          @click="checkStatus"
        >
          <van-icon name="replay" size="18" :class="{ 'animate-spin': loading }" />
        </button>
      </div>

      <div class="text-center">
        <div class="text-4xl font-bold mb-1">
          {{ statusText }}
        </div>
        <p class="text-white/70 text-sm">
          <template v-if="loading">正在載入...</template>
          <template v-else-if="needsSetup">請填寫資料以啟用監測功能</template>
          <template v-else-if="isRegisteredNoSheets">請前往「個人設定」加入表單</template>
          <template v-else>已掃描 {{ summary.tabsScanned || 0 }} 個分頁 · {{ lastUpdatedText }}</template>
        </p>
      </div>
    </div>

    <!-- Error Message (only show if not needsSetup, since needsSetup handles unregistered users) -->
    <div v-if="error && !needsSetup" class="mx-4 -mt-4 mb-4">
      <div class="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
        <div class="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <van-icon name="warning-o" size="18" color="#dc2626" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-red-800 font-medium text-sm">發生錯誤</p>
          <p class="text-red-600 text-xs mt-0.5">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Warnings -->
    <div v-if="warnings.length > 0" class="mx-4 -mt-4 mb-4 space-y-2">
      <div
        v-for="(warn, idx) in warnings"
        :key="`warn-${idx}`"
        class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3"
      >
        <div class="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <van-icon name="info-o" size="18" color="#d97706" />
        </div>
        <div class="flex-1 min-w-0 text-sm">
          <span v-if="warn.sheetTitle" class="font-medium text-amber-800">{{ warn.sheetTitle }}</span>
          <span v-if="warn.tabName" class="text-amber-700"> / {{ warn.tabName }}</span>
          <p class="text-amber-700 mt-0.5">{{ warn.message || warn }}</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="px-4 -mt-4">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
        <van-loading size="28px" color="#6366f1" />
        <p class="text-slate-400 mt-3 text-sm">正在掃描表單...</p>
      </div>
    </div>

    <!-- All Complete State (must check before Empty State) -->
    <div v-else-if="hasValidData && summary.allCompleted && reports.length === 0" class="px-4 -mt-4">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
        <div class="text-5xl mb-4">🎉</div>
        <p class="text-slate-800 font-bold text-lg">太棒了！</p>
        <p class="text-slate-500 text-sm mt-1">所有表單皆已完成填寫</p>
      </div>
    </div>

    <!-- Empty State (no forms set up / not registered) -->
    <div v-else-if="needsSetup" class="px-4 -mt-4">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
        <div class="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <van-icon name="user-circle-o" size="48" color="#6366f1" />
        </div>
        <p class="text-slate-800 font-bold text-xl mb-2">首次使用</p>
        <p class="text-slate-500 text-sm mb-6">請填寫資料以啟用監測功能</p>
        <button
          class="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg active:scale-95 transition-transform"
          @click="$router.push('/register')"
        >
          前往個人設定
        </button>
      </div>
    </div>

    <!-- Registered but No Sheets State -->
    <div v-else-if="isRegisteredNoSheets" class="px-4 -mt-4">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
        <div class="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <van-icon name="notes-o" size="48" color="#f59e0b" />
        </div>
        <p class="text-slate-800 font-bold text-xl mb-2">尚未設定關注表單</p>
        <p class="text-slate-500 text-sm mb-6">請前往「個人設定」加入您要追蹤的表單</p>
        <button
          class="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg active:scale-95 transition-transform"
          @click="$router.push('/register')"
        >
          加入關注表單
        </button>
      </div>
    </div>

    <!-- Reports List -->
    <div v-else-if="groupedReports.length > 0" class="px-4 -mt-4 space-y-4">
      <!-- Sheet Cards -->
      <div
        v-for="sheet in groupedReports"
        :key="sheet.sheetId"
        class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <!-- Sheet Header -->
        <div class="px-4 py-3 border-b border-slate-100">
          <!-- 表單標題列 -->
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">📊</span>
            <p class="font-semibold text-slate-800 text-sm truncate flex-1">{{ sheet.sheetTitle }}</p>
          </div>
          <!-- 狀態標籤 + 按鈕 -->
          <div class="flex items-center justify-between gap-2 ml-7">
            <div class="flex items-center gap-2 flex-wrap">
              <span v-if="sheet.missingCount > 0" class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-lg font-medium">
                {{ sheet.missingCount }} 項未填
              </span>
              <span v-if="sheet.advisoryCount > 0" class="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-lg font-medium">
                {{ sheet.advisoryCount }} 待檢查
              </span>
            </div>
            <a
              :href="sheet.sheetUrl"
              target="_blank"
              class="text-xs text-indigo-600 font-medium flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200 flex-shrink-0 whitespace-nowrap"
              @click.stop
            >
              🔗 開啟
            </a>
          </div>
        </div>

        <!-- Tabs -->
        <div v-for="tab in sheet.tabs" :key="tab.tabName">
          <!-- Tab Header -->
          <div class="flex items-center bg-slate-50 border-l-4 border-indigo-400 px-4 py-2">
            <span class="text-base mr-2">📄</span>
            <span class="flex-1 text-sm font-medium text-slate-700 truncate">{{ tab.tabName }}</span>
            <span v-if="tab.items.length > 0" class="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium mr-1">
              {{ tab.items.length }}
            </span>
            <span v-if="tab.advisories.length > 0" class="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">
              {{ tab.advisories.length }}
            </span>
          </div>

          <!-- Items -->
          <div class="border-l-4 border-transparent ml-4 border-l-slate-200">
            <!-- Missing Items -->
            <div v-for="item in tab.items" :key="item.id" class="bg-red-50 border-b border-red-100 last:border-b-0">
              <div
                class="px-4 py-3 cursor-pointer active:bg-red-100"
                @click="toggleReportDetail(item.id)"
              >
                <!-- 欄位名稱 + 儲存格 -->
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="text-sm text-slate-800 font-medium truncate">{{ item.missingFieldName }}</span>
                    <span class="text-xs text-slate-400 flex-shrink-0">{{ item.cellRef }}</span>
                  </div>
                </div>
                <!-- 前往分頁按鈕（獨立一行，全寬） -->
                <a
                  :href="item.tabUrl || item.sheetUrl"
                  target="_blank"
                  class="w-full text-xs text-indigo-600 font-medium flex items-center justify-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200"
                  @click.stop
                >
                  🔗 前往分頁填寫
                </a>
              </div>
              <div v-show="isReportExpanded(item.id)" class="px-4 pb-3 pt-0">
                <div class="bg-white rounded-lg p-3 text-xs space-y-1.5 border border-red-100">
                  <div v-if="item.category" class="flex gap-2">
                    <span class="text-slate-400 w-12 flex-shrink-0">分類</span>
                    <span class="text-slate-600 break-all">{{ item.category }}</span>
                  </div>
                  <div v-if="item.aiSummary" class="flex gap-2">
                    <span class="text-slate-400 w-12 flex-shrink-0">說明</span>
                    <span class="text-slate-600 break-all">{{ item.aiSummary }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Advisories -->
            <div v-for="(adv, advIdx) in tab.advisories" :key="`adv-${advIdx}`" class="bg-amber-50 border-b border-amber-100 last:border-b-0">
              <div class="px-4 py-3">
                <!-- 欄位名稱 + 儲存格 -->
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm text-slate-700">{{ adv.fieldName || '欄位' }}<span class="text-amber-600">（待檢查）</span></span>
                  <span class="text-xs text-slate-400">{{ adv.cellRef }}</span>
                </div>
                <!-- 說明文字 -->
                <p class="text-xs text-amber-700 mb-2">{{ adv.note }}</p>
                <!-- 前往分頁按鈕（獨立一行，全寬） -->
                <a
                  :href="adv.tabUrl || adv.sheetUrl || '#'"
                  target="_blank"
                  class="w-full text-xs text-indigo-600 font-medium flex items-center justify-center gap-1 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200"
                  @click.stop
                >
                  🔗 前往分頁檢查
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

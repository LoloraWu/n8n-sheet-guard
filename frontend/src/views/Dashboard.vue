<script setup>
import { ref, onMounted, computed } from 'vue';
import liff from '@line/liff';
import { reportApi } from '@/services/api';

// ============ Mock Mode ============
const USE_MOCK = false; // 設為 false 使用真實 API

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
        note: '欄位「備註」可能需要填寫，請自行檢查是否缺漏'
      },
      {
        sheetTitle: '2025年團隊工作追蹤',
        tabName: '工作日誌',
        note: '欄位「補充說明」為選填欄位，請視需要填寫'
      }
    ],
    warnings: [
      {
        sheetTitle: '2025年團隊工作追蹤',
        tabName: '歷史紀錄',
        message: '此分頁資料量超過 50,000 筆，已改用「表頭+尾端」抽樣掃描，可能漏掉較早的今日資料'
      }
    ]
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
const statusText = computed(() => {
  if (summary.value.allCompleted && summary.value.missing === 0) {
    return '✅ 全部完成';
  }
  return `⚠️ ${summary.value.missing} 項未完成`;
});

const statusBgClass = computed(() => {
  return summary.value.allCompleted ? 'bg-green-600' : 'bg-orange-500';
});

const lastUpdatedText = computed(() => {
  if (!lastUpdated.value) return '尚未更新';
  const now = new Date();
  const diff = Math.floor((now - lastUpdated.value) / 1000);
  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  return lastUpdated.value.toLocaleTimeString('zh-TW');
});

// 把 reports + advisories 分組成 Sheet -> Tab -> Items
const groupedReports = computed(() => {
  const sheets = {};

  // 處理缺漏項目
  for (const r of reports.value) {
    const sheetKey = r.spreadsheetId || r.sheetId || 'unknown';
    const tabKey = r.tabName || 'Sheet1';

    if (!sheets[sheetKey]) {
      sheets[sheetKey] = {
        sheetId: sheetKey,
        sheetTitle: r.sheetTitle || '未命名報表',
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
      const tabKey = adv.tabName || 'Sheet1';
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
            sheetTitle: r.sheetTitle || r.sheetName || '未命名報表',
            sheetUrl: r.sheetUrl || `https://docs.google.com/spreadsheets/d/${r.spreadsheetId || r.sheetId}`,
            tabName: r.tabName || 'Sheet1',
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
            const sheetName = oldReport.sheetName || `報表 ${sheetIdx + 1}`;
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
                  tabName: oldReport.tabName || 'Sheet1',
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

      lastUpdated.value = new Date();

      // 預設展開第一個 sheet
      if (groupedReports.value.length > 0) {
        expandedSheets.value = [groupedReports.value[0].sheetId];
      }

    } else {
      error.value = response?.error || '無法取得報表狀態';
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
  <div class="pb-20 min-h-screen bg-gray-50">
    <van-nav-bar title="關注報表儀表板" />

    <!-- Error Message -->
    <div v-if="error" class="bg-red-100 border border-red-300 text-red-700 px-4 py-3 m-4 rounded-lg">
      <div class="flex items-center">
        <van-icon name="warning-o" class="mr-2" />
        {{ error }}
      </div>
    </div>

    <!-- Warnings Banner -->
    <div v-if="warnings.length > 0" class="mx-4 mt-4">
      <div
        v-for="(warn, idx) in warnings"
        :key="`warn-${idx}`"
        class="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg mb-2 text-sm"
      >
        <div class="flex items-start">
          <van-icon name="info-o" class="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <span v-if="warn.sheetTitle" class="font-medium">{{ warn.sheetTitle }}</span>
            <span v-if="warn.tabName"> / {{ warn.tabName }}</span>
            <span v-if="warn.sheetTitle || warn.tabName">：</span>
            {{ warn.message || warn }}
          </div>
        </div>
      </div>
    </div>

    <!-- Status Overview -->
    <div :class="[statusBgClass, 'p-6 text-white text-center transition-colors duration-300']">
      <h2 class="text-lg opacity-90">今日狀態</h2>
      <div class="text-3xl font-bold mt-2 flex items-center justify-center gap-2">
        {{ statusText }}
      </div>
      <p class="text-sm opacity-75 mt-2">
        已掃描 {{ summary.tabsScanned || groupedReports.length || 0 }} 個分頁
        ・最後更新：{{ lastUpdatedText }}
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="p-8 text-center">
      <van-loading type="spinner" color="#1989fa" />
      <p class="text-gray-500 mt-2">正在掃描報表...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasData && !error" class="p-8 text-center text-gray-500">
      <van-icon name="notes-o" size="48" class="mb-4 opacity-50" />
      <p class="text-lg">尚未設定關注報表</p>
      <p class="text-sm mt-2">請前往「個人設定」新增報表</p>
    </div>

    <!-- All Complete State -->
    <div v-else-if="summary.allCompleted && reports.length === 0 && !loading" class="p-8 text-center">
      <div class="text-6xl mb-4">🎉</div>
      <p class="text-xl font-bold text-green-700">太棒了！</p>
      <p class="text-gray-600 mt-2">您目前關注的報表皆已完成填寫</p>
    </div>

    <!-- Missing Reports List (Grouped by Sheet -> Tab) -->
    <div v-else-if="groupedReports.length > 0" class="p-4 space-y-4">
      <!-- Sheet Group -->
      <div
        v-for="(sheet, sheetIndex) in groupedReports"
        :key="sheet.sheetId"
        class="rounded-xl shadow-md overflow-hidden border-2"
        :class="[
          sheetIndex % 3 === 0 ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white' :
          sheetIndex % 3 === 1 ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-white' :
          'border-teal-200 bg-gradient-to-br from-teal-50 to-white'
        ]"
      >
        <!-- Sheet Header -->
        <div
          class="flex items-center justify-between p-4 cursor-pointer transition-colors"
          :class="[
            sheetIndex % 3 === 0 ? 'hover:bg-blue-100/50' :
            sheetIndex % 3 === 1 ? 'hover:bg-purple-100/50' :
            'hover:bg-teal-100/50'
          ]"
          @click="toggleSheet(sheet.sheetId)"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <van-icon
                :name="isSheetExpanded(sheet.sheetId) ? 'arrow-down' : 'arrow'"
                class="transition-transform"
                :class="[
                  sheetIndex % 3 === 0 ? 'text-blue-500' :
                  sheetIndex % 3 === 1 ? 'text-purple-500' :
                  'text-teal-500'
                ]"
              />
              <span class="font-bold text-gray-800 text-lg">{{ sheet.sheetTitle }}</span>
            </div>
            <a
              :href="sheet.sheetUrl"
              target="_blank"
              class="inline-flex items-center gap-1 ml-6 mt-1 px-2 py-1 rounded-full text-xs font-medium transition-colors"
              :class="[
                sheetIndex % 3 === 0 ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                sheetIndex % 3 === 1 ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                'bg-teal-100 text-teal-700 hover:bg-teal-200'
              ]"
              @click.stop
            >
              <van-icon name="link-o" size="12" />
              開啟 Google Sheet
            </a>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <van-tag v-if="sheet.missingCount > 0" type="danger" size="medium" class="!font-bold">
              {{ sheet.missingCount }} 項未填
            </van-tag>
            <van-tag v-if="sheet.advisoryCount > 0" type="warning" size="medium">
              {{ sheet.advisoryCount }} 待檢查
            </van-tag>
          </div>
        </div>

        <!-- Tab List (Expanded) -->
        <div v-show="isSheetExpanded(sheet.sheetId)" class="bg-white/80 border-t border-gray-200">
          <div
            v-for="tab in sheet.tabs"
            :key="tab.tabName"
            class="border-b border-gray-100 last:border-b-0"
          >
            <!-- Tab Header -->
            <div
              class="flex items-center justify-between px-4 py-3 pl-8 cursor-pointer hover:bg-gray-50 transition-colors"
              @click="toggleTab(sheet.sheetId, tab.tabName)"
            >
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <van-icon
                  :name="isTabExpanded(sheet.sheetId, tab.tabName) ? 'arrow-down' : 'arrow'"
                  class="text-gray-300 text-sm"
                />
                <span class="text-gray-700 font-medium truncate">📄 {{ tab.tabName }}</span>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span v-if="tab.missingCount > 0" class="text-red-500 text-sm font-medium">
                  {{ tab.missingCount }} 筆未填
                </span>
                <span v-if="tab.advisories && tab.advisories.length > 0" class="text-yellow-600 text-sm">
                  {{ tab.advisories.length }} 待檢查
                </span>
              </div>
            </div>

            <!-- Missing Items + Advisories (Expanded) -->
            <div
              v-show="isTabExpanded(sheet.sheetId, tab.tabName)"
              class="ml-8 mr-4 mb-3 space-y-3"
            >
              <!-- Missing Items (紅色區塊) -->
              <div v-if="tab.items.length > 0" class="bg-red-50 px-4 py-3 rounded-lg">
                <div
                  v-for="item in tab.items"
                  :key="item.id"
                  class="mb-3 last:mb-0"
                >
                  <!-- Headline (一行摘要，點擊展開) -->
                  <div
                    class="bg-white rounded-lg border border-red-100 shadow-sm overflow-hidden"
                  >
                    <div
                      class="flex items-center justify-between p-3 cursor-pointer hover:bg-red-50 transition-colors"
                      @click="toggleReportDetail(item.id)"
                    >
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <van-icon name="warning" class="text-red-500 flex-shrink-0" />
                        <span class="text-sm text-gray-800 truncate">{{ item.headline }}</span>
                      </div>
                      <van-icon
                        :name="isReportExpanded(item.id) ? 'arrow-up' : 'arrow-down'"
                        class="text-gray-400 flex-shrink-0"
                      />
                    </div>

                    <!-- Detail Card (展開顯示四行卡片) -->
                    <div
                      v-show="isReportExpanded(item.id)"
                      class="border-t border-red-100 p-3 bg-white text-sm space-y-2"
                    >
                      <div class="flex">
                        <span class="text-gray-500 w-16 flex-shrink-0">Sheet</span>
                        <a
                          :href="item.sheetUrl"
                          target="_blank"
                          class="text-blue-600 hover:underline truncate"
                        >
                          {{ item.sheetTitle }}
                        </a>
                      </div>
                      <div class="flex">
                        <span class="text-gray-500 w-16 flex-shrink-0">Tab</span>
                        <a
                          :href="item.tabUrl"
                          target="_blank"
                          class="text-blue-600 hover:underline truncate"
                        >
                          {{ item.tabName }}
                        </a>
                      </div>
                      <div class="flex">
                        <span class="text-gray-500 w-16 flex-shrink-0">欄位</span>
                        <span class="text-red-700 font-medium">
                          {{ item.missingFieldName }}
                          <span v-if="item.cellRef" class="text-gray-500">({{ item.cellRef }})</span>
                        </span>
                      </div>
                      <div v-if="item.category" class="flex">
                        <span class="text-gray-500 w-16 flex-shrink-0">分類</span>
                        <span class="text-gray-700">{{ item.category }}</span>
                      </div>
                      <div v-if="item.aiSummary" class="flex">
                        <span class="text-gray-500 w-16 flex-shrink-0">說明</span>
                        <span class="text-gray-700">{{ item.aiSummary }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Advisories (黃色區塊，請自行檢查) -->
              <div v-if="tab.advisories && tab.advisories.length > 0" class="bg-yellow-50 px-4 py-3 rounded-lg border border-yellow-200">
                <div class="text-yellow-800 font-medium text-sm mb-2 flex items-center gap-1">
                  <van-icon name="info-o" />
                  請自行檢查
                </div>
                <div
                  v-for="(adv, advIdx) in tab.advisories"
                  :key="`adv-${advIdx}`"
                  class="bg-white rounded-lg border border-yellow-100 p-3 mb-2 last:mb-0 text-sm text-gray-700"
                >
                  {{ adv.note || adv }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="p-4">
      <van-button block icon="replay" @click="checkStatus" :loading="loading" type="primary">
        重新整理
      </van-button>
    </div>
  </div>
</template>

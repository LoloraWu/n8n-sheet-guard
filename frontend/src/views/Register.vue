<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { showToast, showNotify } from 'vant';
import 'vant/es/notify/style';
import liff from '@line/liff';
import { userApi } from '@/services/api';
import { userState } from '@/stores/userState';

// State
const form = reactive({
  realName: '',
  aliases: [],
  sheetUrls: []
});

const newAlias = ref('');
const newSheetUrl = ref('');

// 驗證相關 state
const isValidating = ref(false);
const validationResult = ref(null); // { success: true, title, tabCount } 或 { success: false, error }

const isLoading = ref(false);
const isLoadingProfile = ref(false);
const isExistingUser = ref(false);
const userId = ref(null);

// 可用表單列表（從其他使用者取得）
const availableSheets = ref([]);
const isLoadingSheets = ref(false);
const showSheetPicker = ref(false);
const selectedSheetId = ref('');

// 取得 LIFF userId 的輔助函數
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

// 載入可用表單列表（其他使用者已連結的表單）
const loadAvailableSheets = async () => {
  isLoadingSheets.value = true;
  try {
    const response = await userApi.getAvailableSheets();
    if (response.success && response.data?.sheets) {
      availableSheets.value = response.data.sheets;
      console.log('Loaded available sheets:', response.data.sheets);
    }
  } catch (err) {
    console.warn('Failed to load available sheets:', err);
  } finally {
    isLoadingSheets.value = false;
  }
};

// 載入現有使用者資料
const loadExistingProfile = async () => {
  if (!userId.value) return;

  isLoadingProfile.value = true;
  try {
    const response = await userApi.getProfile(userId.value);

    if (response.success && response.data) {
      const userData = response.data;

      // 只要有 realName 或 aliases 就視為「現有使用者」
      // 這樣即使沒有 sheetUrls 也會回填姓名和別名
      if (userData.realName || (userData.aliases && userData.aliases.length > 0)) {
        isExistingUser.value = true;
        // 同步到共享狀態
        userState.setRegistered({
          userId: userId.value,
          realName: userData.realName,
          aliases: userData.aliases,
          sheetUrls: userData.sheetUrls
        });

        // 回填姓名（覆蓋預設的 LINE display name）
        if (userData.realName) {
          form.realName = userData.realName;
        }
        // 回填別名
        if (userData.aliases && userData.aliases.length > 0) {
          form.aliases = [...userData.aliases];
        }

        console.log('Loaded existing profile (name/aliases):', userData);
      }

      // 回填報表（獨立處理，即使是新使用者也可能有報表）
      if (userData.sheetUrls && userData.sheetUrls.length > 0) {
        form.sheetUrls = userData.sheetUrls.map((sheet, index) => ({
          name: sheet.name || `表單 ${index + 1}`,
          url: sheet.url,
          tags: sheet.tags || []
        }));
        console.log('Loaded existing sheets:', userData.sheetUrls);
      } else {
        // 沒有報表：保持空陣列
        console.log('No existing sheets');
      }
    }
  } catch (err) {
    // 使用者不存在是正常情況，不需要顯示錯誤
    console.log('No existing profile found (new user)');
  } finally {
    isLoadingProfile.value = false;
  }
};

onMounted(async () => {
  // === DEV MOCK: 開發時預覽 UI ===
  const DEV_MOCK = false;
  if (DEV_MOCK) {
    form.realName = '王小明';
    form.aliases = ['小明', 'Sin', 'Tommy'];
    form.sheetUrls = [
      {
        name: '【蔚藍星球國王很忙】第二期12月專案',
        url: 'https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ',
        tags: []
      },
      {
        name: '每日進度追蹤表',
        url: 'https://docs.google.com/spreadsheets/d/2zYxWvUtSrQpOnMlKjIhGfEdCbA',
        tags: []
      }
    ];
    availableSheets.value = [
      {
        spreadsheetId: '3aAbBcCdDeEfFgGhHiIjJ',
        name: '哈拉版玩家留言統計',
        url: 'https://docs.google.com/spreadsheets/d/3aAbBcCdDeEfFgGhHiIjJ'
      }
    ];
    isExistingUser.value = true;
    isLoadingProfile.value = false;
    return;
  }
  // === END DEV MOCK ===

  try {
    // 取得 userId
    userId.value = await getLiffUserId();

    // 載入可用表單列表（不需要登入也可以載入）
    loadAvailableSheets();

    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile();
      const displayName = profile?.displayName || '';

      // 先設定預設值：使用 LINE display name
      // 關注報表預設為空，讓使用者自己填
      form.realName = displayName;
      form.aliases = displayName ? [displayName] : [];
      form.sheetUrls = [];

      // 再嘗試載入現有資料（只有真正註冊過的使用者才會覆蓋）
      if (userId.value) {
        await loadExistingProfile();
      }
    }
  } catch (err) {
    console.error('Error initializing register page:', err);
  }
});

// Computed
const submitButtonText = computed(() => {
  return isExistingUser.value ? '更新設定' : '儲存設定';
});

const pageTitle = computed(() => '個人設定');

// Methods
const addAlias = () => {
  if (newAlias.value.trim()) {
    if (!form.aliases.includes(newAlias.value.trim())) {
      form.aliases.push(newAlias.value.trim());
    }
    newAlias.value = '';
  }
};

const removeAlias = (index) => {
  form.aliases.splice(index, 1);
};

// 驗證 Google Sheet URL
const validateSheetUrl = async () => {
  const url = newSheetUrl.value.trim();
  
  if (!url) {
    showToast({ message: '請先輸入 Google 表單網址', duration: 2500, className: 'toast-info' });
    return;
  }

  // 基本 URL 格式檢查
  if (!url.includes('docs.google.com/spreadsheets')) {
    validationResult.value = { success: false, error: '無效的 Google 表單網址格式' };
    return;
  }

  isValidating.value = true;
  validationResult.value = null;

  try {
    const response = await userApi.validateSheet(url);
    
    if (response && response.success && response.data?.valid) {
      validationResult.value = {
        success: true,
        title: response.data.title,
        spreadsheetId: response.data.spreadsheetId,
        tabCount: response.data.tabCount
      };
    } else if (!response || response === '') {
      validationResult.value = { success: false, error: '伺服器無回應' };
    } else {
      validationResult.value = { success: false, error: response.error || '驗證失敗' };
    }
  } catch (error) {
    validationResult.value = { success: false, error: error.message || '驗證失敗，請檢查網路連線' };
  } finally {
    isValidating.value = false;
  }
};

// 清除驗證結果（當 URL 改變時）
const onSheetUrlChange = () => {
  validationResult.value = null;
};

const addSheet = () => {
  if (newSheetUrl.value.trim()) {
    // 基本 URL 格式檢查
    if (!newSheetUrl.value.includes('docs.google.com/spreadsheets')) {
      showToast({ message: '請輸入有效的 Google 表單網址', duration: 2500, className: 'toast-info' });
      return;
    }

    // 檢查是否已驗證成功
    if (!validationResult.value?.success) {
      showToast({ message: '請先驗證表單網址', duration: 2500, className: 'toast-info' });
      return;
    }

    // 檢查是否已存在
    const alreadyExists = form.sheetUrls.some(s => 
      s.url.includes(validationResult.value.spreadsheetId)
    );
    if (alreadyExists) {
      showToast({ message: '此表單已在關注列表中', duration: 2500, className: 'toast-info' });
      return;
    }

    form.sheetUrls.push({
      name: validationResult.value.title || `表單 ${form.sheetUrls.length + 1}`,
      url: newSheetUrl.value.trim(),
      tags: []
    });

    // 清空輸入和驗證結果
    newSheetUrl.value = '';
    validationResult.value = null;
    
    showToast({ message: '✅ 已加入關注表單', duration: 3000, className: 'toast-success' });
  }
};

// 從下拉選單選擇表單
const addSheetFromPicker = () => {
  if (!selectedSheetId.value) return;

  const sheet = availableSheets.value.find(s => s.spreadsheetId === selectedSheetId.value);
  if (!sheet) return;

  // 檢查是否已經加入
  const alreadyExists = form.sheetUrls.some(s => s.url.includes(sheet.spreadsheetId));
  if (alreadyExists) {
    showToast({ message: '此表單已在關注列表中', duration: 2500, className: 'toast-info' });
    return;
  }

  form.sheetUrls.push({
    name: sheet.name,
    url: sheet.url,
    tags: []
  });

  selectedSheetId.value = '';
  showSheetPicker.value = false;
  showToast({ message: '✅ 已加入關注表單', duration: 3000, className: 'toast-success' });
};

// 縮短 URL 顯示
const shortenUrl = (url) => {
  if (!url) return '';
  // 從 Google Sheet URL 提取 spreadsheetId 並縮短
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    const id = match[1];
    return `...${id.slice(-8)}`;
  }
  return url.length > 20 ? url.slice(0, 20) + '...' : url;
};

// 可選擇的表單（排除已加入的）
const selectableSheets = computed(() => {
  return availableSheets.value.filter(sheet => {
    return !form.sheetUrls.some(s => s.url.includes(sheet.spreadsheetId));
  });
});

const removeSheet = (index) => {
    form.sheetUrls.splice(index, 1);
};

const onSubmit = async () => {
  if (!form.realName) {
      showToast({ message: '請填寫真實姓名', duration: 2500, className: 'toast-info' });
      return;
  }

  // 確保 userId 已載入
  if (!userId.value) {
      // 嘗試重新取得 userId
      userId.value = await getLiffUserId();
      if (!userId.value) {
          showToast({
            message: '❌ 無法取得用戶資訊，請重新開啟頁面',
            duration: 3500,
            className: 'toast-fail',
            forbidClick: false
          });
          return;
      }
  }
  
  isLoading.value = true;
  try {
      const currentUserId = userId.value;
      
      const payload = {
          userId: currentUserId,
          realName: form.realName,
          aliases: form.aliases,
          sheetUrls: form.sheetUrls
      };

      console.log('Submitting to n8n:', payload);
      
      const response = await userApi.register(payload);
      console.log('Register response:', response);
      
      // 檢查回應是否有效
      if (response && response.success) {
          showNotify({
            type: 'success',
            message: isExistingUser.value ? '✅ 設定已更新' : '🎉 註冊成功！',
            duration: 3500,
            className: 'notify-big'
          });
          isExistingUser.value = true;
          // 同步到共享狀態（即時讓其他頁面知道）
          userState.setRegistered({
            userId: userId.value,
            realName: form.realName,
            aliases: form.aliases,
            sheetUrls: form.sheetUrls
          });
      } else if (!response || response === '') {
          // 後端回傳空內容 = 失敗
          showNotify({
            type: 'danger',
            message: '❌ 儲存失敗：伺服器無回應',
            duration: 3500,
            className: 'notify-big'
          });
      } else {
          // 有回應但不是成功
          showNotify({
            type: 'danger',
            message: '❌ ' + (response?.error || '儲存失敗，請稍後再試'),
            duration: 3500,
            className: 'notify-big'
          });
      }
      
  } catch (error) {
      console.error('API Error:', error);
      showNotify({
        type: 'danger',
        message: '❌ ' + (error.message || '儲存失敗，請檢查網路連線'),
        duration: 3500,
        className: 'notify-big'
      });
  } finally {
      isLoading.value = false;
  }
};
</script>

<template>
  <div class="pb-24 min-h-screen bg-slate-50">
    <!-- Header -->
    <div class="bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-5 pt-6 pb-8">
      <h1 class="text-xl font-bold tracking-tight">{{ pageTitle }}</h1>
      <p class="text-indigo-200 text-sm mt-1">管理您的個人資料與關注表單</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingProfile" class="p-12 text-center">
      <van-loading size="28px" color="#6366f1" />
      <p class="text-slate-400 mt-3 text-sm">載入中...</p>
    </div>

    <div v-else class="px-4 -mt-4">
      <!-- Status Card -->
      <div v-if="!isExistingUser" class="bg-amber-50 rounded-2xl p-4 mb-5 border border-amber-200 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center">
            <van-icon name="info-o" size="22" color="#fff" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-amber-900 text-sm">首次使用</p>
            <p class="text-amber-700 text-xs mt-0.5">請填寫資料以啟用監測功能</p>
          </div>
        </div>
      </div>

      <div v-else class="bg-emerald-50 rounded-2xl p-4 mb-5 border border-emerald-200 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <van-icon name="passed" size="22" color="#fff" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-emerald-900 text-sm">您已註冊</p>
            <p class="text-emerald-700 text-xs mt-0.5">可以更改以下資料</p>
          </div>
        </div>
      </div>

      <van-form @submit="onSubmit">
        <!-- Section 1: Basic Info -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
          <div class="flex items-center bg-slate-50 border-l-4 border-indigo-400 px-4 py-3">
            <span class="text-lg mr-2">👤</span>
            <h2 class="text-sm font-semibold text-slate-800">基本資料</h2>
          </div>
          <van-cell-group :border="false">
            <van-field
              v-model="form.realName"
              name="realName"
              label="姓名"
              placeholder="請輸入您的姓名"
              label-width="3.5em"
              :rules="[{ required: true, message: '請填寫姓名' }]"
            />
          </van-cell-group>
        </div>

        <!-- Section 2: Aliases -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
          <div class="flex items-center bg-slate-50 border-l-4 border-indigo-400 px-4 py-3">
            <span class="text-lg mr-2">🏷️</span>
            <div class="flex-1">
              <h2 class="text-sm font-semibold text-slate-800">身分別名</h2>
              <p class="text-xs text-slate-400 mt-0.5">系統用這些名字在表單中尋找您</p>
            </div>
            <span v-if="form.aliases.length > 0" class="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full font-medium">
              {{ form.aliases.length }}
            </span>
          </div>
          <div class="p-4 border-l-4 border-transparent ml-4 border-l-slate-200">
            <!-- Alias Tags -->
            <div v-if="form.aliases.length > 0" class="flex flex-wrap gap-2 mb-4">
              <span
                v-for="(alias, index) in form.aliases"
                :key="index"
                class="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium"
              >
                {{ alias }}
                <van-icon
                  name="cross"
                  size="14"
                  class="cursor-pointer opacity-60 hover:opacity-100"
                  @click="removeAlias(index)"
                />
              </span>
            </div>
            <p v-else class="text-slate-400 text-sm mb-4">尚未設定別名</p>

            <!-- Add Alias Input -->
            <div class="flex flex-col gap-2">
              <input
                v-model="newAlias"
                type="text"
                placeholder="輸入新別名"
                class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                @keyup.enter="addAlias"
              />
              <button
                type="button"
                class="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-transform"
                @click="addAlias"
              >
                <van-icon name="plus" class="mr-1" />
                新增別名
              </button>
            </div>
          </div>
        </div>

        <!-- Section 3: Sheet URLs -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
          <div class="bg-slate-50 border-l-4 border-indigo-400 px-4 py-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-lg">📊</span>
                <h2 class="text-sm font-semibold text-slate-800">關注表單</h2>
              </div>
              <span v-if="form.sheetUrls.length > 0" class="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                {{ form.sheetUrls.length }}
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-1.5 ml-7">系統會自動掃描所有分頁</p>
            <p class="text-xs text-amber-600 mt-1 ml-7">⚠️ 請確認表單已設為「知道連結的人都可以檢視」</p>
          </div>

          <!-- Sheet List -->
          <div v-if="form.sheetUrls.length > 0" class="border-l-4 border-transparent ml-4 border-l-slate-200">
            <div
              v-for="(sheet, index) in form.sheetUrls"
              :key="index"
              class="flex items-center px-4 py-3 gap-3 border-b border-slate-100 last:border-b-0 bg-emerald-50"
            >
              <span class="text-lg">📄</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-slate-800 text-sm truncate">{{ sheet.name }}</p>
                <p class="text-xs text-slate-400 break-all">{{ sheet.url }}</p>
              </div>
              <button
                type="button"
                class="text-red-500 p-2 rounded-lg hover:bg-red-50 active:scale-95"
                @click="removeSheet(index)"
              >
                <van-icon name="delete-o" size="18" />
              </button>
            </div>
          </div>

          <div v-else class="py-8 text-center">
            <van-icon name="notes-o" size="36" color="#cbd5e1" />
            <p class="text-slate-400 text-sm mt-2">尚未加入表單</p>
          </div>

          <!-- Add Sheet Section -->
          <div class="border-t border-slate-100">
            <!-- Quick Select (if available) -->
            <div v-if="selectableSheets.length > 0">
              <div class="flex items-center bg-slate-50 border-l-4 border-blue-400 px-4 py-2.5">
                <span class="text-base mr-2">⚡</span>
                <span class="text-sm font-medium text-slate-700">快速選擇表單</span>
              </div>
              <div class="p-4 border-l-4 border-transparent ml-4 border-l-slate-200 bg-blue-50/30">
                <div
                  class="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm cursor-pointer mb-3"
                  @click="showSheetPicker = true"
                >
                  <template v-if="selectedSheetId">
                    <p class="text-slate-800 font-medium">{{ availableSheets.find(s => s.spreadsheetId === selectedSheetId)?.name || '已選擇' }}</p>
                    <p class="text-xs text-slate-400 break-all mt-1">{{ availableSheets.find(s => s.spreadsheetId === selectedSheetId)?.url }}</p>
                  </template>
                  <span v-else class="text-slate-400">{{ isLoadingSheets ? '載入中...' : '點擊選擇表單' }}</span>
                </div>
                <button
                  type="button"
                  class="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
                  :disabled="!selectedSheetId"
                  @click="addSheetFromPicker"
                >
                  <van-icon name="plus" class="mr-1" />
                  加入
                </button>
              </div>
            </div>

            <!-- Manual Input -->
            <div>
              <div class="flex items-center bg-slate-50 border-l-4 border-blue-400 px-4 py-2.5">
                <span class="text-base mr-2">✏️</span>
                <span class="text-sm font-medium text-slate-700">手動輸入網址</span>
              </div>
              <div class="p-4 border-l-4 border-transparent ml-4 border-l-slate-200 bg-blue-50/30">
                <!-- URL 輸入 + 驗證按鈕 -->
                <div class="flex flex-col gap-2 mb-3">
                  <input
                    v-model="newSheetUrl"
                    type="text"
                    placeholder="Google 表單網址"
                    class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-400"
                    @input="onSheetUrlChange"
                  />
                  <button
                    type="button"
                    class="w-full py-2.5 text-sm font-medium text-white bg-slate-600 rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    :disabled="isValidating || !newSheetUrl.trim()"
                    @click="validateSheetUrl"
                  >
                    <van-loading v-if="isValidating" size="14" color="#fff" class="mr-1" />
                    {{ isValidating ? '驗證中...' : '🔍 驗證網址' }}
                  </button>
                </div>

                <!-- 驗證結果顯示 -->
                <div v-if="validationResult" class="mb-3">
                  <!-- 成功 -->
                  <div v-if="validationResult.success" class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div class="flex items-center gap-2 text-emerald-700">
                      <van-icon name="passed" size="18" color="#059669" />
                      <span class="font-medium text-sm">驗證成功</span>
                    </div>
                    <div class="mt-2 text-emerald-600 text-xs space-y-1">
                      <p>📄 {{ validationResult.title }}</p>
                      <p>📑 共 {{ validationResult.tabCount }} 個分頁</p>
                    </div>
                  </div>
                  <!-- 失敗 -->
                  <div v-else class="bg-red-50 border border-red-200 rounded-xl p-3">
                    <div class="flex items-center gap-2 text-red-700">
                      <van-icon name="cross" size="18" color="#dc2626" />
                      <span class="font-medium text-sm">驗證失敗</span>
                    </div>
                    <p class="mt-1 text-red-600 text-xs">{{ validationResult.error }}</p>
                  </div>
                </div>

                <button
                  type="button"
                  class="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                  :disabled="!validationResult?.success"
                  @click="addSheet"
                >
                  <van-icon name="plus" class="mr-1" />
                  加入
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sheet Picker Popup -->
        <van-action-sheet v-model:show="showSheetPicker" title="選擇表單">
          <div class="max-h-[60vh] overflow-y-auto">
            <div
              v-for="sheet in selectableSheets"
              :key="sheet.spreadsheetId"
              class="px-4 py-3 border-b border-slate-100 active:bg-slate-50 cursor-pointer"
              @click="selectedSheetId = sheet.spreadsheetId; showSheetPicker = false;"
            >
              <p class="font-medium text-slate-800 text-sm">{{ sheet.name }}</p>
              <p class="text-xs text-slate-400 break-all mt-1">{{ sheet.url }}</p>
            </div>
            <div v-if="selectableSheets.length === 0" class="py-8 text-center text-slate-400 text-sm">
              沒有可選擇的表單
            </div>
          </div>
        </van-action-sheet>

        <!-- Submit Button -->
        <div class="mt-6">
          <button
            type="submit"
            class="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-transform"
            :disabled="isLoading"
          >
            <van-loading v-if="isLoading" size="18" color="#fff" class="mr-2" />
            {{ submitButtonText }}
          </button>
        </div>
      </van-form>
    </div>
  </div>
</template>

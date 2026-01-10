<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { showToast } from 'vant';
import liff from '@line/liff';
import { reminderApi, userApi } from '@/services/api';

// ============ Mock Mode ============
// 🔧 設為 true 可在本地預覽已註冊使用者的 UI
const USE_MOCK = false;

const MOCK_SETTINGS = {
  // 模擬已註冊使用者的提醒設定
  enabled: true,
  times: ['09:00', '21:00']
};

// ============ State ============
const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const userId = ref(null);
const isRegistered = ref(false);

// 提醒設定
const reminderSettings = reactive({
  enabled: false,
  times: []
});

// 時間選擇器
const showTimePicker = ref(false);
const editingIndex = ref(-1); // -1 表示新增，>=0 表示編輯

// ============ Constants ============
// 24 小時整點選項
const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { text: `${hour}:00`, value: `${hour}:00` };
});

// 最多 3 個時間
const MAX_TIMES = 3;

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
const needsSetup = computed(() => {
  return !loading.value && !isRegistered.value;
});

const canAddTime = computed(() => {
  return reminderSettings.times.length < MAX_TIMES;
});

// 可選的時間（排除已選擇的）
const availableTimeOptions = computed(() => {
  const selectedTimes = reminderSettings.times;
  // 如果是編輯模式，當前編輯的時間也要可選
  const editingTime = editingIndex.value >= 0 ? selectedTimes[editingIndex.value] : null;
  
  return timeOptions.filter(opt => {
    return !selectedTimes.includes(opt.value) || opt.value === editingTime;
  });
});

// ============ Actions ============
const loadSettings = async () => {
  loading.value = true;
  error.value = null;

  try {
    // 🔧 Mock 模式：直接使用假資料
    if (USE_MOCK) {
      console.log('🔧 Mock 模式：使用假資料');
      await new Promise(resolve => setTimeout(resolve, 500)); // 模擬載入延遲
      userId.value = 'MOCK_USER_123';
      isRegistered.value = true;
      reminderSettings.enabled = MOCK_SETTINGS.enabled;
      reminderSettings.times = [...MOCK_SETTINGS.times];
      return;
    }

    userId.value = await getLiffUserId();

    if (!userId.value) {
      error.value = '無法取得使用者資訊，請重新登入';
      return;
    }

    // 先檢查是否已註冊
    try {
      const profileResponse = await userApi.getProfile(userId.value);
      if (profileResponse.success && profileResponse.data) {
        isRegistered.value = true;
      }
    } catch (e) {
      // 使用者不存在
      isRegistered.value = false;
      return;
    }

    // 取得提醒設定
    const response = await reminderApi.getSettings(userId.value);
    
    if (response.success && response.data) {
      reminderSettings.enabled = response.data.enabled || false;
      reminderSettings.times = response.data.times || [];
    }
  } catch (err) {
    console.error('Load settings error:', err);
    // 如果是「使用者不存在」的錯誤，不顯示錯誤訊息，只標記未註冊
    if (err.message?.includes('不存在') || err.message?.includes('註冊')) {
      isRegistered.value = false;
    } else {
      error.value = err.message || '載入失敗，請稍後再試';
    }
  } finally {
    loading.value = false;
  }
};

const saveSettings = async () => {
  saving.value = true;

  try {
    // 🔧 Mock 模式：模擬儲存成功
    if (USE_MOCK) {
      console.log('🔧 Mock 模式：模擬儲存', { enabled: reminderSettings.enabled, times: reminderSettings.times });
      await new Promise(resolve => setTimeout(resolve, 500)); // 模擬延遲
      showToast({ type: 'success', message: '設定已儲存（Mock）' });
      return;
    }

    const response = await reminderApi.updateSettings({
      userId: userId.value,
      enabled: reminderSettings.enabled,
      times: reminderSettings.times
    });

    if (response.success) {
      showToast({ type: 'success', message: '設定已儲存' });
    } else {
      showToast({ type: 'fail', message: response.error || '儲存失敗' });
    }
  } catch (err) {
    console.error('Save settings error:', err);
    showToast({ type: 'fail', message: err.message || '儲存失敗' });
  } finally {
    saving.value = false;
  }
};

// 開啟時間選擇器（新增）
const openAddTimePicker = () => {
  editingIndex.value = -1;
  showTimePicker.value = true;
};

// 開啟時間選擇器（編輯）
const openEditTimePicker = (index) => {
  editingIndex.value = index;
  showTimePicker.value = true;
};

// 選擇時間
const onTimeConfirm = ({ selectedValues }) => {
  const selectedTime = selectedValues[0];
  
  if (editingIndex.value >= 0) {
    // 編輯模式
    reminderSettings.times[editingIndex.value] = selectedTime;
  } else {
    // 新增模式
    reminderSettings.times.push(selectedTime);
  }
  
  // 排序時間
  reminderSettings.times.sort();
  showTimePicker.value = false;
};

// 刪除時間
const removeTime = (index) => {
  reminderSettings.times.splice(index, 1);
};

// 開關變更
const onSwitchChange = (value) => {
  if (!value) {
    // 關閉時不清空時間，保留設定
  }
};

// ============ Lifecycle ============
onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="pb-24 min-h-screen bg-slate-50">
    <!-- Header with Status (與 Dashboard 一致) -->
    <div
      class="text-white px-5 pt-6 pb-10"
      :class="[
        loading ? 'bg-gradient-to-br from-slate-500 to-slate-600' :
        needsSetup ? 'bg-gradient-to-br from-slate-600 to-slate-700' :
        'bg-gradient-to-br from-indigo-600 to-violet-600'
      ]"
    >
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold tracking-tight">提醒設定</h1>
      </div>

      <div class="text-center">
        <div class="text-4xl font-bold mb-1">
          <template v-if="loading">載入中...</template>
          <template v-else-if="needsSetup">⚙️ 尚未設定</template>
          <template v-else-if="reminderSettings.enabled">🔔 已啟用</template>
          <template v-else>🔕 已關閉</template>
        </div>
        <p class="text-white/70 text-sm">
          <template v-if="loading">正在載入...</template>
          <template v-else-if="needsSetup">請先完成個人設定</template>
          <template v-else-if="reminderSettings.enabled && reminderSettings.times.length > 0">
            {{ reminderSettings.times.length }} 個提醒時間
          </template>
          <template v-else-if="reminderSettings.enabled">尚未設定提醒時間</template>
          <template v-else>自訂報表檢查時間</template>
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="px-4 -mt-4">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
        <van-loading size="28px" color="#6366f1" />
        <p class="text-slate-400 mt-3 text-sm">正在載入...</p>
      </div>
    </div>

    <!-- Error State (only show if not needsSetup) -->
    <div v-else-if="error && !needsSetup" class="px-4 -mt-4">
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

    <!-- Needs Setup State (Not Registered) - 與 Dashboard 完全一致 -->
    <div v-else-if="needsSetup" class="px-4 -mt-4">
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
        <div class="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <van-icon name="user-circle-o" size="48" color="#6366f1" />
        </div>
        <p class="text-slate-800 font-bold text-xl mb-2">請先完成設定</p>
        <p class="text-slate-500 text-sm mb-6">前往「個人設定」完成註冊<br/>並加入您要追蹤的表單</p>
        <button
          class="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg active:scale-95 transition-transform"
          @click="$router.push('/register')"
        >
          前往個人設定
        </button>
      </div>
    </div>

    <!-- Settings Form -->
    <div v-else class="px-4 -mt-4">
      <!-- Info Card -->
      <div class="bg-indigo-50 rounded-2xl p-4 mb-5 border border-indigo-200 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
            <van-icon name="clock-o" size="22" color="#fff" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-indigo-900 text-sm">自動提醒功能</p>
            <p class="text-indigo-700 text-xs mt-0.5">系統會在設定的時間檢查您的表單</p>
          </div>
        </div>
      </div>

      <!-- Main Switch -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
        <div class="flex items-center bg-slate-50 border-l-4 border-indigo-400 px-4 py-3">
          <span class="text-lg mr-2">🔔</span>
          <div class="flex-1">
            <p class="font-semibold text-slate-800 text-sm">啟用自動提醒</p>
            <p class="text-slate-400 text-xs mt-0.5">
              {{ reminderSettings.enabled ? '已開啟' : '已關閉' }}
            </p>
          </div>
          <van-switch
            v-model="reminderSettings.enabled"
            size="24"
            active-color="#6366f1"
            @change="onSwitchChange"
          />
        </div>
      </div>

      <!-- Time Settings (只有開啟時顯示) -->
      <div v-show="reminderSettings.enabled" class="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
        <div class="flex items-center bg-slate-50 border-l-4 border-indigo-400 px-4 py-3">
          <span class="text-lg mr-2">⏰</span>
          <div class="flex-1">
            <h2 class="text-sm font-semibold text-slate-800">提醒時間</h2>
            <p class="text-xs text-slate-400 mt-0.5">最多可設定 {{ MAX_TIMES }} 個時間</p>
          </div>
          <span v-if="reminderSettings.times.length > 0" class="text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full font-medium">
            {{ reminderSettings.times.length }}
          </span>
        </div>

        <!-- Time List -->
        <div v-if="reminderSettings.times.length > 0" class="border-l-4 border-transparent ml-4 border-l-slate-200">
          <div
            v-for="(time, index) in reminderSettings.times"
            :key="time"
            class="px-4 py-3 flex items-center gap-3 border-b border-slate-100 last:border-b-0 bg-emerald-50"
          >
            <span class="text-lg">🕐</span>
            <div
              class="flex-1 min-w-0 cursor-pointer"
              @click="openEditTimePicker(index)"
            >
              <p class="font-semibold text-slate-800 text-lg">{{ time }}</p>
              <p class="text-xs text-slate-400">點擊修改</p>
            </div>
            <button
              class="text-red-500 p-2 rounded-lg hover:bg-red-50 active:scale-95"
              @click="removeTime(index)"
            >
              <van-icon name="delete-o" size="18" />
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="py-8 text-center">
          <van-icon name="clock-o" size="36" color="#cbd5e1" />
          <p class="text-slate-400 text-sm mt-2">尚未設定提醒時間</p>
        </div>

        <!-- Add Time Button -->
        <div v-if="canAddTime" class="p-4 bg-slate-50 border-t border-slate-100">
          <button
            class="w-full py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            @click="openAddTimePicker"
          >
            <van-icon name="plus" size="16" />
            新增提醒時間
          </button>
        </div>

        <!-- Max Reached Info -->
        <div v-else class="p-4 bg-slate-50 border-t border-slate-100">
          <p class="text-center text-xs text-slate-400">已達最大數量（{{ MAX_TIMES }} 個）</p>
        </div>
      </div>

      <!-- Reminder Info (只有開啟且有設定時間時顯示) -->
      <div v-if="reminderSettings.enabled && reminderSettings.times.length > 0" class="bg-amber-50 rounded-2xl p-4 mb-5 border border-amber-200">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <van-icon name="info-o" size="16" color="#d97706" />
          </div>
          <div class="text-xs text-amber-800">
            <p class="font-medium mb-1">提醒說明</p>
            <ul class="list-disc pl-4 space-y-0.5 text-amber-700">
              <li>系統會在您設定的時間自動檢查表單</li>
              <li>若有未填寫的項目，會透過 LINE 通知您</li>
              <li>提醒內容與「進度儀表板」頁面相同</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="mt-6">
        <button
          class="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-transform disabled:opacity-50"
          :disabled="saving"
          @click="saveSettings"
        >
          <van-loading v-if="saving" size="18" color="#fff" class="mr-2" />
          儲存設定
        </button>
      </div>
    </div>

    <!-- Time Picker Popup -->
    <van-popup v-model:show="showTimePicker" position="bottom" round>
      <van-picker
        :title="editingIndex >= 0 ? '修改時間' : '選擇時間'"
        :columns="availableTimeOptions"
        confirm-button-text="確認"
        cancel-button-text="取消"
        :visible-option-num="7"
        @confirm="onTimeConfirm"
        @cancel="showTimePicker = false"
      />
    </van-popup>
  </div>
</template>

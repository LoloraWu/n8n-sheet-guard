<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { showToast } from 'vant';
import liff from '@line/liff';
import { userApi } from '@/services/api';

// State
const form = reactive({
  realName: '',
  aliases: [],
  sheetUrls: []
});

const newAlias = ref('');
const newSheetName = ref('');
const newSheetUrl = ref('');

const isLoading = ref(false);
const isLoadingProfile = ref(false);
const isExistingUser = ref(false);
const userId = ref(null);

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

// 載入現有使用者資料
const loadExistingProfile = async () => {
  if (!userId.value) return;
  
  isLoadingProfile.value = true;
  try {
    const response = await userApi.getProfile(userId.value);
    
    if (response.success && response.data) {
      const userData = response.data;
      isExistingUser.value = true;
      
      // 回填表單資料
      if (userData.realName) {
        form.realName = userData.realName;
      }
      if (userData.aliases && userData.aliases.length > 0) {
        form.aliases = [...userData.aliases];
      }
      if (userData.sheetUrls && userData.sheetUrls.length > 0) {
        form.sheetUrls = userData.sheetUrls.map((sheet, index) => ({
          name: sheet.name || `報表 ${index + 1}`,
          url: sheet.url,
          tags: sheet.tags || []
        }));
      }
      
      console.log('Loaded existing profile:', userData);
    }
  } catch (err) {
    // 使用者不存在是正常情況，不需要顯示錯誤
    console.log('No existing profile found (new user)');
  } finally {
    isLoadingProfile.value = false;
  }
};

onMounted(async () => {
  try {
    // 取得 userId
    userId.value = await getLiffUserId();
    
    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile();
      if (profile.displayName) {
        // 先載入現有資料
        await loadExistingProfile();
        
        // 如果是新使用者，自動填入 LINE 顯示名稱
        if (!isExistingUser.value) {
          if (!form.realName) {
            form.realName = profile.displayName;
          }
          if (!form.aliases.includes(profile.displayName)) {
            form.aliases.push(profile.displayName);
          }
        }
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

const pageTitle = computed(() => {
  return isExistingUser.value ? '編輯設定' : '個人設定 / 註冊';
});

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

const addSheet = () => {
  if (newSheetUrl.value.trim()){
      // Basic URL validation
      if(!newSheetUrl.value.includes('docs.google.com/spreadsheets')) {
          showToast('請輸入有效的 Google Sheet 網址');
          return;
      }
      
      form.sheetUrls.push({
          name: newSheetName.value || `報表 ${form.sheetUrls.length + 1}`,
          url: newSheetUrl.value.trim(),
          tags: []
      });
      
      newSheetName.value = '';
      newSheetUrl.value = '';
  }
};

const removeSheet = (index) => {
    form.sheetUrls.splice(index, 1);
};

const onSubmit = async () => {
  if (!form.realName) {
      showToast('請填寫真實姓名');
      return;
  }
  
  isLoading.value = true;
  try {
      const currentUserId = userId.value || 'U_GUEST';
      
      const payload = {
          userId: currentUserId,
          realName: form.realName,
          aliases: form.aliases,
          sheetUrls: form.sheetUrls
      };

      console.log('Submitting to n8n:', payload);
      
      const response = await userApi.register(payload);
      
      if (response) {
          showToast({ 
            type: 'success', 
            message: isExistingUser.value ? '設定已更新' : '註冊成功' 
          });
          isExistingUser.value = true;
          console.log('Response:', response);
      }
      
  } catch (error) {
      showToast({ type: 'fail', message: error.message || '儲存失敗' });
      console.error('API Error:', error);
  } finally {
      isLoading.value = false;
  }
};
</script>

<template>
  <div class="pb-20">
    <van-nav-bar :title="pageTitle" />
    
    <!-- Loading State -->
    <div v-if="isLoadingProfile" class="p-8 text-center text-gray-500">
      <van-loading size="24px" vertical>載入中...</van-loading>
    </div>
    
    <div v-else class="p-4">
      <!-- User Status Badge -->
      <div v-if="isExistingUser" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
        <van-icon name="passed" color="#16a34a" size="20" class="mr-2" />
        <span class="text-green-700 text-sm">已註冊使用者，您可以修改以下設定</span>
      </div>
      
      <van-form @submit="onSubmit">
        <!-- Section 1: Basic Info -->
        <h2 class="text-sm font-bold text-gray-500 mb-2 px-2">基本資料</h2>
        <van-cell-group inset class="mb-4">
          <van-field
            v-model="form.realName"
            name="realName"
            label="真實姓名"
            placeholder="請輸入您的姓名"
            :rules="[{ required: true, message: '請填寫姓名' }]"
          />
        </van-cell-group>
        
        <!-- Section 2: Aliases -->
        <h2 class="text-sm font-bold text-gray-500 mb-2 px-2">
          身分別名 <span class="text-xs font-normal text-gray-400">(用於識別報表中的名字)</span>
        </h2>
        <van-cell-group inset class="mb-4">
          <div class="p-3 bg-white">
             <div class="flex flex-wrap mb-3" style="gap: 32px !important;">
                 <van-tag 
                   v-for="(alias, index) in form.aliases" 
                   :key="index" 
                   closeable 
                   size="large" 
                   type="primary" 
                   class="!text-base !py-1 !px-2"
                   @close="removeAlias(index)"
                 >
                   {{ alias }}
                 </van-tag>
                 <span v-if="form.aliases.length === 0" class="text-gray-400 text-sm">暫無別名</span>
             </div>
             
             <div class="flex items-center gap-2">
                 <van-field
                   v-model="newAlias"
                   placeholder="新增別名 (e.g. 小張)"
                   class="!p-0 flex-1 border-b border-gray-200"
                   :border="false"
                 />
                 <van-button size="small" type="primary" icon="plus" @click="addAlias">新增</van-button>
             </div>
          </div>
        </van-cell-group>

        <!-- Section 3: Sheet URLs -->
        <h2 class="text-sm font-bold text-gray-500 mb-2 px-2">關注報表</h2>
        
        <!-- Hint: Auto scan all tabs -->
        <div class="mx-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <div class="flex items-start gap-2">
            <van-icon name="info-o" class="mt-0.5 flex-shrink-0" />
            <div>
              <p class="font-medium">自動掃描所有分頁</p>
              <p class="text-blue-600 mt-1">只需貼上 Google Sheet 網址，系統會自動掃描該試算表內的<strong>所有分頁</strong>，不需要另外選擇。</p>
            </div>
          </div>
        </div>
        
        <van-cell-group inset class="mb-4">
             <van-cell v-for="(sheet, index) in form.sheetUrls" :key="index" center>
                 <template #title>
                     <div class="font-bold text-base mb-1" style="color: rgb(37, 99, 235) !important;">{{ sheet.name }}</div>
                     <div class="text-xs text-gray-500 truncate">{{ sheet.url }}</div>
                 </template>
                 <template #right-icon>
                     <van-icon name="delete" color="#ef4444" size="26" class="ml-3" @click="removeSheet(index)" />
                 </template>
             </van-cell>
             
             <div class="p-3 bg-white border-t border-gray-100">
                 <van-field
                   v-model="newSheetName"
                   label="報表名稱"
                   placeholder="例：每日進度"
                   label-width="4.5em"
                   class="!px-0"
                 />
                 <van-field
                   v-model="newSheetUrl"
                   label="網址"
                   placeholder="https://docs.google.com/..."
                   label-width="4.5em"
                   class="!px-0 mb-2"
                 />
                 <van-button block size="small" icon="plus" type="primary" plain @click="addSheet">
                     加入關注列表
                 </van-button>
             </div>
        </van-cell-group>

        <!-- Submit -->
        <div class="mt-8 px-2">
          <van-button round block type="primary" native-type="submit" :loading="isLoading">
            {{ submitButtonText }}
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

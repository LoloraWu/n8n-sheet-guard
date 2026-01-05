<script setup>
import { ref, reactive, onMounted } from 'vue';
import { showToast } from 'vant';
import liff from '@line/liff';

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

onMounted(async () => {
  try {
    // App.vue ensures LIFF is initialized before mounting this view
    if (liff.isLoggedIn()) {
      const profile = await liff.getProfile();
      if (profile.displayName) {
        // Auto-fill Real Name if empty (optional, but helpful)
        if (!form.realName) {
           form.realName = profile.displayName; 
        }
        
        // Auto-add default alias
        if (!form.aliases.includes(profile.displayName)) {
          form.aliases.push(profile.displayName);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching LIFF profile:', err);
  }
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
      // Mock API Call
      console.log('Submitting:', form);
      await new Promise(r => setTimeout(r, 1000)); // Simulate delay
      
      showToast({ type: 'success', message: '設定已儲存' });
      // Navigate to Dashboard or stay (depending on flow)
  } catch (error) {
      showToast({ type: 'fail', message: '儲存失敗' });
      console.error(error);
  } finally {
      isLoading.value = false;
  }
};
</script>

<template>
  <div class="pb-20">
    <van-nav-bar title="個人設定 / 註冊" />
    
    <div class="p-4">
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
            儲存設定
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

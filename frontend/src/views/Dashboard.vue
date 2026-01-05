<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

// Mock Data
const activeNames = ref(['1']); // Default expand first item
const reports = ref([
    { 
        id: '1', 
        name: '每日進度表', 
        status: 'missing', 
        missingItems: ['[11/20巴哈留言] D6 未填寫', '[11/20巴哈回文] D7 未填寫'], 
        url: 'https://docs.google.com/spreadsheets/d/123456789' 
    },
    { 
        id: '2', 
        name: '簽到表', 
        status: 'completed', 
        missingItems: [],
        url: 'https://docs.google.com/spreadsheets/d/987654321' 
    }
]);

const loading = ref(false);

const checkStatus = async () => {
    loading.value = true;
    try {
        await new Promise(r => setTimeout(r, 800)); // Simulate delay
        // Refresh logic would go here
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    checkStatus();
});
</script>

<template>
  <div class="pb-20">
    <van-nav-bar title="關注報表儀表板" />

    <!-- Status Overview -->
    <div class="bg-green-600 p-6 text-white text-center">
        <h2 class="text-lg opacity-90">今日狀態</h2>
        <div class="text-3xl font-bold mt-2 flex items-center justify-center gap-2">
            ⚠️ 1 項未完成
        </div>
        <p class="text-sm opacity-75 mt-2">最後更新：剛剛</p>
    </div>
    
    <!-- Report List -->
    <div class="p-4 -mt-4">
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
             <!-- Use Collapse for details -->
             <van-collapse v-model="activeNames" accordion>
                 <van-collapse-item 
                    v-for="report in reports" 
                    :key="report.id" 
                    :name="report.id"
                 >
                    <template #title>
                        <div class="flex items-center justify-between">
                            <span class="font-bold text-gray-800 text-lg">{{ report.name }}</span>
                            <van-tag v-if="report.status === 'missing'" type="danger" size="medium">未完成</van-tag>
                            <van-tag v-else type="success" size="medium">Pass</van-tag>
                        </div>
                    </template>
                    <template #value>
                         <span v-if="report.status === 'missing'" class="text-red-500 font-bold">{{ report.missingItems.length }} 筆未填</span>
                         <span v-else class="text-green-500">已完成</span>
                    </template>

                    <!-- Expanded Content -->
                    <div class="space-y-4">
                        <!-- Unfilled Notification -->
                        <div v-if="report.status === 'missing'" class="bg-red-50 p-3 rounded-lg border border-red-100">
                            <div class="text-red-800 font-bold mb-3 flex items-center">
                                <van-icon name="warning" class="mr-1" /> 偵測到未填寫項目：
                            </div>
                            <div class="flex flex-col gap-2">
                                <div 
                                    v-for="item in report.missingItems" 
                                    :key="item" 
                                    class="text-red-700 bg-white px-3 py-2 rounded border border-red-100 text-sm shadow-sm"
                                >
                                    {{ item }}
                                </div>
                            </div>
                        </div>

                        <!-- URL Section -->
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <div class="text-gray-500 text-xs mb-1">報表連結</div>
                            <a :href="report.url" target="_blank" class="text-blue-600 underline break-all flex items-center">
                                <van-icon name="link-o" class="mr-1" />
                                點擊開啟 Google Sheet
                            </a>
                            <div class="text-xs text-gray-400 mt-1 truncate">{{ report.url }}</div>
                        </div>
                    </div>
                 </van-collapse-item>
             </van-collapse>
        </div>
    </div>
    <!-- Actions -->
    <div class="p-4">
        <van-button block icon="replay" @click="checkStatus" :loading="loading">
            重新整理
        </van-button>
    </div>
  </div>
</template>

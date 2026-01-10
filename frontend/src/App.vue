<script setup>
import { ref, onMounted, provide } from 'vue'
import liff from '@line/liff'
import TabBar from '@/components/TabBar.vue'

const liffStatus = ref('Initializing...')
const liffError = ref('')
const userProfile = ref(null)
const isDev = import.meta.env.DEV
const isReady = ref(false)

// Placeholder LIFF ID - to be replaced by user via .env or directly here
const LIFF_ID = import.meta.env.VITE_LIFF_ID || 'TIMESTAMP_LIFF_ID'

// Provide user profile to child components
provide('userProfile', userProfile)
provide('liffReady', isReady)

onMounted(async () => {
  console.log('LIFF Init Start', LIFF_ID)
  try {
    // Only init if we have a seemingly valid LIFF ID or strictly in LIFF browser
    // For local dev without ID, we handle error
    await liff.init({ liffId: LIFF_ID })
    liffStatus.value = 'LIFF Initialized'
    isReady.value = true
    
    if (liff.isLoggedIn()) {
      try {
        userProfile.value = await liff.getProfile()
      } catch (e) {
        console.warn('Failed to get profile', e)
      }
    } else {
       // In dev mode, don't force login
       if (!isDev) {
         // liff.login()
       }
    }
  } catch (err) {
    if (err.code === 'INVALID_ARGUMENT' && LIFF_ID === 'TIMESTAMP_LIFF_ID') {
       liffStatus.value = 'LIFF ID Not Configured'
       liffError.value = 'Please set VITE_LIFF_ID in .env'
       // In dev mode, still allow app to render for UI testing
       if (isDev) {
         isReady.value = true
       }
    } else {
       liffStatus.value = 'Initialization Failed'
       liffError.value = err.message
       // In dev mode, still allow app to render for UI testing
       if (isDev) {
         isReady.value = true
       }
    }
    console.error('LIFF Init Error:', err)
  }
})

const login = () => {
  if (!liff.isLoggedIn()) {
    liff.login()
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans antialiased">
    <!-- Router View for Pages -->
    <template v-if="isReady || isDev">
      <router-view />
      <TabBar />
    </template>

    <!-- Loading State -->
    <div v-else-if="liffStatus === 'Initializing...'" class="flex flex-col items-center justify-center min-h-screen p-6">
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
        <van-loading size="32px" color="#6366f1" class="mb-4" />
        <h1 class="text-lg font-bold text-slate-800 mb-1">系統啟動中</h1>
        <p class="text-slate-400 text-sm">正在初始化 LIFF...</p>
      </div>
    </div>

    <!-- Error States -->
    <div v-else class="flex flex-col items-center justify-center min-h-screen p-6">
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-sm">
        <div class="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <van-icon name="warning-o" size="32" color="#f59e0b" />
        </div>
        <h1 class="text-lg font-bold text-slate-800 mb-2">系統初始化失敗</h1>
        <p class="text-slate-500 text-sm mb-4">{{ liffStatus }}</p>
        <div v-if="liffError" class="text-red-600 text-xs bg-red-50 p-3 rounded-xl mb-4 text-left">
          {{ liffError }}
        </div>
        <button
          v-if="liffStatus === 'LIFF ID Not Configured'"
          class="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700"
          @click="location.reload()"
        >
          重新載入
        </button>
      </div>
    </div>
  </div>
</template>

<style>
/* Global custom styles */
html {
  -webkit-tap-highlight-color: transparent;
}

/* Smooth transitions */
* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
</style>

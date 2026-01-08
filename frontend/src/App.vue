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
  <div class="min-h-screen bg-gray-100 font-sans">
    <!-- Router View for Pages -->
    <template v-if="isReady || isDev">
      <router-view />
      <TabBar />
    </template>

    <!-- Loading State -->
    <div v-else-if="liffStatus === 'Initializing...'" class="flex flex-col items-center justify-center min-h-screen p-4">
       <div class="bg-white p-6 rounded-lg shadow-lg text-center">
          <van-loading size="36px" class="mb-4" />
          <h1 class="text-xl font-bold mb-2">系統啟動中</h1>
          <p class="text-gray-500">正在初始化 LIFF...</p>
       </div>
    </div>

    <!-- Error States -->
    <div v-else class="flex flex-col items-center justify-center min-h-screen p-4">
       <div class="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm">
          <van-icon name="warning-o" size="48" color="#faad14" class="mb-4" />
          <h1 class="text-xl font-bold mb-4">系統初始化失敗</h1>
          <p class="mb-4 text-gray-600">{{ liffStatus }}</p>
          <div v-if="liffError" class="text-red-500 text-sm bg-red-50 p-3 rounded mb-4">
             {{ liffError }}
          </div>
          <van-button v-if="liffStatus === 'LIFF ID Not Configured'" type="primary" size="small" @click="location.reload()">
            重新載入
          </van-button>
       </div>
    </div>
  </div>
</template>

<style>
/* Global resets handled by Tailwind */
</style>

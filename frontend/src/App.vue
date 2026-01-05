<script setup>
import { ref, onMounted } from 'vue'
import liff from '@line/liff'

const liffStatus = ref('Initializing...')
const liffError = ref('')
const userProfile = ref(null)
const isDev = import.meta.env.DEV

// Placeholder LIFF ID - to be replaced by user via .env or directly here
const LIFF_ID = import.meta.env.VITE_LIFF_ID || 'TIMESTAMP_LIFF_ID'

onMounted(async () => {
  console.log('LIFF Init Start', LIFF_ID)
  try {
    // Only init if we have a seemingly valid LIFF ID or strictly in LIFF browser
    // For local dev without ID, we handle error
    await liff.init({ liffId: LIFF_ID })
    liffStatus.value = 'LIFF Initialized'
    
    if (liff.isLoggedIn()) {
      try {
        userProfile.value = await liff.getProfile()
      } catch (e) {
        console.warn('Failed to get profile', e)
      }
    } else {
       // login logic if needed
       // liff.login()
    }
  } catch (err) {
    if (err.code === 'INVALID_ARGUMENT' && LIFF_ID === 'TIMESTAMP_LIFF_ID') {
       liffStatus.value = 'LIFF ID Not Configured'
       liffError.value = 'Please set VITE_LIFF_ID in .env'
    } else {
       liffStatus.value = 'Initialization Failed'
       liffError.value = err.message
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
    <router-view v-if="liffStatus === 'LIFF Initialized' || liffStatus === 'Initializing...' || isDev" />

    <!-- Loading / Error States -->
    <div v-else class="flex flex-col items-center justify-center min-h-screen p-4">
       <div class="bg-white p-6 rounded-lg shadow-lg text-center">
          <h1 class="text-xl font-bold mb-4">系統啟動中</h1>
          <p class="mb-4 text-gray-600">{{ liffStatus }}</p>
          <div v-if="liffError" class="text-red-500 text-sm bg-red-50 p-2 rounded">
             {{ liffError }}
          </div>
       </div>
    </div>
  </div>
</template>

<style>
/* Global resets handled by Tailwind */
</style>

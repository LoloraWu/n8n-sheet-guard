<script setup>
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// Map route names to tab indices
const routeToTab = {
  'Dashboard': 0,
  'Register': 1
};

const tabToRoute = {
  0: '/dashboard',
  1: '/register'
};

// Initialize active tab based on current route
const active = ref(routeToTab[route.name] ?? 0);

// Watch route changes and update active tab
watch(() => route.name, (newName) => {
  if (newName && routeToTab[newName] !== undefined) {
    active.value = routeToTab[newName];
  }
});

const onChange = (index) => {
  const path = tabToRoute[index];
  if (path && route.path !== path) {
    router.push(path);
  }
};
</script>

<template>
  <van-tabbar v-model="active" @change="onChange" class="shadow-lg" safe-area-inset-bottom>
    <van-tabbar-item icon="chart-trending-o">
      填寫進度
    </van-tabbar-item>
    <van-tabbar-item icon="setting-o">
      個人設定
    </van-tabbar-item>
  </van-tabbar>
</template>

<style scoped>
/* Custom TabBar styling */
:deep(.van-tabbar) {
  border-top: 1px solid #f0f0f0;
}

:deep(.van-tabbar-item--active) {
  color: #1989fa;
}
</style>


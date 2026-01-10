<script setup>
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// Map route names to tab indices: 個人設定 | 進度儀表板 | 提醒設定
const routeToTab = {
  'Register': 0,
  'Dashboard': 1,
  'ReminderSettings': 2
};

const tabToRoute = {
  0: '/register',
  1: '/dashboard',
  2: '/reminder'
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
  <van-tabbar v-model="active" @change="onChange" safe-area-inset-bottom class="custom-tabbar">
    <van-tabbar-item icon="setting-o">
      個人設定
    </van-tabbar-item>
    <van-tabbar-item class="main-tab">
      <template #icon="{ active: isActive }">
        <div class="main-icon" :class="{ active: isActive }">
          <van-icon name="chart-trending-o" />
        </div>
      </template>
      進度儀表板
    </van-tabbar-item>
    <van-tabbar-item icon="clock-o">
      提醒設定
    </van-tabbar-item>
  </van-tabbar>
</template>

<style scoped>
.custom-tabbar {
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -8px 30px rgba(99, 102, 241, 0.12);
}

:deep(.van-tabbar) {
  height: 72px;
  background: linear-gradient(to top, #ffffff, #f8fafc);
}

:deep(.van-tabbar-item) {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
  padding: 10px 0 8px;
}

:deep(.van-tabbar-item--active) {
  color: #6366f1;
  font-weight: 600;
}

:deep(.van-tabbar-item--active .van-tabbar-item__icon) {
  transform: scale(1.05);
}

:deep(.van-tabbar-item__icon) {
  font-size: 22px;
  margin-bottom: 4px;
  transition: transform 0.2s ease;
}

:deep(.van-tabbar-item__text) {
  letter-spacing: 0.3px;
}

/* 中間主要 Tab - 凸出圓形按鈕 */
:deep(.main-tab) {
  position: relative;
}

:deep(.main-tab .van-tabbar-item__text) {
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
}

.main-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -24px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.45);
  transition: all 0.2s ease;
  border: 3px solid #fff;
}

.main-icon :deep(.van-icon) {
  font-size: 26px;
  color: white;
}

.main-icon.active {
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(99, 102, 241, 0.55);
}
</style>


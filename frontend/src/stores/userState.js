/**
 * 共享使用者狀態 - 跨頁面即時同步
 */
import { reactive, readonly } from 'vue';

// 私有狀態
const state = reactive({
  isRegistered: false,
  userId: null,
  realName: '',
  aliases: [],
  sheetUrls: [],
  lastUpdated: null
});

// 公開 API
export const userState = {
  // 唯讀狀態（防止外部直接修改）
  state: readonly(state),

  // 設定已註冊
  setRegistered(userData = {}) {
    state.isRegistered = true;
    if (userData.userId) state.userId = userData.userId;
    if (userData.realName) state.realName = userData.realName;
    if (userData.aliases) state.aliases = userData.aliases;
    if (userData.sheetUrls) state.sheetUrls = userData.sheetUrls;
    state.lastUpdated = Date.now();
  },

  // 設定未註冊
  setUnregistered() {
    state.isRegistered = false;
    state.realName = '';
    state.aliases = [];
    state.sheetUrls = [];
    state.lastUpdated = Date.now();
  },

  // 設定 userId
  setUserId(userId) {
    state.userId = userId;
  },

  // 檢查是否已註冊
  get isRegistered() {
    return state.isRegistered;
  },

  // 重置狀態
  reset() {
    state.isRegistered = false;
    state.userId = null;
    state.realName = '';
    state.aliases = [];
    state.sheetUrls = [];
    state.lastUpdated = null;
  }
};

export default userState;

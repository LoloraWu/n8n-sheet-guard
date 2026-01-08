/**
 * API 服務模組 - 統一管理與 n8n 後端的 API 呼叫
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://lorawu.app.n8n.cloud/webhook';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 秒超時（AI 處理可能較慢）
  headers: {
    'Content-Type': 'application/json'
  }
});

// 回應攔截器 - 統一處理錯誤
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      // 伺服器回應錯誤
      const message = error.response.data?.error || error.response.data?.message || '伺服器錯誤';
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // 請求發出但無回應
      return Promise.reject(new Error('無法連接伺服器，請檢查網路'));
    }
    return Promise.reject(error);
  }
);

/**
 * 使用者 API
 */
export const userApi = {
  /**
   * 註冊或更新使用者資料
   * @param {Object} data - { userId, realName, aliases, sheetUrls }
   */
  async register(data) {
    const response = await apiClient.post('/user-register', data);
    return response.data;
  },

  /**
   * 取得使用者資料
   * @param {string} userId - LINE User ID
   */
  async getProfile(userId) {
    const response = await apiClient.get('/user-profile', {
      params: { userId }
    });
    return response.data;
  }
};

/**
 * 報表 API
 */
export const reportApi = {
  /**
   * 取得報表填寫狀態
   * @param {string} userId - LINE User ID
   */
  async getStatus(userId) {
    const response = await apiClient.get('/report-status', {
      params: { userId }
    });
    return response.data;
  }
};

/**
 * 健康檢查 API
 */
export const healthApi = {
  async check() {
    const response = await apiClient.get('/health');
    return response.data;
  }
};

export default {
  user: userApi,
  report: reportApi,
  health: healthApi
};


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

/**
 * 帶重試的請求函數
 * @param {Function} requestFn - 請求函數
 * @param {number} maxRetries - 最大重試次數
 * @param {number} delay - 重試延遲（毫秒）
 */
const retryRequest = async (requestFn, maxRetries = 2, delay = 1000) => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      // 如果是業務邏輯錯誤（4xx），不重試
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      // 如果還有重試機會，等待後重試
      if (attempt < maxRetries) {
        console.warn(`Request failed, retrying... (${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

// 回應攔截器 - 統一處理錯誤
apiClient.interceptors.response.use(
  (response) => {
    // 處理空回應（n8n 有時會回傳空 body）
    if (response.status === 200 && !response.data) {
      console.warn('API returned empty response');
      return { data: null };
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      // 伺服器回應錯誤
      const message = error.response.data?.error || error.response.data?.message || '伺服器錯誤';
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // 請求發出但無回應（可能是網路問題或 CORS）
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('請求超時，請稍後再試'));
      }
      return Promise.reject(new Error('伺服器連線失敗，請稍後再試'));
    }
    return Promise.reject(error);
  }
);

/**
 * 使用者 API
 */
export const userApi = {
  /**
   * 註冊或更新使用者資料（帶重試機制）
   * @param {Object} data - { userId, realName, aliases, sheetUrls }
   */
  async register(data) {
    const response = await retryRequest(() => 
      apiClient.post('/user-register', data)
    );
    return response.data;
  },

  /**
   * 取得使用者資料（帶重試機制）
   * @param {string} userId - LINE User ID
   */
  async getProfile(userId) {
    const response = await retryRequest(() => 
      apiClient.get('/user-profile', { params: { userId } })
    );
    return response.data;
  },

  /**
   * 取得所有可用的表單列表（其他使用者已連結的表單）
   * @returns {Promise<{success: boolean, data: {sheets: Array, total: number}}>}
   */
  async getAvailableSheets() {
    const response = await retryRequest(() => 
      apiClient.get('/available-sheets')
    );
    return response.data;
  },

  /**
   * 驗證 Google Sheet URL 是否有效（帶重試機制）
   * @param {string} url - Google Sheet URL
   * @returns {Promise<{success: boolean, data?: {valid: boolean, spreadsheetId: string, title: string, tabCount: number}, error?: string}>}
   */
  async validateSheet(url) {
    const response = await retryRequest(() => 
      apiClient.post('/validate-sheet', { url })
    );
    return response.data;
  }
};

/**
 * 報表 API
 */
export const reportApi = {
  /**
   * 取得報表填寫狀態（帶重試機制）
   * @param {string} userId - LINE User ID
   */
  async getStatus(userId) {
    const response = await retryRequest(() => 
      apiClient.get('/report-status', { params: { userId } })
    );
    return response.data;
  }
};

/**
 * 健康檢查 API
 */
export const healthApi = {
  async check() {
    const response = await retryRequest(() => 
      apiClient.get('/health')
    , 1, 500); // 健康檢查只重試 1 次，延遲 500ms
    return response.data;
  }
};

/**
 * 提醒設定 API
 */
export const reminderApi = {
  /**
   * 取得使用者提醒設定
   * @param {string} userId - LINE User ID
   * @returns {Promise<{success: boolean, data?: {enabled: boolean, times: string[]}, error?: string}>}
   */
  async getSettings(userId) {
    const response = await retryRequest(() => 
      apiClient.get('/reminder-settings', { params: { userId } })
    );
    return response.data;
  },

  /**
   * 更新使用者提醒設定（帶重試機制）
   * @param {Object} data - { userId, enabled, times }
   * @returns {Promise<{success: boolean, data?: {message: string, enabled: boolean, times: string[]}, error?: string}>}
   */
  async updateSettings(data) {
    const response = await retryRequest(() => 
      apiClient.post('/reminder-settings', data)
    );
    return response.data;
  }
};

export default {
  user: userApi,
  report: reportApi,
  health: healthApi,
  reminder: reminderApi
};


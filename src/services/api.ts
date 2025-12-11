// FILE: src/services/api.ts
// ============================================
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../utils/api';
import {
  getToken,
  setToken,
  clearToken,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  getCookies,
  setCookies,
  clearCookies,
  clearAll,
} from '../utils/storage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout for network issues
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Log API configuration on initialization
console.log('🔧 API Configuration:', {
  baseURL: API_BASE_URL,
  timeout: 15000,
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add token and cookies
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();
    const cookies = await getCookies();

    // Add token to Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add cookies to Cookie header
    if (cookies) {
      config.headers.Cookie = cookies;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh and cookie storage
api.interceptors.response.use(
  async (response) => {
    // Store Set-Cookie in AsyncStorage
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      const cookieString = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      await setCookies(cookieString);
    }

    // Store tokens if provided in response
    if (response.data?.data?.token) {
      await setToken(response.data.data.token);
    }
    if (response.data?.data?.refreshToken) {
      await setRefreshToken(response.data.data.refreshToken);
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();

        if (!refreshToken) {
          // No refresh token available, clear all and logout
          await clearAll();
          isRefreshing = false;
          processQueue(new Error('No refresh token available'), null);
          return Promise.reject(error);
        }

        // Try to refresh the token
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/refresh-token`,
          { refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const newToken = response.data?.data?.token;
        const newRefreshToken = response.data?.data?.refreshToken;

        if (newToken) {
          await setToken(newToken);
          if (newRefreshToken) {
            await setRefreshToken(newRefreshToken);
          }

          api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          isRefreshing = false;
          processQueue(null, newToken);
          return api(originalRequest);
        } else {
          await clearAll();
          isRefreshing = false;
          processQueue(new Error('Token refresh failed'), null);
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Token refresh failed, clear all and logout
        await clearAll();
        isRefreshing = false;
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      }
    }

    // Handle other 401 responses (clear storage)
    if (error.response?.status === 401) {
      await clearAll();
    }

    return Promise.reject(error);
  }
);

// Send OTP function
export const sendOTP = async (phone: string) => {
  try {
    console.log(`📤 Sending OTP request to: ${API_BASE_URL}/api/auth/send-otp`);
    console.log(`📱 Phone number: ${phone}`);
    const response = await api.post('/api/auth/send-otp', { phone });
    console.log('✅ OTP sent successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Send OTP Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
    });
    throw error;
  }
};

// Verify OTP function
export const verifyOTP = async (phone: string, otp: string) => {
  try {
    const response = await api.post('/api/auth/verify-otp', { phone, otp });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user profile from database
 */
export const getUserProfile = async () => {
  try {
    const response = await api.get('/api/user/profile');
    return response.data;
  } catch (error: any) {
    console.error('Get User Profile Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
};

/**
 * Logout function - clears all stored tokens and cookies
 * Note: Logout always succeeds locally even if API call fails
 */
export const logout = async () => {
  try {
    // Try to call logout endpoint (may fail if token is expired/invalid, which is OK)
    await api.post('/api/auth/logout');
  } catch (error: any) {
    // Silently ignore errors - logout should always succeed locally
    // Token might be expired/invalid, which is fine for logout
    if (error.response?.status !== 401) {
      // Only log non-401 errors (401 is expected if token is expired)
      console.warn('Logout API warning:', error.message);
    }
  } finally {
    // Always clear all stored data regardless of API response
    await clearAll();
  }
};

export default api;

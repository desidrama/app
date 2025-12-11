// src/utils/api.ts
// API_BASE_URL is configured via environment variables
import Constants from 'expo-constants';

// Get API_BASE_URL from environment variables
// Priority order:
// 1. EXPO_PUBLIC_API_BASE_URL (from .env file - recommended)
// 2. API_BASE_URL (from .env file - alternative)
// 3. Constants.expoConfig.extra.apiBaseUrl (from app.config.js)
// 4. Fallback to development URL

const getApiBaseUrl = (): string => {
  // Try EXPO_PUBLIC_ prefixed env variable first (Expo's recommended way)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // Try non-prefixed env variable
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  // Try getting from Expo Constants (from app.config.js extra field)
  const envApiUrl = Constants.expoConfig?.extra?.apiBaseUrl;
  if (envApiUrl) {
    return envApiUrl;
  }

  // Fallback URLs for development/production
  const DEV_API_URL = 'http://192.168.1.4:5000';
  const PROD_API_URL = 'https://api.yourproductiondomain.com';

  // Use development URL in dev mode, production URL otherwise
  return __DEV__ ? DEV_API_URL : PROD_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

console.log('📡 API_BASE_URL:', API_BASE_URL);

export const SEND_OTP_PATH = '/api/auth/send-otp';
export const VERIFY_OTP_PATH = '/api/auth/verify-otp';

// src/utils/api.ts
// API_BASE_URL is configured via environment variables
import Constants from 'expo-constants';


// Get API_BASE_URL from environment variables
// Priority order:
// 1. EXPO_PUBLIC_API_BASE_URL (from .env file - recommended)
// 2. API_BASE_URL (from .env file - alternative)
// 3. Constants.expoConfig.extra.apiBaseUrl (from app.config.js)
// 4. Fallback to development URL


// Helper to check if a string is a valid URL (not a placeholder)
const isValidUrl = (url: string | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  // Ignore placeholder strings
  if (url.includes('Configured via') || url.includes('yourproductiondomain') || !url.startsWith('http')) {
    return false;
  }
  return url.startsWith('http://') || url.startsWith('https://');
};

const getApiBaseUrl = (): string => {
  // Try EXPO_PUBLIC_ prefixed env variable first (Expo's recommended way)
  if (isValidUrl(process.env.EXPO_PUBLIC_API_BASE_URL)) {
    return process.env.EXPO_PUBLIC_API_BASE_URL!;
  }

  // Try non-prefixed env variable
  if (isValidUrl(process.env.API_BASE_URL)) {
    return process.env.API_BASE_URL!;
  }

  // Try getting from Expo Constants (from app.config.js extra field)
  // But skip if it's a placeholder string
  const envApiUrl = Constants.expoConfig?.extra?.apiBaseUrl;
  if (isValidUrl(envApiUrl)) {
    return envApiUrl as string;
  }

  // Fallback URLs for development/production
  // For Android emulator: use 10.0.2.2 to access host machine's localhost
  // For iOS simulator: use localhost
  // For physical device: use your computer's local IP (e.g., 192.168.x.x)
  const DEV_API_URL = 'http://10.203.172.110:5000'; // Android emulator default
  const PROD_API_URL = 'https://api.yourproductiondomain.com';

  // Use development URL in dev mode, production URL otherwise
  const fallbackUrl = __DEV__ ? DEV_API_URL : PROD_API_URL;
  
  if (!isValidUrl(process.env.EXPO_PUBLIC_API_BASE_URL) && !isValidUrl(envApiUrl)) {
    console.warn('⚠️ No valid API_BASE_URL found. Using fallback:', fallbackUrl);
    console.warn('💡 To set a custom URL, create a .env file with: EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:5000');
  }
  
  return fallbackUrl;
};

export const API_BASE_URL = getApiBaseUrl();

console.log('📡 API_BASE_URL:', API_BASE_URL);

export const SEND_OTP_PATH = '/api/auth/send-otp';
export const VERIFY_OTP_PATH = '/api/auth/verify-otp';





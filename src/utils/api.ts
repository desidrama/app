// src/utils/api.ts
// API_BASE_URL is configured via environment variables
import Constants from 'expo-constants';


// Get API_BASE_URL from environment - Expo reads from app.json or .env
const envApiUrl = Constants.expoConfig?.extra?.apiBaseUrl;

// Fallback URLs for development/production
const DEV_API_URL = 'http://192.168.29.105:5000';

// Development URL - Change this as needed



const PROD_API_URL = 'https://api.yourproductiondomain.com';

// Priority: env variable > .env files (via Constants) > fallback
export const API_BASE_URL = 
  envApiUrl || 
  process.env.API_BASE_URL || 
  (__DEV__ ? DEV_API_URL : PROD_API_URL);

console.log('📡 API_BASE_URL:', API_BASE_URL);

export const SEND_OTP_PATH = '/api/auth/send-otp';
export const VERIFY_OTP_PATH = '/api/auth/verify-otp';

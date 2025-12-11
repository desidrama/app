// src/utils/api.ts
// API_BASE_URL is configured via environment variables
// For development: change the value below directly
// For production: use EAS secrets or environment variables

// Development URL - Change this as needed
const DEV_API_URL = 'http://10.78.2.110:5000';
const PROD_API_URL = 'https://api.yourproductiondomain.com';

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export const SEND_OTP_PATH = '/api/auth/send-otp';
export const VERIFY_OTP_PATH = '/api/auth/verify-otp';

// src/utils/api.ts
// Edit API_BASE depending on platform/local testing.
// For Android emulator use 10.0.2.2. For iOS simulator use localhost.
// For a real device use your PC's LAN IP (e.g. http://192.168.1.45:5000).

export const API_BASE = __DEV__
  ? 'http://10.0.2.2:5000'   // Android emulator
  // ? 'http://localhost:5000' // Uncomment for iOS simulator
  : 'https://api.yourproductiondomain.com';

export const SEND_OTP_PATH = '/api/auth/send-otp';
export const VERIFY_OTP_PATH = '/api/auth/verify-otp';

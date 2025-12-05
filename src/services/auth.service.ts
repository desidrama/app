// ============================================
// FILE: src/services/auth.service.ts
// ============================================
import api from './api';

export const authService = {
  async sendOTP(phone: string) {
    const response = await api.post('/auth/send-otp', { phone });
    return response.data;
  },

  async verifyOTP(phone: string, otp: string) {
    const response = await api.post('/auth/verify-otp', { phone, otp });
    return response.data;
  },
};
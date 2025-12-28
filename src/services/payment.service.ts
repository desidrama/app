// app/src/services/payment.service.ts
import api from './api';

export interface CoinPackage {
  id: string;
  coins: number;
  amount: number;
  name: string;
}

export interface PaymentInitiateResponse {
  orderId: string;
  paymentSessionId: string;
  orderAmount: number;
  coins: number;
  packageName: string;
}

export interface PaymentVerifyResponse {
  orderId: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  coins: number;
  amount: number;
}

export interface PaymentHistoryItem {
  _id: string;
  userId: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  coins: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export const paymentService = {
  /**
   * Get available coin packages
   */
  async getCoinPackages(): Promise<CoinPackage[]> {
    try {
      const response = await api.get('/api/payment/packages');
      return response.data?.data || [];
    } catch (error: any) {
      console.error('Get Coin Packages Error:', error);
      throw error;
    }
  },

  /**
   * Initiate payment for coin purchase
   */
  async initiatePayment(packageId: string): Promise<PaymentInitiateResponse> {
    try {
      const response = await api.post('/api/payment/initiate', {
        packageId,
      });
      
      console.log('📥 [PaymentService] API Response:', {
        success: response.data?.success,
        hasData: !!response.data?.data,
        dataKeys: response.data?.data ? Object.keys(response.data.data) : [],
        fullResponse: JSON.stringify(response.data, null, 2),
      });
      
      if (!response.data?.data) {
        console.error('❌ [PaymentService] No data in response:', response.data);
        throw new Error('No payment data received from server');
      }
      
      const paymentData = response.data.data;
      
      if (!paymentData.paymentUrl) {
        console.error('❌ [PaymentService] Missing paymentUrl in response:', {
          paymentData,
          availableKeys: Object.keys(paymentData),
        });
        throw new Error('Payment URL not provided by server');
      }
      
      return paymentData;
    } catch (error: any) {
      console.error('❌ [PaymentService] Initiate Payment Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  /**
   * Verify payment status
   */
  async verifyPayment(orderId: string): Promise<PaymentVerifyResponse> {
    try {
      const response = await api.get(`/api/payment/verify/${orderId}`);
      return response.data?.data;
    } catch (error: any) {
      console.error('Verify Payment Error:', error);
      throw error;
    }
  },

  /**
   * Get payment history
   */
  async getPaymentHistory(page: number = 1): Promise<{
    data: PaymentHistoryItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    try {
      const response = await api.get(`/api/payment/history?page=${page}`);
      return response.data;
    } catch (error: any) {
      console.error('Get Payment History Error:', error);
      throw error;
    }
  },
};

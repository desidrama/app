// ============================================
// FILE: src/services/carousel.service.ts
// ============================================
import api from './api';

export interface CarouselItem {
  _id: string;
  title: string;
  description?: string;
  tagline?: string;
  duration?: string;
  episodeCount?: number;
  imageUrl: string;
  contentType: 'webseries' | 'reels' | 'trending' | 'custom';
  contentId?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const carouselService = {
  /**
   * Get active carousel items for display
   */
  async getActiveCarouselItems(): Promise<CarouselItem[]> {
    try {
      const response = await api.get('/api/carousel/active');
      // The API returns { success: true, data: CarouselItem[] }
      return response.data?.data || [];
    } catch (error: any) {
      const isNetworkError = error?.message === 'Network Error' || error?.code === 'ERR_NETWORK' || !error?.response;
      if (isNetworkError) {
        console.error('Get Active Carousel Items Error: Network connection failed', {
          message: error.message,
          code: error.code,
        });
      } else {
        console.error('Get Active Carousel Items Error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      }
      throw error;
    }
  },
};


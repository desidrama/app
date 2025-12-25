// ============================================
// FILE: src/services/video.service.ts
// ============================================
import api from './api';

export const videoService = {
  async getReelsFeed(page: number = 1) {
    try {
      const response = await api.get(`/api/content/reels?page=${page}`);
      return response.data;
    } catch (error: any) {
      // Handle 401 gracefully - return empty feed
      if (error.response?.status === 401) {
        return { success: false, data: [], message: 'Authentication required' };
      }
      throw error;
    }
  },

  async getWebseriesFeed(page: number = 1) {
    try {
      const response = await api.get(`/api/content/webseries?page=${page}`);
      return response.data;
    } catch (error: any) {
      // Handle 401 gracefully - return empty feed
      if (error.response?.status === 401) {
        return { success: false, data: [], message: 'Authentication required' };
      }
      throw error;
    }
  },

  async getSeasons() {
    try {
      const response = await api.get('/api/content/seasons');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { success: false, data: [], message: 'Authentication required' };
      }
      throw error;
    }
  },

  async getEpisodes(seasonId: string) {
    try {
      const response = await api.get(`/api/content/episodes/${seasonId}`);
      return response.data;
    } catch (error: any) {
      // Handle 401 gracefully - return empty episodes
      if (error.response?.status === 401) {
        return { success: false, data: [], message: 'Authentication required' };
      }
      throw error;
    }
  },

  async getLatestVideos(limit: number = 10, type?: string) {
    try {
      const typeParam = type ? `&type=${type}` : '';
      const response = await api.get(`/api/content/latest?limit=${limit}${typeParam}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { success: false, data: [], message: 'Authentication required' };
      }
      throw error;
    }
  },

  async getVideoById(videoId: string) {
    const response = await api.get(`/api/content/videos/${videoId}`);
    return response.data;
  },

  async incrementView(videoId: string) {
    const response = await api.post(`/api/content/videos/${videoId}/view`);
    return response.data;
  },

  async likeVideo(videoId: string) {
    const response = await api.post(`/api/content/videos/${videoId}/like`);
    return response.data;
  },

  // ========== Watch Progress Methods ==========
  async saveWatchProgress(videoId: string, currentTime: number, duration: number) {
    const response = await api.post('/api/content/watch-progress', {
      videoId,
      currentTime,
      duration,
    });
    return response.data;
  },

  async getContinueWatching(limit: number = 10) {
    try {
      const response = await api.get(`/api/content/continue-watching?limit=${limit}`);
      return response.data;
    } catch (error: any) {
      // Handle 401 gracefully - return empty continue watching list
      if (error.response?.status === 401) {
        return { success: false, data: [], message: 'Authentication required' };
      }
      throw error;
    }
  },

  async getWatchProgress(videoId: string) {
    const response = await api.get(`/api/content/watch-progress/${videoId}`);
    return response.data;
  },

  async deleteWatchProgress(videoId: string) {
    try {
      const response = await api.delete(`/api/content/watch-progress/${videoId}`);
      return response.data;
    } catch (error) {
      // Silently fail if watch progress doesn't exist
      console.log('Note: Watch progress may not exist for deletion');
      return { success: true, message: 'Watch progress deleted or not found' };
    }
  },

  async searchVideos(query: string, page: number = 1) {
    const response = await api.get(`/api/content/search?q=${encodeURIComponent(query)}&page=${page}`);
    return response.data;
  },
};
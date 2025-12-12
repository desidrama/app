// ============================================
// FILE: src/services/video.service.ts
// ============================================
import api from './api';

export const videoService = {
  async getReelsFeed(page: number = 1) {
    const response = await api.get(`/api/content/reels?page=${page}`);
    return response.data;
  },

  async getWebseriesFeed(page: number = 1) {
    const response = await api.get(`/api/content/webseries?page=${page}`);
    return response.data;
  },

  async getSeasons() {
    const response = await api.get('/api/content/seasons');
    return response.data;
  },

  async getEpisodes(seasonId: string) {
    const response = await api.get(`/api/content/episodes/${seasonId}`);
    return response.data;
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
    const response = await api.get(`/api/content/continue-watching?limit=${limit}`);
    return response.data;
  },

  async getWatchProgress(videoId: string) {
    const response = await api.get(`/api/content/watch-progress/${videoId}`);
    return response.data;
  },

  async deleteWatchProgress(videoId: string) {
    const response = await api.delete(`/api/content/watch-progress/${videoId}`);
    return response.data;
  },
};
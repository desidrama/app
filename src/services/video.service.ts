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
};
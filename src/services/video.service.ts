// ============================================
// FILE: src/services/video.service.ts
// ============================================
import api from './api';

export const videoService = {
  async getReelsFeed(page: number = 1) {
    const response = await api.get(`/video/reels?page=${page}`);
    return response.data;
  },

  async getSeasons() {
    const response = await api.get('/video/seasons');
    return response.data;
  },

  async getEpisodes(seasonId: string) {
    const response = await api.get(`/video/seasons/${seasonId}/episodes`);
    return response.data;
  },

  async incrementView(videoId: string) {
    const response = await api.post(`/video/view/${videoId}`);
    return response.data;
  },

  async likeVideo(videoId: string) {
    const response = await api.post(`/video/like/${videoId}`);
    return response.data;
  },
};
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
    // Validate seasonId before making request
    // Convert to string first to handle cases where seasonId might be undefined, null, or non-string
    const seasonIdStr = seasonId ? String(seasonId).trim() : '';
    if (!seasonIdStr || seasonIdStr === 'undefined' || seasonIdStr === 'null' || seasonIdStr === '') {
      console.warn('Invalid seasonId provided to getEpisodes:', seasonId);
      return {
        success: false,
        message: 'Invalid season ID',
        data: [],
      };
    }
    
    try {
      const response = await api.get(`/api/content/episodes/${seasonIdStr}`);
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

  async unlikeVideo(videoId: string) {
    const response = await api.post(`/api/content/videos/${videoId}/unlike`);
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

  // ========== Like Methods ==========
  async toggleLike(videoId: string, currentLiked: boolean) {
    try {
      if (!videoId) {
        throw new Error('Video ID is required');
      }
      
      let response;
      if (currentLiked) {
        // Unlike the video
        response = await api.post(`/api/content/videos/${videoId}/unlike`);
      } else {
        // Like the video
        response = await api.post(`/api/content/videos/${videoId}/like`);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error toggling like:', error);
      if (error.response?.status === 401) {
        throw new Error('Authentication required');
      }
      throw error;
    }
  },

  async getLikeStatus(videoId: string) {
    try {
      if (!videoId) {
        throw new Error('Video ID is required');
      }
      const response = await api.get(`/api/content/videos/${videoId}/like`);
      return response.data;
    } catch (error: any) {
      // Graceful fallback: if 404, treat as not liked
      if (error.response?.status === 404) {
        console.warn('Like status endpoint not found, treating as not liked');
        return { success: true, data: { liked: false, likeCount: 0 } };
      }
      if (error.response?.status === 401) {
        // Not authenticated - treat as not liked
        return { success: true, data: { liked: false, likeCount: 0 } };
      }
      console.error('Error getting like status:', error);
      // Return safe default on any error
      return { success: true, data: { liked: false, likeCount: 0 } };
    }
  },

  // ========== Comment Methods ==========
  async getComments(reelId: string, page: number = 1, limit: number = 20) {
    try {
      if (!reelId) {
        throw new Error('Reel ID is required');
      }
      const response = await api.get(`/api/content/videos/${reelId}/comments`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error: any) {
      // Graceful fallback: if 404 or any error, return empty comments
      if (error.response?.status === 404) {
        console.warn('Comments endpoint not found, returning empty list');
        return { success: true, data: [], pagination: { page, limit, total: 0, hasMore: false } };
      }
      if (error.response?.status === 401) {
        // Not authenticated - return empty list
        return { success: true, data: [], pagination: { page, limit, total: 0, hasMore: false } };
      }
      console.error('Error getting comments:', error);
      // Return safe default on any error
      return { success: true, data: [], pagination: { page, limit, total: 0, hasMore: false } };
    }
  },

  async postComment(reelId: string, commentText: string, parentCommentId?: string) {
    try {
      if (!reelId) {
        console.error('Missing reelId, cannot post comment');
        throw new Error('Reel ID is required');
      }
      
      if (!commentText || !commentText.trim()) {
        throw new Error('Comment text is required');
      }
      
      console.log('Posting comment for reel:', reelId);
      
      const requestBody: any = { text: commentText.trim() };
      if (parentCommentId) {
        requestBody.parentCommentId = parentCommentId;
      }
      
      const response = await api.post(`/api/content/videos/${reelId}/comments`, requestBody);
      return response.data;
    } catch (error: any) {
      console.error('Error posting comment:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        reelId,
      });
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Authentication required to post comments');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || 'Invalid comment');
      }
      if (error.response?.status === 404) {
        throw new Error('Comment feature not available. Please try again later.');
      }
      throw new Error(error.response?.data?.message || 'Failed to post comment. Please try again.');
    }
  },

  async getReplies(commentId: string, page: number = 1, limit: number = 20) {
    try {
      if (!commentId) {
        throw new Error('Comment ID is required');
      }
      const response = await api.get(`/api/content/comments/${commentId}/replies`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error: any) {
      // Graceful fallback: if 404 or any error, return empty replies
      if (error.response?.status === 404) {
        console.warn('Replies endpoint not found, returning empty list');
        return { success: true, data: [], pagination: { page, limit, total: 0, hasMore: false } };
      }
      if (error.response?.status === 401) {
        // Not authenticated - return empty list
        return { success: true, data: [], pagination: { page, limit, total: 0, hasMore: false } };
      }
      console.error('Error getting replies:', error);
      // Return safe default on any error
      return { success: true, data: [], pagination: { page, limit, total: 0, hasMore: false } };
    }
  },

  async editComment(commentId: string, commentText: string) {
    try {
      if (!commentId) {
        throw new Error('Comment ID is required');
      }
      
      if (!commentText || !commentText.trim()) {
        throw new Error('Comment text is required');
      }
      
      const response = await api.put(`/api/content/comments/${commentId}`, {
        text: commentText.trim(),
      });
      return response.data;
    } catch (error: any) {
      console.error('Error editing comment:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        commentId,
      });
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Authentication required to edit comment');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || 'Invalid comment text');
      }
      if (error.response?.status === 404) {
        throw new Error('Comment not found. Cannot edit comment.');
      }
      throw new Error(error.response?.data?.message || 'Failed to edit comment. Please try again.');
    }
  },

  async deleteComment(commentId: string) {
    try {
      if (!commentId) {
        throw new Error('Comment ID is required');
      }
      
      const response = await api.delete(`/api/content/comments/${commentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting comment:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        commentId,
      });
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Authentication required to delete comment');
      }
      if (error.response?.status === 404) {
        throw new Error('Comment not found. Cannot delete comment.');
      }
      throw new Error(error.response?.data?.message || 'Failed to delete comment. Please try again.');
    }
  },

  async likeComment(commentId: string) {
    try {
      if (!commentId) {
        throw new Error('Comment ID is required');
      }
      
      const response = await api.post(`/api/content/comments/${commentId}/like`);
      return response.data;
    } catch (error: any) {
      console.error('Error liking comment:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        commentId,
      });
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Authentication required to like comment');
      }
      if (error.response?.status === 404) {
        throw new Error('Comment not found. Cannot like comment.');
      }
      throw new Error(error.response?.data?.message || 'Failed to like comment. Please try again.');
    }
  },

  async unlikeComment(commentId: string) {
    try {
      if (!commentId) {
        throw new Error('Comment ID is required');
      }
      
      const response = await api.post(`/api/content/comments/${commentId}/unlike`);
      return response.data;
    } catch (error: any) {
      console.error('Error unliking comment:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        commentId,
      });
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Authentication required to unlike comment');
      }
      if (error.response?.status === 404) {
        throw new Error('Comment not found. Cannot unlike comment.');
      }
      throw new Error(error.response?.data?.message || 'Failed to unlike comment. Please try again.');
    }
  },

  // ========== OTT Experience Methods ==========
  async getWebseriesWithEpisodes(webseriesId: string) {
    try {
      const response = await api.get(`/api/content/webseries/${webseriesId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching webseries with episodes:', error);
      throw error;
    }
  },

  async getSeasonEpisodes(seasonId: string) {
    try {
      const response = await api.get(`/api/content/seasons/${seasonId}/episodes`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching season episodes:', error);
      throw error;
    }
  },

  async getAllEpisodes(webseriesId: string) {
    try {
      // Fetch all seasons for the webseries
      const webseriesResponse = await this.getWebseriesWithEpisodes(webseriesId);
      if (webseriesResponse.success && webseriesResponse.data) {
        const episodes: any[] = [];
        const seasons = webseriesResponse.data.seasons || [];
        
        for (const season of seasons) {
          if (season.episodes && Array.isArray(season.episodes)) {
            episodes.push(...season.episodes);
          }
        }
        
        return { success: true, data: episodes };
      }
      return { success: false, data: [] };
    } catch (error: any) {
      console.error('Error fetching all episodes:', error);
      return { success: false, data: [] };
    }
  },

  async getEpisodeDetails(episodeId: string) {
    try {
      const response = await api.get(`/api/content/episodes/${episodeId}/details`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching episode details:', error);
      throw error;
    }
  },

  async preloadEpisodeVideo(episodeId: string) {
    try {
      // This would trigger video caching on the server side if implemented
      const response = await api.post(`/api/content/episodes/${episodeId}/preload`);
      return response.data;
    } catch (error: any) {
      // Non-critical operation, silently fail
      console.warn('Could not preload episode video:', error);
      return { success: false };
    }
  },

  // ========== Episode Unlock Methods (STRICT BACKEND VALIDATION) ==========
  
  /**
   * CRITICAL: Check video access from backend (single source of truth)
   * This MUST be called before rendering any video/popup
   */
  async checkVideoAccess(videoId: string) {
    try {
      if (!videoId) {
        throw new Error('Video ID is required');
      }
      const response = await api.get(`/api/content/video/access-check?videoId=${videoId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error checking video access:', error);
      if (error.response?.status === 401) {
        return { success: false, unlocked: false, data: null, message: 'Authentication required' };
      }
      // On any error, treat as locked for safety
      return { success: false, unlocked: false, data: null };
    }
  },

  /**
   * Purchase episode with coins (backend saves immediately)
   */
  async purchaseEpisodeWithCoins(videoId: string) {
    try {
      if (!videoId) {
        throw new Error('Video ID is required');
      }
      const response = await api.post('/api/content/video/unlock/coins', { videoId });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error purchasing episode with coins:', error);
      if (error.response?.status === 401) {
        throw new Error('Authentication required');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || 'Insufficient coins');
      }
      throw error;
    }
  },

  /**
   * Unlock episode with ad (called AFTER ad completes, backend saves immediately)
   */
  async unlockEpisodeWithAd(videoId: string) {
    try {
      if (!videoId) {
        throw new Error('Video ID is required');
      }
      const response = await api.post('/api/content/video/unlock/ad', { videoId });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error unlocking episode with ad:', error);
      if (error.response?.status === 401) {
        throw new Error('Authentication required');
      }
      throw error;
    }
  },

  /**
   * @deprecated Use checkVideoAccess instead - this is for backward compatibility only
   */
  async checkEpisodeUnlockStatus(episodeId: string) {
    try {
      const response = await api.get(`/api/content/episodes/${episodeId}/unlock-status`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { success: false, data: { isUnlocked: false }, message: 'Authentication required' };
      }
      throw error;
    }
  },
};

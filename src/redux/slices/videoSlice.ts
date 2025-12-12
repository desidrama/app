// ============================================
// FILE: src/redux/slices/videoSlice.ts
// ============================================
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Video } from '../../types';

export interface ContinueWatchingVideo {
  _id: string;
  userId: string;
  videoId: {
    _id: string;
    title: string;
    description?: string;
    duration: number;
    thumbnailUrl: string;
    type: 'reel' | 'episode';
    seasonId?: string;
    episodeNumber?: number;
  };
  currentTime: number;
  duration: number;
  progress: number;
  lastWatchedAt: string;
}

interface VideoState {
  reels: Video[];
  currentPage: number;
  loading: boolean;
  continueWatching: ContinueWatchingVideo[];
  continueWatchingLoading: boolean;
}

const initialState: VideoState = {
  reels: [],
  currentPage: 1,
  loading: false,
  continueWatching: [],
  continueWatchingLoading: false,
};

const videoSlice = createSlice({
  name: 'video',
  initialState,
  reducers: {
    setReels: (state, action: PayloadAction<Video[]>) => {
      state.reels = action.payload;
    },
    addReels: (state, action: PayloadAction<Video[]>) => {
      state.reels = [...state.reels, ...action.payload];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setContinueWatching: (state, action: PayloadAction<ContinueWatchingVideo[]>) => {
      state.continueWatching = action.payload;
    },
    addContinueWatchingVideo: (state, action: PayloadAction<ContinueWatchingVideo>) => {
      // Check if video already exists
      const exists = state.continueWatching.some(
        (item) => item.videoId._id === action.payload.videoId._id
      );
      if (!exists) {
        state.continueWatching.unshift(action.payload);
      } else {
        // Update existing video and move to top
        state.continueWatching = state.continueWatching
          .filter((item) => item.videoId._id !== action.payload.videoId._id)
          .concat([action.payload])
          .reverse();
      }
    },
    removeContinueWatchingVideo: (state, action: PayloadAction<string>) => {
      state.continueWatching = state.continueWatching.filter(
        (item) => item.videoId._id !== action.payload
      );
    },
    updateContinueWatchingProgress: (
      state,
      action: PayloadAction<{ videoId: string; currentTime: number; progress: number }>
    ) => {
      const video = state.continueWatching.find(
        (item) => item.videoId._id === action.payload.videoId
      );
      if (video) {
        video.currentTime = action.payload.currentTime;
        video.progress = action.payload.progress;
        video.lastWatchedAt = new Date().toISOString();
      }
    },
    setContinueWatchingLoading: (state, action: PayloadAction<boolean>) => {
      state.continueWatchingLoading = action.payload;
    },
  },
});

export const {
  setReels,
  addReels,
  setLoading,
  setContinueWatching,
  addContinueWatchingVideo,
  removeContinueWatchingVideo,
  updateContinueWatchingProgress,
  setContinueWatchingLoading,
} = videoSlice.actions;
export default videoSlice.reducer;


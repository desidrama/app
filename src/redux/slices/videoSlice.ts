// ============================================
// FILE: src/redux/slices/videoSlice.ts
// ============================================
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Video } from '../../types';

interface VideoState {
  reels: Video[];
  currentPage: number;
  loading: boolean;
}

const initialState: VideoState = {
  reels: [],
  currentPage: 1,
  loading: false,
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
  },
});

export const { setReels, addReels, setLoading } = videoSlice.actions;
export default videoSlice.reducer;


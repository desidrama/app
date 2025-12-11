// ============================================
// FILE: src/redux/slices/userSlice.ts
// ============================================
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';

interface UserState {
  profile: User | null;
  loading: boolean;
}

const initialState: UserState = {
  profile: null,
  loading: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.profile = action.payload;
    },
    updateCoins: (state, action: PayloadAction<number>) => {
      if (state.profile) {
        // Update both coins and coinsBalance for compatibility
        const currentBalance = state.profile.coinsBalance ?? state.profile.coins ?? 0;
        state.profile.coins = currentBalance + action.payload;
        state.profile.coinsBalance = currentBalance + action.payload;
      }
    },
  },
});

export const { setUser, updateCoins } = userSlice.actions;
export default userSlice.reducer;
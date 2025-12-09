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
        state.profile.coins = (state.profile.coins || 0) + action.payload;
      }
    },
  },
});

export const { setUser, updateCoins } = userSlice.actions;
export default userSlice.reducer;
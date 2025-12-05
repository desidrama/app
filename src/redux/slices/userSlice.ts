// ============================================
// FILE: src/redux/slices/userSlice.ts
// ============================================
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';

interface UserState {
  user: User | null;
  loading: boolean;
}

const initialState: UserState = {
  user: null,
  loading: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    updateCoins: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.coinsBalance += action.payload;
      }
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
});

export const { setUser, updateCoins, clearUser } = userSlice.actions;
export default userSlice.reducer;
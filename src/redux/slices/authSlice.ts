// ============================================
// FILE: src/redux/slices/authSlice.ts
// ============================================
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  user: any | null;
  loading: boolean;
  authChecked: boolean; // New flag to indicate if we've checked stored auth
}

const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  refreshToken: null,
  user: null,
  loading: false,
  authChecked: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<{ token: string; refreshToken?: string; user?: any }>) => {
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      if (action.payload.user) {
        state.user = action.payload.user;
      }
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    // New action to check stored authentication on app startup
    setAuthChecked: (state, action: PayloadAction<boolean>) => {
      state.authChecked = action.payload;
    },
    // Restore auth from stored data
    restoreAuth: (state, action: PayloadAction<{ token: string; refreshToken?: string; user?: any }>) => {
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      if (action.payload.user) {
        state.user = action.payload.user;
      }
      state.isAuthenticated = true;
      state.authChecked = true;
    },
  },
});

export const { setToken, logout, setLoading, setAuthChecked, restoreAuth } = authSlice.actions;
export default authSlice.reducer;

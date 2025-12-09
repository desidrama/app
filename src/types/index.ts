// ============================================
// FILE: src/types/index.ts
// ============================================

export interface Video {
  _id: string;
  title: string;
  description?: string;
  masterPlaylistUrl: string;
  thumbnail?: string;
  duration: number;
  views: number;
  likes: number;
  shares?: number;
  comments?: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  coins: number;
  username?: string;
  bio?: string;
  location?: string;
  referralCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: User;
  token?: string;
  loading: boolean;
  error?: string;
}

export interface VideoState {
  reels: Video[];
  currentVideo?: Video;
  loading: boolean;
  error?: string;
}

export interface UserState {
  profile?: User;
  loading: boolean;
  error?: string;
}

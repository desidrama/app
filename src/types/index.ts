// ============================================
// FILE: src/types/index.ts
// ============================================

export interface Video {
  _id: string;
  title: string;
  description?: string;
  masterPlaylistUrl?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  duration: number;
  views: number;
  likes: number;
  shares?: number;
  comments?: number;
  type?: 'reel' | 'episode';
  seriesName?: string;
  seasonId?: {
    _id: string;
    title: string;
    seasonNumber: number;
    thumbnail?: string;
  };
  episodeNumber?: number;
  variants?: Array<{
    resolution: string;
    url: string;
    size?: number;
    duration?: number;
  }>;
  year?: string;
  ageRating?: string;
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
  profilePicture?: string;
  coins: number;
  coinsBalance?: number; // Backend field name
  username?: string;
  bio?: string;
  location?: string;
  referralCode?: string;
  streak?: number;
  lastLoginDate?: string;
  lastDailyCheckInDate?: string;
  currentCheckInDay?: number; // 1-7 for the 7-day cycle
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

export interface CoinTransaction {
  _id: string;
  userId: string;
  type: 'earned' | 'redeemed';
  source: 'ad_view' | 'social_follow' | 'daily_login' | 'referral' | 'signup_bonus' | 'reel_watch';
  amount: number;
  description: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// FILE: src/utils/storage.ts
// ============================================
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'dedidrama_auth_token';
const REFRESH_TOKEN_KEY = 'dedidrama_refresh_token';
const COOKIES_KEY = 'dedidrama_cookies';
const USER_KEY = 'dedidrama_user';

/**
 * Get stored authentication token
 */
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

/**
 * Save authentication token
 */
export const setToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

/**
 * Clear authentication token
 */
export const clearToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error clearing token:', error);
  }
};

/**
 * Get stored user profile
 */
export const getUser = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(USER_KEY);
  } catch (error) {
    console.error('Error retrieving user:', error);
    return null;
  }
};

/**
 * Save user profile
 */
export const setUser = async (user: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_KEY, user);
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

/**
 * Clear user profile
 */
export const clearUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error clearing user:', error);
  }
};

/**
 * Get stored refresh token
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    return null;
  }
};

/**
 * Save refresh token
 */
export const setRefreshToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving refresh token:', error);
  }
};

/**
 * Clear refresh token
 */
export const clearRefreshToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error clearing refresh token:', error);
  }
};

/**
 * Get stored cookies
 */
export const getCookies = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(COOKIES_KEY);
  } catch (error) {
    console.error('Error retrieving cookies:', error);
    return null;
  }
};

/**
 * Save cookies
 */
export const setCookies = async (cookies: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(COOKIES_KEY, cookies);
  } catch (error) {
    console.error('Error saving cookies:', error);
  }
};

/**
 * Clear cookies
 */
export const clearCookies = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(COOKIES_KEY);
  } catch (error) {
    console.error('Error clearing cookies:', error);
  }
};

/**
 * Mission States Storage
 */
const MISSION_STATES_KEY = 'dedidrama_mission_states';

export const getMissionStates = async (): Promise<Record<string, any> | null> => {
  try {
    const data = await AsyncStorage.getItem(MISSION_STATES_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error retrieving mission states:', error);
    return null;
  }
};

export const setMissionStates = async (states: Record<string, any>): Promise<void> => {
  try {
    await AsyncStorage.setItem(MISSION_STATES_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Error saving mission states:', error);
  }
};

export const clearMissionStates = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(MISSION_STATES_KEY);
  } catch (error) {
    console.error('Error clearing mission states:', error);
  }
};

/**
 * Video Quality Preference Storage
 */
const VIDEO_QUALITY_KEY = 'dedidrama_video_quality';

export const getVideoQualityPreference = async (): Promise<string> => {
  try {
    const quality = await AsyncStorage.getItem(VIDEO_QUALITY_KEY);
    return quality || '720p'; // Default to 720p
  } catch (error) {
    console.error('Error retrieving video quality preference:', error);
    return '720p'; // Default to 720p
  }
};

export const setVideoQualityPreference = async (quality: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(VIDEO_QUALITY_KEY, quality);
  } catch (error) {
    console.error('Error saving video quality preference:', error);
  }
};

/**
 * Clear all stored data
 */
export const clearAll = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, COOKIES_KEY, USER_KEY, MISSION_STATES_KEY, VIDEO_QUALITY_KEY]);
  } catch (error) {
    console.error('Error clearing all storage:', error);
  }
};

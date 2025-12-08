// ============================================
// FILE: src/utils/storage.ts
// ============================================
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'dedidrama_auth_token';
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
 * Clear all stored data
 */
export const clearAll = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  } catch (error) {
    console.error('Error clearing all storage:', error);
  }
};

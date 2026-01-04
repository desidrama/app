/**
 * Responsive Utility Functions
 * Provides responsive sizing, spacing, and typography based on viewport dimensions
 */

import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Breakpoints (in pixels)
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
};

// Base sizing (normalized to a base screen width of 375px for mobile)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Get current device category
 */
export const getDeviceCategory = (): 'mobile' | 'tablet' | 'desktop' => {
  const minDimension = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
  if (minDimension < BREAKPOINTS.tablet) return 'mobile';
  if (minDimension < BREAKPOINTS.desktop) return 'tablet';
  return 'desktop';
};

/**
 * Check if device is in landscape mode
 */
export const isLandscape = (): boolean => {
  return SCREEN_WIDTH > SCREEN_HEIGHT;
};

/**
 * Responsive width calculation
 * Scales value based on screen width relative to base width
 * @param size - Base size in pixels (for 375px base width)
 * @param min - Minimum size (optional)
 * @param max - Maximum size (optional)
 */
export const rw = (size: number, min?: number, max?: number): number => {
  const scaled = (size / BASE_WIDTH) * SCREEN_WIDTH;
  let result = scaled;
  if (min !== undefined) result = Math.max(result, min);
  if (max !== undefined) result = Math.min(result, max);
  return Math.round(result);
};

/**
 * Responsive height calculation
 * Scales value based on screen height relative to base height
 * @param size - Base size in pixels (for 812px base height)
 * @param min - Minimum size (optional)
 * @param max - Maximum size (optional)
 */
export const rh = (size: number, min?: number, max?: number): number => {
  const scaled = (size / BASE_HEIGHT) * SCREEN_HEIGHT;
  let result = scaled;
  if (min !== undefined) result = Math.max(result, min);
  if (max !== undefined) result = Math.min(result, max);
  return Math.round(result);
};

/**
 * Responsive font size with fluid scaling
 * Uses clamp-like behavior for typography
 * @param minSize - Minimum font size (mobile)
 * @param maxSize - Maximum font size (desktop)
 * @param baseSize - Base size at base width
 */
export const rf = (minSize: number, maxSize: number, baseSize?: number): number => {
  const device = getDeviceCategory();
  const base = baseSize || ((minSize + maxSize) / 2);
  
  if (device === 'mobile') {
    // Scale based on width for mobile
    const scale = SCREEN_WIDTH / BASE_WIDTH;
    return Math.round(Math.max(minSize, Math.min(maxSize, base * scale)));
  } else if (device === 'tablet') {
    // Moderate scaling for tablets
    const scale = Math.min(SCREEN_WIDTH / BREAKPOINTS.tablet, 1.2);
    return Math.round(minSize + (maxSize - minSize) * (scale - 1) * 0.5);
  } else {
    // Desktop: use max size with slight scaling for very large screens
    const scale = Math.min(SCREEN_WIDTH / BREAKPOINTS.desktop, 1.5);
    return Math.round(Math.min(maxSize * scale, maxSize * 1.2));
  }
};

/**
 * Responsive padding based on screen size
 * Returns appropriate padding value for the device category
 */
export const rp = (mobile: number, tablet?: number, desktop?: number): number => {
  const device = getDeviceCategory();
  if (device === 'desktop' && desktop !== undefined) {
    // Cap desktop padding to prevent excessive spacing on ultra-wide screens
    const maxPadding = Math.min(desktop, SCREEN_WIDTH * 0.08);
    return Math.round(maxPadding);
  }
  if (device === 'tablet' && tablet !== undefined) {
    return Math.round(tablet);
  }
  return Math.round(mobile);
};

/**
 * Percentage of screen width
 * @param percent - Percentage (0-100)
 */
export const wp = (percent: number): number => {
  return (SCREEN_WIDTH * percent) / 100;
};

/**
 * Percentage of screen height
 * @param percent - Percentage (0-100)
 */
export const hp = (percent: number): number => {
  return (SCREEN_HEIGHT * percent) / 100;
};

/**
 * Minimum touch target size (44x44px for mobile, smaller for desktop)
 */
export const getTouchTargetSize = (): number => {
  const device = getDeviceCategory();
  if (device === 'mobile') return 44;
  if (device === 'tablet') return 40;
  return 36;
};

/**
 * Calculate video container dimensions maintaining aspect ratio
 * @param aspectRatio - Video aspect ratio (width/height, e.g., 16/9)
 * @param maxWidthPercent - Maximum width as percentage of screen (default: 100)
 * @param maxHeightPercent - Maximum height as percentage of screen (default: 100)
 */
export const getVideoDimensions = (
  aspectRatio: number = 16 / 9,
  maxWidthPercent: number = 100,
  maxHeightPercent: number = 100
): { width: number; height: number } => {
  const device = getDeviceCategory();
  const isLandscapeMode = isLandscape();
  
  const maxWidth = wp(maxWidthPercent);
  const maxHeight = hp(maxHeightPercent);
  
  let width: number;
  let height: number;
  
  if (device === 'mobile' && !isLandscapeMode) {
    // Mobile portrait: use full width with margins
    width = SCREEN_WIDTH - rp(32, 48, 64); // Responsive side margins
    height = width / aspectRatio;
    
    // Ensure height doesn't exceed available space
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
  } else if (device === 'mobile' && isLandscapeMode) {
    // Mobile landscape: maximize height
    height = SCREEN_HEIGHT - rp(16, 24, 32); // Top/bottom margins
    width = height * aspectRatio;
    
    // Ensure width doesn't exceed screen
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
  } else if (device === 'tablet') {
    // Tablet: balanced approach
    if (isLandscapeMode) {
      height = SCREEN_HEIGHT * 0.85; // Use 85% of height
      width = height * aspectRatio;
      if (width > SCREEN_WIDTH * 0.9) {
        width = SCREEN_WIDTH * 0.9;
        height = width / aspectRatio;
      }
    } else {
      width = SCREEN_WIDTH * 0.9;
      height = width / aspectRatio;
      if (height > SCREEN_HEIGHT * 0.7) {
        height = SCREEN_HEIGHT * 0.7;
        width = height * aspectRatio;
      }
    }
  } else {
    // Desktop: center with comfortable margins
    const maxDesktopWidth = Math.min(SCREEN_WIDTH * 0.8, 1920); // Cap at 1920px
    width = maxDesktopWidth;
    height = width / aspectRatio;
    
    // Ensure height is reasonable
    if (height > SCREEN_HEIGHT * 0.85) {
      height = SCREEN_HEIGHT * 0.85;
      width = height * aspectRatio;
    }
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

/**
 * Get responsive spacing values for common use cases
 */
export const getSpacing = () => {
  const device = getDeviceCategory();
  
  return {
    xs: rp(4, 6, 8),
    sm: rp(8, 12, 16),
    md: rp(12, 16, 20),
    lg: rp(16, 24, 32),
    xl: rp(24, 32, 40),
    xxl: rp(32, 48, 64),
  };
};

/**
 * Get responsive border radius values
 */
export const getBorderRadius = () => {
  const device = getDeviceCategory();
  
  return {
    sm: rp(4, 6, 8),
    md: rp(8, 12, 16),
    lg: rp(12, 16, 20),
    xl: rp(16, 24, 32),
    full: 9999,
  };
};

/**
 * Scale value based on device density
 */
export const scale = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

// Export screen dimensions
export { SCREEN_WIDTH, SCREEN_HEIGHT };

export default {
  rw,
  rh,
  rf,
  rp,
  wp,
  hp,
  getDeviceCategory,
  isLandscape,
  getTouchTargetSize,
  getVideoDimensions,
  getSpacing,
  getBorderRadius,
  scale,
  BREAKPOINTS,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};


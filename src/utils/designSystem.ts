// Design System Constants
// Comprehensive UI/UX Design System based on premium dark theme

export const SPACING = {
  // 8px base unit for consistent spacing
  unit: 8,
  xs: 4,    // 0.5 units
  sm: 8,    // 1 unit
  md: 16,   // 2 units
  lg: 24,   // 3 units
  xl: 32,   // 4 units
  xxl: 48,  // 6 units
};

export const BORDER_RADIUS = {
  small: 8,      // Small elements
  medium: 12,    // Cards
  large: 16,     // Cards (alternative)
  button: 24,    // Buttons
  buttonLarge: 28, // Large buttons
  pill: 20,      // Pills/tags
  searchBar: 24, // Search bar
};

export const TYPOGRAPHY = {
  // Headings: Bold, 24-32px
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },
  // Body Text: Regular weight, 14-16px
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24, // 1.5x for readability
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 21, // 1.5x
  },
  // Labels: Medium weight, 12-14px
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  // Buttons
  button: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '700' as const,
    lineHeight: 20,
  },
};

export const SHADOWS = {
  // Card shadows
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  // Elevated surfaces
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  // Button press
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
};

export const ANIMATIONS = {
  // Transition durations
  fast: 150,
  medium: 300,
  slow: 400,
  // Easing
  easing: {
    easeInOut: 'ease-in-out',
    easeOut: 'ease-out',
  },
};

// Touch target minimum size (44x44px for accessibility)
export const TOUCH_TARGET_SIZE = 44;

// Button heights
export const BUTTON_HEIGHT = {
  small: 40,
  medium: 48,
  large: 52,
};


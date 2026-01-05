import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export type ThemeType = 'dark' | 'light';

export const darkColors = {
  // Primary Background: Deep charcoal black with subtle gradients
  background: '#0d0d0d',
  backgroundGradient: '#1a1a1a',
  // Secondary Background: Dark gray for cards and elevated surfaces
  surface: '#2a2a2a',
  surfaceElevated: '#333333',
  // Borders
  borderSubtle: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  // Accent Color: Vibrant yellow (#FFD700 to #FFC400 range)
  yellow: '#FFD700', // Primary vibrant yellow
  yellowBright: '#FFC400', // Slightly darker variant
  yellowDim: 'rgba(255, 215, 0, 0.15)',
  yellowGlow: 'rgba(255, 215, 0, 0.3)',
  // Error states
  error: '#F25F5C',
  // Text Colors
  textPrimary: '#FFFFFF', // Pure white for headings
  textSecondary: '#B0B0B0', // Light gray for body text
  textMuted: '#707070', // Medium gray for metadata
  textOnYellow: '#000000', // Dark text on yellow backgrounds
  // Progress indicators
  progressTrack: 'rgba(255, 255, 255, 0.15)',
  progressFill: '#FFD700',
};

export const lightColors = {
  background: '#FFFFFF',
  backgroundGradient: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  borderSubtle: 'rgba(0, 0, 0, 0.2)',
  borderLight: 'rgba(0, 0, 0, 0.25)',
  yellow: '#FFA500',
  yellowBright: '#FFB81C',
  yellowDim: 'rgba(255, 165, 0, 0.08)',
  yellowGlow: 'rgba(255, 165, 0, 0.15)',
  error: '#EF4444',
  textPrimary: '#000000',
  textSecondary: '#333333',
  textMuted: '#666666',
  textOnYellow: '#000000',
  progressTrack: '#F5F5F5',
  progressFill: '#FFA500',
};

interface ThemeContextType {
  theme: ThemeType;
  colors: typeof darkColors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('appTheme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  const colors = theme === 'dark' ? darkColors : lightColors;

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    AsyncStorage.setItem('appTheme', newTheme).catch((error) => {
      console.error('Error saving theme:', error);
    });
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Show loading screen while theme is being loaded
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: darkColors.background }]}>
        <ActivityIndicator size="large" color={darkColors.yellow} />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
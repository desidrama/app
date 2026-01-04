// FILE: src/components/SearchVideoCard.tsx
// Specialized VideoCard for Search Screen with beautified styling

import React from 'react';
import { Image, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { BORDER_RADIUS } from '../utils/designSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2; // 2 columns with padding and gap
const CARD_HEIGHT = CARD_WIDTH * 1.45; // Aspect ratio for video cards

interface SearchVideoCardProps {
  imageUrl: string;
  onPress: () => void;
}

export default function SearchVideoCard({
  imageUrl,
  onPress,
}: SearchVideoCardProps) {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: BORDER_RADIUS.large, // 16px radius
      overflow: 'hidden',
      backgroundColor: colors.surface,
      position: 'relative',
      ...(Platform.OS === 'ios' ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      } : {
        elevation: 8,
      }),
    },
  });

  return (
    <TouchableOpacity
      style={dynamicStyles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});


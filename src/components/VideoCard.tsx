// FILE: src/components/VideoCard.tsx

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../utils/designSystem';

interface VideoCardProps {
  title: string;
  imageUrl: string;
  episodeNumber?: number;
  seasonNumber?: number;
  seriesName?: string;
  genre?: string;
  onPress: () => void;
  hideTextOverlay?: boolean; // Hide text overlay for search screen
  showTitleBelow?: boolean; // Show title below card instead of on card
  cardWidth?: number; // Custom card width for grid layouts
}

export default function VideoCard({
  title,
  imageUrl,
  episodeNumber,
  seasonNumber,
  seriesName,
  genre,
  onPress,
  hideTextOverlay = false,
  showTitleBelow = false,
  cardWidth,
}: VideoCardProps) {
  const { colors } = useTheme();

  const cardW = cardWidth || 140;
  const cardH = cardW * 1.43; // Maintain aspect ratio

  const dynamicStyles = StyleSheet.create({
    container: {
      width: cardW,
      borderRadius: BORDER_RADIUS.large, // 16px radius for cards
      overflow: 'hidden',
      backgroundColor: colors.surface,
      position: 'relative',
      ...SHADOWS.card, // Subtle shadow/elevation
    },
    imageContainer: {
      width: '100%',
      height: cardH,
    },
    title: {
      ...TYPOGRAPHY.bodySmall,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
    },
    meta: {
      ...TYPOGRAPHY.labelSmall,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    badge: {
      position: 'absolute',
      bottom: SPACING.sm,
      left: SPACING.sm,
      backgroundColor: colors.yellow,
      borderRadius: BORDER_RADIUS.small,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
    },
    badgeText: {
      ...TYPOGRAPHY.labelSmall,
      fontWeight: '700',
      color: colors.textOnYellow,
    },
    titleBelow: {
      ...TYPOGRAPHY.bodySmall,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: SPACING.sm,
      textAlign: 'center',
    },
  });

  const badgeText = seasonNumber && episodeNumber 
    ? `S${seasonNumber} E${episodeNumber}`
    : episodeNumber 
    ? `EP ${episodeNumber}`
    : seasonNumber
    ? `S${seasonNumber}`
    : null;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={dynamicStyles.container}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={dynamicStyles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* Gradient overlay for badge readability */}
          {badgeText && (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)']}
              locations={[0.6, 1]}
              style={styles.gradientOverlay}
            />
          )}
          
          {/* Season/Episode badge */}
          {badgeText && (
            <View style={dynamicStyles.badge}>
              <Text style={dynamicStyles.badgeText}>{badgeText}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      {/* Title below card */}
      {showTitleBelow && (
        <Text style={dynamicStyles.titleBelow} numberOfLines={2}>
          {seriesName || title}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
});
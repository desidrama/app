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
  seriesName?: string;
  genre?: string;
  onPress: () => void;
}

export default function VideoCard({
  title,
  imageUrl,
  episodeNumber,
  seriesName,
  genre,
  onPress,
}: VideoCardProps) {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      width: 140,
      height: 200,
      borderRadius: BORDER_RADIUS.large, // 16px radius for cards
      overflow: 'hidden',
      backgroundColor: colors.surface,
      position: 'relative',
      ...SHADOWS.card, // Subtle shadow/elevation
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
      bottom: SPACING.md + 20, // Above text overlay
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
      
      {/* Gradient overlay for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
        locations={[0.5, 0.8, 1]}
        style={styles.gradientOverlay}
      />
      
      {/* Episode badge in bright yellow */}
      {episodeNumber && (
        <View style={dynamicStyles.badge}>
          <Text style={dynamicStyles.badgeText}>EP {episodeNumber}</Text>
        </View>
      )}
      
      {/* Text Overlay */}
      <View style={styles.textOverlay}>
        <Text style={dynamicStyles.title} numberOfLines={1}>
          {seriesName || title}
        </Text>
        {genre && (
          <Text style={dynamicStyles.meta} numberOfLines={1}>
            {genre}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  textOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.sm,
  },
});
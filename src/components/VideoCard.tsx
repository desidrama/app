// FILE: src/components/VideoCard.tsx

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      position: 'relative',
      elevation: 0,
      shadowOpacity: 0,
    },
    title: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    meta: {
      fontSize: 11,
      fontWeight: '400',
      color: colors.textSecondary,
    },
  });

  return (
    <TouchableOpacity
      style={dynamicStyles.container}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
      
      
      
      {/* Text Overlay */}
      <View style={styles.textOverlay}>
        <Text style={dynamicStyles.title} numberOfLines={1}>
          {title}
        </Text>
        {(seriesName || genre) && (
          <Text style={dynamicStyles.meta} numberOfLines={1}>
            {seriesName || ''}
            {seriesName && genre ? ' · ' : ''}
            {genre || ''}
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
  
  textOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
});
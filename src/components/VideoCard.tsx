// FILE: src/components/VideoCard.tsx

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const colors = {
  surface: '#14141F',
  textPrimary: '#F5F5FA',
  textSecondary: '#A5A5C0',
};

interface VideoCardProps {
  title: string;
  imageUrl: string;
  episodeNumber?: number;
  genre?: string;
  onPress: () => void;
}

export default function VideoCard({
  title,
  imageUrl,
  episodeNumber,
  genre,
  onPress,
}: VideoCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
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
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {(episodeNumber || genre) && (
          <Text style={styles.meta} numberOfLines={1}>
            {episodeNumber ? `Episode ${episodeNumber}` : ''}
            {episodeNumber && genre ? ' · ' : ''}
            {genre || ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
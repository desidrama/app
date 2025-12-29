// ============================================
// FILE: src/components/ContinueWatching.tsx
// ============================================

import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Design System Constants
const colors = {
  background: '#080812',
  surface: '#14141F',
  gold: '#F6C453',
  textPrimary: '#F5F5FA',
  textSecondary: '#A5A5C0',
  textMuted: '#6A6A82',
  progressTrack: 'rgba(255, 255, 255, 0.15)',
  progressFill: '#F6C453',
};

const spacing = {
  sectionGap: 28,
  continueCardWidth: 160,
  continueCardHeight: 220,
};

const radius = {
  card: 18,
};

interface ContinueWatchingItem {
  _id?: string;
  videoId: {
    _id: string;
    title: string;
    thumbnailUrl?: string;
    thumbnail?: string;
    episodeNumber?: number;
    duration?: number;
    genre?: string;
  };
  currentTime: number;
  progress: number;
  episodeNumber?: number;
}

interface ContinueWatchingProps {
  items: ContinueWatchingItem[];
  loading: boolean;
  onItemPress: (item: ContinueWatchingItem) => void;
}

const ContinueWatchingCard = ({ 
  item, 
  onPress 
}: { 
  item: ContinueWatchingItem; 
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const resumeScaleAnim = useRef(new Animated.Value(0.9)).current;
  const resumeOpacityAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(resumeScaleAnim, {
        toValue: 1.0,
        damping: 20,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.timing(resumeOpacityAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.0,
        damping: 20,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.spring(resumeScaleAnim, {
        toValue: 0.9,
        damping: 20,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.timing(resumeOpacityAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const videoData = item.videoId || {};
  const thumbnail = videoData.thumbnailUrl || videoData.thumbnail || 'https://picsum.photos/160/220';
  const episodeNumber = videoData.episodeNumber || item.episodeNumber;
  
  // Calculate progress
  const progress = item.progress 
    ? (item.progress > 1 ? item.progress / 100 : item.progress)
    : (item.currentTime && videoData.duration 
        ? item.currentTime / videoData.duration 
        : 0);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.cardWrapper}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={{ uri: thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />

        {/* Bottom Gradient - 40% height */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          locations={[0, 1]}
          style={styles.gradientOverlay}
        />

        {/* Bookmark Icon */}
        <TouchableOpacity 
          style={styles.bookmarkButton}
          onPress={(e) => {
            e.stopPropagation();
            // Handle bookmark action
          }}
        >
          <Ionicons name="bookmark-outline" size={18} color="#FFF" />
        </TouchableOpacity>

        {/* Episode Badge */}
        {episodeNumber && (
          <View style={styles.episodeBadge}>
            <Text style={styles.episodeBadgeText}>
              EP {episodeNumber}
            </Text>
          </View>
        )}

        {/* Content Overlay */}
        <View style={styles.contentOverlay}>
          <Text style={styles.seriesName} numberOfLines={1}>
            {videoData.title || 'Untitled'}
          </Text>
        </View>

        {/* Progress Bar - at bottom */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFillBar,
                { width: `${Math.min(progress * 100, 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Resume Play Button - Bottom-right corner */}
        <Animated.View
          style={[
            styles.resumeButtonContainer,
            {
              transform: [{ scale: resumeScaleAnim }],
              opacity: resumeOpacityAnim,
            },
          ]}
        >
          <View style={styles.resumeButton}>
            <Ionicons name="play" size={16} color="#FFFFFF" />
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function ContinueWatching({
  items,
  loading,
  onItemPress,
}: ContinueWatchingProps) {
  if (loading) {
    return (
      <View style={styles.wrapper}>
        <LinearGradient
          colors={[
            'rgba(58, 47, 38, 0.3)',
            'rgba(85, 66, 47, 0.2)',
            'rgba(8, 8, 18, 0.95)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradientContainer}
        >
          <View style={styles.content}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.gold} />
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[
          'rgba(13, 11, 0, 1)',
          'rgba(7, 4, 0, 1)',
          'rgba(8, 8, 18, 0.95)',
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientContainer}
      >
        <View style={styles.content}>
          {/* Header with arrow */}
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Continue Watching</Text>
            <TouchableOpacity style={styles.arrowButton}>
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Cards Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
            decelerationRate="fast"
          >
            {items.map((item, index) => {
              const key = item._id || `${item.videoId?._id}-${index}`;
              return (
                <ContinueWatchingCard
                  key={key}
                  item={item}
                  onPress={() => onItemPress(item)}
                />
              );
            })}
          </ScrollView>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    marginBottom: 0,
    borderRadius: 15,
    overflow: 'hidden', // Ensures rounded corners are clipped
  },
  gradientContainer: {
    width: '100%',
    paddingVertical: 20,
    paddingBottom: 24,
    
    overflow: 'hidden', // Ensures gradient respects border radius
  },
  content: {
    paddingLeft: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    height: spacing.continueCardHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    gap: 12,
    paddingRight: 16,
  },
  cardWrapper: {
    marginRight: 0,
  },
  card: {
    width: 140,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    position: 'relative',
    // Remove all shadow properties to prevent bad visual effects
  },
  thumbnail: {
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
  bookmarkButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
    zIndex: 10,
  },
  episodeBadge: {
    position: 'absolute',
    bottom: 28,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 5,
  },
  episodeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    zIndex: 5,
  },
  seriesName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 14,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  progressFillBar: {
    height: '100%',
    backgroundColor: colors.progressFill,
  },
  resumeButtonContainer: {
    position: 'absolute',
    bottom: 34,
    right: 8,
    zIndex: 15,
  },
  resumeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(246, 196, 83, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    // Removed shadow properties to prevent visual issues
  },
});
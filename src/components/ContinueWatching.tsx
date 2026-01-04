// ContinueWatching: Shows a horizontal list of videos the user can resume watching.

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../utils/designSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Grid card width for 3-column layout
const GRID_CARD_WIDTH = (SCREEN_WIDTH - SPACING.md * 2 - SPACING.sm * 2) / 3;
const GRID_CARD_HEIGHT = GRID_CARD_WIDTH * 1.43;

// Spacing constants for layout
const spacing = {
  sectionGap: 28,
  continueCardWidth: 160,
  continueCardHeight: 220,
};

// Border radius constants
const radius = {
  card: 18,
};

// Type for a single continue watching item
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
    seasonId?: {
      _id: string;
      title: string;
      seasonNumber?: number;
    } | string;
  };
  currentTime: number;
  progress: number;
  episodeNumber?: number;
}

// Props for ContinueWatching component
interface ContinueWatchingProps {
  items: ContinueWatchingItem[];
  loading: boolean;
  onItemPress: (item: ContinueWatchingItem) => void;
}

/**
 * ContinueWatchingCard: Card for a single continue watching video.
 */
const ContinueWatchingCard = ({ item, onPress }: { item: ContinueWatchingItem; onPress: () => void; }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const resumeScaleAnim = useRef(new Animated.Value(0.9)).current;
  const resumeOpacityAnim = useRef(new Animated.Value(0)).current;

  // Animate card and resume button on press in
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

  // Animate card and resume button on press out
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

  const { colors, theme } = useTheme();
  const videoData = item.videoId || {};
  const thumbnail = videoData.thumbnailUrl || videoData.thumbnail || 'https://picsum.photos/160/220';
  const episodeNumber = videoData.episodeNumber || item.episodeNumber;
  // Extract series name and season number from seasonId (can be object with title or just ID)
  const seasonNumber = videoData.seasonId && typeof videoData.seasonId === 'object' 
    ? (videoData.seasonId as any).seasonNumber || 1
    : 1;
  const seriesName = videoData.seasonId && typeof videoData.seasonId === 'object' 
    ? videoData.seasonId.title 
    : null;
  
  // Calculate progress for progress bar
  const progress = item.progress 
    ? (item.progress > 1 ? item.progress / 100 : item.progress)
    : (item.currentTime && videoData.duration 
        ? item.currentTime / videoData.duration 
        : 0);

  // Dynamic styles for this component
  const dynamicStyles = StyleSheet.create({
    card: {
      width: GRID_CARD_WIDTH,
      borderRadius: BORDER_RADIUS.large, // 16px radius for cards
      overflow: 'hidden',
      backgroundColor: colors.surface,
      position: 'relative',
      ...SHADOWS.card,
    },
    cardImageContainer: {
      width: '100%',
      height: GRID_CARD_HEIGHT,
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
    progressTrack: {
      height: 3, // Thin yellow progress bar
      backgroundColor: colors.progressTrack,
      overflow: 'hidden',
    },
    progressFillBar: {
      height: '100%',
      backgroundColor: colors.yellow, // Vibrant yellow
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
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            dynamicStyles.card,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={dynamicStyles.cardImageContainer}>
            <Image
              source={{ uri: thumbnail }}
              style={styles.thumbnail}
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

            {/* Season/Episode Badge */}
            {badgeText && (
              <View style={dynamicStyles.badge}>
                <Text style={dynamicStyles.badgeText}>{badgeText}</Text>
              </View>
            )}

            {/* Progress Bar - at bottom */}
            <View style={styles.progressBarContainer}>
              <View style={dynamicStyles.progressTrack}>
                <View
                  style={[
                    dynamicStyles.progressFillBar,
                    { width: `${Math.min(progress * 100, 100)}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
      
      {/* Title below card */}
      <Text style={dynamicStyles.titleBelow} numberOfLines={2}>
        {seriesName || videoData.title || 'Untitled'}
      </Text>
    </View>
  );
};

/**
 * ContinueWatching: Shows a horizontal scroll of videos the user can resume.
 */
export default function ContinueWatching({ items, loading, onItemPress }: ContinueWatchingProps) {
  const { colors, theme } = useTheme();
  
  // Dynamic styles for main component
  const dynamicStyles = StyleSheet.create({
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    arrowButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
  
  // Show loading indicator if loading
  if (loading) {
    return (
      <View style={[styles.wrapper, { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.large, overflow: 'hidden', marginHorizontal: SPACING.md, marginTop: SPACING.lg }]}>
        <View style={styles.content}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.yellow} />
          </View>
        </View>
      </View>
    );
  }

  // Don't render if no items
  if (!items || items.length === 0) {
    return null;
  }

  // Main render: section with header and grid layout of cards
  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.large, overflow: 'hidden', marginHorizontal: SPACING.md, marginTop: SPACING.lg }]}>
      <View style={styles.content}>
        {/* Header with arrow */}
        <View style={styles.header}>
          <Text style={dynamicStyles.sectionTitle}>Continue Watching</Text>
          <TouchableOpacity style={dynamicStyles.arrowButton}>
            <Ionicons name="chevron-forward" size={20} color={colors.yellow} />
          </TouchableOpacity>
        </View>

        {/* Cards Grid */}
        <View style={styles.gridContainer}>
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
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  content: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    height: GRID_CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    alignItems: 'center',
    width: GRID_CARD_WIDTH,
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
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 5,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    zIndex: 5,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
});
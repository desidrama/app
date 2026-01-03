// ContinueWatching: Shows a horizontal list of videos the user can resume watching.

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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

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
  // Extract series name from seasonId (can be object with title or just ID)
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
      width: 140,
      height: 200,
      borderRadius: 16, // 16px radius for cards
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
    episodeBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textOnYellow,
    },
    seriesName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 20,
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
    resumeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.yellow,
      justifyContent: 'center',
      alignItems: 'center',
      ...(Platform.OS === 'ios' ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      } : {
        elevation: 4,
      }),
    },
  });

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
          dynamicStyles.card,
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
          colors={theme === 'dark' 
            ? ['transparent', 'rgba(0,0,0,0.85)']
            : ['transparent', 'rgba(0,0,0,0.65)']}
          locations={[0, 1]}
          style={styles.gradientOverlay}
        />

        {/* Episode Badge */}
        {episodeNumber && (
          <View style={[styles.episodeBadge, { backgroundColor: colors.yellow }]}>
            <Text style={dynamicStyles.episodeBadgeText}>
              EP {episodeNumber}
            </Text>
          </View>
        )}

        {/* Content Overlay */}
        <View style={styles.contentOverlay}>
          <Text style={[dynamicStyles.seriesName, { color: '#FFFFFF' }]} numberOfLines={1}>
            {seriesName || videoData.title || 'Untitled'}
          </Text>
        </View>

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
          <View style={dynamicStyles.resumeButton}>
            <Ionicons name="play" size={16} color={theme === 'dark' ? '#1A1A1A' : '#FFFFFF'} />
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
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
      <View style={[styles.wrapper, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.background, colors.backgroundGradient, colors.background]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradientContainer}
        >
          <View style={styles.content}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.yellow} />
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Don't render if no items
  if (!items || items.length === 0) {
    return null;
  }

  // Main render: section with header and horizontal scroll of cards
  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surfaceElevated, borderRadius: 20, overflow: 'hidden' }]}>
      <LinearGradient
        colors={theme === 'dark' 
          ? [colors.yellow + '15', colors.yellow + '08', colors.yellow + '15']
          : [colors.yellow + '20', colors.yellow + '10', colors.yellow + '20']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        <View style={styles.content}>
          {/* Header with arrow */}
          <View style={styles.header}>
            <Text style={dynamicStyles.sectionTitle}>Continue Watching</Text>
            <TouchableOpacity style={dynamicStyles.arrowButton}>
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
    overflow: 'hidden',
  },
  gradientContainer: {
    width: '100%',
    paddingVertical: 20,
    paddingBottom: 24,
    overflow: 'hidden',
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
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
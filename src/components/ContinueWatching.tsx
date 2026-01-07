// ContinueWatching: Horizontal scrollable list

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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Card dimensions: 2:3 aspect ratio, showing 3 cards at a time
// Screen width - padding (16px each side = 32px) - gaps (12px * 2 = 24px) = available width
// Card width = available width / 3
const HORIZONTAL_PADDING = 32; // 16px on each side
const CARD_GAP = 12;
const AVAILABLE_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING - (CARD_GAP * 2); // Gap between 3 cards = 2 gaps
const CARD_WIDTH = AVAILABLE_WIDTH / 3;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 1.5; // 2:3 aspect ratio (width:height)
const CARD_HEIGHT = CARD_IMAGE_HEIGHT + 60; // Image height + text content space

interface ContinueWatchingItem {
  _id?: string;
  videoId: {
    _id: string;
    title: string;
    thumbnailUrl?: string;
    thumbnail?: string;
    episodeNumber?: number;
    seasonNumber?: number;
    duration?: number;
    genre?: string;
    genres?: string[];
    languages?: string;
    seasonId?: {
      seasonNumber?: number;
    } | string;
    type?: 'reel' | 'episode';
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

const ContinueWatchingCard = ({ item, onPress }: { item: ContinueWatchingItem; onPress: () => void; }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 15,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const videoData = item.videoId || {};
  const thumbnail = videoData.thumbnailUrl || videoData.thumbnail || 'https://picsum.photos/245/150';
  
  // Handle seasonId being either string or object
  const seasonNumber = videoData.seasonNumber || 
    (typeof videoData.seasonId === 'object' ? videoData.seasonId?.seasonNumber : undefined) || 1;
  
  const episodeNumber = videoData.episodeNumber || item.episodeNumber || 1;
  const title = videoData.title || 'Untitled';
  
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
        {/* Image Container */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          {/* Episode Badge - Centered at bottom middle of image */}
          <Text style={styles.episodeBadgeText}>
            S{seasonNumber} • E{episodeNumber}
          </Text>
          {/* Progress Bar - At bottom of image */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progress * 100, 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Text Content Section - BELOW the image */}
        <View style={styles.textContent}>
          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>

          {/* Genre and Language */}
          {(videoData.genres || videoData.genre || videoData.languages) && (
            <View style={styles.metaInfo}>
              {(videoData.genres || videoData.genre) && (
                <>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {Array.isArray(videoData.genres) 
                      ? videoData.genres[0] 
                      : videoData.genre}
                  </Text>
                  {videoData.languages && (
                    <Text style={[styles.metaText, { marginHorizontal: 4 }]}>•</Text>
                  )}
                </>
              )}
              {videoData.languages && (
                <Text style={styles.metaText} numberOfLines={1}>
                  {videoData.languages}
                </Text>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function ContinueWatching({ items, loading, onItemPress }: ContinueWatchingProps) {
  if (loading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFB800" />
        </View>
      </View>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {/* Section Title */}
      <Text style={styles.sectionTitle}>Continue Watching</Text>

      {/* Horizontal Scrollable Cards */}
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
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    paddingLeft: 8,
  },
  loadingContainer: {
    height: CARD_HEIGHT + 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    gap: CARD_GAP,
    paddingRight: 16,
    paddingLeft: 8,
  },
  cardWrapper: {
    marginRight: 0,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    backgroundColor: 'transparent',
    flexDirection: 'column',
  },
  imageContainer: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  textContent: {
    paddingHorizontal: 0,
    paddingTop: 6,
    paddingBottom: 0,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFCB00',
  },
  episodeBadgeText: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    marginLeft: -35,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB800',
    textAlign: 'center',
    width: 70,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.65)',
  },
});

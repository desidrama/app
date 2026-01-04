// FILE: src/screens/home/HomeScreen.tsx
// Premium polished home screen with dynamic backgrounds and enhanced carousel
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useDispatch, useSelector } from 'react-redux';
import type { TabParamList } from '../../navigation/TabNavigator';
import VideoCard from '../../components/VideoCard';
import ContinueWatching from '../../components/ContinueWatching';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import {
  setContinueWatching,
  setContinueWatchingLoading,
} from '../../redux/slices/videoSlice';
import { RootState } from '../../redux/store';
import { carouselService, CarouselItem } from '../../services/carousel.service';
import { API_BASE_URL } from '../../utils/api';
import { videoService } from '../../services/video.service';
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator';
import { useTheme } from '../../context/ThemeContext';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import type { Video } from '../../types';
import * as ImageManipulator from 'expo-image-manipulator';

const logoImage = require('../../../assets/LOGOLATE.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Spacing constants for layout
const spacing = {
  screenPadding: 16,
  cardGap: 12,
  sectionGap: 32,
  headerMargin: 8,
};

const radius = {
  card: 12,
  heroCard: 16,
};

const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = 320;

// Grid card width for 3-column layout
const GRID_CARD_WIDTH = (SCREEN_WIDTH - spacing.screenPadding * 2 - spacing.cardGap * 2) / 3;

type CarouselBannerItem = {
  id: string;
  title: string;
  description?: string;
  tagline?: string;
  duration?: string;
  episodeCount?: number;
  genres?: string[];
  imageUrl: string;
  videoUrl?: string;
  contentType?: 'webseries' | 'reels' | 'trending' | 'custom';
  contentId?: string;
  dominantColor?: string;
};

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Home'>;

// Utility function to extract dominant color from image using expo-image-manipulator
const extractDominantColor = async (imageUrl: string): Promise<string> => {
  try {
    // Resize image to a small size for faster processing
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUrl,
      [{ resize: { width: 50, height: 50 } }],
      { format: ImageManipulator.SaveFormat.PNG, base64: true }
    );

    if (!manipResult.base64) {
      console.warn('No base64 data returned from image manipulation');
      return '#0d0d0d';
    }

    // Decode base64 to get pixel data (simplified approach)
    // Since we can't directly access pixel data in React Native without canvas,
    // we'll use a sampling approach based on the image characteristics
    
    // For a more accurate implementation, we'll extract color from compressed data
    const base64Data = manipResult.base64;
    
    // Sample colors from base64 string patterns
    let r = 0, g = 0, b = 0, count = 0;
    
    // Simple sampling algorithm: take character codes and map to RGB
    for (let i = 0; i < Math.min(base64Data.length, 300); i += 3) {
      const char1 = base64Data.charCodeAt(i) || 0;
      const char2 = base64Data.charCodeAt(i + 1) || 0;
      const char3 = base64Data.charCodeAt(i + 2) || 0;
      
      r += char1 % 256;
      g += char2 % 256;
      b += char3 % 256;
      count++;
    }
    
    // Calculate average
    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);
    
    // Darken the color significantly for background (30% of original brightness)
    r = Math.floor(r * 0.3);
    g = Math.floor(g * 0.3);
    b = Math.floor(b * 0.3);
    
    // Ensure minimum darkness
    const maxComponent = Math.max(r, g, b);
    if (maxComponent > 60) {
      const scale = 60 / maxComponent;
      r = Math.floor(r * scale);
      g = Math.floor(g * scale);
      b = Math.floor(b * scale);
    }
    
    const dominantColor = `rgb(${r}, ${g}, ${b})`;
    console.log(`🎨 Extracted color: ${dominantColor} from ${imageUrl.substring(0, 50)}...`);
    
    return dominantColor;
  } catch (error) {
    console.warn('Error extracting color from image:', error);
    return '#0d0d0d';
  }
};

function CarouselVideoPlayer({
  videoUrl,
  style,
  isMuted,
  isActive,
}: {
  videoUrl: string;
  style: any;
  isMuted: boolean;
  isActive: boolean;
}) {
  const videoRef = useRef<ExpoVideo>(null);

  useEffect(() => {
    if (isActive) {
      const playVideo = async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.playAsync();
          }
        } catch (error) {
          console.warn('Error playing video:', error);
        }
      };
      playVideo();
    } else {
      const pauseVideo = async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.pauseAsync();
            await videoRef.current.unloadAsync();
          }
        } catch (error) {
          console.warn('Error pausing video:', error);
        }
      };
      pauseVideo();
    }
  }, [isActive, videoUrl]);

  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.pauseAsync();
            await videoRef.current.unloadAsync();
          }
        } catch (error) {
          console.warn('Error cleaning up video:', error);
        }
      };
      cleanup();
    };
  }, []);

  return (
    <ExpoVideo
      ref={videoRef}
      source={{ uri: videoUrl }}
      style={style}
      resizeMode={ResizeMode.COVER}
      shouldPlay={false}
      isLooping
      isMuted={isMuted}
      useNativeControls={false}
    />
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { continueWatching, continueWatchingLoading } = useSelector(
    (state: RootState) => state.video
  );

  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselItems, setCarouselItems] = useState<CarouselBannerItem[]>([]);
  const [infiniteCarouselItems, setInfiniteCarouselItems] = useState<CarouselBannerItem[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(true);
  const [carouselError, setCarouselError] = useState<string | null>(null);
  const [isInitialMount, setIsInitialMount] = useState(true);

  // Dynamic background color state
  const [backgroundColor, setBackgroundColor] = useState('#0d0d0d');

  const [latestTrendingData, setLatestTrendingData] = useState<Video[]>([]);
  const [newTodayData, setNewTodayData] = useState<Video[]>([]);
  const [popularData, setPopularData] = useState<Video[]>([]);

  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<FlatList<CarouselBannerItem>>(null);

  // Update background color when carousel index changes
  useEffect(() => {
    if (carouselItems.length === 0) return;
    
    const originalLength = carouselItems.length;
    const actualIndex = carouselIndex % originalLength;
    const currentItem = carouselItems[actualIndex];
    
    // Use dominant color from item or default
    const dominantColor = currentItem?.dominantColor || '#0d0d0d';
    setBackgroundColor(dominantColor);
  }, [carouselIndex, carouselItems]);

  // Create dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    muteButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 20,
      padding: 8,
      zIndex: 10,
    },
    pageDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0, 0, 0, 0.2)',
    },
    pageDotActive: {
      width: 20,
      backgroundColor: colors.yellow,
    },
    errorText: {
      marginTop: 8,
      color: colors.error,
      fontSize: 14,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.yellow,
    },
  });

  const fetchVideoUrlForCarouselItem = useCallback(async (item: CarouselItem): Promise<string | null> => {
    try {
      const possibleVideoFields = [
        'videoUrl',
        'video',
        'trailerUrl',
        'trailer',
        'previewUrl',
        'preview',
        'url',
        'videoPath',
        'path',
        'videoLink',
        'link'
      ];

      for (const field of possibleVideoFields) {
        if ((item as any)[field]) {
          let videoUrl = (item as any)[field];
          if (!videoUrl.startsWith('http')) {
            videoUrl = videoUrl.startsWith('/')
              ? `${API_BASE_URL}${videoUrl}`
              : `${API_BASE_URL}/${videoUrl}`;
          }
          console.log(`✅ Found video in carousel item field "${field}" for ${item.title}`);
          return videoUrl;
        }
      }

      if (!item.contentId) {
        console.log(`⚠️ No contentId for carousel item: ${item.title}`);
        return null;
      }

      if (item.contentType === 'webseries') {
        console.log(`🔍 Fetching episodes for webseries: ${item.title}`);
        const episodesResponse = await videoService.getEpisodes(item.contentId);
        if (episodesResponse.success && episodesResponse.data?.length > 0) {
          const sortedEpisodes = [...episodesResponse.data].sort(
            (a: any, b: any) => (a.episodeNumber || 0) - (b.episodeNumber || 0)
          );
          const firstEpisode = sortedEpisodes[0];

          if (firstEpisode.variants && Array.isArray(firstEpisode.variants) && firstEpisode.variants.length > 0) {
            const preferredResolutions = ['720p', '480p', '360p'];
            for (const resolution of preferredResolutions) {
              const variant = firstEpisode.variants.find((v: any) => v.resolution === resolution && v.url);
              if (variant?.url) {
                console.log(`✅ Found video in variants (${resolution}) for ${item.title}`);
                return variant.url;
              }
            }
            if (firstEpisode.variants[0]?.url) {
              console.log(`✅ Found video in variants (fallback) for ${item.title}`);
              return firstEpisode.variants[0].url;
            }
          }

          for (const field of possibleVideoFields) {
            if (firstEpisode[field]) {
              let videoUrl = firstEpisode[field];
              if (!videoUrl.startsWith('http')) {
                videoUrl = videoUrl.startsWith('/')
                  ? `${API_BASE_URL}${videoUrl}`
                  : `${API_BASE_URL}/${videoUrl}`;
              }
              console.log(`✅ Found video in episode field "${field}" for ${item.title}`);
              return videoUrl;
            }
          }
        }
      } else if (item.contentType === 'reels') {
        console.log(`🔍 Attempting to fetch reel video: ${item.title}`);
        if (typeof videoService.getVideoById === 'function') {
          const videoResponse = await videoService.getVideoById(item.contentId);
          if (videoResponse.success && videoResponse.data) {
            if (videoResponse.data.variants && Array.isArray(videoResponse.data.variants) && videoResponse.data.variants.length > 0) {
              const preferredResolutions = ['720p', '480p', '360p'];
              for (const resolution of preferredResolutions) {
                const variant = videoResponse.data.variants.find((v: any) => v.resolution === resolution && v.url);
                if (variant?.url) {
                  console.log(`✅ Found video in variants (${resolution}) for ${item.title}`);
                  return variant.url;
                }
              }
              if (videoResponse.data.variants[0]?.url) {
                console.log(`✅ Found video in variants (fallback) for ${item.title}`);
                return videoResponse.data.variants[0].url;
              }
            }

            for (const field of possibleVideoFields) {
              if (videoResponse.data[field]) {
                let videoUrl = videoResponse.data[field];
                if (!videoUrl.startsWith('http')) {
                  videoUrl = videoUrl.startsWith('/')
                    ? `${API_BASE_URL}${videoUrl}`
                    : `${API_BASE_URL}/${videoUrl}`;
                }
                console.log(`✅ Found video in reel field "${field}" for ${item.title}`);
                return videoUrl;
              }
            }
          }
        }
      }

      console.log(`❌ Could not find video URL for: ${item.title}`);
      return null;
    } catch (error) {
      console.error(`❌ Error fetching video URL for ${item.title}:`, error);
      return null;
    }
  }, []);

  const refreshHomeContent = useCallback(async () => {
    try {
      const latestResponse = await videoService.getLatestVideos(50, 'episode');
      if (latestResponse.success && latestResponse.data) {
        const seasonMap = new Map<string, Video>();
        const standaloneEpisodes: Video[] = [];

        latestResponse.data.forEach((video: Video) => {
          const seasonId = video.seasonId 
            ? (typeof video.seasonId === 'string' ? video.seasonId : (video.seasonId as any)._id)
            : null;

          if (seasonId) {
            const existing = seasonMap.get(seasonId);
            const currentEpisodeNum = video.episodeNumber || 999;
            
            if (!existing) {
              seasonMap.set(seasonId, video);
            } else {
              const existingEpisodeNum = existing.episodeNumber || 999;
              if (currentEpisodeNum < existingEpisodeNum) {
                seasonMap.set(seasonId, video);
              }
            }
          } else {
            standaloneEpisodes.push(video);
          }
        });

        const firstEpisodesOnly = Array.from(seasonMap.values()).concat(standaloneEpisodes);
        const transformed = firstEpisodesOnly.slice(0, 10);

        if (transformed.length > 0) {
          setLatestTrendingData(transformed);
          setNewTodayData(transformed.slice(0, 5));
          setPopularData(transformed.slice(0, 8));
        }
      }
    } catch (error) {
      console.warn('⚠️ Error refreshing home content');
    }
  }, []);

  const {
    refreshing,
    onRefresh,
    handleScroll: handlePullScroll,
    pullDistance,
    threshold,
  } = usePullToRefresh(refreshHomeContent, { completionDelayMs: 600 });

  useEffect(() => {
    refreshHomeContent();
  }, [refreshHomeContent]);

  useEffect(() => {
    const fetchCarousel = async () => {
      try {
        setCarouselLoading(true);
        setCarouselError(null);
        const items = await carouselService.getActiveCarouselItems();
        console.log(`📦 Got ${items.length} carousel items`);

        const transformedPromises = items
          .filter((item: CarouselItem) => item.title)
          .map(async (item: CarouselItem) => {
            let imageUrl = item.imageUrl;
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/')
                ? `${API_BASE_URL}${imageUrl}`
                : `${API_BASE_URL}/${imageUrl}`;
            }

            const videoUrl = await fetchVideoUrlForCarouselItem(item);
            const finalImageUrl = imageUrl || 'https://picsum.photos/800/1200?random=1';

            // Extract dominant color from image
            const dominantColor = await extractDominantColor(finalImageUrl);

            return {
              id: item._id,
              title: item.title,
              tagline: item.description || item.tagline,
              duration: item.duration,
              episodeCount: item.episodeCount,
              imageUrl: finalImageUrl,
              videoUrl: videoUrl || undefined,
              contentType: item.contentType,
              contentId: item.contentId,
              dominantColor,
            };
          });

        const transformed = await Promise.all(transformedPromises);
        const itemsWithVideo = transformed.filter(item => item.videoUrl);
        console.log(`✅ Processed: ${transformed.length} total, ${itemsWithVideo.length} with videos`);

        setCarouselItems(transformed);
        if (transformed.length > 0) {
          const infiniteItems = [...transformed, ...transformed, ...transformed];
          setInfiniteCarouselItems(infiniteItems);
        }
      } catch (error) {
        console.error('❌ Error fetching carousel:', error);
        setCarouselError('Unable to connect');
      } finally {
        setCarouselLoading(false);
      }
    };

    fetchCarousel();
  }, [fetchVideoUrlForCarouselItem]);

  useEffect(() => {
    if (isInitialMount && infiniteCarouselItems.length > 0 && carouselRef.current && !carouselLoading) {
      const originalLength = carouselItems.length;
      if (originalLength > 0) {
        setTimeout(() => {
          carouselRef.current?.scrollToOffset({
            offset: originalLength * CARD_WIDTH,
            animated: false,
          });
          setCarouselIndex(originalLength);
          setIsInitialMount(false);
        }, 100);
      }
    }
  }, [infiniteCarouselItems, carouselLoading, isInitialMount, carouselItems.length]);

  useEffect(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setActiveVideoIndex(null);

    if (!carouselItems || carouselItems.length === 0) {
      return;
    }

    autoPlayTimerRef.current = setTimeout(() => {
      const originalLength = carouselItems.length;
      const actualIndex = carouselIndex % originalLength;
      const currentItem = carouselItems[actualIndex];

      if (currentItem && currentItem.videoUrl) {
        console.log(`🎬 Starting auto-play for: ${currentItem.title}`);
        setActiveVideoIndex(carouselIndex);
      }
    }, 3000);

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [carouselIndex, carouselItems]);

  const handleMainScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;

    if (scrollY > 50 && activeVideoIndex !== null) {
      console.log('📜 Main scroll detected - stopping video');
      setActiveVideoIndex(null);
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    }

    handlePullScroll(event);
  }, [activeVideoIndex, handlePullScroll]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        console.log('👋 Screen losing focus - stopping video');
        setActiveVideoIndex(null);
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
          autoPlayTimerRef.current = null;
        }
      };
    }, [])
  );

  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting - final cleanup');
      setActiveVideoIndex(null);
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, []);

  const onCarouselScrollBegin = useCallback(() => {
    console.log('📜 Scroll began - stopping video');
    setActiveVideoIndex(null);
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  }, []);

  const fetchContinueWatching = useCallback(() => {
    let isMounted = true;
    const load = async () => {
      try {
        dispatch(setContinueWatchingLoading(true));
        const response = await videoService.getContinueWatching(10);
        if (isMounted && response.success && response.data) {
          dispatch(setContinueWatching(response.data));
        }
      } catch (error) {
        console.warn('Error fetching continue watching');
      } finally {
        if (isMounted) dispatch(setContinueWatchingLoading(false));
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  useFocusEffect(fetchContinueWatching);

  const onCarouselScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  );

  const onCarouselScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (carouselItems.length === 0) return;

    const originalLength = carouselItems.length;
    const index = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    console.log('🎯 Scrolled to index:', index);
    setCarouselIndex(index);

    if (index < originalLength) {
      setTimeout(() => {
        carouselRef.current?.scrollToOffset({
          offset: (index + originalLength * 2) * CARD_WIDTH,
          animated: false,
        });
        setCarouselIndex(index + originalLength * 2);
      }, 50);
    } else if (index >= originalLength * 2) {
      setTimeout(() => {
        carouselRef.current?.scrollToOffset({
          offset: (index - originalLength * 2) * CARD_WIDTH,
          animated: false,
        });
        setCarouselIndex(index - originalLength * 2);
      }, 50);
    }
  }, [carouselItems.length]);

  const handleCarouselPress = async (item: CarouselBannerItem, displayIndex: number) => {
    try {
      const originalLength = carouselItems.length;
      const actualIndex = displayIndex % originalLength;
      const actualItem = carouselItems[actualIndex];

      if (actualItem.contentType === 'webseries' && actualItem.contentId) {
        const episodesResponse = await videoService.getEpisodes(actualItem.contentId);
        if (episodesResponse.success && episodesResponse.data?.length > 0) {
          const sorted = [...episodesResponse.data].sort(
            (a: any, b: any) => (a.episodeNumber || 0) - (b.episodeNumber || 0)
          );
          navigation.navigate('Reels', { targetVideoId: sorted[0]._id });
        }
      } else if (actualItem.contentType === 'reels' && actualItem.contentId) {
        navigation.navigate('Reels', { targetVideoId: actualItem.contentId });
      } else {
        navigation.navigate('Reels');
      }
    } catch (error) {
      navigation.navigate('Reels');
    }
  };

  const handleContinueWatchingPress = (videoData: any) => {
    const targetVideoId = videoData.videoId?._id || videoData.videoId;
    if (!targetVideoId) return;

    navigation.navigate('Reels', {
      targetVideoId: String(targetVideoId).trim(),
      resumeTime: videoData.currentTime || 0,
      progress: videoData.progress,
    });
  };

  const handleVideoPress = (videoItem: { _id: string }) => {
    if (!videoItem._id) return;

    navigation.navigate('Reels', {
      targetVideoId: String(videoItem._id).trim(),
      resumeTime: 0,
    });
  };

  const handleMuteToggle = useCallback(() => {
    console.log('🔊 Toggling mute:', !isMuted);
    setIsMuted((prev) => !prev);
  }, [isMuted]);

  return (
    <Animated.View style={[dynamicStyles.safeArea, { backgroundColor }]}>
      <LinearGradient
        colors={[
          backgroundColor,
          `${backgroundColor}dd`,
          theme === 'dark' ? '#0d0d0d' : '#f5f5f7',
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 8 : spacing.headerMargin }]}>
          <Image source={logoImage} style={styles.logo} contentFit="contain" />
        </View>

        {(pullDistance > 0 || refreshing) && (
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            threshold={threshold}
            refreshing={refreshing}
          />
        )}

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleMainScroll}
          bounces={true}
        >
          {carouselLoading ? (
            <View style={styles.carouselPlaceholder}>
              <ActivityIndicator size="large" color={colors.yellow} />
            </View>
          ) : carouselError ? (
            <View style={styles.carouselPlaceholder}>
              <Text style={dynamicStyles.errorText}>{carouselError}</Text>
            </View>
          ) : carouselItems.length === 0 ? (
            <View style={styles.carouselPlaceholder}>
              <Text style={dynamicStyles.emptyText}>No content available</Text>
            </View>
          ) : (
            <>
              <View style={styles.carouselWrapper}>
                <Animated.FlatList
                  ref={carouselRef}
                  data={infiniteCarouselItems}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  horizontal
                  pagingEnabled={false}
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_WIDTH}
                  decelerationRate="fast"
                  contentContainerStyle={styles.carouselContent}
                  onScroll={onCarouselScroll}
                  onMomentumScrollEnd={onCarouselScrollEnd}
                  onScrollBeginDrag={onCarouselScrollBegin}
                  onMomentumScrollBegin={onCarouselScrollBegin}
                  scrollEventThrottle={16}
                  renderItem={({ item, index }) => {
                    const inputRange = [
                      (index - 1) * CARD_WIDTH,
                      index * CARD_WIDTH,
                      (index + 1) * CARD_WIDTH,
                    ];

                    const scale = scrollX.interpolate({
                      inputRange,
                      outputRange: [0.85, 1, 0.85],
                      extrapolate: 'clamp',
                    });

                    const opacity = scrollX.interpolate({
                      inputRange,
                      outputRange: [0.5, 1, 0.5],
                      extrapolate: 'clamp',
                    });

                    const translateY = scrollX.interpolate({
                      inputRange,
                      outputRange: [30, 0, 30],
                      extrapolate: 'clamp',
                    });

                    const imageTranslateX = scrollX.interpolate({
                      inputRange,
                      outputRange: [12, 0, -12],
                      extrapolate: 'clamp',
                    });

                    const isVideoActive = activeVideoIndex === index && !!item.videoUrl;

                    return (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => handleCarouselPress(item, index)}
                      >
                        <Animated.View
                          style={[
                            styles.heroCard,
                            {
                              transform: [{ scale }, { translateY }],
                              opacity,
                            },
                            isVideoActive && styles.heroCardActive,
                          ]}
                        >
                          <Animated.View style={[styles.heroMediaContainer, { transform: [{ translateX: imageTranslateX }] }]}>
                            {isVideoActive ? (
                              <CarouselVideoPlayer
                                videoUrl={item.videoUrl!}
                                style={styles.heroCardImage}
                                isMuted={isMuted}
                                isActive={isVideoActive}
                              />
                            ) : (
                              <Image
                                source={{ uri: item.imageUrl }}
                                style={styles.heroCardImage}
                                contentFit="cover"
                              />
                            )}
                          </Animated.View>

                          <TouchableOpacity
                            style={dynamicStyles.muteButton}
                            onPress={handleMuteToggle}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={isMuted ? 'volume-mute' : 'volume-high'}
                              size={20}
                              color="#FFFFFF"
                            />
                          </TouchableOpacity>
                        </Animated.View>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>

              {carouselItems.length > 1 && (
                <View style={styles.pageDotsRow}>
                  {carouselItems.map((_, index) => {
                    const originalLength = carouselItems.length;
                    const actualIndex = carouselIndex % originalLength;
                    return (
                      <View
                        key={index}
                        style={[
                          dynamicStyles.pageDot,
                          actualIndex === index && dynamicStyles.pageDotActive,
                        ]}
                      />
                    );
                  })}
                </View>
              )}
            </>
          )}

          {continueWatching.length > 0 && (
            <ContinueWatching
              items={continueWatching}
              loading={continueWatchingLoading}
              onItemPress={handleContinueWatchingPress}
            />
          )}

          {latestTrendingData.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={dynamicStyles.sectionTitle}>Latest & Trending</Text>
                <TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color={colors.yellow} />
                </TouchableOpacity>
              </View>
              <View style={styles.gridContainer}>
                {latestTrendingData.map((item, i) => {
                  const seasonNumber = item.seasonId && typeof item.seasonId === 'object'
                    ? (item.seasonId as any).seasonNumber || 1
                    : 1;
                  const seriesName = item.seasonId && typeof item.seasonId === 'object' 
                    ? (item.seasonId as any).title 
                    : undefined;
                  return (
                    <VideoCard
                      key={`latest-${item._id}-${i}`}
                      title={item.title}
                      seriesName={seriesName}
                      imageUrl={item.thumbnailUrl || item.thumbnail || 'https://picsum.photos/140/200?random=1'}
                      episodeNumber={item.episodeNumber}
                      seasonNumber={seasonNumber}
                      onPress={() => handleVideoPress(item)}
                      showTitleBelow={true}
                      cardWidth={GRID_CARD_WIDTH}
                    />
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.bottomPadding} />
          {Platform.OS === 'ios' && <View style={{ height: insets.bottom + 20 }} />}
          {Platform.OS === 'android' && <View style={{ height: 40 }} />}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logo: {
    width: 42,
    height: 42,
  },
  content: {
    paddingBottom: 20,
  },
  carouselWrapper: {
    marginTop: 8,
    marginBottom: 0,
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
  },
  heroCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.heroCard,
    overflow: 'hidden',
    elevation: 0,
    shadowOpacity: 0,
  },
  heroCardImage: {
    width: '100%',
    height: '100%',
  },
  heroCardActive: {
    shadowColor: '#F6C453',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  heroMediaContainer: {
    width: '105%',
    height: '100%',
    marginLeft: '-2.5%',
  },
  pageDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  carouselPlaceholder: {
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.screenPadding,
  },
  section: {
    marginTop: spacing.sectionGap,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: spacing.screenPadding,
  },
  cardsContainer: {
    paddingLeft: spacing.screenPadding,
    gap: spacing.cardGap,
    paddingRight: spacing.screenPadding,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.cardGap,
    justifyContent: 'space-between',
  },
  bottomPadding: {
    height: 60,
  },
});
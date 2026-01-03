// FILE: src/screens/home/HomeScreen.tsx
// Premium polished home screen with smooth animations and circular carousel
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
  RefreshControl,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
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

const logoImage = require('../../../assets/LOGOLATE.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Spacing constants for layout
const spacing = {
  screenPadding: 16,
  cardGap: 12,
  sectionGap: 28,
  headerMargin: 8,
};

const radius = {
  card: 12,
  heroCard: 16,
  button: 28,
  chip: 20,
  searchBar: 24,
};

const motion = {
  fast: 200,
  medium: 300,
  slow: 400,
};

const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = 320;

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
};

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Home'>;

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

  // Cleanup on unmount
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

  const [latestTrendingData, setLatestTrendingData] = useState<Video[]>([]);
  const [newTodayData, setNewTodayData] = useState<Video[]>([]);
  const [popularData, setPopularData] = useState<Video[]>([]);

  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<FlatList<CarouselBannerItem>>(null);
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const mainScrollY = useRef(new Animated.Value(0)).current;

  // Create dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    safeArea: {
      flex: 1
    },
    safeAreaInner: {
      flex: 1
    },
    container: {
      flex: 1
    },
    header: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 0,
      borderRadius: 0
    },
    content: {
      flex: 1
    },
    // Carousel and hero card styles
    chip: {
      backgroundColor: theme === 'dark' ? 'rgba(246, 196, 83, 0.25)' : 'rgba(255, 165, 0, 0.15)',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(246, 196, 83, 0.4)' : 'rgba(255, 165, 0, 0.3)',
    },
    chipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.yellow,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    heroTagline: {
      fontSize: 13,
      fontWeight: '400',
      color: theme === 'dark' ? '#A5A5C0' : '#666666',
      lineHeight: 18,
      textShadowColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    playingIndicator: {
      position: 'absolute',
      top: 12,
      left: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme === 'dark' ? 'rgba(246, 196, 83, 0.95)' : 'rgba(255, 165, 0, 0.9)',
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 6,
    },
    playingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme === 'dark' ? '#050509' : '#FFFFFF',
    },
    playingText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme === 'dark' ? '#050509' : '#FFFFFF',
      letterSpacing: 0.5,
    },
    bookmarkButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 20,
      padding: 8,
      zIndex: 10,
    },
    muteButton: {
      position: 'absolute',
      top: 12,
      right: 56,
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
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    seeAllText: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.textSecondary,
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
          console.log(`🔍 First episode data for ${item.title}:`, JSON.stringify(firstEpisode, null, 2));

          if (firstEpisode.variants && Array.isArray(firstEpisode.variants) && firstEpisode.variants.length > 0) {
            const preferredResolutions = ['720p', '480p', '360p'];
            for (const resolution of preferredResolutions) {
              const variant = firstEpisode.variants.find((v: any) => v.resolution === resolution && v.url);
              if (variant?.url) {
                console.log(`✅ Found video in variants (${resolution}) for ${item.title}: ${variant.url}`);
                return variant.url;
              }
            }
            if (firstEpisode.variants[0]?.url) {
              console.log(`✅ Found video in variants (fallback) for ${item.title}: ${firstEpisode.variants[0].url}`);
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
              console.log(`✅ Found video in episode field "${field}" for ${item.title}: ${videoUrl}`);
              return videoUrl;
            }
          }
          console.log(`⚠️ First episode has no video URL in any known field for ${item.title}`);
          console.log(`📋 Available fields in episode:`, Object.keys(firstEpisode));
        } else {
          console.log(`⚠️ No episodes found for ${item.title}`);
        }
      } else if (item.contentType === 'reels') {
        console.log(`🔍 Attempting to fetch reel video: ${item.title}`);
        if (typeof videoService.getVideoById === 'function') {
          const videoResponse = await videoService.getVideoById(item.contentId);
          if (videoResponse.success && videoResponse.data) {
            console.log(`🔍 Reel data:`, JSON.stringify(videoResponse.data, null, 2));

            if (videoResponse.data.variants && Array.isArray(videoResponse.data.variants) && videoResponse.data.variants.length > 0) {
              const preferredResolutions = ['720p', '480p', '360p'];
              for (const resolution of preferredResolutions) {
                const variant = videoResponse.data.variants.find((v: any) => v.resolution === resolution && v.url);
                if (variant?.url) {
                  console.log(`✅ Found video in variants (${resolution}) for ${item.title}: ${variant.url}`);
                  return variant.url;
                }
              }
              if (videoResponse.data.variants[0]?.url) {
                console.log(`✅ Found video in variants (fallback) for ${item.title}: ${videoResponse.data.variants[0].url}`);
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
        } else {
          console.log(`⚠️ videoService.getVideoById not available`);
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
      const latestResponse = await videoService.getLatestVideos(50, 'episode'); // Get more to filter properly
      if (latestResponse.success && latestResponse.data) {
        // Group episodes by seasonId and keep only the first episode of each series
        const seasonMap = new Map<string, Video>();
        const standaloneEpisodes: Video[] = [];

        latestResponse.data.forEach((video: Video) => {
          const seasonId = video.seasonId 
            ? (typeof video.seasonId === 'string' ? video.seasonId : (video.seasonId as any)._id)
            : null;

          if (seasonId) {
            // This is part of a web series
            const existing = seasonMap.get(seasonId);
            const currentEpisodeNum = video.episodeNumber || 999;
            
            if (!existing) {
              // First episode found for this season
              seasonMap.set(seasonId, video);
            } else {
              // Check if this episode has a lower episode number
              const existingEpisodeNum = existing.episodeNumber || 999;
              if (currentEpisodeNum < existingEpisodeNum) {
                seasonMap.set(seasonId, video);
              }
            }
          } else {
            // Standalone episode (no seasonId) - keep it
            standaloneEpisodes.push(video);
          }
        });

        // Combine first episodes of each series with standalone episodes
        const firstEpisodesOnly = Array.from(seasonMap.values()).concat(standaloneEpisodes);

        // Keep full Video objects, limit to 10 items
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

            return {
              id: item._id,
              title: item.title,
              tagline: item.description || item.tagline,
              duration: item.duration,
              episodeCount: item.episodeCount,
              imageUrl: imageUrl || 'https://picsum.photos/800/1200?random=1',
              videoUrl: videoUrl || undefined,
              contentType: item.contentType,
              contentId: item.contentId,
            };
          });

        const transformed = await Promise.all(transformedPromises);
        const itemsWithVideo = transformed.filter(item => item.videoUrl);
        console.log(`✅ Processed: ${transformed.length} total, ${itemsWithVideo.length} with videos`);

        if (itemsWithVideo.length > 0) {
          console.log(`🎥 Items with videos:`, itemsWithVideo.map(i => `${i.title} (${i.videoUrl?.substring(0, 50)}...)`));
        } else {
          console.warn(`⚠️ WARNING: No carousel items have videos. Auto-play will not work.`);
          console.warn(`💡 Check the episode data logs above to see what fields are available.`);
        }

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
      } else {
        console.log(`⚠️ No video URL for current item: ${currentItem?.title || 'unknown'}`);
      }
    }, 3000);

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [carouselIndex, carouselItems]);

  // Stop video when scrolling main content
  const handleMainScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;

    // Stop video if user scrolls down more than 50 pixels
    if (scrollY > 50 && activeVideoIndex !== null) {
      console.log('📜 Main scroll detected - stopping video');
      setActiveVideoIndex(null);
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    }

    // Call the pull-to-refresh scroll handler
    handlePullScroll(event);
  }, [activeVideoIndex, handlePullScroll]);

  // Stop video when screen loses focus or component unmounts
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Cleanup when screen loses focus
        console.log('👋 Screen losing focus - stopping video');
        setActiveVideoIndex(null);
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
          autoPlayTimerRef.current = null;
        }
      };
    }, [])
  );

  // Additional cleanup on unmount
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
    <LinearGradient
      colors={
        theme === 'dark'
          ? ['#050509', '#0a0a12', '#121218']
          : ['#f5f5f7', '#ffffff', '#f0f0f2']
      }
      style={dynamicStyles.safeArea}
    >
      <SafeAreaView style={dynamicStyles.safeAreaInner} edges={['top']}>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 8 : spacing.headerMargin }]}>
          <Image source={logoImage} style={styles.logo} resizeMode="contain" />
        </View>

        {(pullDistance > 0 || refreshing) && (
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            threshold={threshold}
            refreshing={refreshing}
          />
        )}

        <ScrollView
          style={dynamicStyles.container}
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
                    const originalLength = carouselItems.length;
                    const actualIndex = index % originalLength;

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

                    const getContentTypeLabel = () => {
                      if (item.contentType === 'webseries') {
                        return item.episodeCount ? `Series · ${item.episodeCount} eps` : 'Series';
                      } else if (item.contentType === 'reels') {
                        return item.duration || 'Short';
                      }
                      return 'Featured';
                    };

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
                                resizeMode="cover"
                              />
                            )}
                          </Animated.View>

                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
                            style={styles.heroGradientOverlay}
                          >
                            <View style={styles.heroMetaContainer}>
                              <View style={styles.chipContainer}>
                                <View style={dynamicStyles.chip}>
                                  <Text style={dynamicStyles.chipText}>{getContentTypeLabel()}</Text>
                                </View>
                                {item.genres && item.genres.length > 0 && (
                                  <View style={dynamicStyles.chip}>
                                    <Text style={dynamicStyles.chipText}>{item.genres[0]}</Text>
                                  </View>
                                )}
                              </View>

                              <Text style={styles.heroTitle} numberOfLines={2}>
                                {item.title}
                              </Text>

                              {item.tagline && (
                                <Text style={dynamicStyles.heroTagline} numberOfLines={2}>
                                  {item.tagline}
                                </Text>
                              )}
                            </View>
                          </LinearGradient>

                          {isVideoActive && (
                            <View style={dynamicStyles.playingIndicator}>
                              <View style={dynamicStyles.playingDot} />
                              <Text style={dynamicStyles.playingText}>Playing Preview</Text>
                            </View>
                          )}

                          {isVideoActive && (
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
                          )}
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

          {continueWatchingLoading ? (
            <View style={styles.section}>
              <ActivityIndicator size="small" color={colors.yellow} />
            </View>
          ) : (
            continueWatching.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={dynamicStyles.sectionTitle}>Continue Watching</Text>
                </View>
                <ContinueWatching
                  items={continueWatching}
                  loading={continueWatchingLoading}
                  onItemPress={handleContinueWatchingPress}
                />
              </View>
            )
          )}

          {latestTrendingData.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={dynamicStyles.sectionTitle}>Latest & Trending</Text>
                <Text style={dynamicStyles.seeAllText}>→</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardsContainer}
              >
                {latestTrendingData.map((item, i) => (
                  <VideoCard
                    key={`latest-${item._id}-${i}`}
                    title={item.title}
                    imageUrl={item.thumbnailUrl || item.thumbnail || 'https://picsum.photos/140/200?random=1'}
                    onPress={() => handleVideoPress(item)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.bottomPadding} />
          {Platform.OS === 'ios' && <View style={{ height: insets.bottom + 20 }} />}
          {Platform.OS === 'android' && <View style={{ height: 40 }} />}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  safeAreaInner: {
    flex: 1,
  },
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
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logoAccent: {},
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
  heroGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heroMetaContainer: {
    gap: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    paddingHorizontal: spacing.screenPadding,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardsContainer: {
    gap: spacing.cardGap,
  },
  bottomPadding: {
    height: 60,
  },
});
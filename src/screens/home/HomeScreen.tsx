// FILE: src/screens/home/HomeScreen.tsx
// Premium polished home screen with smooth animations and circular carousel
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Dimensions,
  SafeAreaView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useDispatch, useSelector } from 'react-redux';
import type { TabParamList } from '../../navigation/TabNavigator';
import VideoCard from '../../components/VideoCard';
import ContinueWatching from '../../components/ContinueWatching';
import { Video, ResizeMode } from 'expo-av';
import {
  setContinueWatching,
  setContinueWatchingLoading,
} from '../../redux/slices/videoSlice';
import { RootState } from '../../redux/store';
import { carouselService, CarouselItem } from '../../services/carousel.service';
import { API_BASE_URL } from '../../utils/api';
import { videoService } from '../../services/video.service';
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { Video as VideoType } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Premium Design System
const colors = {
  background: '#080812',
  surface: '#14141F',
  surfaceElevated: '#1A1A28',
  borderSubtle: 'rgba(35, 35, 52, 0.35)',
  borderLight: 'rgba(245, 245, 250, 0.24)',
  gold: '#F6C453',
  goldDim: 'rgba(246, 196, 83, 0.15)',
  error: '#F25F5C',
  textPrimary: '#F5F5FA',
  textSecondary: '#A5A5C0',
  textMuted: '#6A6A82',
  textOnGold: '#050509',
  progressTrack: 'rgba(255, 255, 255, 0.15)',
  progressFill: '#F6C453',
};

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
  tagline?: string; // ADD THIS
  duration?: string; // ADD THIS
  episodeCount?: number; // ADD THIS
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
  isMuted 
}: { 
  videoUrl: string; 
  style: any; 
  isMuted: boolean;
}) {
  const videoRef = useRef<Video>(null);

  useEffect(() => {
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

    return () => {
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
    };
  }, [videoUrl]);

  return (
    <Video
      ref={videoRef}
      source={{ uri: videoUrl }}
      style={style}
      resizeMode={ResizeMode.COVER}
      shouldPlay
      isLooping
      isMuted={isMuted}
      useNativeControls={false}
    />
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch();
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

  const [latestTrendingData, setLatestTrendingData] = useState<Array<any>>([]);
  const [newTodayData, setNewTodayData] = useState<Array<any>>([]);
  const [popularData, setPopularData] = useState<Array<any>>([]);

  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<FlatList<CarouselBannerItem>>(null);
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const mainScrollY = useRef(new Animated.Value(0)).current;
  const fetchVideoUrlForCarouselItem = useCallback(async (item: CarouselItem): Promise<string | null> => {
    try {
      const possibleVideoFields = [
        'videoUrl', 'video', 'trailerUrl', 'trailer', 
        'previewUrl', 'preview', 'url', 'videoPath', 
        'path', 'videoLink', 'link'
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
      const latestResponse = await videoService.getLatestVideos(10, 'episode');
      if (latestResponse.success && latestResponse.data) {
        const transformed = latestResponse.data.map((video: VideoType) => ({
          _id: (video as any)._id || String(Date.now()),
          title: video.title || 'Untitled',
          imageUrl: video.thumbnailUrl || video.thumbnail || 'https://picsum.photos/140/200?random=1',
        }));
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
  tagline: item.description || item.tagline, // ADD THIS
  duration: item.duration, // ADD THIS
  episodeCount: item.episodeCount, // ADD THIS
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
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeAreaInner}>
        <View style={styles.container}>
          <Animated.View style={[
  styles.header, 
  { 
    opacity: headerOpacity,
    transform: [{ translateY: headerTranslateY }]
  }
]}>
            <Text style={styles.logoText}>Digital <Text style={styles.logoAccent}>कलाकार</Text></Text>
          </Animated.View>

          {(pullDistance > 0 || refreshing) && (
            <PullToRefreshIndicator
              pullDistance={pullDistance}
              threshold={threshold}
              refreshing={refreshing}
              topOffset={Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 50 : 50}
            />
          )}

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handlePullScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="transparent"
                colors={['transparent']}
                progressViewOffset={-1000}
              />
            }
          >
            <View style={styles.carouselWrapper}>
              {carouselLoading ? (
                <View style={styles.carouselPlaceholder}>
                  <ActivityIndicator size="large" color={colors.gold} />
                </View>
              ) : carouselError ? (
                <View style={styles.carouselPlaceholder}>
                  <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
                  <Text style={styles.errorText}>{carouselError}</Text>
                </View>
              ) : carouselItems.length === 0 ? (
                <View style={styles.carouselPlaceholder}>
                  <Text style={styles.emptyText}>No content available</Text>
                </View>
              ) : (
                <>
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

  // NEW: Parallax effect for the image
  const imageTranslateX = scrollX.interpolate({
    inputRange,
    outputRange: [12, 0, -12],
    extrapolate: 'clamp',
  });

  const isVideoActive = activeVideoIndex === index && !!item.videoUrl;

  // Generate content type label
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
          // NEW: Glow effect when video is playing
          isVideoActive && styles.heroCardActive,
        ]}
      >
        {/* NEW: Parallax Image/Video Container */}
        <Animated.View 
          style={[
            styles.heroMediaContainer,
            { transform: [{ translateX: imageTranslateX }] }
          ]}
        >
          {isVideoActive ? (
            <CarouselVideoPlayer
              videoUrl={item.videoUrl!}
              style={styles.heroCardImage}
              isMuted={isMuted}
            />
          ) : (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.heroCardImage}
              resizeMode="cover"
            />
          )}
        </Animated.View>

        {/* NEW: Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']}
          locations={[0.4, 0.7, 1]}
          style={styles.heroGradientOverlay}
        >
          {/* NEW: Content Meta Container */}
          <View style={styles.heroMetaContainer}>
            {/* Content Type Chip */}
            <View style={styles.chipContainer}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{getContentTypeLabel()}</Text>
              </View>
              {item.genres && item.genres.length > 0 && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{item.genres[0]}</Text>
                </View>
              )}
            </View>

            {/* Title and Tagline */}
            <Text style={styles.heroTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.tagline && (
              <Text style={styles.heroTagline} numberOfLines={2}>
                {item.tagline}
              </Text>
            )}
          </View>
        </LinearGradient>

        {/* NEW: Playing Preview Indicator */}
        {isVideoActive && (
          <View style={styles.playingIndicator}>
            <View style={styles.playingDot} />
            <Text style={styles.playingText}>Playing Preview</Text>
          </View>
        )}

        <TouchableOpacity style={styles.bookmarkButton}>
          <Ionicons name="bookmark-outline" size={22} color="#FFF" />
        </TouchableOpacity>

        {isVideoActive && (
          <TouchableOpacity
            style={styles.muteButton}
            onPress={handleMuteToggle}
            activeOpacity={0.7}
            accessibilityLabel="Toggle sound"
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={22}
              color="#FFF"
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}}
                  />

                  {carouselItems.length > 1 && (
                    <View style={styles.pageDotsRow}>
                      {carouselItems.map((_, index) => {
                        const originalLength = carouselItems.length;
                        const actualIndex = carouselIndex % originalLength;
                        return (
                          <Animated.View
                            key={index}
                            style={[
                              styles.pageDot,
                              index === actualIndex && styles.pageDotActive,
                            ]}
                          />
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </View>

            <ContinueWatching
              items={continueWatching}
              loading={continueWatchingLoading}
              onItemPress={handleContinueWatchingPress}
            />

            {latestTrendingData.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Latest & Trending</Text>
                  <TouchableOpacity>
                    <Text style={styles.seeAllText}> →</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardsContainer}
                  decelerationRate="fast"
                >
                  {latestTrendingData.map((item, i) => (
                    <VideoCard
                      key={item._id || i}
                      title={item.title}
                      imageUrl={item.imageUrl}
                      onPress={() => handleVideoPress(item)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeAreaInner: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + spacing.headerMargin : spacing.headerMargin,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  logoAccent: {
    color: colors.gold,
  },
  content: {
    flex: 1,
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
    backgroundColor: colors.surface,
    elevation: 0,
    shadowOpacity: 0,
  },
  heroCardImage: {
    width: '100%',
    height: '100%',
  },
  heroCardActive: {
  shadowColor: colors.gold,
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
chip: {
  backgroundColor: 'rgba(246, 196, 83, 0.25)',
  borderRadius: 12,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: 'rgba(246, 196, 83, 0.4)',
},
chipText: {
  fontSize: 11,
  fontWeight: '600',
  color: colors.gold,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
},
heroTitle: {
  fontSize: 22,
  fontWeight: '800',
  color: colors.textPrimary,
  letterSpacing: 0.3,
  textShadowColor: 'rgba(0, 0, 0, 0.8)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
},
heroTagline: {
  fontSize: 13,
  fontWeight: '400',
  color: colors.textSecondary,
  lineHeight: 18,
  textShadowColor: 'rgba(0, 0, 0, 0.6)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
},
playingIndicator: {
  position: 'absolute',
  top: 12,
  left: 12,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(246, 196, 83, 0.95)',
  borderRadius: 16,
  paddingHorizontal: 10,
  paddingVertical: 6,
  gap: 6,
},
playingDot: {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: colors.background,
},
playingText: {
  fontSize: 11,
  fontWeight: '700',
  color: colors.background,
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
  pageDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  pageDotActive: {
    width: 20,
    backgroundColor: colors.gold,
  },
  carouselPlaceholder: {
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.screenPadding,
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
  cardsContainer: {
    gap: spacing.cardGap,
  },
  bottomPadding: {
    height: 100,
  },
});
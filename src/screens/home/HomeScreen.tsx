// HomeScreen: Netflix-style discovery UI matching exact design
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useDispatch, useSelector } from 'react-redux';
import type { TabParamList } from '../../navigation/TabNavigator';
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
import { useTheme } from '../../context/ThemeContext';
import ContinueWatching from '../../components/ContinueWatching';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Updated dimensions to match screenshot exactly
const HERO_HEIGHT = SCREEN_HEIGHT * 0.49;
const HERO_WIDTH = SCREEN_WIDTH * 0.75;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3.15;
const CARD_HEIGHT = 240;

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
  rating?: string;
  year?: string;
  category?: string;
  languages?: string;
};

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Home'>;

function CarouselVideoPlayer({ videoUrl, style, isMuted, isActive }: { videoUrl: string; style: any; isMuted: boolean; isActive: boolean; }) {
  const videoRef = useRef<Video>(null);

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
    <Video
      ref={videoRef}
      source={{ uri: videoUrl }}
      style={style}
      resizeMode={ResizeMode.COVER}
      shouldPlay={isActive}
      isLooping
      isMuted={isMuted}
      useNativeControls={false}
    />
  );
}

// Helper function to extract series name from title
const extractSeriesName = (title: string): string => {
  if (!title) return '';
  // Remove episode number patterns like "EPISODE 1", "EP 1", "E1", etc.
  return title
    .replace(/EPISODE\s*\d+/gi, '')
    .replace(/EP\s*\d+/gi, '')
    .replace(/E\d+/gi, '')
    .replace(/SEASON\s*\d+/gi, '')
    .replace(/S\d+/gi, '')
    .trim();
};

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { continueWatching, continueWatchingLoading } = useSelector(
    (state: RootState) => state.video
  );

  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [carouselScrollOffset, setCarouselScrollOffset] = useState(0);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselItems, setCarouselItems] = useState<CarouselBannerItem[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(true);
  const [carouselError, setCarouselError] = useState<string | null>(null);
  const [isCarouselLooping, setIsCarouselLooping] = useState(false);

  const [latestTrendingData, setLatestTrendingData] = useState<Array<any>>([]);

  const carouselRef = useRef<FlatList<CarouselBannerItem>>(null);

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
          return videoUrl;
        }
      }

      if (!item.contentId) return null;

      if (item.contentType === 'webseries') {
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
              if (variant?.url) return variant.url;
            }
            if (firstEpisode.variants[0]?.url) return firstEpisode.variants[0].url;
          }
          
          for (const field of possibleVideoFields) {
            if (firstEpisode[field]) {
              let videoUrl = firstEpisode[field];
              if (!videoUrl.startsWith('http')) {
                videoUrl = videoUrl.startsWith('/')
                  ? `${API_BASE_URL}${videoUrl}`
                  : `${API_BASE_URL}/${videoUrl}`;
              }
              return videoUrl;
            }
          }
        }
      } else if (item.contentType === 'reels') {
        if (typeof videoService.getVideoById === 'function') {
          const videoResponse = await videoService.getVideoById(item.contentId);
          if (videoResponse.success && videoResponse.data) {
            if (videoResponse.data.variants && Array.isArray(videoResponse.data.variants) && videoResponse.data.variants.length > 0) {
              const preferredResolutions = ['720p', '480p', '360p'];
              for (const resolution of preferredResolutions) {
                const variant = videoResponse.data.variants.find((v: any) => v.resolution === resolution && v.url);
                if (variant?.url) return variant.url;
              }
              if (videoResponse.data.variants[0]?.url) return videoResponse.data.variants[0].url;
            }
            
            for (const field of possibleVideoFields) {
              if (videoResponse.data[field]) {
                let videoUrl = videoResponse.data[field];
                if (!videoUrl.startsWith('http')) {
                  videoUrl = videoUrl.startsWith('/')
                    ? `${API_BASE_URL}${videoUrl}`
                    : `${API_BASE_URL}/${videoUrl}`;
                }
                return videoUrl;
              }
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error(`Error fetching video URL:`, error);
      return null;
    }
  }, []);

  const refreshHomeContent = useCallback(async () => {
    try {
      const latestResponse = await videoService.getLatestVideos(20, 'episode');
      if (latestResponse.success && latestResponse.data) {
        const transformed = latestResponse.data.map((video: VideoType) => ({
          _id: (video as any)._id || String(Date.now()),
          title: video.title || 'Untitled',
          imageUrl: video.thumbnailUrl || video.thumbnail || 'https://picsum.photos/160/240?random=1',
          seasonNumber: (video as any).seasonId?.seasonNumber || 1,
          episodeNumber: (video as any).episodeNumber || 1,
          genres: (video as any).genres || ['Drama'],
          languages: (video as any).languages || 'Hindi',
        }));
        if (transformed.length > 0) {
          setLatestTrendingData(transformed);
        }
      }
    } catch (error) {
      console.warn('Error refreshing home content');
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
              imageUrl: imageUrl || 'https://picsum.photos/400/600?random=1',
              videoUrl: videoUrl || undefined,
              contentType: item.contentType,
              contentId: item.contentId,
              rating: (item as any).rating || 'U/A',
              year: (item as any).year || '2025',
              category: (item as any).category || (item as any).genres?.[0] || 'Comedy',
              languages: (item as any).languages || 'Hindi',
            };
          });

        const transformed = await Promise.all(transformedPromises);
        setCarouselItems(transformed);
      } catch (error) {
        console.error('Error fetching carousel:', error);
        setCarouselError('Unable to connect');
      } finally {
        setCarouselLoading(false);
      }
    };

    fetchCarousel();
  }, [fetchVideoUrlForCarouselItem]);

  useEffect(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
    setActiveVideoIndex(null);

    if (!carouselItems || carouselItems.length === 0) return;

    autoPlayTimerRef.current = setTimeout(() => {
      const currentItem = carouselItems[carouselIndex];
      if (currentItem && currentItem.videoUrl) {
        setActiveVideoIndex(carouselIndex);
      }
    }, 3000);

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [carouselIndex, carouselItems]);

  // Auto-scroll carousel to middle set on mount for infinite loop
  useEffect(() => {
    if (carouselItems.length > 1 && carouselRef.current && !isCarouselLooping) {
      const timer = setTimeout(() => {
        carouselRef.current?.scrollToIndex({
          index: carouselItems.length,
          animated: false,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [carouselItems.length, isCarouselLooping]);

  const handleMainScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    
    if (scrollY > 50 && activeVideoIndex !== null) {
      setActiveVideoIndex(null);
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    }
    
    handlePullScroll(event);
  }, [activeVideoIndex, handlePullScroll]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setActiveVideoIndex(null);
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
        }
      };
    }, [])
  );

  const onCarouselScrollBegin = useCallback(() => {
    setActiveVideoIndex(null);
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
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

  const onCarouselMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (carouselItems.length === 0 || isCarouselLooping) return;
    
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / HERO_WIDTH);
    const originalIndex = index % carouselItems.length;
    setCarouselIndex(originalIndex);

    // Handle infinite loop: jump to middle set if at edges
    if (carouselItems.length > 1) {
      const firstSetEnd = carouselItems.length;
      const middleSetStart = carouselItems.length;
      const middleSetEnd = carouselItems.length * 2;
      const lastSetStart = carouselItems.length * 2;

      // If scrolled to first set (left edge), jump to middle set
      if (index < middleSetStart) {
        setIsCarouselLooping(true);
        setTimeout(() => {
          const jumpIndex = middleSetStart + originalIndex;
          carouselRef.current?.scrollToIndex({ index: jumpIndex, animated: false });
          setIsCarouselLooping(false);
        }, 50);
      } 
      // If scrolled to last set (right edge), jump to middle set
      else if (index >= lastSetStart) {
        setIsCarouselLooping(true);
        setTimeout(() => {
          const jumpIndex = middleSetStart + originalIndex;
          carouselRef.current?.scrollToIndex({ index: jumpIndex, animated: false });
          setIsCarouselLooping(false);
        }, 50);
      }
    }
  }, [carouselItems.length, isCarouselLooping]);

  const onCarouselScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCarouselScrollOffset(e.nativeEvent.contentOffset.x);
  }, []);

  const getCardScale = (itemIndex: number) => {
    const cardWidth = HERO_WIDTH;
    const centerOffset = carouselScrollOffset + SCREEN_WIDTH / 2;
    const itemStartPosition = 30 + itemIndex * cardWidth;
    const itemCenterPosition = itemStartPosition + HERO_WIDTH / 2;
    const distance = Math.abs(centerOffset - itemCenterPosition);
    const maxDistance = SCREEN_WIDTH / 1.8;
    const scale = Math.max(0.92, 1 - (distance / maxDistance) * 0.08);
    return scale;
  };

  const getCardTranslateY = (itemIndex: number) => {
    const cardWidth = HERO_WIDTH;
    const centerOffset = carouselScrollOffset + SCREEN_WIDTH / 2;
    const itemStartPosition = 30 + itemIndex * cardWidth;
    const itemCenterPosition = itemStartPosition + HERO_WIDTH / 2;
    const distance = Math.abs(centerOffset - itemCenterPosition);
    const maxDistance = SCREEN_WIDTH / 1.5;
    const translateY = Math.min((distance / maxDistance) * 60, 60);
    return translateY;
  };

  const handleCarouselPress = async (item: CarouselBannerItem) => {
    try {
      if (item.contentType === 'webseries' && item.contentId) {
        const episodesResponse = await videoService.getEpisodes(item.contentId);
        if (episodesResponse.success && episodesResponse.data?.length > 0) {
          const sorted = [...episodesResponse.data].sort(
            (a: any, b: any) => (a.episodeNumber || 0) - (b.episodeNumber || 0)
          );
          navigation.navigate('Reels', { targetVideoId: sorted[0]._id });
          return;
        }
      } else if (item.contentType === 'reels' && item.contentId) {
        navigation.navigate('Reels', { targetVideoId: item.contentId });
        return;
      }
      navigation.navigate('Reels');
    } catch (error) {
      navigation.navigate('Reels');
    }
  };

  const handleContinueWatchingPress = (item: any) => {
    const targetVideoId = item.videoId?._id || item.videoId;
    if (!targetVideoId) return;
    navigation.navigate('Reels', {
      targetVideoId: String(targetVideoId).trim(),
      resumeTime: item.currentTime || 0,
      progress: item.progress,
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
    setIsMuted((prev) => !prev);
  }, []);

  const getCurrentCarouselItem = () => {
    if (carouselItems.length === 0) return null;
    return carouselItems[carouselIndex] || carouselItems[0];
  };

  const currentItem = getCurrentCarouselItem();

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Dynamic Background */}
      <View style={StyleSheet.absoluteFill}>
        {currentItem && (
          <Image
            source={{ uri: currentItem.imageUrl }}
            style={StyleSheet.absoluteFill}
            blurRadius={80}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)', '#000000']}
          locations={[0, 0.3, 0.7]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Image 
              source={require('../../../assets/LOGOFINAL.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <TouchableOpacity>
              <Ionicons name="search" size={26} color="#FFCB00" />
            </TouchableOpacity>
          </View>

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
            onScroll={handleMainScroll}
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
            {/* Hero Carousel */}
            <View style={styles.heroSection}>
              {carouselLoading ? (
                <View style={styles.heroPlaceholder}>
                  <ActivityIndicator size="large" color="#FFB800" />
                </View>
              ) : carouselError ? (
                <View style={styles.heroPlaceholder}>
                  <Ionicons name="alert-circle-outline" size={32} color="#FF4444" />
                  <Text style={styles.errorText}>{carouselError}</Text>
                </View>
              ) : carouselItems.length === 0 ? (
                <View style={styles.heroPlaceholder}>
                  <Text style={styles.emptyText}>No content available</Text>
                </View>
              ) : (
                <>
                  <FlatList
                    ref={carouselRef}
                    data={carouselItems.length > 1 ? [...carouselItems, ...carouselItems, ...carouselItems] : carouselItems}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    horizontal
                    pagingEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={HERO_WIDTH}
                    decelerationRate={0.92}
                    contentContainerStyle={styles.heroCarousel}
                    scrollIndicatorInsets={{ right: 1 }}
                    onMomentumScrollEnd={onCarouselMomentumScrollEnd}
                    onScrollBeginDrag={onCarouselScrollBegin}
                    onScroll={onCarouselScroll}
                    scrollEventThrottle={8}
                    renderItem={({ item, index }) => {
                      const isVideoActive = activeVideoIndex === index && !!item.videoUrl;
                      const scale = getCardScale(index);
                      const translateY = getCardTranslateY(index);

                      return (
                        <TouchableOpacity
                          activeOpacity={0.95}
                          onPress={() => handleCarouselPress(item)}
                        >
                          <View style={[styles.heroCard, { transform: [{ scale }, { translateY }] }]}>
                            {isVideoActive ? (
                              <CarouselVideoPlayer
                                videoUrl={item.videoUrl!}
                                style={styles.heroImage}
                                isMuted={isMuted}
                                isActive={isVideoActive}
                              />
                            ) : (
                              <Image
                                source={{ uri: item.imageUrl }}
                                style={styles.heroImage}
                                resizeMode="cover"
                              />
                            )}

                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
                              locations={[0.45, 0.7, 1]}
                              style={styles.heroGradient}
                            />

                            {isVideoActive && (
                              <TouchableOpacity
                                style={styles.muteButton}
                                onPress={handleMuteToggle}
                              >
                                <View style={styles.muteButtonInner}>
                                  <Ionicons
                                    name={isMuted ? 'volume-mute' : 'volume-high'}
                                    size={20}
                                    color="#FFF"
                                  />
                                </View>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />

                  {carouselItems.length > 1 && (
                    <View style={styles.pageIndicators}>
                      {carouselItems.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.pageDot,
                            index === carouselIndex && styles.pageDotActive,
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Continue Watching Component */}
            {continueWatching.length > 0 && (
              <View style={styles.continueWatchingWrapper}>
                <ContinueWatching
                  items={continueWatching}
                  loading={continueWatchingLoading}
                  onItemPress={handleContinueWatchingPress}
                />
              </View>
            )}

            {/* New Releases */}
            {latestTrendingData.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>New Releases</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardRow}
                >
                  {latestTrendingData.slice(0, 10).map((item, i) => (
                    <TouchableOpacity
                      key={item._id || i}
                      onPress={() => handleVideoPress(item)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.contentCardWrapper}>
                        <View style={styles.imageContainer}>
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.contentCardImage}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={styles.textContent}>
                          <Text style={styles.contentCardTitle} numberOfLines={2}>
                            {extractSeriesName(item.title)}
                          </Text>
                          {(item.genres || item.languages) && (
                            <Text style={styles.contentCardGenre} numberOfLines={1}>
                              {item.genres?.[0]}, {item.languages}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Hindi Bullet */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hindi Bullet</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardRow}
              >
                {latestTrendingData.slice(0, 8).map((item, i) => (
                  <TouchableOpacity
                    key={item._id || `hindi-${i}`}
                    onPress={() => handleVideoPress(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.contentCardWrapper}>
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.contentCardImage}
                          resizeMode="cover"
                        />
                      </View>
                      <View style={styles.textContent}>
                        <Text style={styles.contentCardTitle} numberOfLines={1}>
                          {extractSeriesName(item.title)}
                        </Text>
                        {(item.genres || item.languages) && (
                          <Text style={styles.contentCardGenre} numberOfLines={1}>
                            {item.genres?.[0]}, {item.languages}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Bengali Bullet */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bengali Bullet</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardRow}
              >
                {latestTrendingData.slice(0, 8).map((item, i) => (
                  <TouchableOpacity
                    key={item._id || `bengali-${i}`}
                    onPress={() => handleVideoPress(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.contentCardWrapper}>
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.contentCardImage}
                          resizeMode="cover"
                        />
                      </View>
                      <View style={styles.textContent}>
                        <Text style={styles.contentCardTitle} numberOfLines={1}>
                          {extractSeriesName(item.title)}
                        </Text>
                        {(item.genres || item.languages) && (
                          <Text style={styles.contentCardGenre} numberOfLines={1}>
                            {item.genres?.[0]}, {item.languages}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Kannada Bullet */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kannada Bullet</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardRow}
              >
                {latestTrendingData.slice(0, 8).map((item, i) => (
                  <TouchableOpacity
                    key={item._id || `kannada-${i}`}
                    onPress={() => handleVideoPress(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.contentCardWrapper}>
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.contentCardImage}
                          resizeMode="cover"
                        />
                      </View>
                      <View style={styles.textContent}>
                        <Text style={styles.contentCardTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {(item.genres || item.languages) && (
                          <Text style={styles.contentCardGenre} numberOfLines={1}>
                            {item.genres?.[0]}, {item.languages}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoImage: {
    height: 130,
    width: 240,
    resizeMode: 'contain',
    marginLeft: -20,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    marginTop: -6,
    marginBottom: 28,
  },
  heroPlaceholder: {
    height: HERO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#FF4444',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  heroCarousel: {
    paddingHorizontal: (SCREEN_WIDTH - HERO_WIDTH) / 2,
    gap: 0,
    justifyContent: 'center',
  },
  heroCard: {
    width: HERO_WIDTH,
    height: HERO_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  watchNowContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  watchNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    gap: 6,
  },
  watchNowText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroMeta: {
    marginBottom: 6,
  },
  heroRating: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroLanguageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  heroLanguagePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroLanguageText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  muteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  muteButtonInner: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    gap: 6,
  },
  pageDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255, 203, 0, 0.3)',
  },
  pageDotActive: {
    width: 22,
    backgroundColor: '#FFCB00',
  },
  continueWatchingWrapper: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginBottom: 28,
    marginHorizontal: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  section: {
    marginTop: 28,
    paddingLeft: 16,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  cardRow: {
    gap: 12,
    paddingRight: 16,
  },
  contentCardWrapper: {
    width: CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  contentCardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A2A',
  },
  textContent: {
    padding: 8,
  },
  contentCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  contentCardGenre: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  contentCardInfo: {
    marginTop: 0,
  },
  contentCardMeta: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  cardGradient: {
    display: 'none',
  },
  overlayCardTitle: {
    display: 'none',
  },
});
// FILE: src/screens/home/HomeScreen.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';


import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  ImageBackground,
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
import VideoCard from '../../components/VideoCard';


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

type CarouselBannerItem = {
  id: string;
  title: string;
  imageUrl: string;
  contentType?: 'webseries' | 'reels' | 'trending' | 'custom';
  contentId?: string;
};

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('New & Hot');

  const dispatch = useDispatch();
  const { continueWatching, continueWatchingLoading } = useSelector(
    (state: RootState) => state.video
  );

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselItems, setCarouselItems] = useState<CarouselBannerItem[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(true);
  const [carouselError, setCarouselError] = useState<string | null>(null);
  const [carouselRawData, setCarouselRawData] = useState<CarouselItem[]>([]); // Store full carousel data

  const [latestTrendingData, setLatestTrendingData] = useState([
    { title: 'Series 1', imageUrl: 'https://picsum.photos/110/160?random=4' },
    { title: 'Series 2', imageUrl: 'https://picsum.photos/110/160?random=5' },
    { title: 'Series 3', imageUrl: 'https://picsum.photos/110/160?random=6' },
  ]);

  const refreshHomeContent = useCallback(async () => {
    try {
      // Fetch latest videos for "Latest & Trending" section
      const latestResponse = await videoService.getLatestVideos(10, 'episode');
      if (latestResponse.success && latestResponse.data) {
        const transformedLatest = latestResponse.data.map((video: VideoType) => ({
          title: video.title || 'Untitled',
          imageUrl: video.thumbnailUrl || video.thumbnail || 'https://picsum.photos/110/160?random=4',
        }));
        if (transformedLatest.length > 0) {
          setLatestTrendingData(transformedLatest);
        }
      }
    } catch (error: any) {
      const isNetworkError = error?.message === 'Network Error' || error?.code === 'ERR_NETWORK' || !error?.response;
      if (isNetworkError) {
        console.warn('⚠️ Network error while refreshing home content. Please check your connection and ensure the backend server is running.');
        console.warn('API Base URL:', API_BASE_URL);
      } else {
        console.error('Error refreshing home content:', {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        });
      }
      // Keep existing data on error - don't clear what we have
    }
  }, []);

  const {
    refreshing,
    onRefresh,
    handleScroll: handlePullScroll,
    pullDistance,
    threshold,
  } = usePullToRefresh(refreshHomeContent, { completionDelayMs: 600 });

  // Load initial data on mount
  useEffect(() => {
    refreshHomeContent();
  }, [refreshHomeContent]);


  const carouselRef = useRef<FlatList<CarouselBannerItem>>(null);


  // Fetch carousel data from API
  useEffect(() => {
    const fetchCarousel = async () => {
      try {
        setCarouselLoading(true);
        setCarouselError(null);
        const items = await carouselService.getActiveCarouselItems();
        
        // Store raw carousel data for navigation
        setCarouselRawData(items);

        // Transform API data to CarouselBannerItem format
        const transformedItems: CarouselBannerItem[] = items
          .filter((item: CarouselItem) => item.title) // Only include items with titles
          .map((item: CarouselItem) => {
            // Format image URL - if it's a relative path, prepend API base URL
            let imageUrl = item.imageUrl;
            if (imageUrl && imageUrl.trim() && !imageUrl.startsWith('http')) {
              // Handle relative paths (e.g., /uploads/filename.jpg)
              if (imageUrl.startsWith('/')) {
                imageUrl = `${API_BASE_URL}${imageUrl}`;
              } else {
                imageUrl = `${API_BASE_URL}/${imageUrl}`;
              }
            }

            // Use fallback only if no imageUrl is available
            if (!imageUrl || !imageUrl.trim()) {
              imageUrl = 'https://picsum.photos/800/1200?random=1';
            }

            return {
              id: item._id,
              title: item.title,
              imageUrl: imageUrl,
              contentType: item.contentType,
              contentId: item.contentId,
            };
          });

        setCarouselItems(transformedItems);
      } catch (error: any) {
        const isNetworkError = error?.message === 'Network Error' || error?.code === 'ERR_NETWORK' || !error?.response;
        if (isNetworkError) {
          console.warn('⚠️ Network error while fetching carousel. Please check your connection and ensure the backend server is running.');
          console.warn('API Base URL:', API_BASE_URL);
          setCarouselError('Unable to connect to server. Please check your internet connection.');
        } else {
          console.error('Failed to fetch carousel:', {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
          });
          setCarouselError(error?.response?.data?.message || error?.message || 'Failed to load carousel');
        }
        // Fallback to empty array or keep previous data
        setCarouselItems([]);
      } finally {
        setCarouselLoading(false);
      }
    };

    fetchCarousel();
  }, []);

  // Fetch continue watching videos whenever the Home tab gains focus
  const fetchContinueWatching = useCallback(() => {
    let isMounted = true;

    const load = async () => {
      try {
        dispatch(setContinueWatchingLoading(true));
        const response = await videoService.getContinueWatching(10);
        if (isMounted && response.success && response.data) {
          dispatch(setContinueWatching(response.data));
        }
      } catch (error: any) {
        const isNetworkError = error?.message === 'Network Error' || error?.code === 'ERR_NETWORK' || !error?.response;
        if (isNetworkError) {
          console.warn('⚠️ Network error while fetching continue watching. Please check your connection and ensure the backend server is running.');
        } else {
          console.error('Error fetching continue watching:', {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data,
          });
        }
        // Keep existing continue watching data on error
      } finally {
        if (isMounted) {
          dispatch(setContinueWatchingLoading(false));
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  useFocusEffect(fetchContinueWatching);

  useEffect(() => {
    const n = carouselItems.length;
    if (n <= 1) return;

    const interval = setInterval(() => {
      const next = (carouselIndex + 1) % n;
      carouselRef.current?.scrollToIndex({ index: next, animated: true });
      setCarouselIndex(next);
    }, 4000);

    return () => clearInterval(interval);
  }, [carouselIndex, carouselItems.length]);

  const onCarouselScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const bannerWidth = SCREEN_WIDTH - 32; // Account for padding
    const viewIndex = Math.round(x / bannerWidth);
    setCarouselIndex(viewIndex);
  };

  const getCarouselItemLayout = (data: ArrayLike<CarouselBannerItem> | null | undefined, index: number) => {
    const bannerWidth = SCREEN_WIDTH - 32;
    return {
      length: bannerWidth,
      offset: bannerWidth * index,
      index,
    };
  };

  // Handle carousel banner click
  const handleCarouselPress = async (item: CarouselBannerItem) => {
    try {
      // If it's a webseries, navigate to first episode
      if (item.contentType === 'webseries' && item.contentId) {
        // Fetch episodes for this season
        const episodesResponse = await videoService.getEpisodes(item.contentId);
        
        if (episodesResponse.success && episodesResponse.data && episodesResponse.data.length > 0) {
          // Sort episodes by episodeNumber and get the first one
          const sortedEpisodes = [...episodesResponse.data].sort(
            (a: any, b: any) => (a.episodeNumber || 0) - (b.episodeNumber || 0)
          );
          const firstEpisode = sortedEpisodes[0];
          
          // Navigate to Reels tab and pass the episode ID
          // The ReelsFeedScreen will need to handle this initial video
          if (navigation) {
            navigation.navigate('Reels', {
              targetVideoId: firstEpisode._id,
            });
          }
        } else {
          console.warn('No episodes found for season:', item.contentId);
        }
      } else if (item.contentType === 'reels' && item.contentId) {
        // For reels, navigate directly to that video
        if (navigation) {
          navigation.navigate('Reels', {
            targetVideoId: item.contentId,
          });
        }
      } else {
        // For other types (trending, custom), just navigate to Reels tab
        if (navigation) {
          navigation.navigate('Reels');
        }
      }
    } catch (error) {
      console.error('Error handling carousel press:', error);
      // Fallback: just navigate to Reels tab
      if (navigation) {
        navigation.navigate('Reels');
      }
    }
  };

  const handleContinueWatchingPress = (videoData: any) => {
    console.log(`🖱️🖱️🖱️ BUTTON PRESSED - handleContinueWatchingPress called`);
    console.log(`📦 Raw videoData:`, JSON.stringify(videoData, null, 2));
    
    // Get the exact video ID from the continue watching data
    const rawVideoId = videoData.videoId?._id || videoData.videoId;
    const targetVideoId = rawVideoId ? String(rawVideoId).trim() : null;
    const resumeTime = videoData.currentTime || 0;
    
    console.log(`🎯🎯🎯 CLICKED CONTINUE WATCHING:`);
    console.log(`   Raw Video ID: ${rawVideoId}`);
    console.log(`   Processed Video ID: ${targetVideoId}`);
    console.log(`   Title: ${videoData.videoId?.title}`);
    console.log(`   Resume Time: ${resumeTime}s`);
    
    if (!targetVideoId) {
      console.error(`❌ No targetVideoId found in videoData:`, videoData);
      return;
    }
    
    // Send user to Reels tab with target video + resume info
    const params = {
      targetVideoId: targetVideoId,
      resumeTime: resumeTime,
      progress: videoData.progress,
    };
    
    console.log(`🚀 Navigating to Reels with params:`, JSON.stringify(params, null, 2));
    
    // Navigate to Reels tab
    navigation.navigate('Reels', params);
    
    console.log(`✅ Navigation called to Reels tab with targetVideoId: ${targetVideoId}`);
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050509" />
      <SafeAreaView style={styles.safeAreaInner}>
        <View style={styles.container}>
          {/* Header with Brand + Search */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.brandDigital}>Digital</Text>
              <Text style={styles.brandKalakar}> कलाकार</Text>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={18}
                color="#C8C8C8"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor="#A0A0A0"
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.micButton}>
                <Ionicons name="mic-outline" size={18} color="#F5F5F5" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pull-to-Refresh Indicator */}
          {(pullDistance > 0 || refreshing) && (
            <PullToRefreshIndicator
              pullDistance={pullDistance}
              threshold={threshold}
              refreshing={refreshing}
              topOffset={
                Platform.OS === 'android' 
                  ? (StatusBar.currentHeight || 0) + 16 + 14 + 40 + 12 + 8
                  : 16 + 14 + 40 + 12 + 8
              }
            />
          )}

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handlePullScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#050509"
                colors={['#050509']}
                progressViewOffset={-1000}
              />
            }
          >
            {/* Category Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContainer}
            >
              {['New & Hot', 'Popular', 'Originals', 'Categories'].map((cat) => {
                const isActive = cat === activeCategory;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                    onPress={() => setActiveCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isActive && styles.categoryTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Carousel Banner */}
            <View style={styles.carouselWrapper}>
              {carouselLoading ? (
                <View style={styles.carouselLoadingContainer}>
                  <ActivityIndicator size="large" color="#FFD54A" />
                  <Text style={styles.carouselLoadingText}>Loading featured content...</Text>
                </View>
              ) : carouselError ? (
                <View style={styles.carouselErrorContainer}>
                  <Ionicons name="alert-circle-outline" size={24} color="#FF6B6B" />
                  <Text style={styles.carouselErrorText}>{carouselError}</Text>
                </View>
              ) : carouselItems.length === 0 ? (
                <View style={styles.carouselEmptyContainer}>
                  <Text style={styles.carouselEmptyText}>No featured content available</Text>
                </View>
              ) : (
                <>
                  <FlatList
                    ref={carouselRef}
                    data={carouselItems}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    getItemLayout={getCarouselItemLayout}
                    onMomentumScrollEnd={onCarouselScrollEnd}
                    decelerationRate="fast"
                    contentContainerStyle={styles.carouselContentContainer}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.carouselBanner}
                        activeOpacity={0.9}
                        onPress={() => handleCarouselPress(item)}
                      >
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.carouselBannerImage}
                          resizeMode="cover"
                        />
                        <View style={styles.carouselBannerOverlay} />
                        <View style={styles.carouselBannerContent}>
                          <Text style={styles.carouselBannerTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />

                  {/* Dots Indicator */}
                  {carouselItems.length > 1 && (
                    <View style={styles.carouselDotsRow}>
                      {carouselItems.map((_, index) => {
                        const isActive = index === carouselIndex;
                        return (
                          <View
                            key={index}
                            style={[styles.carouselDot, isActive && styles.carouselDotActive]}
                          />
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Continue Watching</Text>
                <Text style={styles.sectionSubtitle}>
                  Pick up exactly where you left off
                </Text>

                <View style={{ height: 12 }} />

                {continueWatchingLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFD54A" />
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    contentContainerStyle={styles.horizontalScrollContainer}
                    style={styles.horizontalScrollView}
                    nestedScrollEnabled={true}
                    bounces={true}
                    decelerationRate="fast"
                    snapToInterval={120}
                    snapToAlignment="start"
                  >
                    {continueWatching.map((item, index) => {
                      // Use a combination of _id and videoId._id to ensure uniqueness
                      const uniqueKey = item._id 
                        ? `continue-${item._id}` 
                        : `continue-${item.videoId._id}-${index}`;
                      return (
                        <TouchableOpacity
                          key={uniqueKey}
                          onPress={() => {
                            console.log(`🖱️ TOUCHABLE OPACITY PRESSED for video: ${item.videoId?.title || 'Unknown'}`);
                            handleContinueWatchingPress(item);
                          }}
                          style={styles.videoCardWrapper}
                          activeOpacity={0.8}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <View style={styles.progressCardContainer} pointerEvents="box-none">
                            <View pointerEvents="none">
                              <VideoCard
                                title={item.videoId.title}
                                imageUrl={item.videoId.thumbnailUrl}
                              />
                            </View>
                            {/* Progress Bar */}
                            <View style={styles.progressBar}>
                              <View
                                style={[
                                  styles.progressFill,
                                  { width: `${Math.min(item.progress, 100)}%` },
                                ]}
                              />
                            </View>
                            {/* Time Badge */}
                            <View style={styles.timeBadge}>
                              <Text style={styles.timeBadgeText}>
                                {Math.floor(item.currentTime)}s
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Latest & Trending */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Latest & Trending</Text>
                  <Text style={styles.sectionSubtitle}>
                    Fresh drops from top creators
                  </Text>
                </View>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 12 }} />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContainer}
              >
                {latestTrendingData.map((item, i) => (
                  <View key={i} style={styles.videoCardWrapper}>
                    <VideoCard
                      title={item.title}
                      imageUrl={item.imageUrl}
                      onPress={() => {}}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ================== STYLES ==================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050509',
  },
  safeAreaInner: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#050509',
  },

  // HEADER
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 12) : 16,
    paddingBottom: 12,
    backgroundColor: '#050509',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandDigital: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  brandKalakar: {
    color: '#FFD54A',
    fontSize: 24,
    fontWeight: '900',
    marginLeft: 4,
  },

  // SEARCH BAR
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#221107',
    borderRadius: 26,
    paddingHorizontal: 14,
    height: 40,
    borderWidth: 1,
    borderColor: '#332016',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  micButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    flex: 1,
  },

  // CATEGORY TABS
  categoryScrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  categoryTab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginRight: 10,
    borderRadius: 999,
    backgroundColor: '#15151C',
  },
  categoryTabActive: {
    backgroundColor: '#FFD54A',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A0A0A7',
  },
  categoryTextActive: {
    color: '#000',
  },

  // CAROUSEL BANNER
  carouselWrapper: {
    marginTop: 8,
    marginBottom: 16,
  },
  carouselContentContainer: {
    paddingHorizontal: 16,
  },
  carouselBanner: {
    width: SCREEN_WIDTH - 32,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#15151C',
  },
  carouselBannerImage: {
    width: '100%',
    height: '100%',
  },
  carouselBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  carouselBannerContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 16,
  },
  carouselBannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#555',
    marginHorizontal: 4,
  },
  carouselDotActive: {
    width: 14,
    borderRadius: 4,
    backgroundColor: '#FFD54A',
  },

  // SECTIONS
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#A5A5AB',
  },
  seeAllText: {
    fontSize: 13,
    color: '#A5A5AB',
  },
  horizontalScrollView: {
    flexGrow: 0,
  },
  horizontalScrollContainer: {
    paddingRight: 16,
    paddingLeft: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  videoCardWrapper: {
    marginRight: 10,
    flexShrink: 0,
  },
  progressCardContainer: {
    position: 'relative',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD54A',
    borderRadius: 2,
  },
  timeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD54A',
  },
  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bottomPadding: {
    height: 100, // ensures content rises above fixed bottom nav bar
  },

  // CAROUSEL LOADING/ERROR STATES
  carouselLoadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  carouselLoadingText: {
    marginTop: 12,
    color: '#A5A5AB',
    fontSize: 14,
  },
  carouselErrorContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  carouselErrorText: {
    marginTop: 8,
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
  },
  carouselEmptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  carouselEmptyText: {
    color: '#A5A5AB',
    fontSize: 14,
  },
});

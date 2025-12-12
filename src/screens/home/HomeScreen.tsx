// FILE: src/screens/home/HomeScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
import VideoCard from '../../components/VideoCard';
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

export default function HomeScreen({ navigation }: any) {
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('New & Hot');

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
    } catch (error) {
      console.error('Error refreshing home content:', error);
      // Keep existing data on error
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
        console.error('Failed to fetch carousel:', error);
        setCarouselError(error.message || 'Failed to load carousel');
        // Fallback to empty array or keep previous data
        setCarouselItems([]);
      } finally {
        setCarouselLoading(false);
      }
    };

    fetchCarousel();
  }, []);

  const continueWatchingData = [
    { title: 'Jurassic Park', imageUrl: 'https://picsum.photos/110/160?random=1' },
    { title: 'Oldboy', imageUrl: 'https://picsum.photos/110/160?random=2' },
    { title: 'John Wick', imageUrl: 'https://picsum.photos/110/160?random=3' },
  ];

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
            navigation.navigate('Main', {
              screen: 'Reels',
              params: {
                initialVideoId: firstEpisode._id,
                initialSeasonId: item.contentId,
              },
            });
          }
        } else {
          console.warn('No episodes found for season:', item.contentId);
        }
      } else if (item.contentType === 'reels' && item.contentId) {
        // For reels, navigate directly to that video
        if (navigation) {
          navigation.navigate('Main', {
            screen: 'Reels',
            params: {
              initialVideoId: item.contentId,
            },
          });
        }
      } else {
        // For other types (trending, custom), just navigate to Reels tab
        if (navigation) {
          navigation.navigate('Main', {
            screen: 'Reels',
          });
        }
      }
    } catch (error) {
      console.error('Error handling carousel press:', error);
      // Fallback: just navigate to Reels tab
      if (navigation) {
        navigation.navigate('Main', {
          screen: 'Reels',
        });
      }
    }
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
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Continue Watching</Text>
              <Text style={styles.sectionSubtitle}>
                Pick up exactly where you left off
              </Text>

              <View style={{ height: 12 }} />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContainer}
              >
                {continueWatchingData.map((item, i) => (
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
  horizontalScrollContainer: {
    paddingRight: 16,
  },
  videoCardWrapper: {
    marginRight: 10,
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

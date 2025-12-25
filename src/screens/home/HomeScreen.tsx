// FILE: src/screens/home/HomeScreen.tsx
// Premium polished home screen with smooth animations and transitions

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
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

// Motion timing
const motion = {
  fast: 200,
  medium: 300,
  slow: 400,
};

// Carousel dimensions for 3-card stack
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = 420;

type CarouselBannerItem = {
  id: string;
  title: string;
  description?: string;
  genres?: string[];
  imageUrl: string;
  contentType?: 'webseries' | 'reels' | 'trending' | 'custom';
  contentId?: string;
};

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const parentNavigation = (navigation as any).getParent();

  const dispatch = useDispatch();
  const { continueWatching, continueWatchingLoading } = useSelector(
    (state: RootState) => state.video
  );

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselItems, setCarouselItems] = useState<CarouselBannerItem[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(true);
  const [carouselError, setCarouselError] = useState<string | null>(null);

  const [latestTrendingData, setLatestTrendingData] = useState<Array<any>>([]);
  const [newTodayData, setNewTodayData] = useState<Array<any>>([]);
  const [popularData, setPopularData] = useState<Array<any>>([]);
  const [activeTab, setActiveTab] = useState('Popular');

  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<FlatList<CarouselBannerItem>>(null);
  const headerOpacity = useRef(new Animated.Value(1)).current;

  const tabs = ['Popular', 'New & Hot', 'Originals', 'Ranking'];

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

        const transformed: CarouselBannerItem[] = items
          .filter((item: CarouselItem) => item.title)
          .map((item: CarouselItem) => {
            let imageUrl = item.imageUrl;
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('/')
                ? `${API_BASE_URL}${imageUrl}`
                : `${API_BASE_URL}/${imageUrl}`;
            }
            return {
              id: item._id,
              title: item.title,
              imageUrl: imageUrl || 'https://picsum.photos/800/1200?random=1',
              contentType: item.contentType,
              contentId: item.contentId,
            };
          });

        setCarouselItems(transformed);
      } catch (error) {
        setCarouselError('Unable to connect');
      } finally {
        setCarouselLoading(false);
      }
    };

    fetchCarousel();
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
    return () => { isMounted = false; };
  }, [dispatch]);

  useFocusEffect(fetchContinueWatching);

  const onCarouselScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  );

  const onCarouselScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    setCarouselIndex(index);
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
        }
      } else if (item.contentType === 'reels' && item.contentId) {
        navigation.navigate('Reels', { targetVideoId: item.contentId });
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

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    // Smooth fade animation
    Animated.sequence([
      Animated.timing(headerOpacity, {
        toValue: 0.5,
        duration: motion.fast,
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: motion.fast,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeAreaInner}>
        <View style={styles.container}>
          {/* Premium Header */}
          <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
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
            {/* Premium 3-Card Stacked Carousel */}
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
                    data={carouselItems}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH}
                    decelerationRate="fast"
                    contentContainerStyle={styles.carouselContent}
                    onScroll={onCarouselScroll}
                    onMomentumScrollEnd={onCarouselScrollEnd}
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

                      return (
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => handleCarouselPress(item)}
                        >
                          <Animated.View
                            style={[
                              styles.heroCard,
                              {
                                transform: [{ scale }, { translateY }],
                                opacity,
                              },
                            ]}
                          >
                            <Image
                              source={{ uri: item.imageUrl }}
                              style={styles.heroCardImage}
                              resizeMode="cover"
                            />
                            
                            <TouchableOpacity style={styles.bookmarkButton}>
                              <Ionicons name="bookmark-outline" size={22} color="#FFF" />
                            </TouchableOpacity>

                            
                          </Animated.View>
                        </TouchableOpacity>
                      );
                    }}
                  />

                  {carouselItems.length > 1 && (
                    <View style={styles.pageDotsRow}>
                      {carouselItems.map((_, index) => (
                        <Animated.View
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

            {/* Premium Search Bar */}
              {/* Search bar removed as requested */}

            {/* Premium Genre Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContainer}
            >
              {tabs.map((tab) => {
                const isActive = tab === activeTab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={styles.tab}
                    onPress={() => handleTabPress(tab)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                      {tab}
                    </Text>
                    {isActive && <View style={styles.tabUnderline} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Premium Continue Watching */}
            <ContinueWatching
              items={continueWatching}
              loading={continueWatchingLoading}
              onItemPress={handleContinueWatchingPress}
            />

            {/* Latest & Trending Section */}
            {latestTrendingData.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Latest & Trending</Text>
                  <TouchableOpacity>
                    <Text style={styles.seeAllText}>See all →</Text>
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

            {/* New Today Section */}
            {newTodayData.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>New Today</Text>
                  <TouchableOpacity>
                    <Text style={styles.seeAllText}>See all →</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardsContainer}
                  decelerationRate="fast"
                >
                  {newTodayData.map((item, i) => (
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

            {/* Popular This Week Section */}
            {popularData.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Popular This Week</Text>
                  <TouchableOpacity>
                    <Text style={styles.seeAllText}>See all →</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardsContainer}
                  decelerationRate="fast"
                >
                  {popularData.map((item, i) => (
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
  
  // PREMIUM HEADER
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
  
  // PREMIUM 3-CARD CAROUSEL
  carouselWrapper: {
    marginTop: 8,
    marginBottom: 16,
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
  
  bookmarkButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
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
  
  // PREMIUM SEARCH BAR
  searchSection: {
    // searchSection removed
  },
  searchBar: {
    // searchBar removed
  },
  searchPlaceholder: {
    // searchPlaceholder removed
  },
  micButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // PREMIUM TABS
  tabsContainer: {
    paddingHorizontal: spacing.screenPadding,
    gap: 20,
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 8,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  
  // PREMIUM SECTIONS
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
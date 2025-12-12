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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VideoCard from '../../components/VideoCard';
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { videoService } from '../../services/video.service';
import { Video as VideoType } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HeroItem = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  imageUrl: string;
};

const HERO_DATA: HeroItem[] = [
  {
    id: '1',
    title: 'Midnight Echoes',
    subtitle: 'New micro-thriller · 2 min',
    tag: 'New & Hot',
    imageUrl: 'https://picsum.photos/800/1200?random=21',
  },
  {
    id: '2',
    title: 'City Lights',
    subtitle: 'Romantic short · 3 min',
    tag: 'Trending',
    imageUrl: 'https://picsum.photos/800/1200?random=22',
  },
  {
    id: '3',
    title: 'Last Call',
    subtitle: 'Crime · 1 min',
    tag: 'Original',
    imageUrl: 'https://picsum.photos/800/1200?random=23',
  },
];

export default function HomeScreen({ navigation }: any) {
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('New & Hot');
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroData, setHeroData] = useState<HeroItem[]>(HERO_DATA);
  const [latestTrendingData, setLatestTrendingData] = useState([
    { title: 'Series 1', imageUrl: 'https://picsum.photos/110/160?random=4' },
    { title: 'Series 2', imageUrl: 'https://picsum.photos/110/160?random=5' },
    { title: 'Series 3', imageUrl: 'https://picsum.photos/110/160?random=6' },
  ]);

  const refreshHomeContent = useCallback(async () => {
    try {
      // Fetch trending videos for hero carousel
      const trendingResponse = await videoService.getTrendingVideos(5);
      if (trendingResponse.success && trendingResponse.data) {
        const transformedHero: HeroItem[] = trendingResponse.data.slice(0, 3).map((video: VideoType, index: number) => ({
          id: video._id,
          title: video.title || 'Untitled',
          subtitle: `${video.type === 'episode' ? 'Episode' : 'Reel'} · ${Math.floor((video.duration || 0) / 60)} min`,
          tag: index === 0 ? 'New & Hot' : index === 1 ? 'Trending' : 'Original',
          imageUrl: video.thumbnailUrl || video.thumbnail || `https://picsum.photos/800/1200?random=${21 + index}`,
        }));
        if (transformedHero.length > 0) {
          setHeroData(transformedHero);
        }
      }

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

  const heroRef = useRef<FlatList<HeroItem>>(null);

  const extendedHeroData = useMemo(() => {
    if (heroData.length <= 1) return heroData;
    const first = heroData[0];
    const last = heroData[heroData.length - 1];
    return [last, ...heroData, first];
  }, [heroData]);

  const continueWatchingData = [
    { title: 'Jurassic Park', imageUrl: 'https://picsum.photos/110/160?random=1' },
    { title: 'Oldboy', imageUrl: 'https://picsum.photos/110/160?random=2' },
    { title: 'John Wick', imageUrl: 'https://picsum.photos/110/160?random=3' },
  ];

  useEffect(() => {
    const n = heroData.length;
    if (n <= 1) return;

    const interval = setInterval(() => {
      const next = (heroIndex + 1) % n;
      heroRef.current?.scrollToIndex({ index: next + 1, animated: true });
      setHeroIndex(next);
    }, 4000);

    return () => clearInterval(interval);
  }, [heroIndex, heroData.length]);

  const onHeroScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const viewIndex = Math.round(x / SCREEN_WIDTH);
    const n = heroData.length;

    if (n <= 1) {
      setHeroIndex(0);
      return;
    }

    if (viewIndex === 0) {
      heroRef.current?.scrollToIndex({ index: n, animated: false });
      setHeroIndex(n - 1);
    } else if (viewIndex === n + 1) {
      heroRef.current?.scrollToIndex({ index: 1, animated: false });
      setHeroIndex(0);
    } else {
      setHeroIndex(viewIndex - 1);
    }
  };

  const getHeroItemLayout = (_: HeroItem[] | null | undefined, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

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

            {/* Hero Carousel */}
            <View style={styles.heroWrapper}>
              <FlatList
                ref={heroRef}
                data={extendedHeroData}
                keyExtractor={(_, index) => `hero-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={1}
                getItemLayout={getHeroItemLayout}
                onMomentumScrollEnd={onHeroScrollEnd}
                decelerationRate="fast"
                renderItem={({ item }) => (
                  <View style={styles.heroSlide}>
                    <ImageBackground
                      source={{ uri: item.imageUrl }}
                      style={styles.heroImage}
                      imageStyle={styles.heroImageRadius}
                    >
                      <View style={styles.heroGradient} />
                      <View style={styles.heroContent}>
                        <View style={styles.heroTagRow}>
                          <Text style={styles.heroTag}>{item.tag}</Text>
                        </View>
                        <Text style={styles.heroTitle}>{item.title}</Text>
                        <Text style={styles.heroSubtitle}>{item.subtitle}</Text>

                        <View style={styles.heroButtonsRow}>
                          <TouchableOpacity style={styles.heroPrimaryButton}>
                            <Ionicons name="play" size={18} color="#000" />
                            <Text style={styles.heroPrimaryText}>Play</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.heroSecondaryButton}>
                            <Ionicons name="add" size={18} color="#fff" />
                            <Text style={styles.heroSecondaryText}>Watchlist</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </ImageBackground>
                  </View>
                )}
              />

              {/* Dots */}
              <View style={styles.heroDotsRow}>
                {heroData.map((item, index) => {
                  const isActive = index === heroIndex;
                  return (
                    <View
                      key={item.id}
                      style={[styles.heroDot, isActive && styles.heroDotActive]}
                    />
                  );
                })}
              </View>
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

  // HERO
  heroWrapper: {
    marginTop: 8,
    marginBottom: 16,
  },
  heroSlide: {
    width: SCREEN_WIDTH,      // keep paging at full screen width
    paddingHorizontal: 16,   // inset the slide content so the image lines up with rest of UI
  },
  heroImage: {
    width: SCREEN_WIDTH - 32, // image width matches the inset (16 left + 16 right)
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignSelf: 'center',     // center inside the page
  },
  heroImageRadius: {
    borderRadius: 18,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroTagRow: {
    marginBottom: 6,
  },
  heroTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#FFD54A',
    fontSize: 11,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroSubtitle: {
    color: '#E0E0E3',
    fontSize: 13,
    marginBottom: 12,
  },
  heroButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFD54A',
    marginRight: 10,
  },
  heroPrimaryText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  heroSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroSecondaryText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#555',
    marginHorizontal: 4,
  },
  heroDotActive: {
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
    height: 140, // ensures content rises above bottom nav / home bar on modern devices
  },
});

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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useDispatch, useSelector } from 'react-redux';
import type { TabParamList } from '../../navigation/TabNavigator';
import VideoCard from '../../components/VideoCard';
import { videoService } from '../../services/video.service';
import {
  setContinueWatching,
  setContinueWatchingLoading,
} from '../../redux/slices/videoSlice';
import { RootState } from '../../redux/store';

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

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('New & Hot');
  const [heroIndex, setHeroIndex] = useState(0);

  const dispatch = useDispatch();
  const { continueWatching, continueWatchingLoading } = useSelector(
    (state: RootState) => state.video
  );

  const heroRef = useRef<FlatList<HeroItem>>(null);

  const extendedHeroData = useMemo(() => {
    if (HERO_DATA.length <= 1) return HERO_DATA;
    const first = HERO_DATA[0];
    const last = HERO_DATA[HERO_DATA.length - 1];
    return [last, ...HERO_DATA, first];
  }, []);

  const latestTrendingData = [
    { title: 'Series 1', imageUrl: 'https://picsum.photos/110/160?random=4' },
    { title: 'Series 2', imageUrl: 'https://picsum.photos/110/160?random=5' },
    { title: 'Series 3', imageUrl: 'https://picsum.photos/110/160?random=6' },
  ];

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
      } catch (error) {
        console.error('Error fetching continue watching:', error);
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
    const n = HERO_DATA.length;
    if (n <= 1) return;

    const interval = setInterval(() => {
      const next = (heroIndex + 1) % n;
      heroRef.current?.scrollToIndex({ index: next + 1, animated: true });
      setHeroIndex(next);
    }, 4000);

    return () => clearInterval(interval);
  }, [heroIndex]);

  const onHeroScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const viewIndex = Math.round(x / SCREEN_WIDTH);
    const n = HERO_DATA.length;

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

  const getHeroItemLayout = (_data: ArrayLike<HeroItem> | null | undefined, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

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

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
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
                {HERO_DATA.map((item, index) => {
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
    height: 140, // ensures content rises above bottom nav / home bar on modern devices
  },
});

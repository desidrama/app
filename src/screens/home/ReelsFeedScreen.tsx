// src/screens/home/ReelPlayerScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { videoService } from '../../services/video.service';
import ReelItem from '../../components/ReelItem';
import styles from './styles/ReelPlayerStyles';
import type { Video as VideoType } from '../../types';
import type { TabParamList } from '../../navigation/TabNavigator';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Reel = {
  id: string;
  title: string;
  year: string;
  rating: string;
  duration: string;
  durationSeconds?: number;
  videoUrl: string;
  initialLikes: number;
  description?: string;
  seasonId?: any;
  episodeNumber?: number;
  thumbnailUrl?: string;
};

const ITEMS_PER_PAGE = 15;

type ReelsScreenRouteProp = RouteProp<TabParamList, 'Reels'>;
type ReelsScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Reels'>;

const ReelPlayerScreen: React.FC<{ navigation?: any }> = ({ navigation: propNavigation }) => {
  const navigation = useNavigation<ReelsScreenNavigationProp>();
  const route = useRoute<ReelsScreenRouteProp>();
  const routeParams = route.params;
  
  const [reels, setReels] = useState<Reel[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPrevious, setLoadingPrevious] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [targetVideoId, setTargetVideoId] = useState<string | null>(routeParams?.targetVideoId || null);
  const [resumeTime, setResumeTime] = useState<number>(routeParams?.resumeTime || 0);
  const [targetVideoFound, setTargetVideoFound] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);
  const scrollOffsetRef = useRef<number>(0);

  // Transform backend video to Reel format
  const transformVideoToReel = useCallback((video: VideoType): Reel => {
          let videoUrl = video.masterPlaylistUrl || '';

          if (!videoUrl && video.variants && video.variants.length > 0) {
            const preferredOrder = ['720p', '1080p', '480p', '360p'];
            for (const res of preferredOrder) {
        const v = video.variants.find((x) => x.resolution === res);
        if (v && v.url) {
          videoUrl = v.url;
                break;
              }
            }
      if (!videoUrl && video.variants.length > 0) {
              videoUrl = video.variants[0].url;
            }
          }

    const formatDuration = (seconds?: number) => {
            if (!seconds) return '0m';
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) return `${hours}h ${minutes}m`;
            return `${minutes}m`;
          };

          return {
      id: (video as any)._id || String(Date.now()),
            title: video.title || 'Untitled',
      year: video.createdAt ? new Date(video.createdAt).getFullYear().toString() : '',
      rating: (video as any).ageRating || 'UA 16+',
      duration: formatDuration(video.duration),
      durationSeconds: video.duration,
            videoUrl,
      initialLikes: (video as any).likes || 0,
            description: video.description,
      seasonId: (video as any).seasonId,
      episodeNumber: (video as any).episodeNumber,
      thumbnailUrl: (video as any).thumbnailUrl || (video as any).thumbnail,
    };
  }, []);

  // Function to find and scroll to target video
  const findAndScrollToVideo = useCallback((videoId: string) => {
    if (!videoId || !flatListRef.current) return;
    
    console.log('🔍 Looking for video with ID:', videoId);
    
    // First, check if video is already in loaded reels
    const index = reels.findIndex((reel) => reel.id === videoId);
    if (index !== -1) {
      console.log('✅ Found video at index:', index);
      setCurrentIndex(index);
      setTargetVideoFound(true);
      // Wait for layout, then scroll
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index, animated: false });
      }, 100);
      return;
    }
    
    // If not found, try to fetch the specific video
    const fetchTargetVideo = async () => {
      try {
        console.log('📥 Video not in feed, fetching specific video...');
        const response = await videoService.getVideoById(videoId);
        if (response.success && response.data) {
          const targetReel = transformVideoToReel(response.data);
          // Prepend to the beginning of the list
          setReels((prev) => [targetReel, ...prev]);
          setCurrentIndex(0);
          setTargetVideoFound(true);
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: 0, animated: false });
          }, 100);
      }
    } catch (error) {
        console.error('Error fetching target video:', error);
      }
    };
    
    fetchTargetVideo();
  }, [reels, transformVideoToReel]);

  // Handle route params change (when navigating with targetVideoId)
  useEffect(() => {
    if (routeParams?.targetVideoId) {
      const videoId = routeParams.targetVideoId;
      const resume = routeParams.resumeTime || 0;
      console.log('🎯 Navigation params received:', { videoId, resume });
      setTargetVideoId(videoId);
      setResumeTime(resume);
      setTargetVideoFound(false);
    }
  }, [routeParams]);

  // Try to find target video when reels are loaded
  useEffect(() => {
    if (targetVideoId && reels.length > 0 && !targetVideoFound) {
      findAndScrollToVideo(targetVideoId);
    }
  }, [targetVideoId, reels, targetVideoFound, findAndScrollToVideo]);

  // Initial load (page 1)
  useEffect(() => {
    loadPage(1, { replace: true });
  }, []);

  // Load a page (forward or initial)
  const loadPage = useCallback(
    async (pageToLoad: number, opts?: { replace?: boolean }) => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await videoService.getWebseriesFeed(pageToLoad);
        if (res && res.success && Array.isArray(res.data)) {
          const transformed = res.data.map(transformVideoToReel);
          if (opts?.replace) {
            setReels(transformed);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
            setCurrentIndex(0);
          } else {
            setReels((prev) => [...prev, ...transformed]);
          }

          setPage(pageToLoad);
          setHasMore(Boolean(res.pagination?.hasMore));
          setHasPrevious(Boolean(res.pagination?.hasPrevious) || pageToLoad > 1);
        } else {
          setHasMore(false);
        }
      } catch (e) {
        console.error('Error loading reels page', e);
      } finally {
        setLoading(false);
      }
    },
    [loading, transformVideoToReel]
  );

  // Load previous page and prepend
  const loadPrevious = useCallback(async () => {
    if (loadingPrevious || page <= 1) return;
    const prevPage = page - 1;
    setLoadingPrevious(true);
    try {
      const res = await videoService.getWebseriesFeed(prevPage);
      if (res && res.success && Array.isArray(res.data) && res.data.length) {
        const transformed = res.data.map(transformVideoToReel);
        setReels((prev) => [...transformed, ...prev]);

        const offsetDelta = transformed.length * SCREEN_HEIGHT;
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToOffset({
            offset: scrollOffsetRef.current + offsetDelta,
              animated: false,
            });
        });

        setPage(prevPage);
        setHasPrevious(prevPage > 1);
      } else {
        setHasPrevious(false);
      }
    } catch (err) {
      console.error('Error loading previous page', err);
    } finally {
      setLoadingPrevious(false);
    }
  }, [loadingPrevious, page, transformVideoToReel]);

  // Load more (next page)
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
      setLoading(true);
    try {
      const res = await videoService.getWebseriesFeed(nextPage);
      if (res && res.success && Array.isArray(res.data) && res.data.length) {
        const transformed = res.data.map(transformVideoToReel);
        setReels((prev) => [...prev, ...transformed]);
          setPage(nextPage);
        setHasMore(Boolean(res.pagination?.hasMore));
          setHasPrevious(true);
        } else {
          setHasMore(false);
        }
    } catch (err) {
      console.error('Error loading more reels', err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, transformVideoToReel]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPage(1, { replace: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadPage]);

  // Viewability: determine active reel
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!viewableItems || viewableItems.length === 0) return;
    const first = viewableItems[0];
    if (typeof first.index === 'number') {
      setCurrentIndex(first.index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 100,
  }).current;

  // Handle scroll: detect near-top to load previous pages
  const handleScroll = useCallback((evt: any) => {
    const offsetY = evt.nativeEvent.contentOffset.y;
    scrollOffsetRef.current = offsetY;
    if (offsetY < SCREEN_HEIGHT * 1.5 && hasPrevious && !loadingPrevious && page > 1) {
      loadPrevious();
    }
  }, [hasPrevious, loadingPrevious, loadPrevious, page]);

  // Handle scroll to index failed
  const onScrollToIndexFailed = useCallback((info: any) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
    });
  }, []);

  // Render item
  const renderItem = useCallback(({ item, index }: { item: Reel; index: number }) => {
    // Check if this is the target video and pass resumeTime
    const isTargetVideo = targetVideoId && item.id === targetVideoId && index === currentIndex;
    const initialTime = isTargetVideo ? resumeTime : 0;
    
    return (
      <ReelItem
        key={item.id}
        reel={item}
        isActive={index === currentIndex}
        initialTime={initialTime}
      />
    );
  }, [currentIndex, targetVideoId, resumeTime]);

  if (loading && reels.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFD54A" />
        <Text style={styles.loadingText}>Loading reels…</Text>
      </SafeAreaView>
    );
  }

  const handleBackPress = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Back Button */}
      <TouchableOpacity
        style={backButtonStyles.backButton}
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        onEndReached={loadMore}
        onScrollToIndexFailed={onScrollToIndexFailed}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFD54A']} />
        }
        ListHeaderComponent={loadingPrevious ? (
            <View style={styles.headerLoader}>
              <ActivityIndicator size="small" color="#FFD54A" />
            </View>
        ) : null}
        ListFooterComponent={loading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#FFD54A" />
            </View>
        ) : null}
      />
    </SafeAreaView>
  );
};

const backButtonStyles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReelPlayerScreen;
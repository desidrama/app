// src/screens/home/ReelPlayerScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  
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
  const [isScreenFocused, setIsScreenFocused] = useState(true);

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

  // Function to find and scroll to target video (used as fallback)
  const findAndScrollToVideo = useCallback((videoId: string) => {
    if (!videoId || !flatListRef.current || targetVideoFound) return;
    
    console.log('🔍 Looking for video with ID:', videoId);
    
    // Check if video is already in loaded reels
    const index = reels.findIndex((reel: Reel) => reel.id === videoId);
    if (index !== -1) {
      console.log('✅ Found video at index:', index);
      setCurrentIndex(index);
      setTargetVideoFound(true);
      // Scroll immediately
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index, animated: false });
      });
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
  }, [reels, targetVideoFound, transformVideoToReel]);

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

  // Try to find target video when reels are loaded (fallback if not found in initial load)
  useEffect(() => {
    if (targetVideoId && reels.length > 0 && !targetVideoFound && !loading) {
      // Small delay to ensure reels are rendered
      const timer = setTimeout(() => {
        findAndScrollToVideo(targetVideoId);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [targetVideoId, reels, targetVideoFound, findAndScrollToVideo, loading]);

  // Load target video first if navigating with targetVideoId
  useEffect(() => {
    if (targetVideoId && !targetVideoFound && reels.length === 0) {
      const loadTargetVideoFirst = async () => {
        try {
          console.log('🎯 Loading target video first:', targetVideoId);
          const response = await videoService.getVideoById(targetVideoId);
          if (response.success && response.data) {
            const targetReel = transformVideoToReel(response.data);
            // Set as the only reel initially, then load feed
            setReels([targetReel]);
            setCurrentIndex(0);
            setTargetVideoFound(true);
            
            // Scroll to index 0 immediately
            requestAnimationFrame(() => {
              flatListRef.current?.scrollToIndex({ index: 0, animated: false });
            });
            
            // Then load the feed in the background (after a short delay to ensure scroll happens)
            setTimeout(() => {
              loadPage(1, { replace: false });
            }, 300);
          } else {
            // If target video not found, just load normal feed
            loadPage(1, { replace: true });
          }
        } catch (error) {
          console.error('Error loading target video:', error);
          // Fallback to normal feed load
          loadPage(1, { replace: true });
        }
      };
      
      loadTargetVideoFirst();
    } else if (!targetVideoId && reels.length === 0) {
      // Normal load if no target video and no reels loaded
      loadPage(1, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetVideoId]); // Only run when targetVideoId changes or on mount

  // Load a page (forward or initial)
  const loadPage = useCallback(
    async (pageToLoad: number, opts?: { replace?: boolean }) => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await videoService.getWebseriesFeed(pageToLoad);
        if (res && res.success && Array.isArray(res.data)) {
          const transformed = res.data.map(transformVideoToReel);
          
          // If we have a target video, check if it's in the feed
          if (targetVideoId && !targetVideoFound) {
            const targetIndex = transformed.findIndex((reel: Reel) => reel.id === targetVideoId);
            if (targetIndex !== -1) {
              console.log('✅ Target video found in feed at index:', targetIndex);
              // Move target video to the beginning
              const targetReel = transformed[targetIndex];
              const otherReels = transformed.filter((_: Reel, idx: number) => idx !== targetIndex);
              const finalReels = opts?.replace ? [targetReel, ...otherReels] : [...reels, targetReel, ...otherReels];
              setReels(finalReels);
              setCurrentIndex(0);
              setTargetVideoFound(true);
              
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: 0, animated: false });
              }, 50);
            } else {
              // Target not in feed, append normally
              if (opts?.replace) {
                setReels(transformed);
                flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                setCurrentIndex(0);
              } else {
                setReels((prev) => [...prev, ...transformed]);
              }
            }
          } else {
            // No target video, normal append
            if (opts?.replace) {
              setReels(transformed);
              flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
              setCurrentIndex(0);
            } else {
              setReels((prev) => [...prev, ...transformed]);
            }
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
    [loading, transformVideoToReel, targetVideoId, targetVideoFound, reels]
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelsFeedScreen.tsx:364',message:'scrollToIndex failed',data:{index:info.index,reelsLength:reels.length,averageItemLength:info.averageItemLength},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelsFeedScreen.tsx:367',message:'Retrying scrollToIndex',data:{index:info.index},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
    });
  }, [reels.length]);

  // Render item
  const renderItem = useCallback(({ item, index }: { item: Reel; index: number }) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelsFeedScreen.tsx:372',message:'renderItem called',data:{itemId:item.id,index,currentIndex,targetVideoId,resumeTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // Check if this is the target video and pass resumeTime
    const isTargetVideo = targetVideoId && item.id === targetVideoId && index === currentIndex;
    const initialTime = isTargetVideo ? resumeTime : 0;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelsFeedScreen.tsx:375',message:'renderItem calculated values',data:{itemId:item.id,index,isTargetVideo,initialTime,isActive:index === currentIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return (
      <ReelItem
        key={item.id}
        reel={item}
        isActive={index === currentIndex}
        initialTime={initialTime}
        screenFocused={isScreenFocused}
        onEpisodeSelect={(episodeId) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelsFeedScreen.tsx:onEpisodeSelect',message:'Episode selected',data:{episodeId,currentIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'episodes'})}).catch(()=>{});
          // #endregion
          // Find the episode in the reels list
          const episodeIndex = reels.findIndex(r => r.id === episodeId);
          if (episodeIndex !== -1) {
            setCurrentIndex(episodeIndex);
            setTargetVideoId(episodeId);
            setResumeTime(0);
            // Scroll to the episode
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: episodeIndex, animated: true });
            }, 100);
          } else {
            // Episode not in current feed, fetch it
            setTargetVideoId(episodeId);
            setResumeTime(0);
            // The existing logic will handle fetching and scrolling
          }
        }}
      />
    );
  }, [currentIndex, targetVideoId, resumeTime, isScreenFocused, reels, setCurrentIndex, setTargetVideoId, setResumeTime]);

  // #region agent log
  // Log safe area insets for debugging
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelsFeedScreen.tsx:411',message:'Safe area insets',data:{top:insets.top,bottom:insets.bottom,left:insets.left,right:insets.right,platform:Platform.OS},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'safe-area'})}).catch(()=>{});
  }, [insets.top, insets.bottom, insets.left, insets.right]);
  // #endregion

  // Handle screen focus/blur to pause all videos when navigating away
  useFocusEffect(
    useCallback(() => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelsFeedScreen.tsx:useFocusEffect',message:'Screen focused',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'screen-focus'})}).catch(()=>{});
      // #endregion
      setIsScreenFocused(true);
      return () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelsFeedScreen.tsx:useFocusEffect-cleanup',message:'Screen blurred - pausing all videos',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'screen-focus'})}).catch(()=>{});
        // #endregion
        setIsScreenFocused(false);
      };
    }, [])
  );

  const handleBackPress = () => {
    navigation.navigate('Home');
  };

  if (loading && reels.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFD54A" />
        <Text style={styles.loadingText}>Loading reels…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      {/* Back Button */}
      {(() => {
        const backButtonTop = insets.top + (Platform.OS === 'ios' ? 8 : 12);
        const backButtonLeft = insets.left + 16;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelsFeedScreen.tsx:backButton',message:'Back button alignment values',data:{platform:Platform.OS,insets:{top:insets.top,bottom:insets.bottom,left:insets.left,right:insets.right},backButtonTop,backButtonLeft},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'alignment'})}).catch(()=>{});
        // #endregion
        return null;
      })()}
      <TouchableOpacity
        style={[
          backButtonStyles.backButton,
          {
            top: insets.top + (Platform.OS === 'ios' ? 8 : 12),
            left: insets.left + 16,
          },
        ]}
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
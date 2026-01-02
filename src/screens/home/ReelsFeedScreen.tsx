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
  Modal,
  Pressable,
} from 'react-native';
import { Animated } from 'react-native';

import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { setUser } from '../../redux/slices/userSlice';
import { useTheme } from '../../context/ThemeContext';

import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { videoService } from '../../services/video.service';
import ReelItem from '../../components/ReelItem';
import RewardedEpisodeAd from '../../components/RewardedEpisodeAd';
import styles from './styles/ReelPlayerStyles';
import type { Video as VideoType } from '../../types';
import type { TabParamList } from '../../navigation/TabNavigator';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
  adStatus?: 'locked' | 'unlocked';

  thumbnailUrl?: string;
};

const ITEMS_PER_PAGE = 15;

type ReelsScreenRouteProp = RouteProp<TabParamList, 'Reels'>;
type ReelsScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Reels'>;

const ReelPlayerScreen: React.FC<{ navigation?: any }> = ({ navigation: propNavigation }) => {
  const navigation = useNavigation<ReelsScreenNavigationProp>();
  const { colors } = useTheme();
  const route = useRoute<ReelsScreenRouteProp>();
  const routeParams = route.params;
  const insets = useSafeAreaInsets();
  const adHandledRef = useRef(false);
  const adReelIndexRef = useRef<number | null>(null);

  // Calculate available viewport height accounting for safe areas
  // This ensures consistent item height across all devices
  const ITEM_HEIGHT = SCREEN_HEIGHT - insets.top - insets.bottom;


// =========================
// REDUX COINS (FIX 1)
// =========================
const dispatch = useDispatch();
const user = useSelector((state: RootState) => state.user.profile);
const SKIP_COST = 30;
const coins = user?.coinsBalance ?? user?.coins ?? 0;

const coinAnim = useRef(new Animated.Value(1)).current;









const deductCoins = (amount: number) => {
  if (!user) return;

  const currentCoins = user.coinsBalance ?? user.coins ?? 0;
  const updatedCoins = Math.max(currentCoins - amount, 0);

  dispatch(
    setUser({
      ...user,
      coinsBalance:
        user.coinsBalance !== undefined ? updatedCoins : user.coinsBalance,
      coins:
        user.coinsBalance === undefined ? updatedCoins : user.coins,
    })
  );
};




  const prevIndexRef = useRef<number | null>(null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPrevious, setLoadingPrevious] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasPrevious, setHasPrevious] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  useEffect(() => {
  adHandledRef.current = false;
}, [currentIndex]);

  const [showAd, setShowAd] = useState(false);
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [showAdPopup, setShowAdPopup] = useState(false);
  const [shouldPlayAd, setShouldPlayAd] = useState(false);





  const [preloadAd, setPreloadAd] = useState(false);

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
      adStatus: (video as any).adStatus ?? 'unlocked',
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
      // Scroll immediately - but guard against empty array
      if (reels.length > 0) {
        requestAnimationFrame(() => {
          if (flatListRef.current && reels.length > 0) {
            flatListRef.current.scrollToIndex({ index, animated: false });
          }
        });
      }
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
            if (flatListRef.current && reels.length > 0) {
              flatListRef.current.scrollToIndex({ index: 0, animated: false });
            }
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
      // Clear reels so the targetVideoId effect will reload with the new video
      setReels([]);
      setCurrentIndex(0);
      setPage(1);
      setHasMore(true);
      // Don't scroll here - let the targetVideoId effect handle it after loading
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
            
            // Scroll to index 0 - but only after reels are definitely in state
            setTimeout(() => {
              if (flatListRef.current && reels.length > 0) {
                flatListRef.current.scrollToIndex({ index: 0, animated: false });
              }
            }, 100);
            
            // Then load the feed in the background (after a short delay to ensure scroll happens)
            setTimeout(() => {
              loadPage(1, { replace: false });
            }, 300);
          } else {
            // If target video not found, just load normal feed
            console.warn('❌ Target video not found:', targetVideoId);
            loadPage(1, { replace: true });
          }
        } catch (error) {
          console.error('❌ Error loading target video:', error);
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
  }, [targetVideoId]); // Only run when targetVideoId changes

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
                if (flatListRef.current && reels.length > 0) {
                  flatListRef.current.scrollToIndex({ index: 0, animated: false });
                }
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

        const offsetDelta = transformed.length * ITEM_HEIGHT;
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
  const handleEpisodeEnd = useCallback(() => {
  // 🔥 Decide based on the reel being LEFT
  const indexToCheck = prevIndexRef.current ?? currentIndex;

  const reel = reels[indexToCheck];

if (!reel || reel.adStatus !== 'locked') {
  return;
}



  if (adHandledRef.current) return;

  adHandledRef.current = true;
adReelIndexRef.current = indexToCheck; // 👈 remember reel
setIsAdOpen(true);
setShowAd(true);
setShowAdPopup(true);
setShouldPlayAd(false);



}, [currentIndex, reels]);



  const onViewableItemsChanged = useCallback(
  ({ viewableItems }: any) => {
    if (!viewableItems || viewableItems.length === 0) return;

    const first = viewableItems[0];
    if (typeof first.index !== 'number') return;

    // 🔥 USER IS LEAVING THE PREVIOUS REEL
    if (
      prevIndexRef.current !== null &&
      first.index !== prevIndexRef.current
    ) {
      handleEpisodeEnd();
    }

    prevIndexRef.current = first.index;
    setCurrentIndex(first.index);
  },
  [handleEpisodeEnd]
);



  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 100,
  }).current;

  // Handle scroll: detect near-top to load previous pages
  const handleScroll = useCallback((evt: any) => {
    const offsetY = evt.nativeEvent.contentOffset.y;
    scrollOffsetRef.current = offsetY;
    if (offsetY < ITEM_HEIGHT * 1.5 && hasPrevious && !loadingPrevious && page > 1) {
      loadPrevious();
    }
  }, [hasPrevious, loadingPrevious, loadPrevious, page, ITEM_HEIGHT]);

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

  // Navigate to next webseries
  const goToNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      }, 100);
    } else if (hasMore) {
      // Load more if available
      loadMore();
    }
  }, [currentIndex, reels.length, hasMore, loadMore]);
  // 🔥 Called when a video/episode finishes playing
    



  // Navigate to previous webseries
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      }, 100);
    } else if (hasPrevious && page > 1) {
      // Load previous page if available
      loadPrevious();
    }
  }, [currentIndex, hasPrevious, page, loadPrevious]);

  // Get item layout for FlatList - ensures consistent item sizing
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [ITEM_HEIGHT]
  );

  // Render item
  const renderItem = useCallback(({ item, index }: { item: Reel; index: number }) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelsFeedScreen.tsx:372',message:'renderItem called',data:{itemId:item.id,index,currentIndex,targetVideoId,resumeTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // Always use resumeTime only for the current target video
    const isTargetVideo = targetVideoId && item.id === targetVideoId && index === currentIndex;
    const initialTime = isTargetVideo ? resumeTime : 0;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelsFeedScreen.tsx:375',message:'renderItem calculated values',data:{itemId:item.id,index,isTargetVideo,initialTime,isActive:index === currentIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return (
      <View style={{ height: ITEM_HEIGHT }}>
        <ReelItem
          key={item.id}
          reel={item}
          isActive={index === currentIndex}
          initialTime={initialTime}
          screenFocused={isScreenFocused}
          onEpisodeSelect={(episodeId) => {
            // Always reset resumeTime and targetVideoFound for new episode
            setCurrentIndex(0);
            setTargetVideoId(episodeId);
            setResumeTime(0);
            setTargetVideoFound(false);
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: 0, animated: false });
            }, 100);
          }}
        />
      </View>
    );
  }, [currentIndex, targetVideoId, resumeTime, isScreenFocused, reels, setCurrentIndex, setTargetVideoId, setResumeTime, ITEM_HEIGHT]);

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
        <Ionicons name="chevron-back" size={31} color="#fff" />
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
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
      {preloadAd && showAd && (
  <View
    pointerEvents="box-none"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    }}
  >


    {/* Coins bar ABOVE ad */}

  {/* Coins bar ABOVE ad */}

<Modal visible={showAdPopup} transparent animationType="fade">
  <View
    style={{
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end', // bottom sheet
    }}
  >
    <View
      style={{
        width: '100%',
        minHeight: '55%',
        backgroundColor: '#121212',

        // Bottom sheet styling
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,

        paddingTop: 14,
        paddingBottom: 28,
        paddingHorizontal: 22,

        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 24,
        elevation: 24,
      }}
    >
      {/* Drag indicator */}
      <View
        style={{
          alignSelf: 'center',
          width: 44,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#444',
          marginBottom: 16,
        }}
      />

      {/* Title */}
      <Text
        style={{
          color: '#fff',
          fontSize: 22,
          fontWeight: '800',
          textAlign: 'center',
          letterSpacing: 0.3,
        }}
      >
        Unlock Next Reel
      </Text>

      {/* Subtitle */}
      <Text
        style={{
          color: '#aaa',
          fontSize: 15,
          textAlign: 'center',
          marginTop: 8,
          lineHeight: 20,
        }}
      >
        Watch a short ad or use coins to continue
      </Text>

      {/* Coins pill */}
      <Animated.View
        style={{
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 18,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 22,
          backgroundColor: '#1E1E1E',
          transform: [{ scale: coinAnim }],
        }}
      >
        <Text style={{ fontSize: 16 }}>🪙</Text>
        <Text
          style={{
            color: '#FFD54A',
            fontWeight: '600',
            marginLeft: 8,
            fontSize: 14,
          }}
        >
          {coins} coins available
        </Text>
      </Animated.View>

      {/* PRIMARY CTA — Skip using coins */}
      <Pressable
        disabled={coins < SKIP_COST}
        onPress={() => {
          deductCoins(SKIP_COST);

          setReels(prev =>
  prev.map((reel, index) =>
    index === currentIndex
      ? { ...reel, adStatus: 'unlocked' }
      : reel
  )
);
  
          setShowAdPopup(false);
          setShowAd(false);
          setPreloadAd(false);
          setShouldPlayAd(false);
          adHandledRef.current = false;
          adReelIndexRef.current = null;
        }}
        style={{
          marginTop: 26,
          paddingVertical: 16,
          borderRadius: 16,
          backgroundColor: coins >= SKIP_COST ? '#FFD54A' : '#333',
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            fontWeight: '800',
            fontSize: 16,
            color: '#000',
          }}
        >
          Skip using {SKIP_COST} coins
        </Text>
      </Pressable>

      {/* SECONDARY CTA — Watch ad */}
      <Pressable
        onPress={() => {
          setShowAdPopup(false);
          setPreloadAd(true);
          setShowAd(true);
          setShouldPlayAd(true);
        }}
        style={{
          marginTop: 14,
          paddingVertical: 14,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#333',
          backgroundColor: '#181818',
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            color: '#fff',
            fontWeight: '600',
            fontSize: 14,
          }}
        >
          Watch a short ad
        </Text>
      </Pressable>
    </View>
  </View>
</Modal>



{/* Ad stays EXACTLY the same */}

    {/* Ad stays EXACTLY the same */}
    <View style={{ flex: 1 }}>
  <RewardedEpisodeAd
    show={shouldPlayAd}
    onAdFinished={() => {
      
  setShowAdPopup(false);
  setIsAdOpen(false);
  setShowAd(false);
  setPreloadAd(false);
  setShouldPlayAd(false);

  setReels(prev =>
  prev.map((r, i) =>
    i === currentIndex ? { ...r, adStatus: 'unlocked' } : r
  )
);

  adHandledRef.current = false;
  adReelIndexRef.current = null;
  // ✅ stay on Reel 2
}}

  />
</View>

  </View>
)}



    </SafeAreaView>
  );
};

const backButtonStyles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    zIndex: 10000, // Very high z-index to ensure it stays above ads and overlays
    width: 47,
    height: 47,
    borderRadius: 23.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    // Ensure back button is always clickable, even during ads
    pointerEvents: 'auto',
    elevation: 1000, // Android elevation (equivalent to zIndex)
  },
});

export default ReelPlayerScreen;
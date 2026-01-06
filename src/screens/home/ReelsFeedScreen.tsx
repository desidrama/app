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
  Alert,
  Share,
  StatusBar,
} from 'react-native';
import { Animated } from 'react-native';

import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { setUser } from '../../redux/slices/userSlice';
import { useTheme } from '../../context/ThemeContext';

import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { videoService } from '../../services/video.service';
import ReelItem from '../../components/ReelItem';
import RewardedEpisodeAd from '../../components/RewardedEpisodeAd';
import styles from './styles/ReelPlayerStyles';
import type { Video as VideoType } from '../../types';
import type { TabParamList } from '../../navigation/TabNavigator';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { skipAdWithCoins, getUserProfile } from '../../services/api';
import { getToken } from '../../utils/storage';

// 🔥 CRITICAL: Use 'screen' instead of 'window' for true fullscreen
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('screen');

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

  // 🔥 CRITICAL: Use full screen height, don't subtract safe areas
  const ITEM_HEIGHT = SCREEN_HEIGHT;

  // 🔥 TRUE EDGE-TO-EDGE FULLSCREEN - Hide system UI
  useEffect(() => {
    StatusBar.setHidden(true);
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }

    return () => {
      // Restore system UI when leaving screen
      StatusBar.setHidden(false);
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible');
      }
    };
  }, []);

  // =========================
  // REDUX COINS
  // =========================
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.profile);
  const SKIP_COST = 10;
  const coins = user?.coinsBalance ?? user?.coins ?? 0;

  const coinAnim = useRef(new Animated.Value(1)).current;

  const fetchUserProfile = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        return;
      }

      const response = await getUserProfile();
      if (response.success && response.data) {
        dispatch(setUser(response.data));
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [fetchUserProfile])
  );

  const deductCoins = async (amount: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await skipAdWithCoins(amount);
      
      if (response.success && response.data) {
        const updatedBalance = response.data.coinsBalance;
        dispatch(
          setUser({
            ...user,
            coinsBalance: updatedBalance,
            coins: updatedBalance,
          })
        );

        Animated.sequence([
          Animated.timing(coinAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(coinAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        return true;
      } else {
        Alert.alert('Error', response.message || 'Failed to deduct coins');
        return false;
      }
    } catch (error: any) {
      console.error('Error deducting coins:', error);
      
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || 'Insufficient coins';
        Alert.alert('Insufficient Coins', errorMessage);
      } else {
        Alert.alert('Error', 'Failed to deduct coins. Please try again.');
      }
      
      return false;
    }
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
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [showAdPopup, setShowAdPopup] = useState(false);
  const [shouldPlayAd, setShouldPlayAd] = useState(false);

  useEffect(() => {
    if (adReelIndexRef.current !== null && adReelIndexRef.current !== currentIndex) {
      adHandledRef.current = false;
      adReelIndexRef.current = null;
      setIsAdOpen(false);
    }
  }, [currentIndex]);

  useEffect(() => {
    const reel = reels[currentIndex];
    if (!reel) return;

    if (
      reel.adStatus === 'locked' &&
      !adHandledRef.current &&
      !isAdOpen
    ) {
      adHandledRef.current = true;
      adReelIndexRef.current = currentIndex;

      setIsAdOpen(true);
      setShowAdPopup(true);
      setShouldPlayAd(false);
    }
  }, [currentIndex, reels, isAdOpen]);

  const [targetVideoId, setTargetVideoId] = useState<string | null>(routeParams?.targetVideoId || null);
  const [resumeTime, setResumeTime] = useState<number>(routeParams?.resumeTime || 0);
  const [targetVideoFound, setTargetVideoFound] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);
  const scrollOffsetRef = useRef<number>(0);
  const [isScreenFocused, setIsScreenFocused] = useState(true);

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

  const findAndScrollToVideo = useCallback((videoId: string) => {
    if (!videoId || !flatListRef.current || targetVideoFound) return;
    
    const index = reels.findIndex((reel: Reel) => reel.id === videoId);
    if (index !== -1) {
      setCurrentIndex(index);
      setTargetVideoFound(true);
      if (reels.length > 0) {
        requestAnimationFrame(() => {
          if (flatListRef.current && reels.length > 0) {
            flatListRef.current.scrollToIndex({ index, animated: false });
          }
        });
      }
      return;
    }
    
    const fetchTargetVideo = async () => {
      try {
        const response = await videoService.getVideoById(videoId);
        if (response.success && response.data) {
          const targetReel = transformVideoToReel(response.data);
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

  useEffect(() => {
    if (routeParams?.targetVideoId) {
      const videoId = routeParams.targetVideoId;
      const resume = routeParams.resumeTime || 0;
      setTargetVideoId(videoId);
      setResumeTime(resume);
      setTargetVideoFound(false);
      setReels([]);
      setCurrentIndex(0);
      setPage(1);
      setHasMore(true);
    }
  }, [routeParams]);

  useEffect(() => {
    if (targetVideoId && reels.length > 0 && !targetVideoFound && !loading) {
      const timer = setTimeout(() => {
        findAndScrollToVideo(targetVideoId);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [targetVideoId, reels, targetVideoFound, findAndScrollToVideo, loading]);

  useEffect(() => {
    if (targetVideoId && !targetVideoFound && reels.length === 0) {
      const loadTargetVideoFirst = async () => {
        try {
          const response = await videoService.getVideoById(targetVideoId);
          if (response.success && response.data) {
            const targetReel = transformVideoToReel(response.data);
            setReels([targetReel]);
            setCurrentIndex(0);
            setTargetVideoFound(true);
            
            setTimeout(() => {
              if (flatListRef.current && reels.length > 0) {
                flatListRef.current.scrollToIndex({ index: 0, animated: false });
              }
            }, 100);
            
            setTimeout(() => {
              loadPage(1, { replace: false });
            }, 300);
          } else {
            loadPage(1, { replace: true });
          }
        } catch (error) {
          console.error('Error loading target video:', error);
          loadPage(1, { replace: true });
        }
      };
      
      loadTargetVideoFirst();
    } else if (!targetVideoId && reels.length === 0) {
      loadPage(1, { replace: true });
    }
  }, [targetVideoId]);

  const loadPage = useCallback(
    async (pageToLoad: number, opts?: { replace?: boolean }) => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await videoService.getWebseriesFeed(pageToLoad);
        if (res && res.success && Array.isArray(res.data)) {
          const transformed = res.data.map(transformVideoToReel);
          
          if (targetVideoId && !targetVideoFound) {
            const targetIndex = transformed.findIndex((reel: Reel) => reel.id === targetVideoId);
            if (targetIndex !== -1) {
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
              if (opts?.replace) {
                setReels(transformed);
                flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                setCurrentIndex(0);
              } else {
                setReels((prev) => [...prev, ...transformed]);
              }
            }
          } else {
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
  }, [loadingPrevious, page, transformVideoToReel, ITEM_HEIGHT]);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPage(1, { replace: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadPage]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (!viewableItems || viewableItems.length === 0) return;

      const first = viewableItems[0];
      if (typeof first.index !== 'number') return;

      if (
        prevIndexRef.current !== null &&
        first.index !== prevIndexRef.current
      ) {
        // handleEpisodeEnd();
      }

      prevIndexRef.current = first.index;
      setCurrentIndex(first.index);
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 100,
  }).current;

  const handleScroll = useCallback((evt: any) => {
    const offsetY = evt.nativeEvent.contentOffset.y;
    scrollOffsetRef.current = offsetY;
    if (offsetY < ITEM_HEIGHT * 1.5 && hasPrevious && !loadingPrevious && page > 1) {
      loadPrevious();
    }
  }, [hasPrevious, loadingPrevious, loadPrevious, page, ITEM_HEIGHT]);

  const onScrollToIndexFailed = useCallback((info: any) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
    });
  }, []);

  const goToNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      }, 100);
    } else if (hasMore) {
      loadMore();
    }
  }, [currentIndex, reels.length, hasMore, loadMore]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      }, 100);
    } else if (hasPrevious && page > 1) {
      loadPrevious();
    }
  }, [currentIndex, hasPrevious, page, loadPrevious]);

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [ITEM_HEIGHT]
  );

  const renderItem = useCallback(({ item, index }: { item: Reel; index: number }) => {
    const isTargetVideo = targetVideoId && item.id === targetVideoId && index === currentIndex;
    const initialTime = isTargetVideo ? resumeTime : 0;
    
    return (
      <View style={{ height: ITEM_HEIGHT }}>
        <ReelItem
          key={item.id}
          reel={item}
          isActive={index === currentIndex}
          initialTime={initialTime}
          screenFocused={isScreenFocused}
          shouldPause={showAdPopup}
          onEpisodeSelect={(episodeId) => {
            const episodeIndex = reels.findIndex(r => r.id === episodeId);
            if (episodeIndex !== -1) {
              setCurrentIndex(episodeIndex);
              setTargetVideoId(episodeId);
              setResumeTime(0);
              setTargetVideoFound(false);
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: episodeIndex, animated: false });
              }, 100);
            }
          }}
        />
      </View>
    );
  }, [currentIndex, targetVideoId, resumeTime, isScreenFocused, reels, showAdPopup, ITEM_HEIGHT]);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  const handleBackPress = () => {
    navigation.navigate('Home');
  };

  const handleShare = useCallback(async () => {
    const currentReel = reels[currentIndex];
    if (!currentReel) return;
    
    try {
      const shareMessage = `Check out "${currentReel.title}" on Digital Kalakar! 🎬\n\n${currentReel.description || 'Watch now!'}`;
      await Share.share({
        message: shareMessage,
        title: currentReel.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [reels, currentIndex]);

  if (loading && reels.length === 0) {
    return (
      <View style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.yellow} />
        <Text style={styles.loadingText}>Loading reels…</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      {/* Top Header - Fixed position with absolute */}
      <View style={[backButtonStyles.topHeader, {
        top: insets.top + (Platform.OS === 'ios' ? 8 : 12),
        left: insets.left + 16,
        right: insets.right + 16,
      }]}>
        <TouchableOpacity
          onPress={handleBackPress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleShare}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-redo-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

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
            <ActivityIndicator size="small" color={colors.yellow} />
          </View>
        ) : null}
      />
      
      <RewardedEpisodeAd
        show={shouldPlayAd}
        onAdFinished={() => {
          setReels(prev =>
            prev.map((r, i) =>
              i === currentIndex ? { ...r, adStatus: 'unlocked' } : r
            )
          );

          setShowAdPopup(false);
          setIsAdOpen(false);
          setShouldPlayAd(false);
        }}
      />

      {showAdPopup && (
        <Modal visible={showAdPopup} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.6)',
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                width: '100%',
                minHeight: '55%',
                backgroundColor: '#121212',
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

              <Pressable
                disabled={coins < SKIP_COST}
                onPress={async () => {
                  if (coins < SKIP_COST) {
                    Alert.alert('Insufficient Coins', `You need ${SKIP_COST} coins to skip. You have ${coins} coins.`);
                    return;
                  }
                  
                  const success = await deductCoins(SKIP_COST);
                  
                  if (success) {
                    setReels(prev =>
                      prev.map((reel, index) =>
                        index === currentIndex
                          ? { ...reel, adStatus: 'unlocked' }
                          : reel
                      )
                    );
            
                    setShowAdPopup(false);
                    setIsAdOpen(false);
                    setShouldPlayAd(false);
                    adHandledRef.current = true;
                  }
                }}
                style={({ pressed }) => ({
                  marginTop: 26,
                  paddingVertical: 16,
                  borderRadius: 16,
                  backgroundColor: coins >= SKIP_COST ? '#FFD54A' : '#333',
                  opacity: pressed ? 0.8 : 1,
                })}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontWeight: '800',
                    fontSize: 16,
                    color: coins >= SKIP_COST ? '#000' : '#666',
                  }}
                >
                  Skip using {SKIP_COST} coins
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowAdPopup(false);
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
      )}
    </View>
  );
};

const backButtonStyles = StyleSheet.create({
  topHeader: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10000,
    pointerEvents: 'box-none',
    elevation: 1000,
  },
});

export default ReelPlayerScreen;
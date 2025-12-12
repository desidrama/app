// ============================================ 
// FILE: src/screens/home/ReelPlayerScreen.tsx
// Updated to fetch webseries from backend and display in reels feed
// ============================================

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Share,
  FlatList,
  Image,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { videoService } from '../../services/video.service';
import { Video as VideoType } from '../../types';
import { getUserProfile } from '../../services/api';
import { setUser } from '../../redux/slices/userSlice';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ReelPlayerProps = {
  navigation?: any;
};

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

// ---- MOCK DATA FOR INFO SHEET ----
const MOCK_CAST = [
  { id: '1', name: 'Laura Dern', image: 'https://picsum.photos/80/80?random=11' },
  { id: '2', name: 'Jeff Goldblum', image: 'https://picsum.photos/80/80?random=12' },
  { id: '3', name: 'Sam Neill', image: 'https://picsum.photos/80/80?random=13' },
  { id: '4', name: 'Richard A.', image: 'https://picsum.photos/80/80?random=14' },
];

const MOCK_EPISODES = [
  {
    id: 'e1',
    title: 'A Wednesday',
    desc: 'Learning to tap into her powers as a psychic while unraveling mystery after.',
    image: 'https://picsum.photos/160/90?random=21',
  },
  {
    id: 'e2',
    title: 'Magician',
    desc: 'Learning to tap into her powers as a psychic while unraveling mystery after.',
    image: 'https://picsum.photos/160/90?random=22',
  },
  {
    id: 'e3',
    title: 'The Knight',
    desc: 'Learning to tap into her powers as a psychic while unraveling mystery after.',
    image: 'https://picsum.photos/160/90?random=23',
  },
];

const MOCK_MORE_LIKE = [
  { id: 'm1', image: 'https://picsum.photos/90/130?random=31' },
  { id: 'm2', image: 'https://picsum.photos/90/130?random=32' },
  { id: 'm3', image: 'https://picsum.photos/90/130?random=33' },
];

const EPISODE_RANGES = [
  { id: '1-18', label: '1 - 18', start: 1, end: 18 },
  { id: '19-41', label: '19 - 41', start: 19, end: 41 },
  { id: '41-62', label: '41 - 62', start: 41, end: 62 },
  { id: '62-83', label: '62 - 83', start: 62, end: 83 },
];

const TOTAL_EPISODES = 18; // mock

const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0] as const;
const QUALITY_OPTIONS = ['Auto', '480p', '720p', '1080p'] as const;
type Quality = (typeof QUALITY_OPTIONS)[number];

const PROGRESS_SAVE_INTERVAL_SECONDS = 2; // Save every 2 seconds for smoother tracking
const MIN_RESUME_SECONDS = 3;
const PERIODIC_SAVE_INTERVAL_MS = 3000; // Save every 3 seconds regardless of status updates

type Comment = {
  id: string;
  user: string;
  text: string;
};

const ReelPlayerScreen: React.FC<ReelPlayerProps> = ({ navigation }) => {
  const route = useRoute<any>();
  const tabNavigation = useNavigation<any>();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1); // Start at -1, will be set when reels load or target is found
  const [currentResumeTime, setCurrentResumeTime] = useState<number | undefined>(undefined); // Track resume time for current reel
  const flatListRef = useRef<FlatList>(null);
  const scrollOffsetRef = useRef(0);
  const previousReelsCountRef = useRef(0);
  const pendingTargetRef = useRef<{ id: string; resumeTime?: number } | null>(null);
  const isJumpingRef = useRef(false);

  useEffect(() => {
    loadWebseries();
  }, []);

  // Capture navigation params to jump to a specific reel (from Continue Watching)
  useEffect(() => {
    const targetVideoId = (route.params as any)?.targetVideoId;
    const resumeTime = (route.params as any)?.resumeTime;
    if (targetVideoId) {
      const normalizedId = String(targetVideoId).trim();
      console.log(`🎯🎯🎯 NAVIGATION TARGET RECEIVED: ${normalizedId}, resumeTime: ${resumeTime}`);
      
      // Always set new target, even if there was a previous one
      // This ensures subsequent clicks work correctly
      const previousTarget = pendingTargetRef.current?.id;
      if (previousTarget && previousTarget !== normalizedId) {
        console.log(`🔄 NEW TARGET RECEIVED: Previous was ${previousTarget}, new is ${normalizedId}`);
      }
      
      // Store the exact target ID and reset jumping flag
      pendingTargetRef.current = { id: normalizedId, resumeTime };
      isJumpingRef.current = false; // Reset jumping flag for new target
      
      // Force the jump logic to re-run by clearing and re-setting
      console.log(`✅ Target set in pendingTargetRef: ${normalizedId}`);
    } else {
      // Only clear if we explicitly navigate away (no targetVideoId)
      // Don't clear on initial mount
    }
  }, [route.params]);

  // Also listen for screen focus to handle navigation
  useFocusEffect(
    React.useCallback(() => {
      const targetVideoId = (route.params as any)?.targetVideoId;
      const resumeTime = (route.params as any)?.resumeTime;
      if (targetVideoId) {
        const normalizedId = String(targetVideoId).trim();
        console.log(`🎯 Screen focused with target: ${normalizedId}`);
        
        // Always update target on focus, even if it's the same
        // This ensures navigation works when coming back to the screen
        pendingTargetRef.current = { id: normalizedId, resumeTime };
        isJumpingRef.current = false; // Reset to allow new jump
        console.log(`✅ Target updated on focus: ${normalizedId}`);
      }
    }, [route.params])
  );

  // When reels list updates, attempt to jump to pending target (e.g., from Home continue watching)
  useEffect(() => {
    if (!pendingTargetRef.current) {
      console.log(`⏸️ No pending target, skipping jump logic`);
      return;
    }
    if (reels.length === 0 || loading) {
      console.log(`⏸️ Reels not ready (length: ${reels.length}, loading: ${loading}), skipping jump logic`);
      return;
    }
    
    // If jump is in progress, wait a bit and retry
    if (isJumpingRef.current) {
      console.log(`⏸️ Jump already in progress, will retry...`);
      const retryTimeout = setTimeout(() => {
        if (pendingTargetRef.current && !isJumpingRef.current) {
          console.log(`🔄 Retrying jump after previous attempt`);
          // Force re-evaluation by toggling a dependency
        }
      }, 500);
      return () => clearTimeout(retryTimeout);
    }

    const targetId = pendingTargetRef.current.id;
    // Robust ID normalization - handle ObjectId, string, etc.
    const normalizeId = (id: any): string => {
      if (!id) return '';
      // Handle MongoDB ObjectId
      if (typeof id === 'object' && id.toString) {
        return String(id.toString()).trim();
      }
      return String(id).trim();
    };
    const targetIdNormalized = normalizeId(targetId);
    
    console.log(`🔍🔍🔍 SEARCHING FOR TARGET VIDEO`);
    console.log(`   Target ID (raw): ${targetId}`);
    console.log(`   Target ID (normalized): ${targetIdNormalized}`);
    console.log(`   Searching in ${reels.length} reels`);
    console.log(`   Available reel IDs: ${reels.map((r, idx) => `${idx}: ${normalizeId(r.id)} (${r.title})`).join(', ')}`);
    
    // Check if target video is in the current reels list
    const targetIndex = reels.findIndex((r, idx) => {
      const reelId = normalizeId(r.id);
      const matches = reelId === targetIdNormalized;
      if (matches) {
        console.log(`✅✅✅ FOUND EXACT MATCH at index ${idx}: ${reelId} === ${targetIdNormalized} (${r.title})`);
      }
      return matches;
    });
    
    if (targetIndex >= 0) {
      // Video found in list, jump to it directly
      const video = reels[targetIndex];
      const resumeTime = pendingTargetRef.current?.resumeTime;
      console.log(`✅✅✅ TARGET VIDEO FOUND at index ${targetIndex}: ${video.title} (ID: ${video.id}), Resume: ${resumeTime}s`);
      
      // Verify it's the exact video
      if (normalizeId(video.id) !== targetIdNormalized) {
        console.error(`❌❌❌ MISMATCH! Video at index ${targetIndex} has ID ${video.id} but we're looking for ${targetIdNormalized}`);
        return;
      }
      
      // Set jumping flag to prevent duplicate attempts and prevent other logic from interfering
      isJumpingRef.current = true;
      
      // Set current index and resume time immediately - this MUST be the video we want
      console.log(`🎯🎯🎯 SETTING TARGET VIDEO: Index ${targetIndex}, Title: ${video.title}, ID: ${normalizeId(video.id)}`);
      setCurrentIndex(targetIndex);
      setCurrentResumeTime(resumeTime);
      console.log(`📍 Set currentIndex to ${targetIndex}, resumeTime to ${resumeTime}s`);
      
      // Force a small delay to ensure state is set before scrolling
      setTimeout(() => {
        // Scroll to target with retry logic
        const attemptScroll = (attempt = 0) => {
          if (attempt > 4) {
          console.error(`❌ Failed to scroll after 4 attempts, using offset fallback`);
          // Final fallback: use scrollToOffset
          const offset = targetIndex * SCREEN_HEIGHT;
          flatListRef.current?.scrollToOffset({
            offset: offset,
            animated: true,
          });
          setTimeout(() => {
            pendingTargetRef.current = null;
            isJumpingRef.current = false;
            tabNavigation.setParams?.({ targetVideoId: undefined, resumeTime: undefined, progress: undefined });
          }, 500);
          return;
        }

        setTimeout(() => {
          try {
            if (!flatListRef.current) {
              console.log(`⏳ FlatList not ready, retrying... (attempt ${attempt + 1})`);
              attemptScroll(attempt + 1);
              return;
            }

            // Verify currentIndex is still set to target (check state, not closure)
            // We'll verify after scroll
            
            // Try scrollToIndex first
            flatListRef.current.scrollToIndex({
              index: targetIndex,
              animated: attempt === 0,
            });
            
            console.log(`✅✅✅ SUCCESSFULLY SCROLLED to index ${targetIndex}: ${video.title} (ID: ${normalizeId(video.id)})`);
            
            // Clear after successful scroll - but only if this was the target we just jumped to
            setTimeout(() => {
              // Verify we're still on the target we jumped to (might have changed if user clicked another video)
              const currentTargetId = pendingTargetRef.current?.id;
              if (currentTargetId === targetIdNormalized) {
                console.log(`🧹 Clearing pending target after successful jump to ${targetIdNormalized}`);
                pendingTargetRef.current = null;
                isJumpingRef.current = false;
                tabNavigation.setParams?.({ targetVideoId: undefined, resumeTime: undefined, progress: undefined });
              } else {
                console.log(`⚠️ Target changed during jump (current: ${currentTargetId}, jumped to: ${targetIdNormalized}), keeping new target`);
                isJumpingRef.current = false; // Still clear jumping flag to allow new jump
              }
            }, 500);
          } catch (error: any) {
            console.log(`⚠️ Scroll attempt ${attempt + 1} failed:`, error?.message || error);
            // Retry with scrollToOffset as fallback
            if (attempt >= 2) {
              const offset = targetIndex * SCREEN_HEIGHT;
              try {
                flatListRef.current?.scrollToOffset({
                  offset: offset,
                  animated: true,
                });
                console.log(`✅ Used scrollToOffset fallback to index ${targetIndex}`);
                setTimeout(() => {
                  pendingTargetRef.current = null;
                  isJumpingRef.current = false;
                  tabNavigation.setParams?.({ targetVideoId: undefined, resumeTime: undefined, progress: undefined });
                }, 500);
              } catch (offsetError) {
                attemptScroll(attempt + 1);
              }
            } else {
              attemptScroll(attempt + 1);
            }
          }
        }, attempt === 0 ? 300 : 400);
        };

        attemptScroll();
      }, 100); // Small delay to ensure currentIndex is set
    } else {
      // Video not found, fetch it
      console.log(`🔍 Target video ${targetIdNormalized} not found in current reels, fetching...`);
      isJumpingRef.current = true;
      
      const fetchAndAddVideo = async () => {
        try {
          const response = await videoService.getVideoById(targetId);
          if (response.success && response.data) {
            const video = response.data;
            const videoUrl = video.masterPlaylistUrl || video.variants?.[0]?.url || '';
            
            if (!videoUrl) {
              console.error(`❌ No video URL found for ${targetId}`);
              isJumpingRef.current = false;
              return;
            }

            const formatDuration = (seconds: number) => {
              if (!seconds) return '0m';
              const hours = Math.floor(seconds / 3600);
              const minutes = Math.floor((seconds % 3600) / 60);
              if (hours > 0) {
                return `${hours}h ${minutes}m`;
              }
              return `${minutes}m`;
            };

            const newReel: Reel = {
              id: video._id,
              title: video.title || 'Untitled',
              year: new Date(video.createdAt).getFullYear().toString(),
              rating: video.ageRating || 'UA 16+',
              duration: formatDuration(video.duration || 0),
              durationSeconds: video.duration || 0,
              videoUrl,
              initialLikes: video.likes || 0,
              description: video.description,
              seasonId: video.seasonId,
              episodeNumber: video.episodeNumber,
              thumbnailUrl: video.thumbnailUrl || video.thumbnail,
            };

            // Add to reels - the useEffect will re-run and find it
            setReels(prev => {
              const exists = prev.some(r => normalizeId(r.id) === normalizeId(newReel.id));
              if (!exists) {
                console.log(`✅ Fetched video ${newReel.title} and adding to reels.`);
                return [newReel, ...prev];
              }
              console.log(`⚠️ Fetched video ${newReel.title} already exists, not adding.`);
              return prev;
            });
            // Reset jumping flag so useEffect can handle the jump
            isJumpingRef.current = false;
            console.log(`⏳ State updated, useEffect will re-evaluate for jump.`);
          } else {
            console.error(`❌ Failed to fetch target video ${targetId}`);
            isJumpingRef.current = false;
          }
        } catch (error) {
          console.error(`❌ Error fetching target video ${targetId}:`, error);
          isJumpingRef.current = false;
        }
      };
      
      fetchAndAddVideo();
    }
  }, [reels, loading, route.params?.targetVideoId]); // Re-run when targetVideoId in route params changes

  const loadWebseries = async () => {
    try {
      setLoading(true);
      const response = await videoService.getWebseriesFeed(page);
      
      if (response.success && response.data) {
        // Transform backend video data to Reel format
        const transformedReels: Reel[] = response.data.map((video: VideoType) => {
          // Get video URL - prefer masterPlaylistUrl, fallback to best variant
          let videoUrl = video.masterPlaylistUrl || '';
          if (!videoUrl && video.variants && video.variants.length > 0) {
            // Prefer 720p, then 1080p, then 480p, then 360p
            const preferredOrder = ['720p', '1080p', '480p', '360p'];
            for (const res of preferredOrder) {
              const variant = video.variants.find(v => v.resolution === res);
              if (variant) {
                videoUrl = variant.url;
                break;
              }
            }
            // If no preferred resolution found, use first available
            if (!videoUrl) {
              videoUrl = video.variants[0].url;
            }
          }

          // Format duration
          const formatDuration = (seconds: number) => {
            if (!seconds) return '0m';
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            if (hours > 0) {
              return `${hours}h ${minutes}m`;
            }
            return `${minutes}m`;
          };

          return {
            id: video._id,
            title: video.title || 'Untitled',
            year: new Date(video.createdAt).getFullYear().toString(),
            rating: video.ageRating || 'UA 16+',
            duration: formatDuration(video.duration || 0),
            durationSeconds: video.duration || 0,
            videoUrl,
            initialLikes: video.likes || 0,
            description: video.description,
            seasonId: video.seasonId,
            episodeNumber: video.episodeNumber,
            thumbnailUrl: video.thumbnailUrl || video.thumbnail,
          };
        });

        if (page === 1) {
          setReels(transformedReels);
          setHasPrevious(false); // First page, no previous content
          // Don't set currentIndex to 0 if we have a pending target
          if (!pendingTargetRef.current) {
            setCurrentIndex(0);
          }
        } else {
          setReels(prev => [...prev, ...transformedReels]);
        }

        setHasMore(response.pagination?.hasMore || false);
        // Update hasPrevious based on response or current page
        // If we're on page 1, there's no previous. Otherwise, there is.
        const currentPage = page;
        setHasPrevious(response.pagination?.hasPrevious !== undefined 
          ? response.pagination.hasPrevious 
          : currentPage > 1);

        // Note: The useEffect that watches 'reels' will handle jumping to pending target
      }
    } catch (error) {
      console.error('Error loading webseries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrevious = async () => {
    if (loadingPrevious || !hasPrevious || page <= 1) return;

    const previousPage = page - 1;
    try {
      setLoadingPrevious(true);
      const response = await videoService.getWebseriesFeed(previousPage);
      
      if (response.success && response.data) {
        const transformedReels: Reel[] = response.data.map((video: VideoType) => {
          let videoUrl = video.masterPlaylistUrl || '';
          if (!videoUrl && video.variants && video.variants.length > 0) {
            const preferredOrder = ['720p', '1080p', '480p', '360p'];
            for (const res of preferredOrder) {
              const variant = video.variants.find(v => v.resolution === res);
              if (variant) {
                videoUrl = variant.url;
                break;
              }
            }
            if (!videoUrl) {
              videoUrl = video.variants[0].url;
            }
          }

          const formatDuration = (seconds: number) => {
            if (!seconds) return '0m';
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            if (hours > 0) {
              return `${hours}h ${minutes}m`;
            }
            return `${minutes}m`;
          };

          return {
            id: video._id,
            title: video.title || 'Untitled',
            year: new Date(video.createdAt).getFullYear().toString(),
            rating: video.ageRating || 'UA 16+',
            duration: formatDuration(video.duration || 0),
            durationSeconds: video.duration || 0,
            videoUrl,
            initialLikes: video.likes || 0,
            description: video.description,
            seasonId: video.seasonId,
            episodeNumber: video.episodeNumber,
            thumbnailUrl: video.thumbnailUrl || video.thumbnail,
          };
        });

        // Store current scroll position
        previousReelsCountRef.current = reels.length;
        
        // Prepend new reels to the beginning
        setReels(prev => [...transformedReels, ...prev]);
        setPage(previousPage);
        // Update hasPrevious - can load more previous if not on page 1
        setHasPrevious(previousPage > 1);
        
        // Also update hasMore - we can still load forward
        setHasMore(response.pagination?.hasMore !== undefined 
          ? response.pagination.hasMore 
          : true);

        // Adjust scroll position to maintain user's view
        // Wait for next frame to ensure list has updated
        requestAnimationFrame(() => {
          if (flatListRef.current) {
            const newItemsHeight = transformedReels.length * SCREEN_HEIGHT;
            flatListRef.current.scrollToOffset({
              offset: scrollOffsetRef.current + newItemsHeight,
              animated: false,
            });
          }
        });
      }
    } catch (error) {
      console.error('Error loading previous webseries:', error);
    } finally {
      setLoadingPrevious(false);
    }
  };

  const loadMore = async () => {
    // Prevent multiple simultaneous loads
    if (loading || loadingPrevious || !hasMore) {
      return;
    }

    const nextPage = page + 1;
    try {
      setLoading(true);
      const response = await videoService.getWebseriesFeed(nextPage);
      
      if (response.success && response.data) {
        const transformedReels: Reel[] = response.data.map((video: VideoType) => {
          let videoUrl = video.masterPlaylistUrl || '';
          if (!videoUrl && video.variants && video.variants.length > 0) {
            const preferredOrder = ['720p', '1080p', '480p', '360p'];
            for (const res of preferredOrder) {
              const variant = video.variants.find(v => v.resolution === res);
              if (variant) {
                videoUrl = variant.url;
                break;
              }
            }
            if (!videoUrl) {
              videoUrl = video.variants[0].url;
            }
          }

          const formatDuration = (seconds: number) => {
            if (!seconds) return '0m';
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            if (hours > 0) {
              return `${hours}h ${minutes}m`;
            }
            return `${minutes}m`;
          };

          return {
            id: video._id,
            title: video.title || 'Untitled',
            year: new Date(video.createdAt).getFullYear().toString(),
            rating: video.ageRating || 'UA 16+',
            duration: formatDuration(video.duration || 0),
            videoUrl,
            initialLikes: video.likes || 0,
            description: video.description,
            seasonId: video.seasonId,
            episodeNumber: video.episodeNumber,
            thumbnailUrl: video.thumbnailUrl || video.thumbnail,
          };
        });

        if (transformedReels.length > 0) {
          setReels(prev => [...prev, ...transformedReels]);
          setPage(nextPage);
          const stillHasMore = response.pagination?.hasMore || false;
          setHasMore(stillHasMore);
          // When loading more, we can now scroll back (hasPrevious becomes true)
          setHasPrevious(true);
          
          // Auto-load next page if there's more content and we got a full page
          // This ensures continuous loading when all episodes finish
          if (stillHasMore && transformedReels.length === 15) {
            // Small delay to prevent too rapid loading, then auto-load next page
            setTimeout(() => {
              // Use stillHasMore from closure instead of state
              if (stillHasMore) {
                loadMore();
              }
            }, 800);
          }
        } else {
          // No more content
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more webseries:', error);
      // Don't set hasMore to false on error, allow retry
    } finally {
      setLoading(false);
    }
  };

  // Handle viewability change to track which video should play
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    // Don't update currentIndex if we have a pending target jump
    if (pendingTargetRef.current || isJumpingRef.current) {
      console.log(`⏸️ Skipping viewable items update - jump in progress`);
      return;
    }
    
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== null && newIndex !== currentIndex) {
        // Use a small delay to prevent rapid index changes
        setTimeout(() => {
          setCurrentIndex(newIndex);
        }, 50);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70, // Increased threshold for more stable detection
    minimumViewTime: 100, // Minimum time item must be visible
  }).current;

  // Handle scroll to detect when user is near the top
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollOffsetRef.current = offsetY;
    
    // Load previous content when user scrolls near the top (within 1.5 screen heights)
    // This ensures we load before user reaches the very top
    if (offsetY < SCREEN_HEIGHT * 1.5 && hasPrevious && !loadingPrevious && !loading && page > 1) {
      loadPrevious();
    }
  };

  const jumpToTargetIfNeeded = async (targetId?: string) => {
    if (!targetId) return;
    
    // Prevent duplicate jump attempts
    if (isJumpingRef.current) {
      console.log(`⏸️ Jump already in progress for ${targetId}, skipping...`);
      return;
    }
    
    isJumpingRef.current = true;

    // Normalize IDs for comparison (handle both string and ObjectId)
    const normalizeId = (id: string) => String(id).trim();
    const targetIdNormalized = normalizeId(targetId);

    // First, try to find in current reels - use the most up-to-date reels array
    // We need to check again in case reels were updated
    let targetIndex = reels.findIndex(r => normalizeId(r.id) === targetIdNormalized);
    
    console.log(`🔍 Searching for video ${targetIdNormalized} in ${reels.length} reels...`);
    if (targetIndex >= 0) {
      console.log(`✅ Found target video at index ${targetIndex}: ${reels[targetIndex].title}`);
    }
    
    // If not found in current reels, fetch the video directly
    if (targetIndex === -1) {
      console.log(`🎯 Target video ${targetId} not found in current reels, fetching...`);
      try {
        const response = await videoService.getVideoById(targetId);
        if (response.success && response.data) {
          const video = response.data;
          
          // Transform to Reel format
          let videoUrl = video.masterPlaylistUrl || '';
          if (!videoUrl && video.variants && video.variants.length > 0) {
            const preferredOrder = ['720p', '1080p', '480p', '360p'];
            for (const res of preferredOrder) {
              const variant = video.variants.find((v: any) => v.resolution === res);
              if (variant) {
                videoUrl = variant.url;
                break;
              }
            }
            if (!videoUrl) {
              videoUrl = video.variants[0].url;
            }
          }

          const formatDuration = (seconds: number) => {
            if (!seconds) return '0m';
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            if (hours > 0) {
              return `${hours}h ${minutes}m`;
            }
            return `${minutes}m`;
          };

          const newReel: Reel = {
            id: video._id,
            title: video.title || 'Untitled',
            year: new Date(video.createdAt).getFullYear().toString(),
            rating: video.ageRating || 'UA 16+',
            duration: formatDuration(video.duration || 0),
            durationSeconds: video.duration || 0,
            videoUrl,
            initialLikes: video.likes || 0,
            description: video.description,
            seasonId: video.seasonId,
            episodeNumber: video.episodeNumber,
            thumbnailUrl: video.thumbnailUrl || video.thumbnail,
          };

          // Check if video already exists to avoid duplicates
          setReels(prev => {
            const existsIndex = prev.findIndex(r => normalizeId(r.id) === targetIdNormalized);
            if (existsIndex === -1) {
              // Insert at the beginning of the reels list
              console.log(`✅ Target video fetched and will be inserted at index 0`);
              return [newReel, ...prev];
            } else {
              console.log(`✅ Target video already exists at index ${existsIndex}`);
              return prev; // Don't modify if it already exists
            }
          });
          
          // After updating state, let the useEffect handle finding and jumping
          // Reset the jumping flag so useEffect can handle it
          isJumpingRef.current = false;
          console.log(`⏳ State updated, waiting for useEffect to handle jump...`);
          return; // Exit early, let useEffect handle the jump
        } else {
          console.error(`❌ Failed to fetch target video ${targetId}`);
          isJumpingRef.current = false;
          return;
        }
      } catch (error) {
        console.error(`❌ Error fetching target video ${targetId}:`, error);
        isJumpingRef.current = false;
        return;
      }
    }

    // If we found the video in current reels, jump to it immediately
    if (targetIndex >= 0 && targetIndex < reels.length) {
      // Verify the video at this index is correct
      const videoAtTarget = reels[targetIndex];
      if (normalizeId(videoAtTarget.id) === targetIdNormalized) {
        console.log(`🎯 Jumping to video at index ${targetIndex}: ${videoAtTarget.title}`);
        setCurrentIndex(targetIndex);
      } else {
        console.error(`❌ Video at index ${targetIndex} (${videoAtTarget.id}) does not match target ${targetIdNormalized}`);
        isJumpingRef.current = false;
        return;
      }
    } else {
      console.error(`❌ Invalid target index: ${targetIndex} (reels length: ${reels.length})`);
      isJumpingRef.current = false;
      return;
    }
    
    // Use multiple attempts to ensure scrolling works
    const attemptScroll = (attempt = 0) => {
      if (attempt > 5) {
        console.error(`❌ Failed to scroll to index ${targetIndex} after 5 attempts`);
        // Clear pending target even on failure to prevent infinite loops
        pendingTargetRef.current = null;
        isJumpingRef.current = false;
        tabNavigation.setParams?.({ targetVideoId: undefined, resumeTime: undefined, progress: undefined });
        return;
      }

      try {
        if (!flatListRef.current) {
          setTimeout(() => attemptScroll(attempt + 1), 100);
          return;
        }

        flatListRef.current.scrollToIndex({
          index: targetIndex,
          animated: attempt === 0, // Only animate first attempt
        });
        
        console.log(`✅ Successfully scrolled to index ${targetIndex} (attempt ${attempt + 1})`);
        
        // Clear pending target and route params after successful scroll
        setTimeout(() => {
          pendingTargetRef.current = null;
          isJumpingRef.current = false;
          tabNavigation.setParams?.({ targetVideoId: undefined, resumeTime: undefined, progress: undefined });
        }, 300);
      } catch (error: any) {
        console.log(`⚠️ Scroll attempt ${attempt + 1} failed:`, error?.message || error);
        setTimeout(() => attemptScroll(attempt + 1), 150);
      }
    };

    // Start scrolling attempt
    setTimeout(() => {
      requestAnimationFrame(() => {
        attemptScroll();
      });
    }, 100);
  };

  if (loading && reels.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFD54A" />
        <Text style={styles.loadingText}>Loading webseries...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          console.log('⚠️ Scroll to index failed:', info);
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            // Fallback: scroll to offset
            const offset = info.index * SCREEN_HEIGHT;
            flatListRef.current?.scrollToOffset({
              offset: offset,
              animated: true,
            });
            console.log(`✅ Fallback scroll to offset ${offset} for index ${info.index}`);
          });
        }}
        renderItem={({ item, index }) => {
          const isActiveItem = index === currentIndex;
          return (
            <ReelItem 
              reel={item} 
              navigation={navigation} 
              isActive={isActiveItem}
              {...(isActiveItem && currentResumeTime !== undefined ? { resumeTime: currentResumeTime } : {})}
              key={item.id}
            />
          );
        }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        updateCellsBatchingPeriod={50}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          loadingPrevious ? (
            <View style={styles.headerLoader}>
              <ActivityIndicator size="small" color="#FFD54A" />
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#FFD54A" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default ReelPlayerScreen;

/**
 * Single full-screen reel item
 * Memoized to prevent unnecessary re-renders
 */
const ReelItem = React.memo<{ reel: Reel; navigation?: any; isActive?: boolean; resumeTime?: number }>(({
  reel,
  navigation,
  isActive = false,
  resumeTime = undefined,
}) => {
  const dispatch = useDispatch();
  const videoRef = useRef<Video | null>(null);
  const lastSavedProgressRef = useRef(0);
  const resumePositionRef = useRef(0);
  const hasFetchedResumeRef = useRef(false);
  const pendingSeekRef = useRef(false);
  const isCompletedRef = useRef(false);

  const [currentEpisode, setCurrentEpisode] = useState(reel.episodeNumber || 1);
  const [likes, setLikes] = useState(reel.initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [showReactions, setShowReactions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [quality, setQuality] = useState<Quality>('Auto');

  const [activeRangeId, setActiveRangeId] = useState(EPISODE_RANGES[0].id);
  const [showEpisodesSheet, setShowEpisodesSheet] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  
  // Real episodes from database
  const [seasonEpisodes, setSeasonEpisodes] = useState<VideoType[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // comments
  const [comments, setComments] = useState<Comment[]>([
    { id: 'c1', user: 'Amit', text: 'Family movie night favourite 🍿' },
    { id: 'c2', user: 'Priya', text: 'Kids loved the dinosaurs!' },
  ]);
  const [newComment, setNewComment] = useState('');

  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const infoTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Store last known position and duration for cleanup saves
  const lastKnownPositionRef = useRef(0);
  const lastKnownDurationRef = useRef(0);
  const saveInProgressRef = useRef(false);
  const pendingSaveRef = useRef<{ position: number; duration: number } | null>(null);

  // Reset progress trackers when reel changes
  useEffect(() => {
    hasFetchedResumeRef.current = false;
    resumePositionRef.current = 0;
    pendingSeekRef.current = false;
    lastSavedProgressRef.current = 0;
    lastKnownPositionRef.current = 0;
    lastKnownDurationRef.current = 0;
    isCompletedRef.current = false;
    saveInProgressRef.current = false;
    pendingSaveRef.current = null;
  }, [reel.id]);

  // Handle video playback based on isActive prop
  useEffect(() => {
    if (!videoRef.current) return;

    const controlPlayback = async () => {
      try {
        if (isActive) {
          // Small delay to ensure previous video has released focus
          await new Promise(resolve => setTimeout(resolve, 100));
          await videoRef.current?.playAsync();
        } else {
          // CRITICAL: Pause video immediately when not active
          // This prevents background playback and progress saving
          await videoRef.current?.pauseAsync();
          // Also stop updating position when paused
          console.log(`⏸️ Video paused for ${reel.title} (isActive: false)`);
        }
      } catch (error: any) {
        // Ignore audio focus errors - they're expected when switching videos quickly
        if (error?.message?.includes('AudioFocusNotAcquired')) {
          // Retry after a short delay
          setTimeout(async () => {
            try {
              if (isActive && videoRef.current) {
                await videoRef.current?.playAsync();
              } else if (!isActive && videoRef.current) {
                // Make sure it's paused if not active
                await videoRef.current?.pauseAsync();
              }
            } catch (retryError) {
              // Silently ignore retry errors
            }
          }, 300);
        } else {
          console.error('Error controlling playback:', error);
        }
      }
    };

    controlPlayback();
  }, [isActive, reel.id]);

  // Load saved watch progress when reel becomes active
  useEffect(() => {
    if (!isActive || hasFetchedResumeRef.current) return;

    const loadResumePoint = async () => {
      try {
        // If resumeTime is provided from navigation (continue watching), use that first
        if (resumeTime !== undefined && resumeTime > MIN_RESUME_SECONDS) {
          console.log(`⏱️ Using resumeTime from navigation: ${resumeTime}s`);
          resumePositionRef.current = resumeTime;
          pendingSeekRef.current = true; // Will be handled in onLoad
        } else {
          // Otherwise, load from database
          const response = await videoService.getWatchProgress(reel.id);
          const resumeSeconds = response?.data?.currentTime || 0;

          if (response?.success && resumeSeconds > MIN_RESUME_SECONDS) {
            resumePositionRef.current = resumeSeconds;
            pendingSeekRef.current = true; // Will be handled in onLoad
            console.log(`📀 Loaded resume position from database: ${resumeSeconds}s`);
          }
        }
      } catch (error) {
        console.error('Error loading resume point:', error);
      } finally {
        hasFetchedResumeRef.current = true;
      }
    };

    loadResumePoint();
  }, [isActive, reel.id, resumeTime]);

  // Load episodes from season when episodes sheet opens
  const loadSeasonEpisodes = async () => {
    if (!reel.seasonId) return;
    
    try {
      setLoadingEpisodes(true);
      const seasonId = typeof reel.seasonId === 'object' ? reel.seasonId._id : reel.seasonId;
      const response = await videoService.getEpisodes(seasonId);
      
      if (response.success && response.data) {
        setSeasonEpisodes(response.data);
      }
    } catch (error) {
      console.error('Error loading season episodes:', error);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const persistProgress = async (positionSeconds: number, durationSeconds?: number, forceSave = false) => {
    // Store latest values for cleanup
    if (positionSeconds > 0) {
      lastKnownPositionRef.current = positionSeconds;
    }
    if (durationSeconds && durationSeconds > 0) {
      lastKnownDurationRef.current = durationSeconds;
    }

    // Try to get duration from video status if not provided
    let validDuration = durationSeconds && durationSeconds > 0 ? durationSeconds : lastKnownDurationRef.current;
    
    // If still no duration, try to get it from video ref
    if (!validDuration || validDuration <= 0) {
      try {
        const status = await videoRef.current?.getStatusAsync();
        if (status?.isLoaded && status.durationMillis) {
          validDuration = status.durationMillis / 1000;
          lastKnownDurationRef.current = validDuration;
        }
      } catch (error) {
        // Ignore errors getting status
      }
    }

    // Still need valid duration to save
    if (!validDuration || validDuration <= 0) {
      // Queue save for later if we have position but no duration yet
      if (positionSeconds >= MIN_RESUME_SECONDS) {
        pendingSaveRef.current = { position: positionSeconds, duration: 0 };
      }
      return; // Can't save without duration
    }

    // Only save if watched at least minimum time
    if (positionSeconds < MIN_RESUME_SECONDS) {
      return;
    }

    // Calculate progress percentage
    const progressPercent = (positionSeconds / validDuration) * 100;
    
    // Only save if progress is between 5% and 85%
    // Videos watched less than 5% or more than 85% should not appear in continue watching
    if (progressPercent < 5) {
      // Too little progress, don't save
      return;
    }
    
    if (progressPercent >= 85) {
      // Video is essentially completed, mark as completed and don't save
      isCompletedRef.current = true;
      return;
    }

    // Throttle saves unless forced
    if (!forceSave && positionSeconds - lastSavedProgressRef.current < PROGRESS_SAVE_INTERVAL_SECONDS) {
      return;
    }

    // If a save is already in progress, queue this one
    if (saveInProgressRef.current) {
      pendingSaveRef.current = { position: positionSeconds, duration: validDuration };
      return;
    }

    saveInProgressRef.current = true;
    try {
      await videoService.saveWatchProgress(
        reel.id,
        Math.floor(positionSeconds),
        Math.floor(validDuration)
      );
      lastSavedProgressRef.current = positionSeconds;
      console.log(`💾 Progress saved: ${reel.title} - ${Math.floor(positionSeconds)}s / ${Math.floor(validDuration)}s (${Math.round(progressPercent)}%)`);
      
      // Process pending save if any
      if (pendingSaveRef.current) {
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (pending.duration > 0) {
          await persistProgress(pending.position, pending.duration, true);
        }
      }
    } catch (error) {
      console.error(`❌ Error saving watch progress for ${reel.title}:`, error);
      // Retry once after a short delay
      setTimeout(async () => {
        try {
          await videoService.saveWatchProgress(
            reel.id,
            Math.floor(positionSeconds),
            Math.floor(validDuration)
          );
          lastSavedProgressRef.current = positionSeconds;
          console.log(`✅ Retry successful: ${reel.title}`);
        } catch (retryError) {
          console.error(`❌ Retry failed for ${reel.title}:`, retryError);
        } finally {
          saveInProgressRef.current = false;
        }
      }, 1000);
      return;
    } finally {
      saveInProgressRef.current = false;
    }
  };

  // Periodic save that runs independently of playback status updates
  // CRITICAL: Only runs when isActive is true
  useEffect(() => {
    if (!isActive) {
      // Clear any pending saves when becoming inactive
      pendingSaveRef.current = null;
      return;
    }

    const intervalId = setInterval(async () => {
      // Double-check isActive before saving (in case it changed)
      if (!isActive || !videoRef.current || isCompletedRef.current) {
        return;
      }

      try {
        const status = await videoRef.current.getStatusAsync();
        if (status?.isLoaded && status.isPlaying) {
          // Only save if video is actually playing
          const currentSeconds = (status.positionMillis || 0) / 1000;
          const durationSeconds = 
            reel.durationSeconds && reel.durationSeconds > 0
              ? reel.durationSeconds
              : (status.durationMillis || 0) / 1000;

          if (currentSeconds >= MIN_RESUME_SECONDS && durationSeconds > 0) {
            // Force save on periodic interval
            await persistProgress(currentSeconds, durationSeconds, true);
          }
        }
      } catch (error) {
        // Silently handle errors - video might not be ready
      }
    }, PERIODIC_SAVE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isActive, reel.id, reel.durationSeconds]);

  // Save progress when reel becomes inactive (user navigated away)
  // CRITICAL: Use the last known position from when it was active, not current position
  useEffect(() => {
    if (!isActive) {
      const saveOnInactive = async () => {
        // Use the last known position from when video was active
        // Don't get current status as video might still be playing in background
        const position = lastKnownPositionRef.current;
        const duration = lastKnownDurationRef.current;

        // Only save if we have valid data from when it was active
        if (position >= MIN_RESUME_SECONDS && duration > 0) {
          const progressPercent = (position / duration) * 100;
          // Only save if progress is between 5% and 85%
          if (progressPercent >= 5 && progressPercent < 85 && !isCompletedRef.current) {
            try {
              // Force save immediately with the last known position
              saveInProgressRef.current = true;
              await videoService.saveWatchProgress(
                reel.id,
                Math.floor(position),
                Math.floor(duration)
              );
              lastSavedProgressRef.current = position;
              console.log(`💾✅ Progress saved on inactive: ${reel.title} - ${Math.floor(position)}s / ${Math.floor(duration)}s (saved from last active position)`);
            } catch (error) {
              console.error(`❌ Error saving progress on inactive for ${reel.title}:`, error);
              // Retry once
              setTimeout(async () => {
                try {
                  await videoService.saveWatchProgress(
                    reel.id,
                    Math.floor(position),
                    Math.floor(duration)
                  );
                  console.log(`💾✅ Retry successful on inactive: ${reel.title}`);
                } catch (retryError) {
                  console.error(`❌ Retry failed on inactive for ${reel.title}:`, retryError);
                }
              }, 500);
            } finally {
              saveInProgressRef.current = false;
            }
          }
        }
      };

      // Small delay to ensure video has paused
      setTimeout(() => {
        saveOnInactive();
      }, 100);
    }
  }, [isActive, reel.id, reel.title]);

  // Aggressive cleanup save when component unmounts
  // CRITICAL: Use last known position from when video was active
  useEffect(() => {
    return () => {
      // Cleanup: save progress when leaving this reel
      const saveFinalProgress = async () => {
        // Use last known position - don't get current status as video might be playing in background
        const position = lastKnownPositionRef.current;
        const duration = lastKnownDurationRef.current;

        // Only save if we have valid data from when it was active
        if (position >= MIN_RESUME_SECONDS && duration > 0) {
          const progressPercent = (position / duration) * 100;
          // Only save if progress is between 5% and 85%
          if (progressPercent >= 5 && progressPercent < 85 && !isCompletedRef.current) {
            try {
              // Force save immediately with last known position
              await videoService.saveWatchProgress(
                reel.id,
                Math.floor(position),
                Math.floor(duration)
              );
              console.log(`💾✅ Final progress saved on unmount: ${reel.title} - ${Math.floor(position)}s / ${Math.floor(duration)}s (from last active position)`);
            } catch (error) {
              console.error(`❌ Error saving final progress for ${reel.title}:`, error);
              // Retry once
              setTimeout(async () => {
                try {
                  await videoService.saveWatchProgress(
                    reel.id,
                    Math.floor(position),
                    Math.floor(duration)
                  );
                  console.log(`💾✅ Retry successful on unmount: ${reel.title}`);
                } catch (retryError) {
                  console.error(`❌ Final retry failed for ${reel.title}:`, retryError);
                }
              }, 500);
            }
          }
        }
      };

      // Execute immediately - don't await, but it will run
      saveFinalProgress();
    };
  }, [reel.id, reel.title]);

  // ---- helpers ----
  const openEpisodesSheet = async () => {
    if (showEpisodesSheet) return;
    // also ensure info sheet is not visible when opening episodes
    if (showInfoSheet) return;
    
    // Load episodes when opening the sheet
    if (reel.seasonId) {
      await loadSeasonEpisodes();
    }
    
    setShowEpisodesSheet(true);
    Animated.timing(sheetTranslateY, {
      toValue: SCREEN_HEIGHT * 0.2,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const closeEpisodesSheet = () => {
    // animate down and hide after animation completes
    Animated.timing(sheetTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 260,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // ensure the visible flag is cleared and reset the animated value so
      // the sheet won't linger or block touches.
      setShowEpisodesSheet(false);
      // reset translate value to full screen so next open starts from bottom
      sheetTranslateY.setValue(SCREEN_HEIGHT);
    });
  };

  const openInfoSheet = async () => {
    // when opening info sheet, make sure episodes sheet is closed so there's no overlap
    if (showEpisodesSheet) {
      // force close episodes first (animate down)
      closeEpisodesSheet();
    }
    
    // Load episodes if we have a season
    if (reel.seasonId && seasonEpisodes.length === 0) {
      await loadSeasonEpisodes();
    }
    
    setShowInfoSheet(true);
    Animated.timing(infoTranslateY, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const closeInfoSheet = () => {
    Animated.timing(infoTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 260,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => setShowInfoSheet(false));
  };

  const handleNextEpisode = async () => {
    if (!reel.seasonId) return;
    
    try {
      // Load episodes if not already loaded
      if (seasonEpisodes.length === 0) {
        await loadSeasonEpisodes();
      }
      
      // Find current episode and get next one
      const currentIndex = seasonEpisodes.findIndex((ep: any) => ep._id === reel.id);
      if (currentIndex >= 0 && currentIndex < seasonEpisodes.length - 1) {
        const nextEpisode = seasonEpisodes[currentIndex + 1];
        await handleEpisodePress(nextEpisode);
      } else {
        // If episodes not loaded yet, fetch them
        const seasonId = typeof reel.seasonId === 'object' ? reel.seasonId._id : reel.seasonId;
        const response = await videoService.getEpisodes(seasonId);
        if (response.success && response.data) {
          const episodes = response.data.sort((a: any, b: any) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
          setSeasonEpisodes(episodes);
          const currentIndex = episodes.findIndex((ep: any) => ep._id === reel.id);
          if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
            const nextEpisode = episodes[currentIndex + 1];
            await handleEpisodePress(nextEpisode);
          }
        }
      }
    } catch (error) {
      console.error('Error loading next episode:', error);
    }
  };

  const handleLike = async () => {
    try {
      if (!isLiked) {
        // Like the video
        await videoService.likeVideo(reel.id);
        setIsLiked(true);
        setLikes((prev) => prev + 1);
      } else {
        // Unlike the video (you may need to add an unlike endpoint)
        setIsLiked(false);
        setLikes((prev) => Math.max(0, prev - 1));
      }
      setShowReactions(true);
      setTimeout(() => setShowReactions(false), 1500);
    } catch (error) {
      console.error('Error liking video:', error);
      // Still update UI even if API call fails
      setIsLiked((prev) => !prev);
      setLikes((prev) => prev + (isLiked ? -1 : 1));
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${reel.title}" on Digital Kalakar!`,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const handleEpisodePress = async (episode: VideoType | number) => {
    // If it's a VideoType object, navigate to that episode
    if (typeof episode === 'object' && episode._id) {
      try {
        // Get the video details
        const response = await videoService.getVideoById(episode._id);
        if (response.success && response.data) {
          const video = response.data;
          
          // Get video URL
          let videoUrl = video.masterPlaylistUrl || '';
          if (!videoUrl && video.variants && video.variants.length > 0) {
            const preferredOrder = ['720p', '1080p', '480p', '360p'];
            for (const res of preferredOrder) {
              const variant = video.variants.find((v: any) => v.resolution === res);
              if (variant) {
                videoUrl = variant.url;
                break;
              }
            }
            if (!videoUrl) {
              videoUrl = video.variants[0].url;
            }
          }
          
          // Update the reel with new episode data
          // This would ideally trigger a re-render with new video
          // For now, we'll just update the current episode number
          setCurrentEpisode(video.episodeNumber || 1);
          
          // Update video source
          if (videoRef.current && videoUrl) {
            videoRef.current.unloadAsync();
            videoRef.current.loadAsync({ uri: videoUrl }, { shouldPlay: true });
          }
        }
      } catch (error) {
        console.error('Error loading episode:', error);
      }
    } else {
      // If it's just a number, find the episode in the list
      const episodeData = seasonEpisodes.find(ep => ep.episodeNumber === episode);
      if (episodeData) {
        await handleEpisodePress(episodeData);
        return;
      }
      setCurrentEpisode(episode as number);
    }
    closeEpisodesSheet();
  };

  // ---- Settings: Speed & Quality ----
  const cycleSpeed = async () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed as any);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    setPlaybackSpeed(nextSpeed);

    if (videoRef.current) {
      try {
        await videoRef.current.setStatusAsync({
          rate: nextSpeed,
          shouldPlay: true,
        });
      } catch (e) {
        console.warn('Error setting speed', e);
      }
    }
  };

  const cycleQuality = () => {
    const currentIndex = QUALITY_OPTIONS.indexOf(quality);
    const nextIndex = (currentIndex + 1) % QUALITY_OPTIONS.length;
    const nextQuality = QUALITY_OPTIONS[nextIndex];
    setQuality(nextQuality);
    // hook into real quality options when backend is ready
  };

  // ---- Episodes list ----
  // Use real episodes from database if available, otherwise use mock ranges
  const hasRealEpisodes = seasonEpisodes.length > 0;
  
  const renderEpisodeNumber = (episode: VideoType | number) => {
    const episodeNum = typeof episode === 'object' ? episode.episodeNumber || 0 : episode;
    const episodeId = typeof episode === 'object' ? episode._id : null;
    const isActive = episodeNum === currentEpisode;
    const isUnlocked =
      typeof episode === 'object'
        ? (episode as any).isPublished !== false
        : episodeNum <= TOTAL_EPISODES;

    return (
      <TouchableOpacity
        key={episodeId || episodeNum}
        disabled={!isUnlocked}
        onPress={() => handleEpisodePress(episode)}
        style={[
          styles.episodeNumber,
          !isUnlocked && styles.episodeNumberLocked,
          isActive && styles.episodeNumberActive,
        ]}
      >
        <Text
          style={[
            styles.episodeNumberText,
            !isUnlocked && styles.episodeNumberTextLocked,
            isActive && styles.episodeNumberTextActive,
          ]}
        >
          {episodeNum}
        </Text>
      </TouchableOpacity>
    );
  };

  // ---- Comment helpers ----
  const handleAddComment = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    setComments((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, user: 'You', text: trimmed },
    ]);
    setNewComment('');
  };

  // Track video view when video starts playing
  useEffect(() => {
    if (isActive && videoRef.current && !hasTrackedView) {
      const trackView = async () => {
        try {
          console.log('🎬 Tracking view for reel:', reel.id, reel.title);
          const response = await videoService.incrementView(reel.id);
          console.log('✅ View tracked, response:', response);
          setHasTrackedView(true);
          
          // Always refresh coin balance after watching (coins may have been deducted)
          // This happens in the background without showing any notification
          try {
            const profileResponse = await getUserProfile();
            if (profileResponse.success && profileResponse.data) {
              // Update Redux state silently - no notification shown
              // This will trigger the rewards screen to refresh automatically
              dispatch(setUser(profileResponse.data));
              console.log('💰 Coin balance refreshed:', profileResponse.data.coinsBalance);
            }
          } catch (profileError) {
            // Silently fail - don't interrupt user experience
            console.log('Background coin balance refresh failed:', profileError);
          }
        } catch (error) {
          console.error('❌ Error tracking view:', error);
        }
      };
      
      // Track view after a short delay to ensure video is actually playing
      const timer = setTimeout(trackView, 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive, reel.id, hasTrackedView, dispatch]);

  // hide side actions and reaction bar when info sheet is open
  const sideActionsVisible = !showInfoSheet;

  return (
    <View style={styles.reelContainer}>
      {/* VIDEO */}
      <Video
        ref={videoRef}
        source={{ uri: reel.videoUrl }}
        style={styles.video}
        isLooping
        shouldPlay={false}
        resizeMode={ResizeMode.COVER}
        useNativeControls={false}
        onLoad={async () => {
          // Reset view tracking when new video loads
          setHasTrackedView(false);
          lastSavedProgressRef.current = 0;
          isCompletedRef.current = false;

          // Set duration from reel metadata if available
          if (reel.durationSeconds && reel.durationSeconds > 0) {
            lastKnownDurationRef.current = reel.durationSeconds;
          }

          // Handle pending seek from resume position
          if (pendingSeekRef.current && resumePositionRef.current > MIN_RESUME_SECONDS && videoRef.current) {
            try {
              const seekTime = resumePositionRef.current * 1000;
              console.log(`⏸️ Seeking to resume position: ${resumePositionRef.current}s`);
              await videoRef.current.setPositionAsync(seekTime);
              console.log(`✅ Successfully seeked to: ${resumePositionRef.current}s`);
              pendingSeekRef.current = false;
            } catch (error) {
              console.error('Error seeking on video load:', error);
              pendingSeekRef.current = false;
            }
          }
        }}
        onPlaybackStatusUpdate={(status) => {
          if (!status.isLoaded) return;

          // CRITICAL: Stop all processing if reel is not active
          // This prevents background videos from continuing to save progress
          if (!isActive) {
            // Only update duration ref if we don't have it yet, but don't update position
            if (status.durationMillis && !lastKnownDurationRef.current) {
              lastKnownDurationRef.current = (status.durationMillis || 0) / 1000;
            }
            return; // Exit early - don't process anything if not active
          }

          const currentSeconds = (status.positionMillis || 0) / 1000;
          const durationSeconds =
            reel.durationSeconds && reel.durationSeconds > 0
              ? reel.durationSeconds
              : (status.durationMillis || 0) / 1000;

          // Only update refs when active
          if (currentSeconds > 0) {
            lastKnownPositionRef.current = currentSeconds;
          }
          if (durationSeconds > 0) {
            lastKnownDurationRef.current = durationSeconds;
          }

          // Check if video is finished (only if not looping and we have valid duration)
          const progressPercent = durationSeconds > 0 ? (currentSeconds / durationSeconds) * 100 : 0;
          const isFinished =
            status.didJustFinish ||
            (durationSeconds > 0 && currentSeconds >= durationSeconds - 2 && !status.isLooping) ||
            (progressPercent >= 85); // Mark as completed if watched 85% or more

          if (isFinished && !status.isLooping && !isCompletedRef.current) {
            isCompletedRef.current = true;
            videoService
              .deleteWatchProgress(reel.id)
              .catch((error) => console.error('Error deleting watch progress:', error));
            return;
          }

          // Only save progress if we have valid data (we already checked isActive above)
          if (currentSeconds < MIN_RESUME_SECONDS) return;
          if (currentSeconds < MIN_RESUME_SECONDS) return;
          if (!durationSeconds || durationSeconds <= 0) {
            // If we don't have duration yet, try to use stored duration
            if (lastKnownDurationRef.current > 0) {
              persistProgress(currentSeconds, lastKnownDurationRef.current);
            }
            return;
          }

          // Save at key thresholds (5s, 10s, 15s, 30s, 60s, etc.) to ensure we capture progress
          const keyThresholds = [5, 10, 15, 30, 60, 120, 300];
          const shouldForceSave = keyThresholds.some(threshold => 
            currentSeconds >= threshold && lastSavedProgressRef.current < threshold
          );

          persistProgress(currentSeconds, durationSeconds, shouldForceSave);
        }}
      />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextEpisodeButton}
          onPress={handleNextEpisode}
          activeOpacity={0.9}
        >
          <Text style={styles.nextEpisodeText}>Next Episode</Text>
          <Ionicons name="play" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      {/* REACTION BAR – near Rate */}
      {sideActionsVisible && showReactions && (
        <View style={styles.reactionBar}>
          <Text style={styles.reactionEmoji}>😍</Text>
          <Text style={styles.reactionEmoji}>👍</Text>
          <Text style={styles.reactionEmoji}>🙂</Text>
          <Text style={styles.reactionEmoji}>🤣</Text>
        </View>
      )}

      {/* SETTINGS POPOVER */}
      {showSettings && (
        <View style={styles.settingsPopup}>
          <TouchableOpacity style={styles.settingsItem} onPress={cycleSpeed}>
            <MaterialIcons name="slow-motion-video" size={24} color="#fff" />
            <Text style={styles.settingsText}>
              Speed {playbackSpeed.toFixed(1)}x
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={cycleQuality}>
            <Ionicons name="sparkles-outline" size={22} color="#fff" />
            <Text style={styles.settingsText}>Quality {quality}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RIGHT ACTIONS - BIGGER ICONS */}
      {/* When comments are open, disable pointer events on the right actions so overlay/backdrop works */}
      {sideActionsVisible && (
        <View
          style={styles.rightActions}
          pointerEvents={showComments ? 'none' : 'auto'}
        >
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={32}
              color="#fff"
            />
            <Text style={styles.actionLabel}>Rate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowComments(true)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={30} color="#fff" />
            <Text style={styles.actionLabel}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowSettings((prev) => !prev)}
          >
            <Ionicons name="settings-outline" size={30} color="#fff" />
            <Text style={styles.actionLabel}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={28} color="#fff" />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setIsSaved((prev) => !prev)}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={28}
              color="#fff"
            />
            <Text style={styles.actionLabel}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={openEpisodesSheet}>
            <Ionicons name="grid-outline" size={30} color="#fff" />
            <Text style={styles.actionLabel}>Episodes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* BOTTOM INFO – pulled further up */}
      <View style={styles.bottomInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.movieTitle}>{reel.title}</Text>
          <TouchableOpacity onPress={openInfoSheet} style={styles.infoButton}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{reel.year}</Text>
          <View style={styles.ratingChip}>
            <Text style={styles.ratingChipText}>{reel.rating}</Text>
          </View>
          <Text style={styles.metaText}>{reel.duration}</Text>
        </View>
      </View>

      {/* COMMENTS OVERLAY (covers > 50% height) */}
      {showComments && (
        <View style={styles.commentsOverlay}>
          <Pressable
            style={styles.commentsBackdrop}
            onPress={() => setShowComments(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.commentsCard}>
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments</Text>
                <TouchableOpacity onPress={() => setShowComments(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: SCREEN_HEIGHT * 0.45 }}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {item.user.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentUser}>{item.user}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  </View>
                )}
              />

              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a family-friendly comment..."
                  placeholderTextColor="#888"
                  value={newComment}
                  onChangeText={setNewComment}
                />
                <TouchableOpacity onPress={handleAddComment}>
                  <Ionicons name="send" size={22} color="#FFD54A" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* EPISODES BOTTOM SHEET – redesigned like reference UI */}
      <Animated.View
        pointerEvents={showEpisodesSheet ? 'auto' : 'none'}
        style={[
          styles.episodesSheet,
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
      >
        <View style={styles.episodesHeader}>
          <View>
            <Text style={styles.episodesTitle}>{reel.title}</Text>
            <View style={styles.episodesMetaRow}>
              <Text style={styles.metaText}>{reel.year}</Text>
              <View style={styles.ratingChipSmall}>
                <Text style={styles.ratingChipSmallText}>{reel.rating}</Text>
              </View>
              <Text style={styles.metaText}>{reel.duration}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={closeEpisodesSheet}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Range chips – only show if using mock data */}
        {!hasRealEpisodes && (
          <View style={styles.rangeRow}>
            {EPISODE_RANGES.map((range) => {
              const isActive = range.id === activeRangeId;
              return (
                <TouchableOpacity
                  key={range.id}
                  style={[
                    styles.rangeChip,
                    isActive && styles.rangeChipActive,
                  ]}
                  onPress={() => setActiveRangeId(range.id)}
                >
                  <Text
                    style={[
                      styles.rangeChipText,
                      isActive && styles.rangeChipTextActive,
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Episodes grid – compact pills, multiple rows */}
        <View style={styles.episodesGrid}>
          {loadingEpisodes ? (
            <View style={styles.episodesLoadingContainer}>
              <ActivityIndicator size="small" color="#FFD54A" />
              <Text style={styles.episodesLoadingText}>Loading episodes...</Text>
            </View>
          ) : hasRealEpisodes ? (
            // Render real episodes from database
            seasonEpisodes
              .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0))
              .map(renderEpisodeNumber)
          ) : (
            // Fallback to mock episodes if no season data
            (() => {
              const activeRange = EPISODE_RANGES.find((r) => r.id === activeRangeId)!;
              const episodesArray = Array.from(
                { length: activeRange.end - activeRange.start + 1 },
                (_, idx) => activeRange.start + idx,
              );
              return episodesArray.map(renderEpisodeNumber);
            })()
          )}
        </View>
      </Animated.View>

      {/* INFO SHEET (Play / Download / Description / Cast / Episodes / More Like This) */}
      {showInfoSheet && (
        <Animated.View
          style={[
            styles.infoSheetContainer,
            { transform: [{ translateY: infoTranslateY }] },
          ]}
        >
          {/* translucent backdrop tap to close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeInfoSheet}
            style={styles.infoBackdrop}
          />

          <View style={styles.infoSheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* top close */}
              <View style={styles.infoTopBar}>
                <View style={{ width: 28 }} />
                <View style={styles.infoHandle} />
                <TouchableOpacity onPress={closeInfoSheet}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Poster + heart */}
              <View style={styles.infoPosterRow}>
                <View style={styles.posterWrapper}>
                  <Image
                    source={{ 
                      uri: reel.thumbnailUrl || reel.seasonId?.thumbnail || 'https://picsum.photos/340/460?random=99' 
                    }}
                    style={styles.posterImage}
                  />
                  <TouchableOpacity style={styles.posterPlayOverlay}>
                    <Ionicons name="play" size={40} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.posterHeart}
                    onPress={handleLike}
                  >
                    <Ionicons 
                      name={isLiked ? 'heart' : 'heart-outline'} 
                      size={24} 
                      color={isLiked ? '#FFD54A' : '#fff'} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tags */}
              <View style={styles.tagRow}>
                <View style={styles.tagChip}>
                  <Text style={styles.tagText}>Action</Text>
                </View>
                <View style={styles.tagChip}>
                  <Text style={styles.tagText}>Thriller</Text>
                </View>
              </View>

              {/* Title + meta */}
              <Text style={styles.infoTitle}>{reel.title}</Text>
              <View style={styles.infoMetaRow}>
                <Text style={styles.infoMetaText}>{reel.year}</Text>
                <View style={styles.ratingChipSmall}>
                  <Text style={styles.ratingChipSmallText}>{reel.rating}</Text>
                </View>
                <Text style={styles.infoMetaText}>{reel.duration}</Text>
              </View>

              {/* Play / Download big buttons */}
              <TouchableOpacity style={styles.infoPrimaryButton}>
                <Ionicons name="play" size={20} color="#000" />
                <Text style={styles.infoPrimaryText}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.infoSecondaryButton}>
                <Ionicons name="download-outline" size={20} color="#000" />
                <Text style={styles.infoPrimaryText}>Download</Text>
              </TouchableOpacity>

              {/* Description */}
              <Text style={styles.infoDescription}>
                {reel.description || 'No description available'}
              </Text>

              {/* quick actions row */}
              <View style={styles.infoQuickRow}>
                <TouchableOpacity style={styles.infoQuickItem}>
                  <Ionicons name="add" size={22} color="#fff" />
                  <Text style={styles.infoQuickText}>My list</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.infoQuickItem}>
                  <Ionicons name="share-social-outline" size={22} color="#fff" />
                  <Text style={styles.infoQuickText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.infoQuickItem}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={22}
                    color="#fff"
                  />
                  <Text style={styles.infoQuickText}>Comment</Text>
                </TouchableOpacity>
              </View>

              {/* Cast */}
              <Text style={styles.infoSectionHeading}>Cast</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
              >
                {MOCK_CAST.map((person) => (
                  <View key={person.id} style={styles.castItem}>
                    <Image
                      source={{ uri: person.image }}
                      style={styles.castAvatar}
                    />
                    <Text style={styles.castName}>{person.name}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* Episodes */}
              {reel.seasonId && (
                <>
                  <Text style={styles.infoSectionHeading}>Episodes</Text>
                  {loadingEpisodes ? (
                    <View style={styles.episodesLoadingContainer}>
                      <ActivityIndicator size="small" color="#FFD54A" />
                      <Text style={styles.episodesLoadingText}>Loading episodes...</Text>
                    </View>
                  ) : seasonEpisodes.length > 0 ? (
                    seasonEpisodes
                      .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0))
                      .map((ep) => (
                        <TouchableOpacity
                          key={ep._id}
                          style={styles.infoEpisodeCard}
                          onPress={() => handleEpisodePress(ep)}
                        >
                          <Image
                            source={{ 
                              uri: ep.thumbnailUrl || ep.thumbnail || 'https://picsum.photos/160/90?random=21' 
                            }}
                            style={styles.infoEpisodeImage}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.infoEpisodeTitle}>
                              {ep.title || `Episode ${ep.episodeNumber || ''}`}
                            </Text>
                            <Text style={styles.infoEpisodeDesc} numberOfLines={2}>
                              {ep.description || 'No description available'}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.infoEpisodePlay}
                            onPress={() => handleEpisodePress(ep)}
                          >
                            <Ionicons name="play" size={18} color="#000" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))
                  ) : (
                    <Text style={styles.episodesLoadingText}>No episodes available</Text>
                  )}
                </>
              )}

              {/* More like this */}
              <Text style={styles.infoSectionHeading}>More Like This…</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {MOCK_MORE_LIKE.map((item) => (
                  <Image
                    key={item.id}
                    source={{ uri: item.image }}
                    style={styles.moreLikeImage}
                  />
                ))}
              </ScrollView>
            </ScrollView>
          </View>
        </Animated.View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if isActive changes or reel data changes
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.reel.id === nextProps.reel.id &&
    prevProps.reel.videoUrl === nextProps.reel.videoUrl
  );
}) as React.FC<{ reel: Reel; navigation?: any; isActive?: boolean }>;

// ============================================
// STYLES
// ============================================
const EPISODES_PER_ROW = 6;
const RANGE_PER_ROW = 4;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  headerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },

  reelContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },

  // top bar
  topBar: {
    position: 'absolute',
    top: 16,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextEpisodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  nextEpisodeText: {
    marginRight: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },

  // reactions – just left of Rate button
  reactionBar: {
    position: 'absolute',
    // moved slightly higher and left of the action column to match the "yellow line" in screenshots
    right: 92,
    top: SCREEN_HEIGHT * 0.26,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 500,
    elevation: 10,
  },
  reactionEmoji: {
    fontSize: 24,
    marginHorizontal: 6,
  },

  // settings popup
  settingsPopup: {
    position: 'absolute',
    right: 70,
    top: SCREEN_HEIGHT * 0.54,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingsText: {
    marginLeft: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // comments overlay
  commentsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 999,         // ensure overlay is above right actions
    elevation: 999,
  },
  commentsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  commentsCard: {
    backgroundColor: '#111017',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
    minHeight: SCREEN_HEIGHT * 0.62,
    maxHeight: SCREEN_HEIGHT * 0.78, // > 50% height
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentsTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  // Movie info shown inside comments sheet (keeps context)
  commentsMovieRow: {
    marginBottom: 10,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22202b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  commentBubble: {
    backgroundColor: '#1b1a23',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
  },
  commentUser: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  commentText: {
    color: '#e0e0e5',
    fontSize: 12,
    marginTop: 2,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1b1a23',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#fff',
    marginRight: 8,
    fontSize: 13,
  },

  // right actions
  rightActions: {
    position: 'absolute',
    right: 12,
    top: SCREEN_HEIGHT * 0.29,
    alignItems: 'center',
    // keep zIndex lower than comments overlay but above video; pointerEvents handled in component
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 22,
  },
  actionLabel: {
    marginTop: 5,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // bottom info – higher above tab bar
  bottomInfo: {
    position: 'absolute',
    left: 16,
    bottom: 145,
    right: 110,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movieTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  infoButton: {
    marginLeft: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metaText: {
    color: '#f1f1f1',
    fontSize: 12,
    marginRight: 10,
  },
  ratingChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#42a5f5',
    marginRight: 10,
  },
  ratingChipText: {
    color: '#42a5f5',
    fontSize: 11,
    fontWeight: '700',
  },

  // episodes sheet – like reference
  episodesSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.8,
    backgroundColor: '#120606',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  episodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  episodesTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  episodesMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingChipSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#42a5f5',
    marginHorizontal: 6,
  },
  ratingChipSmallText: {
    color: '#42a5f5',
    fontSize: 9,
    fontWeight: '700',
  },

  // range chips row
  rangeRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 18,
  },
  rangeChip: {
    width:
      (SCREEN_WIDTH - 40 - (RANGE_PER_ROW - 1) * 10) / RANGE_PER_ROW, // 4 per row
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#1b1419',
    borderWidth: 1,
    borderColor: '#2c222a',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeChipActive: {
    backgroundColor: '#FFD54A',
    borderColor: '#FFD54A',
  },
  rangeChipText: {
    fontSize: 15,
    color: '#f5f5f5',
    fontWeight: '700',
  },
  rangeChipTextActive: {
    color: '#000',
    fontWeight: '800',
  },

  // episodes grid as pills
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  episodeNumber: {
    width:
      (SCREEN_WIDTH - 40 - (EPISODES_PER_ROW - 1) * 8) / EPISODES_PER_ROW,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252027',
  },
  episodeNumberLocked: {
    backgroundColor: '#18141a',
  },
  episodeNumberActive: {
    backgroundColor: '#FFD54A',
  },
  episodeNumberText: {
    fontSize: 14,
    color: '#f5f5f5',
    fontWeight: '600',
  },
  episodeNumberTextLocked: {
    color: '#6c6c73',
  },
  episodeNumberTextActive: {
    color: '#000',
    fontWeight: '800',
  },

  // INFO SHEET
  infoSheetContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  infoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  infoSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_HEIGHT * 0.9,
    backgroundColor: '#050509',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  infoTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoHandle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
  },
  infoPosterRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  posterWrapper: {
    width: SCREEN_WIDTH * 0.62,
    aspectRatio: 2 / 3,
    borderRadius: 18,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  posterHeart: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  tagText: {
    color: '#f5f5f5',
    fontSize: 12,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
  },
  infoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  infoMetaText: {
    color: '#d7d7dd',
    fontSize: 12,
    marginHorizontal: 6,
  },
  infoPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#FFD54A',
    paddingVertical: 12,
    marginBottom: 10,
  },
  infoSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#ffdd63',
    paddingVertical: 12,
    marginBottom: 16,
  },
  infoPrimaryText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  infoDescription: {
    color: '#f0f0f3',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  infoQuickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 18,
  },
  infoQuickItem: {
    alignItems: 'center',
  },
  infoQuickText: {
    marginTop: 4,
    color: '#e5e5ea',
    fontSize: 12,
  },

  infoSectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
  },

  castItem: {
    alignItems: 'center',
    marginRight: 12,
  },
  castAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 6,
  },
  castName: {
    color: '#f5f5f7',
    fontSize: 11,
  },

  infoEpisodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15151d',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  infoEpisodeImage: {
    width: 90,
    height: 54,
    borderRadius: 10,
    marginRight: 10,
  },
  infoEpisodeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoEpisodeDesc: {
    color: '#c7c7cf',
    fontSize: 11,
  },
  infoEpisodePlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD54A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  moreLikeImage: {
    width: 90,
    height: 130,
    borderRadius: 10,
    marginRight: 10,
  },
  episodesLoadingContainer: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodesLoadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
});

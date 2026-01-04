import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  Image,
  Share,
  Alert,
  PanResponder,
  ScrollView,
  AppState,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useKeyboard } from '@react-native-community/hooks';
import { videoService } from '../services/video.service';
import InfoSheet from './InfoSheet';
import { CommentInputOptimized } from './CommentInputOptimized';
import type { Video as VideoType } from '../types';

const { width, height } = Dimensions.get('window');

type ReelItemProps = {
  reel: {
    id: string;
    title: string;
    description?: string;
    videoUrl: string;
    duration?: string;
    year?: string;
    rating?: string;
    seasonId?: any;
    episodeNumber?: number;
    thumbnailUrl?: string;
    initialLikes?: number;
    comments?: number;
    adStatus?: 'locked' | 'unlocked'; // Ad lock status
  };
  isActive: boolean;
  initialTime?: number;
  screenFocused?: boolean; // Whether the Reels screen is focused
  onEpisodeSelect?: (episodeId: string) => void; // Callback when episode is selected
  shouldPause?: boolean; // External control to pause video (e.g., when popup appears)
  containerHeight: number; // EXACT height for fullscreen reel (ITEM_HEIGHT from parent)
};

// RANGES and EMOJIS removed - using backend-driven episode grouping

const PROGRESS_UPDATE_INTERVAL = 5000; // Save progress every 5 seconds
const MIN_PROGRESS_TO_SAVE = 3; // Only save if at least 3 seconds watched

// Format count for display (e.g., 159000 -> "159K", 71600 -> "71.6K")
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    const formatted = (count / 1000).toFixed(1);
    return formatted.replace(/\.0$/, '') + 'K';
  }
  return count.toString();
};

// Format time as M:SS or MM:SS (e.g., 92 seconds -> "1:32", 5 seconds -> "0:05")
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ActionButton Component - Professional press animation and haptic feedback
// Control Layer - Blocks video tap propagation
const ActionButton = React.memo(({ 
  icon, 
  iconColor, 
  label, 
  onPress,
  style 
}: { 
  icon: string; 
  iconColor: string; 
  label: string; 
  onPress: (e: any) => void;
  style?: any;
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={[styles.premiumActionBtn, style]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Larger tap area
    >
      <Animated.View 
        style={[
          styles.premiumIconContainer,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <Ionicons name={icon as any} size={24} color={iconColor} />
      </Animated.View>
      <Text style={styles.premiumCountLabel}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

export default function ReelItem({ reel, isActive, initialTime = 0, screenFocused = true, onEpisodeSelect, shouldPause = false, containerHeight }: ReelItemProps) {
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboard();
  
  // Swipe gestures removed - only vertical scrolling for reels navigation (YouTube Shorts-style)
  // #region agent log
  useEffect(() => {
    const shareButtonTop = insets.top + (Platform.OS === 'ios' ? 8 : 12);
    const shareButtonRight = insets.right + 16;
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:alignment',message:'Share button alignment values',data:{platform:Platform.OS,insets:{top:insets.top,bottom:insets.bottom,left:insets.left,right:insets.right},shareButtonTop,shareButtonRight,containerWidth:width,containerHeight:height,reelId:reel.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'alignment'})}).catch(()=>{});
  }, [insets.top, insets.bottom, insets.left, insets.right, reel.id]);
  // #endregion
  
  // Video ref for expo-av
  const videoRef = useRef<Video>(null);

  // Log when videoUrl changes
  useEffect(() => {
    console.log(`🎥 ReelItem: Video URL changed for ${reel.title}:`, reel.videoUrl);
  }, [reel.videoUrl, reel.title]);

  const hasSeekedRef = useRef(false);
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTimeRef = useRef(0);
  const isCompletedRef = useRef(false);
  const videoDurationRef = useRef(0);
  const isActiveRef = useRef(isActive);
  const isMountedRef = useRef(true);
  const playbackRetryCountRef = useRef(0); // Track retry attempts for audio focus
  const tapDebounceRef = useRef<NodeJS.Timeout | null>(null); // Debounce tap events (300ms)
  const isAnySheetOpenRef = useRef(false); // Track if any modal/sheet is open
  const wasPlayingBeforeScrub = useRef(false); // Track if video was playing before scrubbing
  const [isScrubbing, setIsScrubbing] = useState(false); // Track if user is currently scrubbing (state for UI updates)
  const isScrubbingRef = useRef(false); // Track if user is currently scrubbing (for onPlaybackStatusUpdate)
  // 1️⃣ SINGLE SOURCE OF TRUTH: Use ref for actual playback state, useState for UI only
  const actualPlayStateRef = useRef<'playing' | 'paused' | 'stopped'>('stopped'); // Actual video player state
  const isPausedByUserRef = useRef(false); // Track if user intentionally paused (ref for immediate access)
  const hasPausedForInactiveRef = useRef(false); // Prevent duplicate pause calls when inactive
  const progressSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Prevent duplicate progress saves

  // Configure audio mode for video playback (once on mount)
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true, // Let system duck other audio when video plays
          interruptionModeAndroid: 1, // DO_NOT_DUCK
          interruptionModeIOS: 1, // DO_NOT_MIX
        });
      } catch (error) {
        console.warn('Error configuring audio mode:', error);
      }
    };
    
    configureAudio();
  }, []);

  const episodeSheetY = useRef(new Animated.Value(height)).current;
const moreSheetY = useRef(new Animated.Value(height)).current;
const descSheetY = useRef(new Animated.Value(height)).current;
const commentSheetY = useRef(new Animated.Value(0)).current; // Comments sheet starts at 0 (fully visible when open)
// Removed playPauseButtonOpacity - Instagram-style: no visible play/pause button

  // Initialize sheet positions on mount - sheets should start off-screen
  
  // Swipe indicators and screen transitions removed

  const [showEpisodes, setShowEpisodes] = useState(false);
const [showComments, setShowComments] = useState(false);
const [showDescSheet, setShowDescSheet] = useState(false);
const [showMore, setShowMore] = useState(false);

  // Open/close comments with animation (Full bottom sheet - Instagram Reels style)
  useEffect(() => {
    if (showComments) {
      Animated.timing(commentSheetY, {
        toValue: 0, // Full bottom sheet (100% visible)
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(commentSheetY, {
        toValue: height,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showComments, commentSheetY, height]);

  // Format time ago helper
  const formatTimeAgo = (date: string | Date): string => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return commentDate.toLocaleDateString();
  };

  // Comment state (must be declared before loadComments)
  const [comments, setComments] = useState<Array<{
    id: string;
    username: string;
    text: string;
    likes: number;
    timeAgo: string;
    isLiked: boolean;
    avatar?: string;
  }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentCount, setCommentCount] = useState(reel.comments || 0);

  // Load comments function
  const loadComments = useCallback(async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const response = await videoService.getComments(reel.id, 1, 20);
      if (response?.success && Array.isArray(response.data)) {
        const formattedComments = response.data.map((comment: any) => ({
          id: comment.id || comment._id,
          username: comment.user?.username || comment.user?.name || 'User',
          text: comment.text,
          likes: 0,
          timeAgo: formatTimeAgo(comment.createdAt),
          isLiked: false,
          avatar: comment.user?.avatar || comment.user?.profilePicture,
        }));
        setComments(formattedComments);
        if (response.pagination?.total !== undefined) {
          setCommentCount(response.pagination.total);
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [reel.id, loadingComments]);

  // Load comments when comment sheet opens
  useEffect(() => {
    if (showComments && isActive) {
      loadComments();
    }
  }, [showComments, isActive, loadComments]);

const [seasonEpisodes, setSeasonEpisodes] = useState<VideoType[]>([]);
const [loadingEpisodes, setLoadingEpisodes] = useState(false);
const [episodesSheetEpisodes, setEpisodesSheetEpisodes] = useState<VideoType[]>([]);
const [loadingEpisodesSheet, setLoadingEpisodesSheet] = useState(false);

  // Like state (Instagram-style: optimistic updates)
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.initialLikes || 0);
  
  // PanResponder for swipe-down to close comments sheet (YouTube Shorts-style)
  const commentSheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical swipes downward
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow downward swipes
        if (gestureState.dy > 0) {
          commentSheetY.setValue(Math.max(0, gestureState.dy)); // Full bottom sheet
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped down enough, close sheet
        if (gestureState.dy > 50) {
          setShowComments(false);
        } else {
          // Snap back to original position (full bottom sheet)
          Animated.spring(commentSheetY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // PanResponder for swipe-down to close episode sheet (YouTube Shorts-style)
  const episodeSheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical swipes downward
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow downward swipes
        if (gestureState.dy > 0) {
          const initialPosition = height * 0.6; // 40% sheet height
          episodeSheetY.setValue(Math.max(initialPosition, initialPosition + gestureState.dy));
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped down enough, close sheet
        if (gestureState.dy > 50) {
          closeEpisodes();
        } else {
          // Snap back to original position
          const initialPosition = height * 0.6; // 40% sheet height means it starts at 60% from top
          Animated.spring(episodeSheetY, {
            toValue: initialPosition,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // PanResponder for swipe-down to close More sheet (Instagram-style)
  const moreSheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical swipes downward
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow downward swipes
        if (gestureState.dy > 0) {
          moreSheetY.setValue(Math.max(0, gestureState.dy));
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped down enough, close sheet
        if (gestureState.dy > 50) {
          closeMore();
        } else {
          // Snap back to original position
          Animated.spring(moreSheetY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // PanResponder for draggable progress bar (time scrubbing)
  const progressBarWidth = useRef(new Animated.Value(0)).current;
  const progressBarPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal gestures on progress bar area
        // Prevent conflict with vertical swipe for next reel
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) || Math.abs(gestureState.dx) > 5;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond if horizontal movement is greater than vertical
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: async () => {
        if (!isActive || !videoRef.current) return;
        isScrubbingRef.current = true;
        setIsScrubbing(true);
        try {
          const status = await videoRef.current.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            // Store playing state before scrubbing
            wasPlayingBeforeScrub.current = status.isPlaying || false;
            
            // Pause video while scrubbing for better UX
            if (status.isPlaying) {
              await videoRef.current.pauseAsync();
            }
            
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {}
          }
        } catch {}
      },
      onPanResponderMove: async (evt, gestureState) => {
        if (!isActive || !videoRef.current || !isScrubbingRef.current) return;
        try {
          const status = await videoRef.current.getStatusAsync();
          if (!status.isLoaded || !status.durationMillis) return;
          
          // Use pageX to get absolute screen position, subtract container's left position (16px padding)
          const screenX = evt.nativeEvent.pageX;
          const containerLeft = 16; // Left padding
          const containerX = screenX - containerLeft;
          const barWidth = width - 32; // Account for padding (16px each side)
          const tapPercent = Math.max(0, Math.min(1, containerX / barWidth));
          const newTime = (status.durationMillis / 1000) * tapPercent;
          
          // REAL-TIME SEEK: Call setPositionAsync during movement
          await videoRef.current.setPositionAsync(newTime * 1000);
          
          // Update visual progress immediately
          const progressPercent = (newTime / (status.durationMillis / 1000)) * 100;
          progressBarWidth.setValue(progressPercent);
          
          // Update timer instantly while scrubbing
          setCurrentTime(newTime);
        } catch {}
      },
      onPanResponderRelease: async (evt, gestureState) => {
        if (!isActive || !videoRef.current) return;
        isScrubbingRef.current = false;
        setIsScrubbing(false);
        try {
          const status = await videoRef.current.getStatusAsync();
          if (!status.isLoaded || !status.durationMillis) return;
          
          // Use pageX to get absolute screen position, subtract container's left position (16px padding)
          const screenX = evt.nativeEvent.pageX;
          const containerLeft = 16; // Left padding
          const containerX = screenX - containerLeft;
          const barWidth = width - 32; // Account for padding
          const tapPercent = Math.max(0, Math.min(1, containerX / barWidth));
          const newTime = (status.durationMillis / 1000) * tapPercent;
          
          // Seek to the exact timestamp
          await videoRef.current.setPositionAsync(newTime * 1000);
          
          // Update timer immediately
          setCurrentTime(newTime);
          
          // Resume playback if it was playing before scrubbing
          if (wasPlayingBeforeScrub.current) {
            await videoRef.current.playAsync();
          }
          
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch {}
        } catch (error) {
          console.error('Error seeking:', error);
        }
      },
    })
  ).current;

  const [activeEpisode, setActiveEpisode] = useState(1);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0); // Current playback time in seconds
  const [totalDuration, setTotalDuration] = useState(0); // Total video duration in seconds
  // Explicit state management (REQUIRED for stability)
  const [isPausedByUser, setIsPausedByUser] = useState(false); // Track if user intentionally paused
  const [isBuffering, setIsBuffering] = useState(false); // Track buffering state
  // Removed showPlayPauseButton and playPauseButtonTimeoutRef - Instagram-style: no visible play/pause button
  
  // Premium UI auto-hide state
  const [uiVisible, setUiVisible] = useState(true);
  const uiHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const uiOpacity = useRef(new Animated.Value(1)).current;
  // Video quality removed - Auto quality only (handled by backend/CDN)
  const [audioTrack, setAudioTrack] = useState('Original');
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // Load like status when reel becomes active
  useEffect(() => {
    if (isActive && reel.id) {
      const loadLikeStatus = async () => {
        try {
          const response = await videoService.getLikeStatus(reel.id);
          if (response?.success && response.data) {
            // Handle both old format (likedByUser, likes) and new format (liked, likeCount)
            const liked = response.data.liked !== undefined ? response.data.liked : (response.data.likedByUser || false);
            const likeCount = response.data.likeCount !== undefined ? response.data.likeCount : (response.data.likes || reel.initialLikes || 0);
            setIsLiked(liked);
            setLikeCount(likeCount);
          }
        } catch (error) {
          // Silently fail - user might not be authenticated
          console.log('Could not load like status:', error);
          // Set default values on error
          setIsLiked(false);
          setLikeCount(reel.initialLikes || 0);
        }
      };
      loadLikeStatus();
    }
  }, [isActive, reel.id, reel.initialLikes]);

  // Initialize video and seek to initial time when video becomes active
  useEffect(() => {
    if (isActive && videoRef.current && !hasSeekedRef.current) {
      const initializeVideo = async () => {
        try {
            // If reel is locked, pause immediately and don't play
          if (reel.adStatus === 'locked') {
            console.log(`🔒 ReelItem: Reel ${reel.title} is locked during initialization, pausing`);
            const status = await videoRef.current!.getStatusAsync();
            if (status.isLoaded) {
              await videoRef.current!.pauseAsync();
              setIsPlaying(false);
              isPausedByUserRef.current = true;
            }
            return;
          }

          // Wait for video to be ready
          const status = await videoRef.current!.getStatusAsync();
          
          if (status.isLoaded) {
            // Seek to initial time if provided
            if (initialTime > 0) {
              await videoRef.current!.setPositionAsync(initialTime * 1000);
              console.log(`⏩ Seeked to ${initialTime}s for video: ${reel.title}`);
            }
            
            // Ensure video is playing (only if not locked)
            if (isActive && screenFocused && reel.adStatus === 'unlocked') {
              await videoRef.current!.setIsMutedAsync(false);
              await videoRef.current!.playAsync();
              setIsPlaying(true);
            }
            
            hasSeekedRef.current = true;
          }
        } catch (error) {
          console.error('Error initializing video:', error);
        }
      };
      
      // Small delay to ensure video is mounted
      const timer = setTimeout(initializeVideo, 100);
      return () => clearTimeout(timer);
    }
    
    // Reset seek flag when video URL changes or becomes inactive
    if (!isActive || !reel.videoUrl) {
      hasSeekedRef.current = false;
      isPausedByUserRef.current = false;
      setIsPausedByUser(false); // Reset user pause flag when video becomes inactive
      actualPlayStateRef.current = 'stopped';
    }
  }, [isActive, initialTime, reel.videoUrl, screenFocused]);

  const openEpisodes = async () => {
    console.log('🎯 openEpisodes called');
    // 9️⃣ COMMENT / MODAL INTERACTION RULE - Pause on open
    isAnySheetOpenRef.current = true;
    if (isActive && videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setIsMutedAsync(true).catch(() => {});
      actualPlayStateRef.current = 'paused';
      setIsPlaying(false);
      isPausedByUserRef.current = true;
      setIsPausedByUser(true); // Prevent auto-resume
    }
    
    // Set state first - useEffect will handle animation
    // FAIL-SAFE: Force state to true to ensure modal renders
    setShowEpisodes(true);
    
    // Fetch episodes if seasonId exists
    if (reel.seasonId) {
      setLoadingEpisodesSheet(true);
      try {
        const seasonId = typeof reel.seasonId === 'string' ? reel.seasonId : (reel.seasonId as any)?._id || reel.seasonId;
        const response = await videoService.getEpisodes(seasonId);
        if (response.success && response.data) {
          setEpisodesSheetEpisodes(response.data);
        }
      } catch (error) {
        console.error('Error loading episodes for sheet:', error);
      } finally {
        setLoadingEpisodesSheet(false);
      }
    }
  };

  // Handle Episodes sheet animation - Same pattern as Comment sheet
  useEffect(() => {
    if (showEpisodes) {
      Animated.timing(episodeSheetY, {
        toValue: 0, // Fully visible (same as commentSheet)
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(episodeSheetY, {
        toValue: height, // Off screen
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showEpisodes, episodeSheetY, height]);

  // Pause video when screen loses focus
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:screenFocus',message:'Screen focus changed',data:{screenFocused,reelId:reel.id,isActive},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'screen-focus'})}).catch(()=>{});
    // #endregion
    if (!screenFocused) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:screenFocus',message:'Pausing video - screen lost focus',data:{reelId:reel.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'screen-focus'})}).catch(()=>{});
      // #endregion
      // Mute and pause when screen loses focus to stop audio
      if (videoRef.current) {
        videoRef.current.setIsMutedAsync(true).catch(() => {});
        videoRef.current.pauseAsync().catch(() => {});
      }
      setPlaybackSpeed(1.0);
      if (videoRef.current) {
        videoRef.current.setRateAsync(1.0, true).catch(() => {});
      }
      // Clear progress interval
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
      // Reset user pause flag when screen loses focus (system pause, not user pause)
      isPausedByUserRef.current = false;
    }
  }, [screenFocused, reel.id]);

  // Helper function to play video with retry logic for audio focus errors
  const playVideoWithRetry = async (retryCount = 0): Promise<boolean> => {
    if (!videoRef.current || !isMountedRef.current) return false;
    
    try {
      const status = await videoRef.current.getStatusAsync();
      if (!status.isLoaded) {
        // Video not ready yet, retry after delay
        if (retryCount < 3) {
          await new Promise(resolve => setTimeout(resolve, 200 + retryCount * 100));
          return playVideoWithRetry(retryCount + 1);
        }
        return false;
      }
      
      // Unmute and play
      await videoRef.current.setIsMutedAsync(false);
      await videoRef.current.playAsync();
      playbackRetryCountRef.current = 0;
      return true;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      
      // Check if this is an audio focus error
      if (errorMsg.includes('AudioFocusNotAcquiredException') || errorMsg.includes('audio focus')) {
        // Audio focus error - retry with exponential backoff
        if (retryCount < 5) {
          const delayMs = Math.min(1000, 100 * Math.pow(2, retryCount)); // 100ms, 200ms, 400ms, 800ms, 1600ms
          console.log(`🔊 Audio focus conflict, retrying in ${delayMs}ms (attempt ${retryCount + 1}/5) for ${reel.title}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return playVideoWithRetry(retryCount + 1);
        } else {
          console.error(`❌ Failed to acquire audio focus after 5 retries for ${reel.title}`);
          return false;
        }
      } else {
        // Other error
        console.error(`Error playing video ${reel.title}:`, error);
        return false;
      }
    }
  };

  // 1️⃣ SINGLE ACTIVE REEL RULE - Strict play/pause based on isActive
  useEffect(() => {
    // Update isActive ref
    isActiveRef.current = isActive;
    
    // CRITICAL: If NOT active, IMMEDIATELY pause, mute, and stop (ONCE per inactive state)
    if (!isActive) {
      // Prevent duplicate pause calls - only pause once per inactive transition
      if (!hasPausedForInactiveRef.current) {
        hasPausedForInactiveRef.current = true;
        
        if (videoRef.current) {
          videoRef.current.setIsMutedAsync(true).catch(() => {});
          videoRef.current.pauseAsync().catch(() => {});
          // Reset position to 0 when inactive (prevents audio leak from previous position)
          videoRef.current.setPositionAsync(0).catch(() => {});
          actualPlayStateRef.current = 'stopped';
          setIsPlaying(false);
          isPausedByUserRef.current = false;
          // Don't call setIsPausedByUser here - it would trigger re-render
        }
        
        if (progressSaveIntervalRef.current) {
          clearInterval(progressSaveIntervalRef.current);
          progressSaveIntervalRef.current = null;
        }
        
        // Save progress ONCE (prevent multiple saves)
        if (progressSaveTimeoutRef.current) {
          clearTimeout(progressSaveTimeoutRef.current);
        }
        const videoRefCopy = videoRef.current;
        progressSaveTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && videoRefCopy && videoDurationRef.current > 0) {
            videoRefCopy.getStatusAsync().then((status) => {
              if (status.isLoaded) {
                const currentTimeSeconds = (status.positionMillis || 0) / 1000;
                const durationSeconds = videoDurationRef.current;
                const progressPercent = durationSeconds > 0 ? (currentTimeSeconds / durationSeconds) * 100 : 0;
                
                if (currentTimeSeconds >= MIN_PROGRESS_TO_SAVE && 
                    progressPercent >= 5 && 
                    progressPercent < 85 && 
                    !isCompletedRef.current) {
                  console.log(`💾 ReelItem: Saving final progress when video becomes inactive for ${reel.title}`);
                  saveProgress(currentTimeSeconds, videoDurationRef.current, true);
                }
              }
            }).catch(() => {});
          }
          progressSaveTimeoutRef.current = null;
        }, 100);
      }
      return;
    }
    
    // Reset the pause flag when becoming active
    hasPausedForInactiveRef.current = false;
    
    // If reel is locked, pause immediately and prevent auto-play
    if (reel.adStatus === 'locked' && videoRef.current) {
      console.log(`🔒 ReelItem: Reel ${reel.title} is locked, pausing video immediately`);
      const pauseLockedVideo = async () => {
        try {
          const status = await videoRef.current!.getStatusAsync();
          if (status.isLoaded) {
            await videoRef.current!.pauseAsync();
            setIsPlaying(false);
            isPausedByUserRef.current = true;
            console.log(`✅ ReelItem: Successfully paused locked video ${reel.title}`);
          }
        } catch (error) {
          console.error(`Error pausing locked video: ${reel.title}`, error);
        }
      };
      pauseLockedVideo();
      return;
    }

    // Only play if: isActive AND screenFocused AND no sheets open AND user hasn't paused AND not locked AND not shouldPause
    if (isActive && screenFocused && !isAnySheetOpenRef.current && !isPausedByUserRef.current && !isBuffering && reel.adStatus !== 'locked' && !shouldPause) {
      const playVideo = async () => {
        try {
          // Use retry function with exponential backoff for audio focus errors
          const success = await playVideoWithRetry();
          if (success) {
            actualPlayStateRef.current = 'playing';
            setIsPlaying(true);
            isPausedByUserRef.current = false;
            setIsPausedByUser(false);
            
            // Auto-hide UI after 2.5 seconds when video starts
            setTimeout(() => {
              if (isMountedRef.current && isActiveRef.current && screenFocused) {
                hideUI();
              }
            }, 2500);
          } else {
            console.warn(`Failed to play video ${reel.title} after retries`);
          }
        } catch (error) {
          console.error('Error in playVideo:', error);
        }
      };
      
      playVideo();
    }
  }, [isActive, screenFocused, reel.title, reel.adStatus, shouldPause]);

  // Pause video when shouldPause is true (e.g., when popup appears)
  useEffect(() => {
    if (shouldPause && videoRef.current && isActive) {
      console.log(`⏸️ ReelItem: Pausing video for ${reel.title} (shouldPause=${shouldPause})`);
      
      // Set flags immediately to prevent play effect from resuming
      isPausedByUserRef.current = true;
      setIsPlaying(false);
      
      // Try to pause immediately without waiting
      videoRef.current.pauseAsync().catch(() => {});
      
      // Also do the full pause check to ensure it worked
      const pauseVideo = async () => {
        try {
          const status = await videoRef.current!.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await videoRef.current!.pauseAsync();
            console.log(`✅ ReelItem: Successfully paused video ${reel.title}`);
          }
        } catch (error) {
          console.error('Error pausing video:', error);
        }
      };
      pauseVideo();
    } else if (!shouldPause && videoRef.current && isActive && screenFocused && !isPausedByUserRef.current) {
      // Resume video when shouldPause becomes false (popup closed, ad finished)
      console.log(`▶️ ReelItem: Resuming video for ${reel.title} (shouldPause=false)`);
      const resumeVideo = async () => {
        try {
          const status = await videoRef.current!.getStatusAsync();
          if (status.isLoaded) {
            isPausedByUserRef.current = false;
            await videoRef.current!.setIsMutedAsync(false);
            await videoRef.current!.playAsync();
            setIsPlaying(true);
            console.log(`✅ ReelItem: Successfully resumed video ${reel.title}`);
          }
        } catch (error) {
          console.error('Error resuming video:', error);
        }
      };
      resumeVideo();
    }
  }, [shouldPause, isActive, screenFocused, reel.title]);


  // Handle when reel becomes unlocked - allow video to play
  useEffect(() => {
    if (reel.adStatus === 'unlocked' && isActive && screenFocused && videoRef.current) {
      // Reel was just unlocked, reset isPausedByUserRef to allow auto-play
      console.log(`🔓 ReelItem: Reel ${reel.title} unlocked, allowing video to play`);
      isPausedByUserRef.current = false;
      
      // Auto-play the video if it's active and screen is focused
      const playUnlockedVideo = async () => {
        try {
          const status = await videoRef.current!.getStatusAsync();
          if (status.isLoaded) {
            // Force unmute the video first (even if already playing)
            console.log(`🔊 ReelItem: Unmuting video for ${reel.title}`);
            await videoRef.current!.setIsMutedAsync(false);
            // Small delay to ensure unmute takes effect
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify unmute worked and retry if needed
            const unmutedStatus = await videoRef.current!.getStatusAsync();
            if (unmutedStatus.isLoaded && unmutedStatus.isMuted) {
              // Still muted, try again with longer delay
              console.log(`⚠️ ReelItem: Video still muted, retrying unmute for ${reel.title}`);
              await videoRef.current!.setIsMutedAsync(false);
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Now play the video (or continue playing if already playing)
            if (unmutedStatus.isLoaded && !unmutedStatus.isPlaying) {
              await videoRef.current!.playAsync();
            }
            setIsPlaying(true);
            
            // Final check after a delay to ensure audio stays on
            setTimeout(async () => {
              if (videoRef.current && isActive && reel.adStatus === 'unlocked') {
                try {
                  const finalStatus = await videoRef.current.getStatusAsync();
                  if (finalStatus.isLoaded) {
                    if (finalStatus.isMuted) {
                      console.log(`🔊 ReelItem: Video became muted, forcing unmute for ${reel.title}`);
                      await videoRef.current.setIsMutedAsync(false);
                    } else {
                      console.log(`✅ ReelItem: Video confirmed playing with audio for ${reel.title}`);
                    }
                  }
                } catch (error) {
                  console.error('Error checking/ensuring audio:', error);
                }
              }
            }, 200);
            
            console.log(`✅ ReelItem: Successfully started playing unlocked video ${reel.title} with audio`);
          } else {
            // Video not loaded yet, wait a bit and retry
            setTimeout(async () => {
              if (videoRef.current && isActive && screenFocused && reel.adStatus === 'unlocked') {
                try {
                  const retryStatus = await videoRef.current.getStatusAsync();
                  if (retryStatus.isLoaded) {
                    await videoRef.current.setIsMutedAsync(false);
                    await new Promise(resolve => setTimeout(resolve, 50));
                    await videoRef.current.playAsync();
                    setIsPlaying(true);
                    console.log(`✅ ReelItem: Successfully started playing unlocked video ${reel.title} with audio (retry)`);
                  }
                } catch (error) {
                  console.error('Error playing unlocked video (retry):', error);
                }
              }
            }, 300);
          }
        } catch (error) {
          console.error('Error playing unlocked video:', error);
        }
      };
      playUnlockedVideo();
    }
  }, [reel.adStatus, isActive, screenFocused, reel.title]);

  // Save progress function
  const saveProgress = async (currentTimeSeconds: number, durationSeconds: number, forceSave: boolean = false) => {
    try {
      const progressPercent = durationSeconds > 0 ? (currentTimeSeconds / durationSeconds) * 100 : 0;
      
      // Only save if progress is between 5% and 85% and not completed
      const shouldSave = 
        progressPercent >= 5 && 
        progressPercent < 85 && 
        !isCompletedRef.current &&
        (forceSave || currentTimeSeconds - lastSavedTimeRef.current >= MIN_PROGRESS_TO_SAVE);
      
      if (shouldSave) {
        console.log(`💾 ReelItem: Saving progress for ${reel.title}: ${currentTimeSeconds.toFixed(1)}s / ${durationSeconds.toFixed(1)}s (${progressPercent.toFixed(1)}%)`);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:saveProgress',message:'Attempting to save watch progress',data:{reelId:reel.id,reelTitle:reel.title,currentTimeSeconds,durationSeconds,progressPercent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'watch-progress-save'})}).catch(()=>{});
        // #endregion
        const response = await videoService.saveWatchProgress(reel.id, currentTimeSeconds, durationSeconds);
        if (response?.success) {
          lastSavedTimeRef.current = currentTimeSeconds;
          console.log(`✅ Progress saved successfully for ${reel.title}`);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:saveProgress',message:'Watch progress saved successfully',data:{reelId:reel.id,reelTitle:reel.title,currentTimeSeconds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'watch-progress-save'})}).catch(()=>{});
          // #endregion
        } else {
          console.warn(`⚠️ Progress save returned unsuccessful for ${reel.title}`);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:saveProgress',message:'Watch progress save returned unsuccessful',data:{reelId:reel.id,reelTitle:reel.title,response},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'watch-progress-save'})}).catch(()=>{});
          // #endregion
        }
      } else if (progressPercent >= 85) {
        isCompletedRef.current = true;
        // Delete watch progress when completed
        videoService.deleteWatchProgress(reel.id).catch(console.error);
      } else if (progressPercent < 5) {
        console.log(`⏭️ Progress too low (${progressPercent.toFixed(1)}%) for ${reel.title}, not saving`);
      }
    } catch (error) {
      console.error(`❌ Error saving watch progress in ReelItem for ${reel.title}:`, error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:saveProgress',message:'Error saving watch progress',data:{reelId:reel.id,reelTitle:reel.title,error:error instanceof Error ? error.message : String(error),errorStatus:(error as any)?.response?.status,errorStatusText:(error as any)?.response?.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'watch-progress-error'})}).catch(()=>{});
      // #endregion
    }
  };

  // Handle playback status updates with buffering detection
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setIsBuffering(true);
      return;
    }
    
    // Update buffering state
    setIsBuffering(status.isBuffering || false);
    
    // Update duration
    if (status.durationMillis && status.durationMillis > 0) {
      const durationSeconds = status.durationMillis / 1000;
      videoDurationRef.current = durationSeconds;
      setTotalDuration(durationSeconds);
    }
    
    // Only update progress and current time if not actively scrubbing
    if (!isScrubbingRef.current) {
      const currentTimeSeconds = (status.positionMillis || 0) / 1000;
      setCurrentTime(currentTimeSeconds);
      if (videoDurationRef.current > 0) {
        const progressPercent = (currentTimeSeconds / videoDurationRef.current) * 100;
        setProgress(progressPercent);
        progressBarWidth.setValue(progressPercent);
      }
    }
    
    // Update playing state (sync ref with actual state)
    setIsPlaying(status.isPlaying);
    actualPlayStateRef.current = status.isPlaying ? 'playing' : 'paused';
    
    // Only auto-resume if: active, focused, no sheets, not user-paused, not buffering
    if (isActive && screenFocused && !isAnySheetOpenRef.current && 
        !status.isPlaying && status.didJustFinish === false && 
        !isPausedByUserRef.current && !isBuffering) {
      // Video stopped unexpectedly, try to resume
      if (videoRef.current && !isBuffering) {
        videoRef.current.playAsync().then(() => {
          actualPlayStateRef.current = 'playing';
        }).catch(() => {});
      }
    }
  };

  // Update isActive ref whenever it changes
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Setup interval for periodic progress saving
  useEffect(() => {
    // Clear any existing interval first
    if (progressSaveIntervalRef.current) {
      clearInterval(progressSaveIntervalRef.current);
      progressSaveIntervalRef.current = null;
    }

    // Only set up interval if video is active
    if (isActive && videoRef.current) {
      progressSaveIntervalRef.current = setInterval(() => {
        // Use ref to check current isActive state (avoids stale closure)
        if (!isActiveRef.current) {
          if (progressSaveIntervalRef.current) {
            clearInterval(progressSaveIntervalRef.current);
            progressSaveIntervalRef.current = null;
            console.log(`🛑 ReelItem: Interval cleared in callback for ${reel.title} (not active)`);
          }
          return;
        }

        if (videoRef.current && videoDurationRef.current > 0) {
          videoRef.current.getStatusAsync().then((status) => {
            if (status.isLoaded && isActiveRef.current) {
              const isPlaying = status.isPlaying;
              if (isPlaying) {
                const currentTimeSeconds = (status.positionMillis || 0) / 1000;
                saveProgress(currentTimeSeconds, videoDurationRef.current);
              }
            } else if (!isActiveRef.current) {
              // If we got here but isActive is false, clear interval
              if (progressSaveIntervalRef.current) {
                clearInterval(progressSaveIntervalRef.current);
                progressSaveIntervalRef.current = null;
                console.log(`🛑 ReelItem: Interval cleared in status check for ${reel.title}`);
              }
            }
          }).catch(() => {});
        }
      }, PROGRESS_UPDATE_INTERVAL);
    }

    return () => {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
    };
  }, [isActive, reel.title]);

  // STEP 4: HARD RESET REFS ON UNMOUNT (NON-NEGOTIABLE)
  useEffect(() => {
    isMountedRef.current = true;
    
    // STEP 4: Initialize all refs to safe defaults on mount
    isPausedByUserRef.current = false;
    actualPlayStateRef.current = 'stopped';
    
    return () => {
      isMountedRef.current = false;
      
      // STEP 4: Hard reset all refs on unmount (prevents stale ref crash on remount)
      isPausedByUserRef.current = false;
      actualPlayStateRef.current = 'stopped';
      isActiveRef.current = false;
      
      // Clear all timers
      if (uiHideTimeoutRef.current) {
        clearTimeout(uiHideTimeoutRef.current);
        uiHideTimeoutRef.current = null;
      }
      if (tapDebounceRef.current) {
        clearTimeout(tapDebounceRef.current);
        tapDebounceRef.current = null;
      }
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
        progressSaveTimeoutRef.current = null;
      }
      
      // Reset flags
      hasPausedForInactiveRef.current = false;
      
      // STOP, UNLOAD, and CLEANUP video player
      if (videoRef.current) {
        videoRef.current.pauseAsync().catch(() => {});
        videoRef.current.setIsMutedAsync(true).catch(() => {});
        videoRef.current.unloadAsync().catch(() => {});
        videoRef.current = null;
      }
      
      console.log(`🧹 ReelItem: Cleaned up video for ${reel.title}`);
    };
  }, [reel.title]);

  // Removed play/pause button timeout cleanup - Instagram-style: no visible play/pause button

  // Save progress on unmount (always save if progress is valid, regardless of isActive)
  useEffect(() => {
    return () => {
      // Clear interval immediately on unmount
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }

      // Always try to save on unmount if progress is valid
      // This ensures progress is saved even when user swipes away quickly
      const saveOnUnmount = async () => {
        try {
          if (videoRef.current && videoDurationRef.current > 0) {
            const status = await videoRef.current.getStatusAsync();
            if (status.isLoaded) {
              const currentTimeSeconds = (status.positionMillis || 0) / 1000;
              const durationSeconds = videoDurationRef.current;
              const progressPercent = durationSeconds > 0 ? (currentTimeSeconds / durationSeconds) * 100 : 0;
              
              // Save on unmount if progress is between 5% and 85%
              // Don't check isActive here - we want to save even if video became inactive
              if (currentTimeSeconds >= MIN_PROGRESS_TO_SAVE && 
                  progressPercent >= 5 && 
                  progressPercent < 85 && 
                  !isCompletedRef.current) {
                console.log(`💾 ReelItem: Saving progress on unmount for ${reel.title} (${progressPercent.toFixed(1)}%)`);
                // Force save - don't wait for response as component is unmounting
                saveProgress(currentTimeSeconds, videoDurationRef.current, true).catch((err: any) => {
                  console.error('Error saving on unmount:', err);
                });
              }
            }
          }
        } catch (error) {
          // Silently ignore errors
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('NativeSharedObjectNotFoundException')) {
            console.error('Error getting status on unmount:', error);
          }
        }
      };
      
      // Execute immediately (don't await as we're in cleanup)
      saveOnUnmount();
    };
  }, [reel.id, reel.title]);

  // Premium UI auto-hide functions
  const showUI = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setUiVisible(true);
    Animated.timing(uiOpacity, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    
    // Clear existing timeout
    if (uiHideTimeoutRef.current) {
      clearTimeout(uiHideTimeoutRef.current);
      uiHideTimeoutRef.current = null;
    }
    
    // Auto-hide after 2.5 seconds ONLY if video is playing (not paused)
    // When paused, keep UI visible (YouTube Shorts-style)
    if (isPlaying && !isPausedByUserRef.current) {
      uiHideTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && uiOpacity && isPlaying && !isPausedByUserRef.current) {
          Animated.timing(uiOpacity, {
            toValue: 0,
            duration: 250,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }).start(() => {
            if (isMountedRef.current && isPlaying && !isPausedByUserRef.current) {
              setUiVisible(false);
            }
          });
        }
      }, 2500);
    }
  }, [uiOpacity, isPlaying]);
  
  // Hide UI immediately
  const hideUI = useCallback(() => {
    if (uiHideTimeoutRef.current) {
      clearTimeout(uiHideTimeoutRef.current);
    }
    Animated.timing(uiOpacity, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setUiVisible(false);
    });
  }, [uiOpacity]);

  // Removed showPlayPauseButtonTemporarily - Instagram-style: no visible play/pause button

  // 1️⃣ IDEMPOTENT PAUSE/PLAY - Always check actual status before action
  const handleScreenPress = useCallback(async (event: any) => {
    if (!isActive || !videoRef.current || isBuffering) return;
    
    // Debounce tap events (300ms)
    if (tapDebounceRef.current) {
      clearTimeout(tapDebounceRef.current);
    }
    
    tapDebounceRef.current = setTimeout(async () => {
      if (!isActive || !videoRef.current || isBuffering || !videoRef.current) return;
      
      // Show UI on tap
      showUI();
      
      try {
        // CRITICAL: Always check actual player status before action
        const status = await videoRef.current.getStatusAsync();
        if (!status.isLoaded || isBuffering) return;
        
        // Idempotent toggle: check actual state, then act
        if (status.isPlaying && actualPlayStateRef.current === 'playing') {
          // Actually playing → pause
          isPausedByUserRef.current = true;
          setIsPausedByUser(true);
          await videoRef.current.pauseAsync();
          actualPlayStateRef.current = 'paused';
          setIsPlaying(false);
        } else if (!status.isPlaying && actualPlayStateRef.current !== 'playing') {
          // Actually paused → play
          isPausedByUserRef.current = false;
          setIsPausedByUser(false);
          await videoRef.current.setIsMutedAsync(false);
          await videoRef.current.playAsync();
          actualPlayStateRef.current = 'playing';
          setIsPlaying(true);
        }
        // If state is inconsistent, sync it (shouldn't happen, but safety check)
      } catch (error) {
        console.error('Error in handleScreenPress:', error);
        // Don't throw - gracefully handle errors
      }
    }, 300);
  }, [isActive, isBuffering, showUI]);

  // Long-press handler for 2x speed (replaces onPressIn)
  const handleLongPress = () => {
    // Long-press anywhere on video to play at 2x speed
    if (isActive && videoRef.current) {
      setPlaybackSpeed(2.0);
      videoRef.current.setRateAsync(2.0, true).catch(() => {});
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
  };

  const handlePressOut = () => {
    // Release long-press to return to 1x speed
    if (isActive && videoRef.current && playbackSpeed === 2.0) {
      setPlaybackSpeed(1.0);
      videoRef.current.setRateAsync(1.0, true).catch(() => {});
    }
  };


  const closeEpisodes = () => {
    console.log('🎯 closeEpisodes called');
    setShowEpisodes(false);
    isAnySheetOpenRef.current = showComments || showMore || showDescSheet;
    // Resume only if user didn't manually pause
    if (isActive && !isPausedByUserRef.current && !showComments && !showMore && !showDescSheet) {
      if (videoRef.current) {
        videoRef.current.setIsMutedAsync(false).catch(() => {});
        videoRef.current.playAsync().catch(() => {});
        actualPlayStateRef.current = 'playing';
        setIsPlaying(true);
      }
    }
  };

  const openMore = () => {
    console.log('🎯 openMore called');
    // 9️⃣ COMMENT / MODAL INTERACTION RULE - Pause on open
    isAnySheetOpenRef.current = true;
    if (isActive && videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setIsMutedAsync(true).catch(() => {});
      setIsPlaying(false);
      setIsPausedByUser(true);
    }
    setShowMore(true);
  };

  const closeMore = () => {
    console.log('🎯 closeMore called');
    setShowMore(false);
    isAnySheetOpenRef.current = showComments || showEpisodes || showDescSheet;
    // Resume only if user didn't manually pause
    if (isActive && !isPausedByUserRef.current && !showComments && !showEpisodes && !showDescSheet) {
      if (videoRef.current) {
        videoRef.current.setIsMutedAsync(false).catch(() => {});
        videoRef.current.playAsync().catch(() => {});
        actualPlayStateRef.current = 'playing';
        setIsPlaying(true);
      }
    }
  };

  // Handle More sheet animation - Same pattern as Comment sheet
  useEffect(() => {
    if (showMore) {
      Animated.timing(moreSheetY, {
        toValue: 0, // Fully visible (same as commentSheet)
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(moreSheetY, {
        toValue: height, // Off screen
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showMore, moreSheetY, height]);


  const openDesc = async () => {
    // 9️⃣ COMMENT / MODAL INTERACTION RULE - Pause on open
    isAnySheetOpenRef.current = true;
    if (isActive && videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setIsMutedAsync(true).catch(() => {});
      actualPlayStateRef.current = 'paused';
      setIsPlaying(false);
      isPausedByUserRef.current = true;
      setIsPausedByUser(true);
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:openDesc',message:'Opening info sheet',data:{reelId:reel.id,hasSeasonId:!!reel.seasonId,reelTitle:reel.title,currentShowDescSheet:showDescSheet},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'info-sheet-open'})}).catch(()=>{});
    // #endregion
    setShowDescSheet(true);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:openDesc',message:'setShowDescSheet called',data:{reelId:reel.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'info-sheet-open'})}).catch(()=>{});
    // #endregion
    
    // Fetch episodes if seasonId exists
    if (reel.seasonId) {
      setLoadingEpisodes(true);
      try {
        const seasonId = typeof reel.seasonId === 'string' ? reel.seasonId : (reel.seasonId as any)?._id || reel.seasonId;
        const response = await videoService.getEpisodes(seasonId);
        if (response.success && response.data) {
          setSeasonEpisodes(response.data);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:openDesc',message:'Episodes loaded',data:{reelId:reel.id,episodeCount:response.data.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'info-sheet'})}).catch(()=>{});
          // #endregion
        }
      } catch (error) {
        console.error('Error loading episodes:', error);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:openDesc',message:'Error loading episodes',data:{reelId:reel.id,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'info-sheet'})}).catch(()=>{});
        // #endregion
      } finally {
        setLoadingEpisodes(false);
      }
    }
  };

  const closeDesc = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:closeDesc',message:'Closing info sheet',data:{reelId:reel.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'info-sheet'})}).catch(()=>{});
    // #endregion
    setShowDescSheet(false);
    isAnySheetOpenRef.current = showComments || showEpisodes || showMore;
    // Resume only if user didn't manually pause
    if (isActive && !isPausedByUserRef.current && !showComments && !showEpisodes && !showMore) {
      if (videoRef.current) {
        videoRef.current.setIsMutedAsync(false).catch(() => {});
        videoRef.current.playAsync().catch(() => {});
        actualPlayStateRef.current = 'playing';
        setIsPlaying(true);
      }
    }
  };

  // Handle episode press - navigate to that episode
  const handleEpisodePress = (episode: VideoType) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:handleEpisodePress',message:'Episode pressed',data:{reelId:reel.id,episodeId:episode._id,episodeTitle:episode.title},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'info-sheet'})}).catch(()=>{});
    // #endregion
    // Close the info sheet first
    setShowDescSheet(false);
    // Note: Episode navigation would need to be handled by parent component
    // For now, we'll just log it
    console.log('Episode pressed:', episode.title);
  };

  // Handle like button with optimistic updates (Instagram-style)
  const likeButtonRef = useRef(false); // Prevent double-tap spam
  const handleLike = async () => {
    if (likeButtonRef.current) return; // Prevent double-tap
    if (!reel.id) {
      console.error('Cannot like: reel.id is missing');
      return;
    }
    likeButtonRef.current = true;

    // Optimistic update - update UI immediately
    const previousLiked = isLiked;
    const previousCount = likeCount;
    const newLiked = !isLiked;
    const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
    setIsLiked(newLiked);
    setLikeCount(newCount);

    // Haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    try {
      const response = await videoService.toggleLike(reel.id);
      if (response?.success && response.data) {
        // Sync with server response - handle both formats for backward compatibility
        const liked = response.data.liked !== undefined ? response.data.liked : (response.data.likedByUser ?? newLiked);
        const likeCountValue = response.data.likeCount !== undefined ? response.data.likeCount : (response.data.likes ?? newCount);
        setIsLiked(liked);
        setLikeCount(likeCountValue);
      } else {
        // Revert on failure
        setIsLiked(previousLiked);
        setLikeCount(previousCount);
        Alert.alert('Error', 'Failed to update like. Please try again.');
      }
    } catch (error: any) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      console.error('Error toggling like:', error);
      
      // Only show alert for non-authentication errors
      if (error.message !== 'Authentication required' && error.response?.status !== 401) {
        Alert.alert('Error', error.message || 'Failed to update like. Please try again.');
      }
    } finally {
      likeButtonRef.current = false;
    }
  };

  // Episodes array is now loaded from API in openEpisodes

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {/* ========================================
          LAYER 1: VIDEO LAYER (No UI, No Touch)
          ======================================== */}
      <View style={styles.videoLayer} pointerEvents={showEpisodes || showMore ? "none" : "none"}>
        <Video
          ref={videoRef}
          source={{ uri: reel.videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          isLooping
          isMuted={true} // Always start muted, will be unmuted when active
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          useNativeControls={false}
          progressUpdateIntervalMillis={100}
          onLoadStart={() => {
            console.log(`🎥 Video loading started: ${reel.title}`);
            // Immediately mute on load start to prevent audio overlap
            if (videoRef.current) {
              videoRef.current.setIsMutedAsync(true).catch(() => {});
            }
          }}
          onLoad={(status) => {
            console.log(`✅ Video loaded: ${reel.title}`, status.isLoaded);
            // Ensure muted on load
            if (videoRef.current) {
              videoRef.current.setIsMutedAsync(true).catch(() => {});
            }
            // Only unmute and play if this video is active
            if (isActive && screenFocused && videoRef.current && status.isLoaded) {
              // Use retry function to handle audio focus conflicts
              playVideoWithRetry().catch((error) => {
                console.error(`Error playing video on load for ${reel.title}:`, error);
              });
            }
          }}
          onError={(error) => {
            console.error(`❌ Video error for ${reel.title}:`, error);
          }}
        />
        {/* Visual overlays only (no interaction) */}
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          locations={[0, 0.5, 0.7, 1]}
          style={styles.videoOverlay}
          pointerEvents="none"
        />
        <View style={styles.vignetteOverlay} pointerEvents="none" />
      </View>

      {/* ========================================
          LAYER 2: GESTURE LAYER (Tap/Seek Only)
          ======================================== */}
      {/* Gesture layer only covers video area, NOT button areas */}
      <Pressable
        style={styles.gestureLayer}
        onPress={handleScreenPress}
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
        delayLongPress={300}
        // Do NOT capture touches meant for buttons - buttons will be on Control Layer with higher zIndex
      />

      {/* CENTER PLAY ICON - YouTube Shorts Style (Only visible when paused) */}
      {!isPlaying && (
        <Animated.View
          style={[
            styles.centerPlayIcon,
            {
              opacity: uiOpacity,
              marginTop: -40, // Half of 80px background size
              marginLeft: -40, // Half of 80px background size
            }
          ]}
          pointerEvents="none"
        >
          <View style={styles.centerPlayIconBackground}>
            <Ionicons name="play" size={48} color="#FFFFFF" />
          </View>
        </Animated.View>
      )}

      {/* ========================================
          LAYER 3: CONTROL LAYER (Buttons)
          ======================================== */}
      
      {/* Share button is now in ReelsFeedScreen topHeader container */}

      {/* PROGRESS BAR - Bottom edge, draggable (Control Layer) */}
      {/* HARD RULE: Progress bar sits EXACTLY at safeAreaBottom + 12dp */}
      <Animated.View 
        style={[
          styles.progressBarContainer,
          {
            opacity: uiOpacity,
            bottom: insets.bottom + 8, // CRITICAL: 8dp above safe area (flush to bottom)
            left: 16,
            right: 16,
          }
        ]}
        pointerEvents={uiVisible ? 'auto' : 'none'}
      >
        {/* Real-time Playback Timer */}
        {totalDuration > 0 && (
          <Text style={styles.playbackTimer}>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </Text>
        )}
        
        <View style={styles.progressBarBackground} {...progressBarPanResponder.panHandlers}>
          <Animated.View 
            style={[
              styles.progressBarFill, 
              { 
                width: progressBarWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              }
            ]} 
          />
          {/* Scrubber Thumb - Visible while dragging */}
          {isScrubbing && (
            <Animated.View
              style={[
                styles.scrubberThumb,
                {
                  left: progressBarWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                }
              ]}
            />
          )}
        </View>
      </Animated.View>


      {/* RIGHT ACTION RAIL - Instagram Style (Control Layer - Highest Priority) */}
      <Animated.View 
        style={[
          styles.rightActions,
          {
            opacity: uiOpacity,
            bottom: insets.bottom + 120, // CRITICAL: 120dp above safe area (above bottom metadata)
            right: 16,
          }
        ]}
        pointerEvents={uiVisible ? 'auto' : 'none'}
      >
        {/* LIKE - With press animation and haptic feedback */}
        <ActionButton
          icon={isLiked ? "heart" : "heart-outline"}
          iconColor={isLiked ? "#FF5A5F" : "#FFFFFF"}
          label={formatCount(likeCount)}
          onPress={(e) => {
            e.stopPropagation(); // Prevent video tap
            showUI();
            handleLike();
          }}
        />

        {/* COMMENTS */}
        <ActionButton
          icon="chatbubble-outline"
          iconColor="#FFFFFF"
          label={formatCount(commentCount)}
          onPress={(e) => {
            e.stopPropagation();
            showUI();
            setShowComments(true);
          }}
        />

        {/* EPISODES */}
        <ActionButton
          icon="albums-outline"
          iconColor="#FFFFFF"
          label="Eps"
          onPress={(e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('🎯 Episodes button pressed');
            showUI();
            openEpisodes();
          }}
        />

        {/* MORE (⋯) */}
        <ActionButton
          icon="ellipsis-horizontal"
          iconColor="#FFFFFF"
          label="More"
          onPress={(e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('🎯 More button pressed');
            showUI();
            openMore();
          }}
        />
      </Animated.View>


      {/* BOTTOM INFO - Title/Metadata (Control Layer - Blocks video tap) */}
      {!showMore && !showComments && !showEpisodes && (
        <Animated.View 
          style={[
            styles.bottomInfo,
            {
              opacity: uiOpacity,
              bottom: insets.bottom + 48, // CRITICAL: 48dp above safe area (40dp above progress bar)
              left: 16,
              right: 100, // Fixed space for right action buttons
            }
          ]}
          pointerEvents={uiVisible ? 'auto' : 'none'}
        >
        {/* Series Name with Info Icon */}
        {(() => {
          // Extract series name from seasonId (can be object with title or just ID)
          const seriesName = typeof reel.seasonId === 'object' && reel.seasonId !== null 
            ? (reel.seasonId as any).title 
            : null;
          
          if (seriesName) {
            return (
              <View>
                <View style={styles.seriesNameRow}>
                  <Text style={styles.seriesNameText}>{seriesName}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      openDesc();
                    }}
                    style={styles.seriesInfoIcon}
                    hitSlop={{ 
                      top: 10, // Fixed hitSlop
                      bottom: 10, 
                      left: 10, 
                      right: 10 
                    }}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="information-circle" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                {/* Season & Episode Label */}
                {(() => {
                  const seasonNumber = typeof reel.seasonId === 'object' && reel.seasonId !== null 
                    ? (reel.seasonId as any).seasonNumber || 1
                    : 1;
                  const episodeNumber = reel.episodeNumber || activeEpisode || 1;
                  
                  return (
                    <Text style={styles.seasonEpisodeLabel}>
                      Season {seasonNumber} · Eps {episodeNumber}
                    </Text>
                  );
                })()}
              </View>
            );
          }
          return null;
        })()}
        
        {/* Description with More button */}
        {(() => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:description',message:'Rendering description',data:{reelId:reel.id,hasDescription:!!reel.description,descriptionLength:reel.description?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'description'})}).catch(()=>{});
          // #endregion
          const fullDescription = reel.description || 'Experience the drama, action, and suspense in this captivating series.';
          const maxLength = 60; // Approximate characters for 1 line
          const isTruncated = fullDescription.length > maxLength;
          const truncatedDescription = isTruncated 
            ? fullDescription.substring(0, maxLength).trim() + '...'
            : fullDescription;
          
          return (
            <View style={styles.descriptionRow}>
              <Text style={styles.descriptionText} numberOfLines={2}>
                {truncatedDescription}
              </Text>
              {isTruncated && (
                <TouchableOpacity
                  onPress={() => {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:moreButton',message:'More button pressed',data:{reelId:reel.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'description'})}).catch(()=>{});
                    // #endregion
                    openDesc();
                  }}
                  style={styles.moreButton}
                >
                  <Text style={styles.moreButtonText}>more</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
        
        </Animated.View>
      )}

      {/* INFO SHEET */}
      {(() => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:render',message:'Rendering InfoSheet',data:{showDescSheet,reelId:reel.id,seasonEpisodesCount:seasonEpisodes.length,loadingEpisodes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'info-sheet-render'})}).catch(()=>{});
        // #endregion
        return null;
      })()}
      <InfoSheet
        visible={showDescSheet}
        onClose={closeDesc}
        reel={{
          id: reel.id,
          title: reel.title,
          year: reel.year || '2024',
          rating: reel.rating || 'U/A 16+',
          duration: reel.duration || '2m',
          thumbnailUrl: reel.thumbnailUrl,
          description: reel.description || 'Experience the drama, action, and suspense in this captivating series.',
          seasonId: reel.seasonId,
        }}
        seasonEpisodes={seasonEpisodes}
        loadingEpisodes={loadingEpisodes}
        onPressEpisode={handleEpisodePress}
        onLike={handleLike}
      />

      {/* EPISODES SHEET - Same pattern as Comment Sheet (WORKING REFERENCE) */}
      {showEpisodes && (
        <View style={styles.overlayLayer} pointerEvents="box-none">
          <Pressable
            style={styles.sheetBackdrop}
            onPress={closeEpisodes}
            pointerEvents="auto"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.episodeSheetContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <Animated.View
              style={[
                styles.episodeSheet,
                { 
                  paddingBottom: Math.max(insets.bottom, 20),
                  transform: [{ translateY: episodeSheetY }],
                },
              ]}
              pointerEvents="auto"
              {...episodeSheetPanResponder.panHandlers}
            >
            {/* Premium Header with Divider */}
            <View style={styles.episodeSheetHeader}>
              <Text style={styles.episodeSheetTitle} numberOfLines={1}>
                {reel.title}
              </Text>
              <TouchableOpacity
                onPress={closeEpisodes}
                style={styles.episodeSheetCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {/* Divider Line */}
            <View style={styles.episodeSheetDivider} />

            {loadingEpisodesSheet ? (
              <View style={styles.episodesLoadingContainer}>
                <Text style={styles.episodesLoadingText}>Loading episodes...</Text>
              </View>
            ) : episodesSheetEpisodes.length > 0 ? (
              <>
                {/* Episode Info Card */}
                {(() => {
                  const currentEpisode = episodesSheetEpisodes.find(e => e._id === reel.id) || episodesSheetEpisodes[0];
                  const currentEpNum = currentEpisode?.episodeNumber || reel.episodeNumber || 1;
                  return (
                    <View style={styles.episodeInfoCard}>
                      <Text style={styles.episodeInfoText}>
                        Episode {currentEpNum} • {reel.duration || '2 min'}
                      </Text>
                      <View style={styles.episodeInfoTags}>
                        <Text style={styles.episodeInfoTag}>Romance</Text>
                        <Text style={styles.episodeInfoTag}>Love Triangle</Text>
                      </View>
                    </View>
                  );
                })()}
                
                {/* Episode Pills - Netflix Style */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.episodeScrollContainer}
                  style={styles.episodeScrollView}
                >
                  {episodesSheetEpisodes
                    .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0))
                    .map((item) => {
                      const isActive = item._id === reel.id;
                      return (
                        <TouchableOpacity
                          key={item._id}
                          onPress={() => {
                            // #region agent log
                            fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:episodeSelect',message:'Episode selected from sheet',data:{reelId:reel.id,episodeId:item._id,episodeNumber:item.episodeNumber,episodeTitle:item.title},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'episodes'})}).catch(()=>{});
                            // #endregion
                            closeEpisodes();
                            if (onEpisodeSelect) {
                              onEpisodeSelect(item._id);
                            } else {
                              setActiveEpisode(item.episodeNumber || 1);
                            }
                          }}
                          style={[
                            styles.netflixEpisodePill,
                            isActive && styles.netflixEpisodePillActive,
                            isActive && { transform: [{ scale: 1.05 }] },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.netflixEpisodeText,
                              isActive && styles.netflixEpisodeTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {item.episodeNumber ? `Ep ${item.episodeNumber}` : 'Ep ?'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </>
            ) : (
              <View style={styles.episodesLoadingContainer}>
                <Text style={styles.episodesLoadingText}>No episodes available</Text>
              </View>
            )}
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* ========================================
          LAYER 4: OVERLAY LAYER (Sheets/Modals)
          ======================================== */}
      
      {/* COMMENTS SHEET - Full Bottom Sheet (Instagram Style) */}
      {showComments && (
        <View style={styles.overlayLayer} pointerEvents="box-none">
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => {
              Keyboard.dismiss();
              setShowComments(false);
            }}
            pointerEvents="auto"
          />
          <Animated.View
            style={[
              styles.commentSheetContainer,
              { 
                transform: [{ translateY: commentSheetY }],
              },
            ]}
            pointerEvents="auto"
            {...commentSheetPanResponder.panHandlers}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
              enabled
            >
              <View style={styles.commentSheet}>
                {/* Handle Bar */}
                <View style={styles.commentHandleBar} />
                
                {/* Header */}
                <View style={styles.commentHeader}>
                  <Text style={styles.commentHeaderTitle}>Comments</Text>
                  <TouchableOpacity
                    onPress={() => setShowComments(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Comments List - Scrollable */}
                <FlatList
                  data={comments}
                  keyExtractor={(item) => item.id}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    {/* Avatar */}
                    <View style={styles.commentAvatar}>
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.commentAvatarImage} />
                      ) : (
                        <View style={styles.commentAvatarPlaceholder}>
                          <Text style={styles.commentAvatarText}>{item.username.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                    </View>

                    {/* Comment Content */}
                    <View style={styles.commentContent}>
                      <View style={styles.commentBubble}>
                        <Text style={styles.commentText}>
                          <Text style={styles.commentUsername}>{item.username} </Text>
                          {item.text}
                        </Text>
                      </View>
                      
                      {/* Comment Actions */}
                      <View style={styles.commentActions}>
                        <Text style={styles.commentTime}>{item.timeAgo}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setComments(comments.map(c => 
                              c.id === item.id 
                                ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
                                : c
                            ));
                          }}
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        >
                          <Text style={styles.commentActionText}>
                            {item.isLiked ? 'Liked' : 'Like'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        >
                          <Text style={styles.commentActionText}>Reply</Text>
                        </TouchableOpacity>
                        {item.likes > 0 && (
                          <View style={styles.commentLikesContainer}>
                            <Ionicons name="heart" size={12} color="#FFD54A" style={{ marginRight: 4 }} />
                            <Text style={styles.commentLikes}>{item.likes}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Like Button */}
                    <TouchableOpacity
                      onPress={() => {
                        setComments(comments.map(c => 
                          c.id === item.id 
                            ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
                            : c
                        ));
                      }}
                      style={styles.commentLikeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons 
                        name={item.isLiked ? "heart" : "heart-outline"} 
                        size={16} 
                        color={item.isLiked ? "#ff3040" : "#fff"} 
                      />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.commentEmpty}>
                    <Text style={styles.commentEmptyText}>No comments yet</Text>
                    <Text style={styles.commentEmptySubtext}>Be the first to comment!</Text>
                  </View>
                }
              />

                {/* Input Section - Optimized with API integration */}
                <View style={[styles.commentInputSection, { paddingBottom: keyboardHeight ? keyboardHeight + 12 : Math.max(insets.bottom, 12) }]}>
                  <View style={styles.commentInputAvatar}>
                    <View style={styles.commentInputAvatarPlaceholder}>
                      <Text style={styles.commentInputAvatarText}>Y</Text>
                    </View>
                  </View>
                  <CommentInputOptimized
                    postId={reel.id}
                    visible={showComments}
                    onCommentAdded={(newComment) => {
                      // Optimistic update: add comment to list and increment count
                      setComments(prev => [newComment, ...prev]); // Newest first
                      setCommentCount(prev => prev + 1);
                    }}
                    inputStyle={styles.commentInput}
                    sendButtonStyle={styles.commentSendBtn}
                    sendButtonDisabledStyle={styles.commentSendBtnDisabled}
                    sendButtonTextStyle={styles.commentSendText}
                    sendButtonTextDisabledStyle={styles.commentSendTextDisabled}
                    placeholder="Join the conversation..."
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      )}

      {/* MORE SHEET - Same pattern as Comment Sheet (Instagram-style, no close button) */}
      {showMore && (
        <View style={styles.overlayLayer} pointerEvents="box-none">
          <Pressable
            style={styles.sheetBackdrop}
            onPress={closeMore}
            pointerEvents="auto"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.moreSheetContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <Animated.View
              style={[
                styles.moreSheet,
                { 
                  paddingBottom: Math.max(insets.bottom, 20),
                  transform: [{ translateY: moreSheetY }],
                },
              ]}
              pointerEvents="auto"
              {...moreSheetPanResponder.panHandlers}
            >
            {/* Handle Bar */}
            <View style={styles.moreHandleBar} />
            
            {/* Header - With close button */}
            <View style={styles.moreSheetHeader}>
              <Text style={styles.moreSheetTitle}>More Options</Text>
              <TouchableOpacity
                onPress={closeMore}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.moreSheetCloseBtn}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.moreSheetScroll}
              contentContainerStyle={styles.moreSheetScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Speed Section */}
              <View style={styles.moreSection}>
                <Text style={styles.moreSectionTitle}>Playback Speed</Text>
                <View style={styles.moreOptionsRow}>
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                    <TouchableOpacity
                      key={speed}
                      style={[
                        styles.moreOptionChip,
                        playbackSpeed === speed && styles.moreOptionChipActive,
                      ]}
                      onPress={() => {
                        setPlaybackSpeed(speed);
                        if (isActive && videoRef.current) {
                          videoRef.current.setRateAsync(speed, true).catch(() => {});
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.moreOptionChipText,
                          playbackSpeed === speed && styles.moreOptionChipTextActive,
                        ]}
                      >
                        {speed === 1.0 ? '1×' : `${speed}×`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Video Quality Section - Removed (Auto quality only, handled by backend/CDN) */}

              {/* Audio Track Section */}
              <View style={styles.moreSection}>
                <Text style={styles.moreSectionTitle}>Audio Track</Text>
                <View style={styles.moreOptionsRow}>
                  {['Original', 'Hindi', 'English', 'Dubbed'].map((track) => (
                    <TouchableOpacity
                      key={track}
                      style={[
                        styles.moreOptionChip,
                        audioTrack === track && styles.moreOptionChipActive,
                      ]}
                      onPress={() => setAudioTrack(track)}
                    >
                      <Text
                        style={[
                          styles.moreOptionChipText,
                          audioTrack === track && styles.moreOptionChipTextActive,
                        ]}
                      >
                        {track}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Divider */}
              <View style={styles.moreDivider} />

              {/* Action Buttons */}
              <View style={styles.moreActions}>
                <TouchableOpacity
                  style={styles.moreActionItem}
                  onPress={() => {
                    setIsInWatchlist(!isInWatchlist);
                    // Add to watchlist functionality
                  }}
                >
                  <Ionicons
                    name={isInWatchlist ? "bookmark" : "bookmark-outline"}
                    size={22}
                    color="#fff"
                  />
                  <Text style={styles.moreActionText}>
                    {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.moreActionItem}
                  onPress={async () => {
                    try {
                      const shareMessage = `Check out "${reel.title}" on Digital Kalakar! 🎬\n\n${reel.description || 'Watch now!'}`;
                      await Share.share({
                        message: shareMessage,
                        title: reel.title,
                      });
                    } catch (error) {
                      console.error('Error sharing:', error);
                    }
                  }}
                >
                  <Ionicons name="share-social" size={22} color="#fff" />
                  <Text style={styles.moreActionText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.moreActionItem}
                  onPress={() => {
                    Alert.alert(
                      'Report Content',
                      'Are you sure you want to report this content?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Report',
                          style: 'destructive',
                          onPress: () => {
                            // Report functionality
                            Alert.alert('Reported', 'Thank you for your report. We will review it shortly.');
                            closeMore();
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="flag-outline" size={22} color="#ff4444" />
                  <Text style={[styles.moreActionText, { color: '#ff4444' }]}>Report</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

// Create responsive styles function
const createResponsiveStyles = () => {
  // Fixed spacing and border radius values for fullscreen Reels
  const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
  const borderRadius = { sm: 4, md: 8, lg: 12, xl: 16, full: 999 };
  const touchTargetSize = 44; // Fixed touch target size
  
  return StyleSheet.create({
  container: { 
    width: '100%', 
    backgroundColor: '#0E0E0E',
    overflow: 'hidden',
  },
  
  // LAYER 1: VIDEO LAYER (No UI, No Touch) - Full bleed, edge to edge
  videoLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  
  // LAYER 2: GESTURE LAYER (Tap/Seek Only - Does NOT cover button areas)
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    // Exclude right side (action buttons) and bottom (metadata) from gesture area - Fixed
    paddingRight: 70, // Fixed: Exclude right action rail
    paddingBottom: 100, // Fixed: Exclude bottom metadata
  },
  
  // LAYER 3: CONTROL LAYER (Buttons - Highest Priority for Taps)
  
  // OVERLAY LAYER - Used by all sheets (Comment, Episode, More)
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
  
  // Sheet backdrop (Fade Overlay - Below Sheet)
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    // No z-index needed - rendered before sheet in DOM order
  },
  
  
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Radial gradient vignette effect using shadow/opacity
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 100,
      },
      android: {
        // Android doesn't support radial shadows well, use a darkening overlay
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
      },
    }),
  },

  rightActions: {
    position: 'absolute',
    right: 0, // Set dynamically in inline style
    bottom: 0, // Set dynamically in inline style
    alignItems: 'center',
    zIndex: 500,
  },
  
  // Episode button position for sheet alignment
  episodesButtonPosition: {
    bottom: 80 + (20 * 2), // bottom of rightActions + spacing for two buttons (like + comments)
  },
  
  // Premium Glassmorphism Action Buttons - Fixed spacing
  premiumActionBtn: {
    alignItems: 'center',
    marginBottom: spacing.md, // Fixed spacing between buttons
    minWidth: touchTargetSize, // Fixed minimum touch target size
  },
  premiumIconContainer: {
    width: touchTargetSize,
    height: touchTargetSize,
    borderRadius: touchTargetSize / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4, // Fixed spacing
    borderWidth: Platform.OS === 'ios' ? 1 : 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // Fixed shadow offset
    shadowOpacity: 0.4,
    shadowRadius: 6, // Fixed shadow radius
    elevation: Platform.OS === 'android' ? 8 : 0, // Fixed elevation
    // Glassmorphism effect
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
      },
      android: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        elevation: 8,
      },
    }),
  },
  premiumCountLabel: {
    color: '#E5E5E5',
    fontSize: 11, // Fixed font size
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  
  // Top right actions
  topHeader: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  topActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    // Glassmorphism effect
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
      },
      android: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        elevation: 8,
      },
    }),
  },
  
  // Navigation buttons and swipe indicators removed - YouTube Shorts style (vertical scrolling only)
  
  // Play/Pause button
  playPauseButtonContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    zIndex: 200,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Speed indicator styles removed - 2x speed shown only during long-press (no visual indicator on progress bar)

  descMetaRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
},
descMetaText: {
  color: '#aaa',
  fontSize: 12,
  marginRight: 12,
},
ratingBadge: {
  backgroundColor: '#333',
  borderRadius: 6,
  paddingHorizontal: 6,
  paddingVertical: 2,
  marginRight: 12,
},
ratingText: {
  color: '#FFD54A',
  fontSize: 11,
  fontWeight: '700',
},
infoSection: {
  marginTop: 10,
},
infoLabel: {
  color: '#777',
  fontSize: 12,
},
infoValue: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '600',
},

  actionBtn: { 
    alignItems: 'center', 
    marginBottom: 24,
    minWidth: 56,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  iconCircleActive: {
    backgroundColor: 'rgba(255, 213, 74, 0.2)',
    borderColor: 'rgba(255, 213, 74, 0.4)',
  },
  label: { 
    color: '#fff', 
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  countLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 2,
  },






  emojiBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    marginHorizontal: 2,
  },





  emoji: {
    fontSize: 24,
    lineHeight: 28,
  },


  // Episode Indicator - OTT Style (Top-left)
  episodeIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 200,
  },
  episodeIndicatorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // BOTTOM INFO - Title/Metadata (Control Layer)
  bottomInfo: {
    position: 'absolute',
    left: 0, // Set dynamically in inline style
    right: 0, // Set dynamically in inline style
    zIndex: 4000,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 6,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    letterSpacing: 0.1,
  },
  seriesNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: spacing.xs, // Responsive gap before description
  },
  seriesNameText: {
    color: '#FFFFFF',
    fontSize: 16, // Fixed font size
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4, // Fixed shadow radius
    letterSpacing: 0.2,
  },
  seriesInfoIcon: {
    marginLeft: 6, // Fixed spacing
    alignSelf: 'center',
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0, // No extra spacing below description
  },
  descriptionText: {
    color: '#FFFFFF',
    fontSize: 14, // Fixed font size
    flex: 1,
    lineHeight: 20, // Fixed line height
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4, // Fixed shadow radius
    letterSpacing: 0.15,
  },
  moreButton: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 4,
  },
  moreButtonText: {
    color: '#FFD54A',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: { 
    color: '#B0B0B0', 
    fontSize: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.2,
    marginTop: 6,
  },

  // PROGRESS BAR - Bottom edge, draggable (Responsive)
  progressBarContainer: {
    position: 'absolute',
    left: 0, // Set dynamically
    right: 0, // Set dynamically
    zIndex: 4000,
    alignItems: 'flex-start',
  },
  progressBarBackground: {
    width: '100%',
    height: 3, // Fixed height
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2, // Fixed border radius
    overflow: 'visible',
    position: 'relative',
  },
  progressBarFill: { 
    height: 3, // Fixed height
    backgroundColor: '#FFD54A',
    borderRadius: 2, // Fixed border radius
  },
  scrubberThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD54A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    top: -4.5, // Center on the 3px bar
    marginLeft: -6, // Center the thumb
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  playbackTimer: {
    color: '#FFFFFF',
    fontSize: 11, // Fixed font size
    fontWeight: '500',
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  seasonEpisodeLabel: {
    color: '#FFD54A',
    fontSize: 13, // Fixed font size
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.2,
  },
  
  // Legacy progress bar styles (deprecated - removed duplicate progressBarBackground)

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  descSheet: {
  position: 'absolute',
  left: 0,
  right: 0,
  height: height * 0.45,
  backgroundColor: '#111',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 20,
  zIndex: 60,
},

  fullDesc: { color: '#ddd', marginTop: 8 },

  // EPISODE SHEET - Same pattern as Comment Sheet
  episodeSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.4, // 40% height (OTT style)
    width: '100%',
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 16,
    zIndex: 10001, // Above backdrop (same as commentSheet)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 21, // Same as commentSheet
    ...Platform.select({
      ios: {
        backgroundColor: '#0E0E0E',
      },
      android: {
        backgroundColor: '#0E0E0E',
      },
    }),
  },
  
  // Legacy sheet styles (deprecated)
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.4,
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 16,
    zIndex: 250,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  // MORE SHEET - Same pattern as Comment Sheet (Instagram-style, 65% height)
  moreSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.65, // Fixed height (65% of window height)
    maxHeight: height * 0.65,
    width: '100%',
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.md,
    paddingHorizontal: 16, // Fixed padding
    zIndex: 10001, // Above backdrop (same as commentSheet)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 21, // Same as commentSheet
    ...Platform.select({
      ios: {
        backgroundColor: '#0E0E0E',
      },
      android: {
        backgroundColor: '#0E0E0E',
      },
    }),
  },

  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  
  // Premium Episode Sheet Header
  episodeSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
  },
  episodeSheetTitle: {
    color: '#FFFFFF',
    fontSize: 17, // Fixed font size
    fontWeight: '600',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: spacing.md,
  },
  episodeSheetCloseBtn: {
    width: touchTargetSize,
    height: touchTargetSize,
    borderRadius: touchTargetSize / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeSheetDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  
  // Episode Info Card
  episodeInfoCard: {
    marginBottom: 20,
    alignItems: 'center',
  },
  episodeInfoText: {
    color: '#B0B0B0',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  episodeInfoTags: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeInfoTag: {
    color: '#B0B0B0',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  
  episodeScrollView: {
    marginHorizontal: -20, // Extend scroll view to edges
  },

  rangeRow: { flexDirection: 'row', marginBottom: 12 },
  rangePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1b1419',
    marginRight: 8,
    alignItems: 'center',
  },
  rangePillActive: { backgroundColor: '#FFD54A' },
  rangeText: { color: '#ccc', fontWeight: '700' },
  rangeTextActive: { color: '#000' },

  // Netflix-style Episode Pills - Premium OTT Design - Fixed values
  episodeScrollContainer: {
    paddingLeft: 16, // Fixed padding
    paddingRight: 16, // Fixed padding
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  netflixEpisodePill: {
    paddingHorizontal: 16, // Fixed padding
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60, // Fixed min width
    minHeight: touchTargetSize,
    marginRight: spacing.md,
  },
  netflixEpisodePillActive: {
    backgroundColor: '#F5C451',
    borderColor: '#F5C451',
  },
  netflixEpisodeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13, // Fixed font size
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  netflixEpisodeTextActive: {
    color: '#000000',
    fontSize: 13, // Fixed font size
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  
  // Legacy episode styles
  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  episodePill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#252027',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 6,
  },
  episodePillActive: { backgroundColor: '#FFD54A' },
  epText: { color: '#ddd' },
  epTextActive: { color: '#000', fontWeight: '800' },
  episodesLoadingContainer: {
    width: '100%',
    paddingVertical: 40, // Fixed padding
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodesLoadingText: {
    color: '#fff',
    marginTop: spacing.md,
    fontSize: 14, // Fixed font size
  },

  // COMMENT SHEET - Full Bottom Sheet (Overlay Layer) - REFERENCE IMPLEMENTATION
  commentSheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.85, // Fixed height (85% of window height)
    maxHeight: height * 0.85,
    width: '100%',
    zIndex: 10001,
  },
  commentSheet: {
    flex: 1,
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.md,
    paddingHorizontal: 16, // Fixed padding
    paddingBottom: 0, // Remove bottom padding - let KeyboardAvoidingView handle it
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 21,
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(14, 14, 14, 0.95)',
      },
      android: {
        backgroundColor: '#0E0E0E',
      },
    }),
  },
  
  // EPISODE SHEET - Same pattern as Comment Sheet
  episodeSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  // MORE SHEET - Same pattern as Comment Sheet
  moreSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  // Legacy comment styles (deprecated)
  commentWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  commentBox: {
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.85,
    maxHeight: height * 0.85,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 16,
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(14, 14, 14, 0.95)',
      },
      android: {
        backgroundColor: '#0E0E0E',
      },
    }),
  },
  commentHandleBar: {
    width: 36, // Fixed width
    height: 4, // Fixed height
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: borderRadius.sm,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20, // Fixed font size
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingRight: spacing.xs,
  },
  commentAvatar: {
    marginRight: spacing.md,
  },
  commentAvatarPlaceholder: {
    width: 32, // Fixed width
    height: 32, // Fixed height
    borderRadius: 16, // Fixed border radius
    backgroundColor: '#FFD54A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarImage: {
    width: 32, // Fixed width
    height: 32, // Fixed height
    borderRadius: 16, // Fixed border radius
  },
  commentAvatarText: {
    color: '#000',
    fontSize: 14, // Fixed font size
    fontWeight: '700',
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    marginBottom: 4,
  },
  commentUsername: {
    color: '#fff',
    fontSize: 14, // Fixed font size
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  commentText: {
    color: '#FFFFFF',
    fontSize: 15, // Fixed font size
    lineHeight: 22, // Fixed line height
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  commentTime: {
    color: '#999',
    fontSize: 12, // Fixed font size
    marginRight: spacing.md,
  },
  commentActionText: {
    color: '#999',
    fontSize: 12, // Fixed font size
    marginRight: spacing.md,
    fontWeight: '600',
  },
  commentLikesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  commentLikes: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  commentLikeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  commentEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  commentEmptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentEmptySubtext: {
    color: '#999',
    fontSize: 14,
  },
  // COMMENT INPUT - Fixed at bottom (Instagram Style) - Responsive
  commentInputSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: spacing.md,
    paddingHorizontal: 0,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0E0E0E',
  },
  commentInputAvatar: {
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  commentInputAvatarPlaceholder: {
    width: 40, // Fixed width
    height: 40, // Fixed height
    borderRadius: 20, // Fixed border radius
    backgroundColor: '#F5C451',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  commentInputAvatarText: {
    color: '#000000',
    fontSize: 16, // Fixed font size
    fontWeight: '700',
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: 14, // Fixed font size
    maxHeight: 100, // Fixed max height
    paddingVertical: spacing.xs,
    paddingHorizontal: 0,
  },
  commentSendBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginLeft: spacing.xs,
    marginBottom: spacing.xs,
    alignSelf: 'flex-end',
    minHeight: touchTargetSize, // Fixed touch target size
  },
  commentSendBtnDisabled: {
    opacity: 0.5,
  },
  commentSendText: {
    color: '#FFD54A',
    fontSize: 14, // Fixed font size
    fontWeight: '700',
  },
  commentSendTextDisabled: {
    color: '#666',
  },

  moreSheetScroll: {
    flex: 1,
  },
  moreSheetScrollContent: {
    paddingBottom: 12,
  },
  moreHandleBar: {
    width: 36, // Fixed width
    height: 4, // Fixed height
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: borderRadius.sm,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  moreSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  moreSheetTitle: {
    color: '#FFFFFF',
    fontSize: 20, // Fixed font size
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  moreSheetCloseBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreSection: {
    marginBottom: spacing.xl, // Fixed spacing (xl instead of xxl)
  },
  moreSectionTitle: {
    color: '#B0B0B0',
    fontSize: 13, // Fixed font size
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  moreOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moreOptionChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 10,
    marginBottom: 10,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOptionChipActive: {
    backgroundColor: '#F5C451',
    borderColor: '#F5C451',
  },
  moreOptionChipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14, // Fixed font size
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  moreOptionChipTextActive: {
    color: '#000000',
    fontSize: 14, // Fixed font size
    fontWeight: '700',
  },
  moreDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
    marginBottom: 16,
  },
  moreActions: {
    marginBottom: 12,
  },
  moreActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  moreActionText: {
    color: '#fff',
    fontSize: 16, // Fixed font size
    fontWeight: '500',
    marginLeft: spacing.md,
  },
  moreItem: { paddingVertical: 14 },
  moreText: { color: '#fff', fontSize: 16 },
  moreClose: { paddingVertical: 14, alignItems: 'center' },
  moreCloseText: { color: '#FFD54A', fontSize: 16 },
  centerPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 50,
  },
  centerPlayIconBackground: {
    width: 80, // Fixed play icon size
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // Fixed shadow offset
    shadowOpacity: 0.5,
    shadowRadius: 8, // Fixed shadow radius
    elevation: Platform.OS === 'android' ? 10 : 0, // Fixed elevation
  },
  });
};

const styles = createResponsiveStyles();

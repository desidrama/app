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
  Platform,
  Pressable,
  Image,
  Share,
  Alert,
  PanResponder,
  ScrollView,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { videoService } from '../services/video.service';
import InfoSheet from './InfoSheet';
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
  };
  isActive: boolean;
  initialTime?: number;
  screenFocused?: boolean; // Whether the Reels screen is focused
  onEpisodeSelect?: (episodeId: string) => void; // Callback when episode is selected
  // Swipe gestures removed - only vertical scrolling for navigation
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

export default function ReelItem({ reel, isActive, initialTime = 0, screenFocused = true, onEpisodeSelect }: ReelItemProps) {
  const insets = useSafeAreaInsets();
  
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
  const userPausedRef = useRef(false); // Track if user intentionally paused

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
  }, [showComments, commentSheetY]);
const [seasonEpisodes, setSeasonEpisodes] = useState<VideoType[]>([]);
const [loadingEpisodes, setLoadingEpisodes] = useState(false);
const [episodesSheetEpisodes, setEpisodesSheetEpisodes] = useState<VideoType[]>([]);
const [loadingEpisodesSheet, setLoadingEpisodesSheet] = useState(false);

  // Like state (YouTube Shorts-style: simple like/unlike)
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

  // PanResponder for draggable progress bar
  const progressBarWidth = useRef(new Animated.Value(0)).current;
  const progressBarPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: async () => {
        if (!isActive || !videoRef.current) return;
        try {
          const status = await videoRef.current.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {}
          }
        } catch {}
      },
      onPanResponderMove: async (evt, gestureState) => {
        if (!isActive || !videoRef.current) return;
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
          
          // Update visual progress immediately
          const progressPercent = (newTime / (status.durationMillis / 1000)) * 100;
          progressBarWidth.setValue(progressPercent);
        } catch {}
      },
      onPanResponderRelease: async (evt, gestureState) => {
        if (!isActive || !videoRef.current) return;
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
          
          await videoRef.current.setPositionAsync(newTime * 1000);
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
  // Removed showPlayPauseButton and playPauseButtonTimeoutRef - Instagram-style: no visible play/pause button
  
  // Premium UI auto-hide state
  const [uiVisible, setUiVisible] = useState(true);
  const uiHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const uiOpacity = useRef(new Animated.Value(1)).current;
  // Video quality removed - Auto quality only (handled by backend/CDN)
  const [audioTrack, setAudioTrack] = useState('Original');
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Array<{
    id: string;
    username: string;
    text: string;
    likes: number;
    timeAgo: string;
    isLiked: boolean;
    avatar?: string;
  }>>([
    { id: '1', username: 'user123', text: 'This is amazing! 🔥', likes: 42, timeAgo: '2h', isLiked: false },
    { id: '2', username: 'movie_lover', text: 'Can\'t wait to watch this!', likes: 15, timeAgo: '5h', isLiked: true },
    { id: '3', username: 'cinema_fan', text: 'Best scene ever!', likes: 8, timeAgo: '1d', isLiked: false },
  ]);

  // Initialize video and seek to initial time when video becomes active
  useEffect(() => {
    if (isActive && videoRef.current && !hasSeekedRef.current) {
      const initializeVideo = async () => {
        try {
          // Wait for video to be ready
          const status = await videoRef.current!.getStatusAsync();
          
          if (status.isLoaded) {
            // Seek to initial time if provided
            if (initialTime > 0) {
              await videoRef.current!.setPositionAsync(initialTime * 1000);
              console.log(`⏩ Seeked to ${initialTime}s for video: ${reel.title}`);
            }
            
            // Ensure video is playing
            if (isActive && screenFocused) {
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
      userPausedRef.current = false; // Reset user pause flag when video becomes inactive
    }
  }, [isActive, initialTime, reel.videoUrl, screenFocused]);

  const openEpisodes = async () => {
    console.log('🎯 openEpisodes called');
    // CRITICAL: Pause video and lock interactions when sheet opens
    if (isActive && videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
      setIsPlaying(false);
      userPausedRef.current = true; // Prevent auto-resume
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
      userPausedRef.current = false;
    }
  }, [screenFocused, reel.id]);

  useEffect(() => {
    // Only play if both isActive AND screenFocused AND user hasn't intentionally paused
    if (isActive && screenFocused && videoRef.current && !userPausedRef.current) {
      const playVideo = async () => {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:isActive',message:'Video becoming active - attempting play',data:{reelId:reel.id,hasVideoRef:!!videoRef.current,screenFocused,videoUrl:reel.videoUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'video-play'})}).catch(()=>{});
          // #endregion
          
          // Wait for video to be loaded
          const status = await videoRef.current!.getStatusAsync();
          
          if (status.isLoaded) {
            // Unmute and play video
            await videoRef.current!.setIsMutedAsync(false);
            await videoRef.current!.playAsync();
            setIsPlaying(true);
            userPausedRef.current = false; // Clear user pause flag when video auto-plays
            
      // Removed play button - Instagram-style: no visible play/pause button
      
      // Auto-hide UI after 2.5 seconds when video starts
      setTimeout(() => {
        if (isMountedRef.current && isActive && screenFocused) {
          hideUI();
        }
      }, 2500);
          } else {
            // Retry after a short delay if video is not loaded yet
            setTimeout(async () => {
              if (isMountedRef.current && isActive && screenFocused && videoRef.current) {
                try {
                  const retryStatus = await videoRef.current.getStatusAsync();
                  if (retryStatus.isLoaded) {
                    await videoRef.current.setIsMutedAsync(false);
                    await videoRef.current.playAsync();
                    setIsPlaying(true);
                  }
                } catch (error) {
                  console.error('Error retrying video play:', error);
                }
              }
            }, 300);
          }
        } catch (error) {
          console.error('Error playing video:', error);
          // Retry once more after delay
          setTimeout(async () => {
            if (isMountedRef.current && isActive && screenFocused && videoRef.current) {
              try {
                await videoRef.current.setIsMutedAsync(false);
                await videoRef.current.playAsync();
                setIsPlaying(true);
              } catch (retryError) {
                console.error('Error on retry play:', retryError);
              }
            }
          }, 500);
        }
      };
      
      playVideo();
    } else {
      // Video is NOT active - IMMEDIATELY mute and pause
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
        console.log(`🛑 ReelItem: Cleared progress interval for ${reel.title} (video inactive)`);
      }
      
      // IMMEDIATELY pause and mute video to prevent audio overlap
      if (videoRef.current) {
        try {
          videoRef.current.setIsMutedAsync(true).catch(() => {});
          videoRef.current.pauseAsync().catch(() => {});
          setIsPlaying(false);
          console.log(`🔇 ReelItem: IMMEDIATELY muted and paused video for ${reel.title} (not active)`);
        } catch (error) {
          console.error(`Error muting/pausing video: ${reel.title}`, error);
        }
      }
      setPlaybackSpeed(1.0);
      if (videoRef.current) {
        videoRef.current.setRateAsync(1.0, true).catch(() => {});
      }
      
      // Then save final progress (if valid) after a short delay
      const videoRefCopy = videoRef.current;
      setTimeout(() => {
        if (isMountedRef.current && videoRefCopy && videoDurationRef.current > 0) {
          videoRefCopy.getStatusAsync().then((status) => {
            if (status.isLoaded) {
              const currentTimeSeconds = (status.positionMillis || 0) / 1000;
              const durationSeconds = videoDurationRef.current;
              const progressPercent = durationSeconds > 0 ? (currentTimeSeconds / durationSeconds) * 100 : 0;
              
              // Save if progress is valid (between 5% and 85%)
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
      }, 100);
    }
  }, [isActive, screenFocused, reel.title]);

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

  // Handle playback status updates
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      // Video is still loading
      return;
    }
    
    // Update duration
    if (status.durationMillis && status.durationMillis > 0) {
      videoDurationRef.current = status.durationMillis / 1000;
    }
    
    // Update progress
    const currentTime = (status.positionMillis || 0) / 1000;
    if (videoDurationRef.current > 0) {
      const progressPercent = (currentTime / videoDurationRef.current) * 100;
      setProgress(progressPercent);
      // Update animated progress bar width
      progressBarWidth.setValue(progressPercent);
    }
    
    // Update playing state
    setIsPlaying(status.isPlaying);
    
    // If video should be playing but isn't, try to play
    // BUT only if user didn't intentionally pause it
    if (isActive && screenFocused && !status.isPlaying && status.didJustFinish === false && !userPausedRef.current) {
      // Video stopped unexpectedly, try to resume
      if (videoRef.current) {
        videoRef.current.playAsync().catch(() => {});
      }
    }
    
    // Reset user pause flag when video starts playing
    if (status.isPlaying && userPausedRef.current) {
      userPausedRef.current = false;
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

  // Track component mount status and cleanup player on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cleanup UI hide timeout
      if (uiHideTimeoutRef.current) {
        clearTimeout(uiHideTimeoutRef.current);
        uiHideTimeoutRef.current = null;
      }
      // Removed play/pause button timeout cleanup
      // Safely cleanup player on unmount
      if (videoRef.current) {
        videoRef.current.setIsMutedAsync(true).catch(() => {});
        videoRef.current.pauseAsync().catch(() => {});
      }
    };
  }, []);

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
    
    // Auto-hide after 2.5 seconds
    uiHideTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && uiOpacity) {
        Animated.timing(uiOpacity, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          if (isMountedRef.current) {
            setUiVisible(false);
          }
        });
      }
    }, 2500);
  }, [uiOpacity]);
  
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

  // Handle screen tap: Left = Seek back, Right = Seek forward, Center = Play/Pause
  const handleScreenPress = async (event: any) => {
    if (!isActive || !videoRef.current) return;
    
    // Show UI on tap
    showUI();
    
    try {
      const status = await videoRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      
      // Get tap position
      const { locationX } = event.nativeEvent;
      const screenWidth = width;
      const tapX = locationX;
      
      // Determine if tap is on left, center, or right third of screen
      const leftThird = screenWidth / 3;
      const rightThird = (screenWidth * 2) / 3;
      
      if (tapX < leftThird) {
        // Tap left → seek backward 10 seconds
        const currentTime = (status.positionMillis || 0) / 1000;
        const newTime = Math.max(0, currentTime - 10);
        await videoRef.current.setPositionAsync(newTime * 1000);
        
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      } else if (tapX > rightThird) {
        // Tap right → seek forward 10 seconds
        const currentTime = (status.positionMillis || 0) / 1000;
        const duration = (status.durationMillis || 0) / 1000;
        const newTime = Math.min(duration, currentTime + 10);
        await videoRef.current.setPositionAsync(newTime * 1000);
        
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      } else {
        // Center tap → toggle play/pause (Instagram-style: no visible button)
        if (status.isPlaying) {
          userPausedRef.current = true;
          await videoRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          userPausedRef.current = false;
          await videoRef.current.setIsMutedAsync(false);
          await videoRef.current.playAsync();
          setIsPlaying(true);
        }
        
        // No visible play/pause button - just toggle state (Instagram-style)
      }
    } catch {
      // Silently ignore ALL errors - player is disposed
    }
  };

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
  };

  const openMore = () => {
    console.log('🎯 openMore called');
    setShowMore(true);
  };

  const closeMore = () => {
    console.log('🎯 closeMore called');
    setShowMore(false);
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

  // Handle like button (YouTube Shorts-style: simple like/unlike)
  const handleLike = async () => {
    try {
      const response = await videoService.likeVideo(reel.id);
      if (response?.success) {
        setIsLiked(!isLiked);
        setLikeCount(response.data?.likes || (isLiked ? likeCount - 1 : likeCount + 1));
        // Haptic feedback
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  // Episodes array is now loaded from API in openEpisodes

  return (
    <View style={styles.container}>
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
              videoRef.current.setIsMutedAsync(false).catch(() => {});
              videoRef.current.playAsync().catch(() => {});
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

      {/* ========================================
          LAYER 3: CONTROL LAYER (Buttons)
          ======================================== */}
      
      {/* TOP RIGHT SHARE BUTTON - Back to original position */}
      <Animated.View 
        style={[
          styles.topRightActions, 
          {
            top: insets.top + (Platform.OS === 'ios' ? 8 : 12),
            right: insets.right + 16,
            opacity: uiOpacity,
          }
        ]}
        pointerEvents={uiVisible ? 'auto' : 'none'}
      >
        <TouchableOpacity 
          style={styles.topActionBtn}
          activeOpacity={0.8}
          onPress={async (e: any) => {
            e.stopPropagation();
            showUI();
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
          <Ionicons name="share-outline" size={27} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* PROGRESS BAR - Bottom edge, draggable (Control Layer) */}
      <Animated.View 
        style={[
          styles.progressBarContainer,
          {
            opacity: uiOpacity,
            bottom: Math.max(insets.bottom, 16),
          }
        ]}
        pointerEvents={uiVisible ? 'auto' : 'none'}
      >
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
        </View>
      </Animated.View>


      {/* RIGHT ACTION RAIL - Instagram Style (Control Layer - Highest Priority) */}
      <Animated.View 
        style={[
          styles.rightActions,
          {
            opacity: uiOpacity,
            bottom: Math.max(insets.bottom, 80),
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
          label={formatCount(reel.comments || comments.length || 0)}
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

      {/* EPISODE INDICATOR - OTT Style (Top-left, non-intrusive) */}
      {reel.episodeNumber && (
        <Animated.View 
          style={[
            styles.episodeIndicator,
            {
              top: insets.top + (Platform.OS === 'ios' ? 8 : 12) + 8, // Below progress bar
              left: insets.left + 16,
              opacity: uiOpacity,
            }
          ]}
          pointerEvents="none"
        >
          <Text style={styles.episodeIndicatorText}>
            Ep {reel.episodeNumber}
          </Text>
        </Animated.View>
      )}

      {/* BOTTOM INFO - Title/Metadata (Control Layer - Blocks video tap) */}
      {!showMore && !showComments && !showEpisodes && (
        <Animated.View 
          style={[
            styles.bottomInfo,
            {
              opacity: uiOpacity,
              bottom: Math.max(insets.bottom, 16),
            }
          ]}
          pointerEvents={uiVisible ? 'auto' : 'none'}
        >
        {/* Tags */}
        <View style={styles.tagsRow}>
          <View style={styles.tagChip}>
            <Text style={styles.tagText}>Romance</Text>
          </View>
          <View style={styles.tagChip}>
            <Text style={styles.tagText}>Love Triangle</Text>
          </View>
        </View>
        
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
              <Text style={styles.descriptionText} numberOfLines={1}>
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
        
        {/* Episode and Duration */}
        {(() => {
          const currentEpisode = reel.episodeNumber || activeEpisode || 1;
          const totalEpisodes = episodesSheetEpisodes.length > 0 
            ? episodesSheetEpisodes.length 
            : seasonEpisodes.length > 0 
            ? seasonEpisodes.length 
            : currentEpisode > 1 ? currentEpisode : 1;
          
          // Ensure we show the correct format: episode/total
          // If total is less than current, use current as total
          const displayEpisode = currentEpisode;
          const displayTotal = totalEpisodes >= currentEpisode ? totalEpisodes : currentEpisode;
          
          return (
            <Text style={styles.meta}>
              {String(displayEpisode)}/{String(displayTotal)} · {reel.duration || '2m'}
            </Text>
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
            onPress={() => setShowComments(false)}
            pointerEvents="auto"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.commentSheetContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <Animated.View
              style={[
                styles.commentSheet,
                { 
                  paddingBottom: Math.max(insets.bottom, 20),
                  transform: [{ translateY: commentSheetY }],
                },
              ]}
              pointerEvents="auto"
              {...commentSheetPanResponder.panHandlers}
            >
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

              {/* Input Section */}
              <View style={styles.commentInputSection}>
                <View style={styles.commentInputAvatar}>
                  <View style={styles.commentInputAvatarPlaceholder}>
                    <Text style={styles.commentInputAvatarText}>Y</Text>
                  </View>
                </View>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Add a comment..."
                  placeholderTextColor="#888"
                  style={styles.commentInput}
                  multiline
                  maxLength={2200}
                  onSubmitEditing={() => {
                    if (comment.trim()) {
                      const newComment = {
                        id: Date.now().toString(),
                        username: 'You',
                        text: comment.trim(),
                        likes: 0,
                        timeAgo: 'now',
                        isLiked: false,
                      };
                      setComments([...comments, newComment]);
                      setComment('');
                    }
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (comment.trim()) {
                      const newComment = {
                        id: Date.now().toString(),
                        username: 'You',
                        text: comment.trim(),
                        likes: 0,
                        timeAgo: 'now',
                        isLiked: false,
                      };
                      setComments([...comments, newComment]);
                      setComment('');
                    }
                  }}
                  disabled={!comment.trim()}
                  style={[styles.commentSendBtn, !comment.trim() && styles.commentSendBtnDisabled]}
                >
                  <Text style={[styles.commentSendText, !comment.trim() && styles.commentSendTextDisabled]}>
                    Post
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* MORE SHEET - Same pattern as Comment Sheet (WORKING REFERENCE) */}
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
            >
            {/* Header */}
            <View style={styles.moreSheetHeader}>
              <Text style={styles.moreSheetTitle}>More Options</Text>
              <TouchableOpacity onPress={closeMore} style={styles.moreSheetCloseBtn}>
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

            {/* Cancel Button */}
            <View style={[styles.moreCancelContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TouchableOpacity style={styles.moreCancel} onPress={closeMore}>
                <Text style={styles.moreCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    width, 
    height, 
    backgroundColor: '#0E0E0E',
    overflow: 'hidden',
  },
  
  // LAYER 1: VIDEO LAYER (No UI, No Touch)
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  
  // LAYER 2: GESTURE LAYER (Tap/Seek Only - Does NOT cover button areas)
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    // Exclude right side (action buttons) and bottom (metadata) from gesture area
    paddingRight: 80, // Exclude right action rail
    paddingBottom: 120, // Exclude bottom metadata
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
    right: 16,
    bottom: Math.max(80, 80), // Respect bottom safe area
    alignItems: 'center',
    zIndex: 500, // High zIndex for action buttons
  },
  
  // Episode button position for sheet alignment
  episodesButtonPosition: {
    bottom: 80 + (20 * 2), // bottom of rightActions + spacing for two buttons (like + comments)
  },
  
  // Premium Glassmorphism Action Buttons - Professional spacing (16dp between buttons)
  premiumActionBtn: {
    alignItems: 'center',
    marginBottom: 16, // 16dp spacing (Instagram/YouTube Shorts standard)
    minWidth: 44,
  },
  premiumIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
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
  premiumCountLabel: {
    color: '#E5E5E5',
    fontSize: 11,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  
  // Top right actions
  topRightActions: {
    position: 'absolute',
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
    left: 16,
    right: 100, // Leave space for right action rail
    zIndex: 4000, // Control Layer - Above gesture, blocks video tap
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
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 6,
  },
  descriptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.2,
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

  // PROGRESS BAR - Bottom edge, draggable (no shadow/border)
  progressBarContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 3,
    zIndex: 4000, // Control Layer
    justifyContent: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: { 
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
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
  // MORE SHEET - Same pattern as Comment Sheet
  moreSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.4, // 40% of screen height
    width: '100%',
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
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
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 12,
  },
  episodeSheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
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

  // Netflix-style Episode Pills - Premium OTT Design
  episodeScrollContainer: {
    paddingLeft: 20,
    paddingRight: 20, // Extra padding on right to prevent cut-off
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  netflixEpisodePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999, // Fully rounded
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    marginRight: 12, // Spacing between pills
  },
  netflixEpisodePillActive: {
    backgroundColor: '#F5C451',
    borderColor: '#F5C451',
  },
  netflixEpisodeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500', // Regular weight for inactive
    letterSpacing: 0.2,
  },
  netflixEpisodeTextActive: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600', // SemiBold for active
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
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodesLoadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },

  // COMMENT SHEET - Full Bottom Sheet (Overlay Layer) - REFERENCE IMPLEMENTATION
  commentSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  commentSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.85, // 85% height (full bottom sheet)
    maxHeight: height * 0.85,
    width: '100%',
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    zIndex: 10001, // Above backdrop
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
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingRight: 8,
  },
  commentAvatar: {
    marginRight: 12,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD54A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentAvatarText: {
    color: '#000',
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  commentText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  commentTime: {
    color: '#999',
    fontSize: 12,
    marginRight: 12,
  },
  commentActionText: {
    color: '#999',
    fontSize: 12,
    marginRight: 12,
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
  // COMMENT INPUT - Fixed at bottom (Instagram Style)
  commentInputSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0E0E0E', // Solid background so it stays visible
  },
  commentInputAvatar: {
    marginRight: 12,
    marginBottom: 8,
  },
  commentInputAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5C451',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  commentInputAvatarText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  commentSendBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  commentSendBtnDisabled: {
    opacity: 0.5,
  },
  commentSendText: {
    color: '#FFD54A',
    fontSize: 14,
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
  moreSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  moreSheetTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  moreSheetCloseBtn: {
    padding: 4,
  },
  moreSection: {
    marginBottom: 32,
  },
  moreSectionTitle: {
    color: '#B0B0B0',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  moreOptionChipTextActive: {
    color: '#000000',
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  moreCancelContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  moreCancel: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  moreCancelText: {
    color: '#FFD54A',
    fontSize: 16,
    fontWeight: '600',
  },
  moreItem: { paddingVertical: 14 },
  moreText: { color: '#fff', fontSize: 16 },
  moreClose: { paddingVertical: 14, alignItems: 'center' },
  moreCloseText: { color: '#FFD54A', fontSize: 16 },


});

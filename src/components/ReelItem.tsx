import React, { useRef, useState, useEffect } from 'react';
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
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  onSwipeLeft?: () => void; // Callback for left swipe (next webseries)
  onSwipeRight?: () => void; // Callback for right swipe (previous webseries)
  canGoNext?: boolean; // Whether next webseries is available
  canGoPrevious?: boolean; // Whether previous webseries is available
};

const RANGES = [
  { label: '1 - 18', start: 1 },
  { label: '19 - 41', start: 19 },
  { label: '41 - 62', start: 41 },
  { label: '62 - 83', start: 62 },
];

const EMOJIS = ['😍', '👍', '😆', '😮', '😢', '😡'];

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

export default function ReelItem({ reel, isActive, initialTime = 0, screenFocused = true, onEpisodeSelect, onSwipeLeft, onSwipeRight, canGoNext = false, canGoPrevious = false }: ReelItemProps) {
  const insets = useSafeAreaInsets();
  
  // Swipe gesture handling
  const swipeThreshold = 50; // Minimum distance for swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes (not vertical)
        // Require minimum horizontal movement and ensure it's more horizontal than vertical
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMinHorizontalMovement = Math.abs(gestureState.dx) > 15;
        return isHorizontal && hasMinHorizontalMovement;
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        // Capture horizontal swipes early to prevent child components from handling them
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMinHorizontalMovement = Math.abs(gestureState.dx) > 15;
        return isHorizontal && hasMinHorizontalMovement;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > swipeThreshold) {
          if (gestureState.dx > 0 && onSwipeLeft && canGoNext) {
            // Swipe right = next webseries
            onSwipeLeft();
          } else if (gestureState.dx < 0 && onSwipeRight && canGoPrevious) {
            // Swipe left = previous webseries
            onSwipeRight();
          }
        }
      },
    })
  ).current;
  // #region agent log
  useEffect(() => {
    const shareButtonTop = insets.top + (Platform.OS === 'ios' ? 8 : 12);
    const shareButtonRight = insets.right + 16;
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:alignment',message:'Share button alignment values',data:{platform:Platform.OS,insets:{top:insets.top,bottom:insets.bottom,left:insets.left,right:insets.right},shareButtonTop,shareButtonRight,containerWidth:width,containerHeight:height,reelId:reel.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'alignment'})}).catch(()=>{});
  }, [insets.top, insets.bottom, insets.left, insets.right, reel.id]);
  // #endregion
  const videoRef = useRef<Video>(null);

  const hasSeekedRef = useRef(false);
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTimeRef = useRef(0);
  const isCompletedRef = useRef(false);
  const videoDurationRef = useRef(0);
  const isActiveRef = useRef(isActive); // Track isActive in a ref to avoid stale closures

  const episodeSheetY = useRef(new Animated.Value(height)).current;
const moreSheetY = useRef(new Animated.Value(height)).current;
const descSheetY = useRef(new Animated.Value(height)).current;
const commentSheetY = useRef(new Animated.Value(height)).current;
const playPauseButtonOpacity = useRef(new Animated.Value(0)).current;

  const [showEpisodes, setShowEpisodes] = useState(false);
const [showComments, setShowComments] = useState(false);
const [showDescSheet, setShowDescSheet] = useState(false);
const [showMore, setShowMore] = useState(false);

  // Open/close comments with animation
  useEffect(() => {
    if (showComments) {
      Animated.timing(commentSheetY, {
        toValue: 0,
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

  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  const [activeRange, setActiveRange] = useState(RANGES[0]);
  const [activeEpisode, setActiveEpisode] = useState(1);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPlayPauseButton, setShowPlayPauseButton] = useState(false);
  const playPauseButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [videoQuality, setVideoQuality] = useState('Auto');
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

  // Seek to initial time when video becomes active and hasn't been seeked yet
  useEffect(() => {
    if (isActive && initialTime > 0 && !hasSeekedRef.current && videoRef.current) {
      videoRef.current.setPositionAsync(initialTime * 1000).then(() => {
        hasSeekedRef.current = true;
        console.log(`⏩ Seeked to ${initialTime}s for video: ${reel.title}`);
      }).catch((error) => {
        console.error('Error seeking to initial time:', error);
      });
    }
  }, [isActive, initialTime, reel.title]);

  const openEpisodes = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:openEpisodes',message:'Opening episodes sheet',data:{reelId:reel.id,hasSeasonId:!!reel.seasonId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'episodes'})}).catch(()=>{});
    // #endregion
    setShowEpisodes(true);
    Animated.timing(episodeSheetY, {
      toValue: height * 0.22,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    
    // Fetch episodes if seasonId exists
    if (reel.seasonId) {
      setLoadingEpisodesSheet(true);
      try {
        const seasonId = typeof reel.seasonId === 'string' ? reel.seasonId : (reel.seasonId as any)?._id || reel.seasonId;
        const response = await videoService.getEpisodes(seasonId);
        if (response.success && response.data) {
          setEpisodesSheetEpisodes(response.data);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:openEpisodes',message:'Episodes loaded for sheet',data:{reelId:reel.id,episodeCount:response.data.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'episodes'})}).catch(()=>{});
          // #endregion
        }
      } catch (error) {
        console.error('Error loading episodes for sheet:', error);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:openEpisodes',message:'Error loading episodes for sheet',data:{reelId:reel.id,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'episodes'})}).catch(()=>{});
        // #endregion
      } finally {
        setLoadingEpisodesSheet(false);
      }
    }
  };

  // Pause video when screen loses focus
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:screenFocus',message:'Screen focus changed',data:{screenFocused,reelId:reel.id,isActive},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'screen-focus'})}).catch(()=>{});
    // #endregion
    if (!screenFocused && videoRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:screenFocus',message:'Pausing video - screen lost focus',data:{reelId:reel.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'screen-focus'})}).catch(()=>{});
      // #endregion
      videoRef.current.pauseAsync().catch(() => {});
      setPlaybackSpeed(1.0);
      videoRef.current.setRateAsync(1.0, true).catch(() => {});
      // Clear progress interval
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
    }
  }, [screenFocused, reel.id]);

  useEffect(() => {
    // Only play if both isActive AND screenFocused
    if (isActive && screenFocused) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:isActive',message:'Video becoming active - attempting play',data:{reelId:reel.id,hasVideoRef:!!videoRef.current,screenFocused},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'video-play'})}).catch(()=>{});
      // #endregion
      videoRef.current?.playAsync();
      setIsPlaying(true);
      // Hide play button when video starts playing automatically
      setShowPlayPauseButton(false);
      playPauseButtonOpacity.setValue(0);
    } else {
      // IMMEDIATELY clear the progress saving interval when video becomes inactive
      // This prevents any further progress saves from happening
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
        console.log(`🛑 ReelItem: Cleared progress interval for ${reel.title} (video inactive)`);
      }
      
      // Pause video immediately
      videoRef.current?.pauseAsync();
      setIsPlaying(false);
      setPlaybackSpeed(1.0);
      videoRef.current?.setRateAsync(1.0, true);
      
      // Then save final progress (if valid) after a short delay to ensure video is paused
        setTimeout(() => {
        if (videoRef.current && videoDurationRef.current > 0) {
          videoRef.current.getStatusAsync().then((status: any) => {
            if (status.isLoaded && status.positionMillis && status.durationMillis) {
              const currentTimeSeconds = status.positionMillis / 1000;
              const durationMillis = status.durationMillis;
              const progressPercent = (status.positionMillis / durationMillis) * 100;
              
              // Save if progress is valid (between 5% and 85%)
              if (currentTimeSeconds >= MIN_PROGRESS_TO_SAVE && 
                  progressPercent >= 5 && 
                  progressPercent < 85 && 
                  !isCompletedRef.current) {
                console.log(`💾 ReelItem: Saving final progress when video becomes inactive for ${reel.title}`);
                saveProgress(currentTimeSeconds, videoDurationRef.current, true);
              }
            }
          }).catch(console.error);
        }
      }, 100);
    }
  }, [isActive]);

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

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded && status.durationMillis) {
      const positionSeconds = status.positionMillis / 1000;
      const durationSeconds = status.durationMillis / 1000;
      videoDurationRef.current = durationSeconds;
      
      const progressPercent = (status.positionMillis / status.durationMillis) * 100;
      setProgress(progressPercent);
      
      // Update isPlaying state based on video status
      if (status.isPlaying !== undefined) {
        setIsPlaying(status.isPlaying);
      }
      
      // Only save progress if video is active AND playing
      // Don't save from status updates - let the interval handle it to avoid duplicate saves
      // This prevents saving when video is paused or closed
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
    if (isActive) {
      progressSaveIntervalRef.current = setInterval(() => {
        // Use ref to check current isActive state (avoids stale closure)
        // If not active, clear interval immediately and return
        if (!isActiveRef.current) {
          if (progressSaveIntervalRef.current) {
            clearInterval(progressSaveIntervalRef.current);
            progressSaveIntervalRef.current = null;
            console.log(`🛑 ReelItem: Interval cleared in callback for ${reel.title} (not active)`);
          }
          return;
        }

        if (videoRef.current && videoDurationRef.current > 0) {
          videoRef.current.getStatusAsync().then((status: any) => {
            // Only save if video is still active, playing, AND not paused
            // Double-check isActiveRef to prevent saves after navigation
            if (status.isLoaded && 
                status.positionMillis && 
                status.isPlaying && 
                !status.isPaused &&
                isActiveRef.current) {
              const currentTimeSeconds = status.positionMillis / 1000;
              saveProgress(currentTimeSeconds, videoDurationRef.current);
            } else if (!isActiveRef.current) {
              // If we got here but isActive is false, clear interval
              if (progressSaveIntervalRef.current) {
                clearInterval(progressSaveIntervalRef.current);
                progressSaveIntervalRef.current = null;
                console.log(`🛑 ReelItem: Interval cleared in status check for ${reel.title}`);
              }
            }
          }).catch((error) => {
            console.error('Error getting video status:', error);
          });
        }
      }, PROGRESS_UPDATE_INTERVAL);
    }

    return () => {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
    };
  }, [isActive]);

  // Cleanup play/pause button timeout on unmount
  useEffect(() => {
    return () => {
      if (playPauseButtonTimeoutRef.current) {
        clearTimeout(playPauseButtonTimeoutRef.current);
      }
    };
  }, []);

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
      // Use a small timeout to ensure video ref is still available
      const saveOnUnmount = async () => {
        try {
          if (videoRef.current && videoDurationRef.current > 0) {
            const status = await videoRef.current.getStatusAsync();
            if (status.isLoaded && status.positionMillis && status.durationMillis) {
              const currentTimeSeconds = status.positionMillis / 1000;
              const durationMillis = status.durationMillis;
              const progressPercent = (status.positionMillis / durationMillis) * 100;
              
              // Save on unmount if progress is between 5% and 85%
              // Don't check isActive here - we want to save even if video became inactive
              if (currentTimeSeconds >= MIN_PROGRESS_TO_SAVE && 
                  progressPercent >= 5 && 
                  progressPercent < 85 && 
                  !isCompletedRef.current) {
                console.log(`💾 ReelItem: Saving progress on unmount for ${reel.title} (${progressPercent.toFixed(1)}%)`);
                // Force save - don't wait for response as component is unmounting
                saveProgress(currentTimeSeconds, videoDurationRef.current, true).catch((err) => {
                  console.error('Error saving on unmount:', err);
                });
              }
            }
          }
        } catch (error) {
          console.error('Error getting status on unmount:', error);
        }
      };
      
      // Execute immediately (don't await as we're in cleanup)
      saveOnUnmount();
    };
  }, [reel.id, reel.title]);

  // Show play/pause button and hide it instantly
  const showPlayPauseButtonTemporarily = () => {
    setShowPlayPauseButton(true);
    
    // Animate button in
    Animated.timing(playPauseButtonOpacity, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    
    // Clear existing timeout
    if (playPauseButtonTimeoutRef.current) {
      clearTimeout(playPauseButtonTimeoutRef.current);
    }
    
    // Hide button instantly (300ms)
    playPauseButtonTimeoutRef.current = setTimeout(() => {
      Animated.timing(playPauseButtonOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setShowPlayPauseButton(false);
      });
    }, 300);
  };

  const handleScreenPress = async () => {
    if (!isActive || !videoRef.current) return;
    
    try {
      const status = await videoRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          // Pause video
          await videoRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          // Play video
          await videoRef.current.playAsync();
          setIsPlaying(true);
        }
        // Show play/pause button
        showPlayPauseButtonTemporarily();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const handlePressIn = () => {
    // Hold to play at 2x
    if (isActive) {
      setPlaybackSpeed(2.0);
      videoRef.current?.setRateAsync(2.0, true);
    }
  };

  const handlePressOut = () => {
    // Release to return to 1x
    if (isActive) {
      setPlaybackSpeed(1.0);
      videoRef.current?.setRateAsync(1.0, true);
    }
  };


  const closeEpisodes = () => {
    Animated.timing(episodeSheetY, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setShowEpisodes(false));
  };

  const openMore = () => {
  setShowMore(true);
  Animated.timing(moreSheetY, {
    toValue: 0,
    duration: 240,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }).start();
};

const closeMore = () => {
  Animated.timing(moreSheetY, {
    toValue: height,
    duration: 220,
    useNativeDriver: true,
  }).start(() => {
    setShowMore(false);
  });
};


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

  // Handle like button
  const handleLike = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:handleLike',message:'Like button pressed',data:{reelId:reel.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'info-sheet'})}).catch(()=>{});
    // #endregion
    videoService.likeVideo(reel.id).catch(console.error);
  };

  // Episodes array is now loaded from API in openEpisodes

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* VIDEO */}
      <Pressable
  style={StyleSheet.absoluteFill}
  onPress={handleScreenPress}
  onPressIn={handlePressIn}
  onPressOut={handlePressOut}
>
  <Video
    ref={videoRef}
    source={{ uri: reel.videoUrl }}
    style={StyleSheet.absoluteFill}
    resizeMode={ResizeMode.COVER}
    shouldPlay={isActive && screenFocused}
    isLooping
    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
  />
</Pressable>

      {/* PLAY/PAUSE BUTTON */}
      {showPlayPauseButton && (
        <Animated.View 
          style={[
            styles.playPauseButtonContainer,
            { opacity: playPauseButtonOpacity }
          ]}
          pointerEvents="none"
        >
          <View style={styles.playPauseButton}>
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={48} 
              color="#fff" 
            />
          </View>
        </Animated.View>
      )}
      
      {/* LEFT NAVIGATION BUTTON (Previous) - Hidden but still functional */}
      {canGoPrevious && (
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonLeft, styles.navButtonHidden]}
          onPress={onSwipeRight}
          activeOpacity={0.7}
        >
          <View style={styles.navButtonContent}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
            <Text style={styles.navButtonText}>Previous</Text>
          </View>
        </TouchableOpacity>
      )}
      
      {/* RIGHT NAVIGATION BUTTON (Next) - Hidden but still functional */}
      {canGoNext && (
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonRight, styles.navButtonHidden]}
          onPress={onSwipeLeft}
          activeOpacity={0.7}
        >
          <View style={styles.navButtonContent}>
            <Text style={styles.navButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
      )}
      {/* TOP RIGHT SHARE */}
      <View style={[styles.topRightActions, {
        top: insets.top + (Platform.OS === 'ios' ? 8 : 12),
        right: insets.right + 16,
      }]}>
        <TouchableOpacity 
          style={styles.topActionBtn}
          activeOpacity={0.8}
          onPress={async () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:share',message:'Share button pressed',data:{reelId:reel.id,reelTitle:reel.title},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'share'})}).catch(()=>{});
            // #endregion
            try {
              const shareMessage = `Check out "${reel.title}" on Digital Kalakar! 🎬\n\n${reel.description || 'Watch now!'}`;
              const result = await Share.share({
                message: shareMessage,
                title: reel.title,
              });
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:share',message:'Share completed',data:{reelId:reel.id,action:result.action},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'share'})}).catch(()=>{});
              // #endregion
            } catch (error) {
              console.error('Error sharing:', error);
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:share',message:'Share error',data:{reelId:reel.id,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'share'})}).catch(()=>{});
              // #endregion
              Alert.alert('Error', 'Unable to share. Please try again.');
            }
          }}
        >
          <Ionicons name="share-outline" size={27} color="#fff" />
        </TouchableOpacity>
      </View>


      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
        {playbackSpeed === 2.0 && (
          <View style={styles.speedButtonContainer} pointerEvents="none">
            <Text style={styles.speedTextSimple}>2x speed</Text>
            <Ionicons name="play-forward" size={12} color="#fff" style={{ marginLeft: 6 }} />
          </View>
        )}
      </View>


      {/* RIGHT ACTIONS */}
      <View style={styles.rightActions}>
        {/* LIKE */}
        <View style={styles.likeWrapper}>
          {showReactions && (
            <Animated.View style={styles.emojiRow}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => {
                    setSelectedReaction(e);
                    setShowReactions(false);
                  }}
                  style={styles.emojiBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emoji}>{e}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowReactions(!showReactions)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, selectedReaction && styles.iconCircleActive]}>
              {selectedReaction ? (
                <Text style={styles.reactionEmoji}>{selectedReaction}</Text>
              ) : (
                <Ionicons name="heart-outline" size={37} color="#fff" />
              )}
            </View>
            <Text style={styles.countLabel}>
              {formatCount(reel.initialLikes || 0)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* COMMENTS */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowComments(true)}
          activeOpacity={0.8}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubble-outline" size={37} color="#fff" />
          </View>
          <Text style={styles.countLabel}>
            {formatCount(reel.comments || comments.length || 0)}
          </Text>
        </TouchableOpacity>

        {/* EPISODES */}
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={openEpisodes}
          activeOpacity={0.8}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="albums-outline" size={37} color="#fff" />
          </View>
          <Text style={styles.label}>Episodes</Text>
        </TouchableOpacity>

        {/* MORE */}
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={openMore}
          activeOpacity={0.8}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="ellipsis-horizontal" size={37} color="#fff" />
          </View>
          <Text style={styles.label}>More</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM INFO */}
      <View style={styles.bottomInfo}>
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
      </View>

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

      {/* EPISODES SHEET */}
      {showEpisodes && (
        <>
          <Pressable style={styles.sheetBackdrop} onPress={closeEpisodes} />
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: episodeSheetY }] },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{reel.title}</Text>
              <TouchableOpacity onPress={closeEpisodes}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {loadingEpisodesSheet ? (
              <View style={styles.episodesLoadingContainer}>
                <Text style={styles.episodesLoadingText}>Loading episodes...</Text>
              </View>
            ) : episodesSheetEpisodes.length > 0 ? (
              <FlatList
                data={episodesSheetEpisodes.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0))}
                keyExtractor={(item) => item._id}
                numColumns={4}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/5574f555-8bbc-47a0-889d-701914ddc9bb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ReelItem.tsx:episodeSelect',message:'Episode selected from sheet',data:{reelId:reel.id,episodeId:item._id,episodeNumber:item.episodeNumber,episodeTitle:item.title},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'episodes'})}).catch(()=>{});
                      // #endregion
                      closeEpisodes();
                      if (onEpisodeSelect) {
                        onEpisodeSelect(item._id);
                      } else {
                        // Fallback: just update active episode
                        setActiveEpisode(item.episodeNumber || 1);
                      }
                    }}
                    style={[
                      styles.episodePill,
                      item._id === reel.id && styles.episodePillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.epText,
                        item._id === reel.id && styles.epTextActive,
                      ]}
                    >
                      {item.episodeNumber ? String(item.episodeNumber) : '?'}
                    </Text>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.episodeGrid}
              />
            ) : (
              <View style={styles.episodesLoadingContainer}>
                <Text style={styles.episodesLoadingText}>No episodes available</Text>
              </View>
            )}
          </Animated.View>
        </>
      )}

      {/* COMMENTS SHEET - Instagram Style */}
      {showComments && (
        <View style={styles.commentWrap}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setShowComments(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <Animated.View
              style={[
                styles.commentBox,
                { 
                  paddingBottom: Math.max(insets.bottom, 8),
                  transform: [{ translateY: commentSheetY }],
                },
              ]}
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

              {/* Comments List */}
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
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
                contentContainerStyle={{ paddingBottom: 16 }}
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

      {/* MORE SHEET */}
      {showMore && (
        <>
          <Pressable style={styles.sheetBackdrop} onPress={closeMore} />
          <Animated.View
            style={[
              styles.moreSheet,
              { 
                transform: [{ translateY: moreSheetY }],
              },
            ]}
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
                          videoRef.current.setRateAsync(speed, true);
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

              {/* Video Quality Section */}
              <View style={styles.moreSection}>
                <Text style={styles.moreSectionTitle}>Video Quality</Text>
                <View style={styles.moreOptionsRow}>
                  {['Auto', '1080p', '720p', '480p', '360p'].map((quality) => (
                    <TouchableOpacity
                      key={quality}
                      style={[
                        styles.moreOptionChip,
                        videoQuality === quality && styles.moreOptionChipActive,
                      ]}
                      onPress={() => setVideoQuality(quality)}
                    >
                      <Text
                        style={[
                          styles.moreOptionChipText,
                          videoQuality === quality && styles.moreOptionChipTextActive,
                        ]}
                      >
                        {quality}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width, height, backgroundColor: '#000' },

  rightActions: {
    position: 'absolute',
    right: 16,
    bottom: 72,
    alignItems: 'center',
    zIndex: 100,
  },

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
    marginBottom: 20,
    minWidth: 56,
  },
  iconCircle: {
    width: 63,
    height: 63,
    borderRadius: 31.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  iconCircleActive: {
    backgroundColor: 'transparent',
  },
  label: { 
    color: '#fff', 
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.2,
    marginTop: -2,
  },
  countLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: -2,
  },
  reactionEmoji: {
    fontSize: 26,
  },

  likeWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 0,
  },

  emojiRow: {
    position: 'absolute',
    right: 60,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 8,
    borderRadius: 30,
    minWidth: 260,
    zIndex: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
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


  bottomInfo: {
    position: 'absolute',
    left: 16,
    bottom: 72,
    right: 100,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 6,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 6,
  },
  descriptionText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    color: '#fff', 
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  progressContainer: {
    position: 'absolute',
    bottom: 48,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  progressBar: { height: '100%', backgroundColor: '#FFD54A' },

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

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: height * 0.75,
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },

  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

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

  commentWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  commentBox: {
    backgroundColor: '#000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.75,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  commentHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  commentHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
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
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
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
  commentInputSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  commentInputAvatar: {
    marginRight: 12,
    marginBottom: 8,
  },
  commentInputAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD54A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInputAvatarText: {
    color: '#000',
    fontSize: 14,
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

  moreSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.75,
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 0,
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
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  moreSheetTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  moreSheetCloseBtn: {
    padding: 4,
  },
  moreSection: {
    marginBottom: 24,
  },
  moreSectionTitle: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  moreOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moreOptionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 8,
    marginBottom: 8,
  },
  moreOptionChipActive: {
    backgroundColor: '#FFD54A',
    borderColor: '#FFD54A',
  },
  moreOptionChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  moreOptionChipTextActive: {
    color: '#000',
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
  topRightActions: {
    position: 'absolute',
    // top and right will be set via inline styles with safe area insets
    zIndex: 1000,
    elevation: 1000,
  },

  topActionBtn: {
    width: 47,
    height: 47,
    borderRadius: 23.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonContainer: {
    position: 'absolute',
    left: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    top: -12,
    transform: [{ translateX: -50 }],
  },
  speedTextSimple: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -30,
    width: 80,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 500,
    opacity: 0.7,
  },
  navButtonHidden: {
    opacity: 0,
    pointerEvents: 'auto', // Keep buttons touchable even when invisible
  },
  navButtonLeft: {
    left: 0,
  },
  navButtonRight: {
    right: 0,
  },
  navButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  playPauseButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },


});

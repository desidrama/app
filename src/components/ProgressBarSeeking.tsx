/**
 * Progress Bar Seeking Logic - Clean Implementation
 * 
 * This file demonstrates how to add seeking functionality to an existing progress bar.
 * Integrate these pieces into your video player component.
 */

import React, { useRef, useState } from 'react';
import { PanResponder, Animated, View, LayoutChangeEvent } from 'react-native';
import { Video } from 'expo-av';

// ============================================================================
// 1. STATE & REFS (Add these to your component)
// ============================================================================

interface SeekingState {
  // Animated value for progress bar width (0-100)
  progressBarWidth: Animated.Value;
  
  // Track if user is actively scrubbing
  isScrubbing: boolean;
  isScrubbingRef: React.MutableRefObject<boolean>;
  
  // Store playback state before scrubbing (to resume after)
  wasPlayingBeforeScrub: React.MutableRefObject<boolean>;
  
  // Progress bar container dimensions for accurate touch calculation
  progressBarLayout: {
    x: number;
    width: number;
  };
}

// Example initialization in your component:
/*
const progressBarWidth = useRef(new Animated.Value(0)).current;
const [isScrubbing, setIsScrubbing] = useState(false);
const isScrubbingRef = useRef(false);
const wasPlayingBeforeScrub = useRef(false);
const [progressBarLayout, setProgressBarLayout] = useState({ x: 0, width: 0 });
*/

// ============================================================================
// 2. HELPER FUNCTION: Calculate seek position from touch
// ============================================================================

/**
 * Calculates the seek time based on touch position
 * @param pageX - Absolute screen X coordinate from touch event
 * @param containerX - Left position of progress bar container
 * @param containerWidth - Width of progress bar container
 * @param durationMillis - Total video duration in milliseconds
 * @returns Clamped seek time in seconds (0 to duration)
 */
const calculateSeekTime = (
  pageX: number,
  containerX: number,
  containerWidth: number,
  durationMillis: number
): number => {
  // Calculate touch position relative to container
  const relativeX = pageX - containerX;
  
  // Clamp between 0 and container width
  const clampedX = Math.max(0, Math.min(containerWidth, relativeX));
  
  // Calculate percentage (0 to 1)
  const seekPercent = containerWidth > 0 ? clampedX / containerWidth : 0;
  
  // Convert to time in seconds
  const durationSeconds = durationMillis / 1000;
  const seekTime = seekPercent * durationSeconds;
  
  // Final clamp to ensure valid range
  return Math.max(0, Math.min(durationSeconds, seekTime));
};

// ============================================================================
// 3. SEEK FUNCTION: Performs the actual video seek
// ============================================================================

/**
 * Seeks video to specified time and updates UI
 * @param videoRef - Reference to expo-av Video component
 * @param seekTimeSeconds - Target time in seconds
 * @param progressBarWidth - Animated value for progress bar
 * @param setCurrentTime - State setter for current time display
 * @param durationMillis - Total video duration in milliseconds
 */
const performSeek = async (
  videoRef: React.RefObject<Video>,
  seekTimeSeconds: number,
  progressBarWidth: Animated.Value,
  setCurrentTime: (time: number) => void,
  durationMillis: number
): Promise<void> => {
  if (!videoRef.current) return;
  
  try {
    // Seek video to new position (setPositionAsync expects milliseconds)
    await videoRef.current.setPositionAsync(seekTimeSeconds * 1000);
    
    // Update progress bar visual (percentage 0-100)
    const durationSeconds = durationMillis / 1000;
    const progressPercent = durationSeconds > 0 
      ? (seekTimeSeconds / durationSeconds) * 100 
      : 0;
    progressBarWidth.setValue(progressPercent);
    
    // Update current time display
    setCurrentTime(seekTimeSeconds);
  } catch (error) {
    console.error('Error seeking video:', error);
  }
};

// ============================================================================
// 4. PAN RESPONDER: Drag-to-seek (scrubbing)
// ============================================================================

/**
 * Creates PanResponder for drag-to-seek functionality
 * 
 * Usage:
 * const progressBarPanResponder = useRef(
 *   createProgressBarPanResponder({
 *     videoRef,
 *     progressBarWidth,
 *     setCurrentTime,
 *     setIsScrubbing,
 *     isScrubbingRef,
 *     wasPlayingBeforeScrub,
 *     progressBarLayout,
 *     isActive, // optional: only allow seeking when video is active
 *   })
 * ).current;
 */
export const createProgressBarPanResponder = (config: {
  videoRef: React.RefObject<Video>;
  progressBarWidth: Animated.Value;
  setCurrentTime: (time: number) => void;
  setIsScrubbing: (scrubbing: boolean) => void;
  isScrubbingRef: React.MutableRefObject<boolean>;
  wasPlayingBeforeScrub: React.MutableRefObject<boolean>;
  progressBarLayout: { x: number; width: number };
  isActive?: boolean;
}) => {
  const {
    videoRef,
    progressBarWidth,
    setCurrentTime,
    setIsScrubbing,
    isScrubbingRef,
    wasPlayingBeforeScrub,
    progressBarLayout,
    isActive = true,
  } = config;

  return PanResponder.create({
    // Determine if we should capture the gesture
    onStartShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to horizontal gestures (prevent conflict with vertical swipes)
      return isActive && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Continue responding if horizontal movement is dominant
      return isActive && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
    },

    // Called when user starts dragging
    onPanResponderGrant: async (evt) => {
      if (!isActive || !videoRef.current) return;
      
      // Mark as scrubbing
      isScrubbingRef.current = true;
      setIsScrubbing(true);
      
      try {
        const status = await videoRef.current.getStatusAsync();
        if (!status.isLoaded || !status.durationMillis) return;
        
        // Store playing state before scrubbing
        wasPlayingBeforeScrub.current = status.isPlaying || false;
        
        // Pause video while scrubbing for better UX
        if (status.isPlaying) {
          await videoRef.current.pauseAsync();
        }
      } catch (error) {
        console.error('Error in onPanResponderGrant:', error);
      }
    },

    // Called continuously while user is dragging
    onPanResponderMove: async (evt) => {
      if (!isActive || !videoRef.current || !isScrubbingRef.current) return;
      
      try {
        const status = await videoRef.current.getStatusAsync();
        if (!status.isLoaded || !status.durationMillis) return;
        
        // Calculate seek time from touch position
        const seekTime = calculateSeekTime(
          evt.nativeEvent.pageX,
          progressBarLayout.x,
          progressBarLayout.width,
          status.durationMillis
        );
        
        // REAL-TIME SEEK: Update video position during drag
        await performSeek(
          videoRef,
          seekTime,
          progressBarWidth,
          setCurrentTime,
          status.durationMillis
        );
      } catch (error) {
        console.error('Error in onPanResponderMove:', error);
      }
    },

    // Called when user releases finger
    onPanResponderRelease: async (evt) => {
      if (!isActive || !videoRef.current) return;
      
      // Mark as not scrubbing
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      
      try {
        const status = await videoRef.current.getStatusAsync();
        if (!status.isLoaded || !status.durationMillis) return;
        
        // Calculate final seek time
        const seekTime = calculateSeekTime(
          evt.nativeEvent.pageX,
          progressBarLayout.x,
          progressBarLayout.width,
          status.durationMillis
        );
        
        // Final seek to exact position
        await performSeek(
          videoRef,
          seekTime,
          progressBarWidth,
          setCurrentTime,
          status.durationMillis
        );
        
        // Resume playback if it was playing before scrubbing
        if (wasPlayingBeforeScrub.current) {
          await videoRef.current.playAsync();
        }
      } catch (error) {
        console.error('Error in onPanResponderRelease:', error);
      }
    },
  });
};

// ============================================================================
// 5. TAP HANDLER: Tap-to-seek
// ============================================================================

/**
 * Handles tap-to-seek on progress bar
 * 
 * Usage:
 * <View
 *   style={styles.progressBarBackground}
 *   {...progressBarPanResponder.panHandlers}
 *   onLayout={(e) => {
 *     const { x, width } = e.nativeEvent.layout;
 *     setProgressBarLayout({ x, width });
 *   }}
 *   onStartShouldSetResponder={() => true}
 *   onResponderRelease={(e) => {
 *     handleProgressBarTap(e, {
 *       videoRef,
 *       progressBarWidth,
 *       setCurrentTime,
 *       progressBarLayout,
 *     });
 *   }}
 * >
 */
export const handleProgressBarTap = async (
  evt: any,
  config: {
    videoRef: React.RefObject<Video>;
    progressBarWidth: Animated.Value;
    setCurrentTime: (time: number) => void;
    progressBarLayout: { x: number; width: number };
  }
): Promise<void> => {
  const { videoRef, progressBarWidth, setCurrentTime, progressBarLayout } = config;
  
  if (!videoRef.current) return;
  
  try {
    const status = await videoRef.current.getStatusAsync();
    if (!status.isLoaded || !status.durationMillis) return;
    
    // Calculate seek time from tap position
    const seekTime = calculateSeekTime(
      evt.nativeEvent.pageX,
      progressBarLayout.x,
      progressBarLayout.width,
      status.durationMillis
    );
    
    // Perform seek
    await performSeek(
      videoRef,
      seekTime,
      progressBarWidth,
      setCurrentTime,
      status.durationMillis
    );
  } catch (error) {
    console.error('Error in handleProgressBarTap:', error);
  }
};

// ============================================================================
// 6. SYNC WITH VIDEO PLAYBACK
// ============================================================================

/**
 * Update progress bar during normal playback (when not scrubbing)
 * 
 * Add this to your onPlaybackStatusUpdate callback:
 * 
 * const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
 *   if (!status.isLoaded) return;
 *   
 *   // Only update if user is NOT actively scrubbing
 *   if (!isScrubbingRef.current) {
 *     const currentTimeSeconds = (status.positionMillis || 0) / 1000;
 *     const durationSeconds = (status.durationMillis || 0) / 1000;
 *     
 *     if (durationSeconds > 0) {
 *       const progressPercent = (currentTimeSeconds / durationSeconds) * 100;
 *       progressBarWidth.setValue(progressPercent);
 *       setCurrentTime(currentTimeSeconds);
 *     }
 *   }
 * };
 */

// ============================================================================
// 7. COMPLETE INTEGRATION EXAMPLE
// ============================================================================

/*
// In your video player component:

// 1. Add state and refs
const videoRef = useRef<Video>(null);
const progressBarWidth = useRef(new Animated.Value(0)).current;
const [isScrubbing, setIsScrubbing] = useState(false);
const isScrubbingRef = useRef(false);
const wasPlayingBeforeScrub = useRef(false);
const [progressBarLayout, setProgressBarLayout] = useState({ x: 0, width: 0 });
const [currentTime, setCurrentTime] = useState(0);
const [totalDuration, setTotalDuration] = useState(0);

// 2. Create PanResponder
const progressBarPanResponder = useRef(
  createProgressBarPanResponder({
    videoRef,
    progressBarWidth,
    setCurrentTime,
    setIsScrubbing,
    isScrubbingRef,
    wasPlayingBeforeScrub,
    progressBarLayout,
    isActive: true,
  })
).current;

// 3. Sync with playback
const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
  if (!status.isLoaded) return;
  
  // Update duration
  if (status.durationMillis && status.durationMillis > 0) {
    setTotalDuration(status.durationMillis / 1000);
  }
  
  // Only update progress if NOT scrubbing
  if (!isScrubbingRef.current) {
    const currentTimeSeconds = (status.positionMillis || 0) / 1000;
    const durationSeconds = (status.durationMillis || 0) / 1000;
    
    if (durationSeconds > 0) {
      const progressPercent = (currentTimeSeconds / durationSeconds) * 100;
      progressBarWidth.setValue(progressPercent);
      setCurrentTime(currentTimeSeconds);
    }
  }
};

// 4. Render progress bar
<View
  style={styles.progressBarContainer}
>
  <View
    style={styles.progressBarBackground}
    {...progressBarPanResponder.panHandlers}
    onLayout={(e) => {
      const { x, width } = e.nativeEvent.layout;
      setProgressBarLayout({ x, width });
    }}
  >
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
</View>
*/



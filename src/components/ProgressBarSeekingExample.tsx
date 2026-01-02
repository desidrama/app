/**
 * PROGRESS BAR SEEKING - MINIMAL ADDITIONS
 * 
 * Copy these code blocks into your existing video player component.
 * This shows ONLY the additions needed - no UI changes required.
 */

import React, { useRef, useState } from 'react';
import { PanResponder, Animated, View, LayoutChangeEvent } from 'react-native';
import { Video, AVPlaybackStatus } from 'expo-av';

// ============================================================================
// ADDITION 1: Add these state variables and refs to your component
// ============================================================================

const videoRef = useRef<Video>(null);
const progressBarWidth = useRef(new Animated.Value(0)).current; // Your existing animated value
const [isScrubbing, setIsScrubbing] = useState(false);
const isScrubbingRef = useRef(false); // Prevents playback updates during scrub
const wasPlayingBeforeScrub = useRef(false); // Remember playback state
const [progressBarLayout, setProgressBarLayout] = useState({ x: 0, width: 0 });

// ============================================================================
// ADDITION 2: Helper function to calculate seek position
// ============================================================================

const calculateSeekTime = (
  pageX: number,
  containerX: number,
  containerWidth: number,
  durationMillis: number
): number => {
  const relativeX = pageX - containerX;
  const clampedX = Math.max(0, Math.min(containerWidth, relativeX));
  const seekPercent = containerWidth > 0 ? clampedX / containerWidth : 0;
  const seekTime = (seekPercent * durationMillis) / 1000;
  return Math.max(0, Math.min(durationMillis / 1000, seekTime));
};

// ============================================================================
// ADDITION 3: Create PanResponder for drag-to-seek
// ============================================================================

const progressBarPanResponder = useRef(
  PanResponder.create({
    // Only respond to horizontal gestures (prevent vertical swipe conflicts)
    onStartShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
    },

    // User starts dragging - pause video
    onPanResponderGrant: async () => {
      if (!videoRef.current) return;
      
      isScrubbingRef.current = true;
      setIsScrubbing(true);
      
      try {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          wasPlayingBeforeScrub.current = status.isPlaying || false;
          if (status.isPlaying) {
            await videoRef.current.pauseAsync();
          }
        }
      } catch (error) {
        // Silently handle errors
      }
    },

    // User is dragging - seek in real-time
    onPanResponderMove: async (evt) => {
      if (!videoRef.current || !isScrubbingRef.current) return;
      
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
        await videoRef.current.setPositionAsync(seekTime * 1000);
        
        // Update progress bar visual
        const durationSeconds = status.durationMillis / 1000;
        const progressPercent = (seekTime / durationSeconds) * 100;
        progressBarWidth.setValue(progressPercent);
        
        // Update current time display (if you have one)
        // setCurrentTime(seekTime);
      } catch (error) {
        // Silently handle errors
      }
    },

    // User releases - final seek and resume if needed
    onPanResponderRelease: async (evt) => {
      if (!videoRef.current) return;
      
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
        await videoRef.current.setPositionAsync(seekTime * 1000);
        
        // Update progress bar
        const durationSeconds = status.durationMillis / 1000;
        const progressPercent = (seekTime / durationSeconds) * 100;
        progressBarWidth.setValue(progressPercent);
        
        // Resume playback if it was playing before
        if (wasPlayingBeforeScrub.current) {
          await videoRef.current.playAsync();
        }
      } catch (error) {
        console.error('Error seeking:', error);
      }
    },
  })
).current;

// ============================================================================
// ADDITION 4: Tap-to-seek handler (optional, if you want tap support)
// ============================================================================

const handleProgressBarTap = async (evt: any) => {
  if (!videoRef.current) return;
  
  try {
    const status = await videoRef.current.getStatusAsync();
    if (!status.isLoaded || !status.durationMillis) return;
    
    const seekTime = calculateSeekTime(
      evt.nativeEvent.pageX,
      progressBarLayout.x,
      progressBarLayout.width,
      status.durationMillis
    );
    
    await videoRef.current.setPositionAsync(seekTime * 1000);
    
    const durationSeconds = status.durationMillis / 1000;
    const progressPercent = (seekTime / durationSeconds) * 100;
    progressBarWidth.setValue(progressPercent);
  } catch (error) {
    console.error('Error tapping progress bar:', error);
  }
};

// ============================================================================
// ADDITION 5: Update your onPlaybackStatusUpdate to respect scrubbing
// ============================================================================

// MODIFY your existing onPlaybackStatusUpdate:
const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
  if (!status.isLoaded) return;
  
  // Update duration (if needed)
  // if (status.durationMillis && status.durationMillis > 0) {
  //   setTotalDuration(status.durationMillis / 1000);
  // }
  
  // CRITICAL: Only update progress if NOT scrubbing
  if (!isScrubbingRef.current) {
    const currentTimeSeconds = (status.positionMillis || 0) / 1000;
    const durationSeconds = (status.durationMillis || 0) / 1000;
    
    if (durationSeconds > 0) {
      const progressPercent = (currentTimeSeconds / durationSeconds) * 100;
      progressBarWidth.setValue(progressPercent);
      // setCurrentTime(currentTimeSeconds); // Update your time display
    }
  }
  
  // Your other playback status updates...
  // setIsPlaying(status.isPlaying);
};

// ============================================================================
// ADDITION 6: Update your progress bar JSX
// ============================================================================

// MODIFY your existing progress bar View:
<View
  style={styles.progressBarBackground}
  {...progressBarPanResponder.panHandlers} // Add this
  onLayout={(e) => { // Add this to track container position
    const { x, width } = e.nativeEvent.layout;
    setProgressBarLayout({ x, width });
  }}
  // Optional: Add tap handler if you want tap-to-seek
  // onStartShouldSetResponder={() => true}
  // onResponderRelease={handleProgressBarTap}
>
  {/* Your existing progress bar fill */}
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

// ============================================================================
// SUMMARY: What was added
// ============================================================================

/*
1. State/Refs:
   - isScrubbing, isScrubbingRef, wasPlayingBeforeScrub
   - progressBarLayout (for accurate touch calculation)

2. Helper function:
   - calculateSeekTime() - converts touch position to seek time

3. PanResponder:
   - Handles drag-to-seek with pause/resume logic
   - Real-time seeking during drag

4. Modified onPlaybackStatusUpdate:
   - Checks isScrubbingRef to prevent conflicts

5. Updated JSX:
   - Added panHandlers to progress bar
   - Added onLayout to track container position

That's it! No UI changes needed - just logic additions.
*/


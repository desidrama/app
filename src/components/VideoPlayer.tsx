import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { videoService } from '../services/video.service';

interface VideoPlayerProps {
  videoUrl: string;
  videoId: string;
  duration: number;
  initialTime?: number; // Start time from continue watching
  onProgressChange?: (currentTime: number, duration: number) => void;
  onVideoComplete?: () => void;
}

const PROGRESS_UPDATE_INTERVAL = 5000; // Save progress every 5 seconds
const MIN_PROGRESS_TO_SAVE = 3; // Only save if at least 3 seconds watched

export default function VideoPlayer({
  videoUrl,
  videoId,
  duration,
  initialTime = 0,
  onProgressChange,
  onVideoComplete,
}: VideoPlayerProps) {
  const player = useVideoPlayer(videoUrl, (player: any) => {
    // Set initial playback position if resuming
    if (initialTime > 0) {
      player.currentTime = initialTime;
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTimeRef = useRef(0);
  const isCompletedRef = useRef(false);

  // Hide loading after player is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Save progress to backend at regular intervals
  const saveProgress = async (currentTime: number, forceSave: boolean = false) => {
    try {
      // Calculate progress percentage
      const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
      
      // Only save if:
      // 1. Progress is between 5% and 85% (backend requirement)
      // 2. At least MIN_PROGRESS_TO_SAVE seconds have elapsed since last save (unless forced)
      // 3. Video is not completed
      const shouldSave = 
        progressPercent >= 5 && 
        progressPercent < 85 && 
        !isCompletedRef.current &&
        (forceSave || currentTime - lastSavedTimeRef.current >= MIN_PROGRESS_TO_SAVE);
      
      if (shouldSave) {
        console.log(`💾 Saving progress: ${currentTime.toFixed(1)}s / ${duration.toFixed(1)}s (${progressPercent.toFixed(1)}%)`);
        await videoService.saveWatchProgress(videoId, currentTime, duration);
        lastSavedTimeRef.current = currentTime;

        // Call callback if provided
        if (onProgressChange) {
          onProgressChange(currentTime, duration);
        }
      } else if (progressPercent < 5) {
        console.log(`⏭️ Progress too low (${progressPercent.toFixed(1)}%), not saving`);
      } else if (progressPercent >= 85) {
        console.log(`✅ Progress high enough (${progressPercent.toFixed(1)}%), marking as completed`);
        isCompletedRef.current = true;
      }
    } catch (error) {
      console.error('Error saving watch progress:', error);
    }
  };

  // Setup interval for periodic progress saving
  useEffect(() => {
    progressSaveIntervalRef.current = setInterval(() => {
      const currentTime = player.currentTime || 0;
      saveProgress(currentTime);
    }, PROGRESS_UPDATE_INTERVAL);

    return () => {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
      }
    };
  }, [player, videoId, duration]);

  // Monitor video playback status
  useEffect(() => {
    const checkPlaybackStatus = () => {
      const currentTime = player.currentTime || 0;
      const progress = (currentTime / duration) * 100;

      // Check if video is completed (95% or more)
      if (progress >= 95 && !isCompletedRef.current) {
        isCompletedRef.current = true;
        
        // Save final progress
        saveProgress(duration);
        
        // Call completion callback
        if (onVideoComplete) {
          onVideoComplete();
        }

        // Delete watch progress after completion
        videoService
          .deleteWatchProgress(videoId)
          .catch((error) => console.error('Error deleting watch progress:', error));
      }
    };

    const statusCheckInterval = setInterval(checkPlaybackStatus, 1000);

    return () => clearInterval(statusCheckInterval);
  }, [player, videoId, duration, onVideoComplete]);

  // Save progress when component unmounts (user leaves video)
  useEffect(() => {
    return () => {
      const currentTime = player.currentTime || 0;
      const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
      
      // Save on unmount if:
      // 1. Progress is between 5% and 85%
      // 2. At least 3 seconds have been watched
      // 3. Video is not completed
      if (currentTime >= MIN_PROGRESS_TO_SAVE && 
          progressPercent >= 5 && 
          progressPercent < 85 && 
          !isCompletedRef.current) {
        console.log(`💾 Saving progress on unmount: ${currentTime.toFixed(1)}s (${progressPercent.toFixed(1)}%)`);
        // Force save on unmount
        saveProgress(currentTime, true).catch((error) => {
          console.error('Error saving progress on unmount:', error);
        });
      }
    };
  }, [player, videoId, duration]);

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
        contentFit="contain"
      />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
});

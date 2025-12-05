
// ============================================
// FILE: src/screens/home/ReelsFeedScreen.tsx
// ============================================
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { videoService } from '../../services/video.service';
import { setReels, addReels } from '../../redux/slices/videoSlice';
import ReelCard from '../../components/ReelCard';
import { COLORS } from '../../utils/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReelsFeedScreen() {
  const dispatch = useDispatch();
  const { reels } = useSelector((state: RootState) => state.video);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await videoService.getReelsFeed(page);
      if (page === 1) {
        dispatch(setReels(response.data));
      } else {
        dispatch(addReels(response.data));
      }
      setPage(page + 1);
    } catch (error) {
      console.error('Error loading reels:', error);
    } finally {
      setLoading(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={styles.container}>
      <FlatList
        data={reels}
        renderItem={({ item, index }) => (
          <ReelCard video={item} isActive={index === currentIndex} />
        )}
        keyExtractor={(item) => item._id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onEndReached={loadReels}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 80,
        }}
        ListFooterComponent={
          loading ? <ActivityIndicator size="large" color={COLORS.primary} /> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

// ============================================
// FILE: src/components/ReelCard.tsx
// ============================================
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Video } from '../types';
import { videoService } from '../services/video.service';
import { COLORS } from '../utils/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReelCardProps {
  video: Video;
  isActive: boolean;
}

export default function ReelCard({ video, isActive }: ReelCardProps) {
  const videoRef = useRef<ExpoVideo>(null);
  const [isLiked, setIsLiked] = React.useState(false);
  const [likes, setLikes] = React.useState(video.likes);

  useEffect(() => {
    if (isActive) {
      videoRef.current?.playAsync();
      videoService.incrementView(video._id);
    } else {
      videoRef.current?.pauseAsync();
    }
  }, [isActive]);

  const handleLike = async () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikes(likes + 1);
      await videoService.likeVideo(video._id);
    }
  };

  const handleDoubleTap = () => {
    handleLike();
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handleDoubleTap} style={styles.videoContainer}>
        <ExpoVideo
          ref={videoRef}
          source={{ uri: video.masterPlaylistUrl }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping
          isMuted={false}
        />
      </Pressable>

      <View style={styles.overlay}>
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={32}
              color={isLiked ? COLORS.primary : COLORS.text}
            />
            <Text style={styles.actionText}>{likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="eye-outline" size={32} color={COLORS.text} />
            <Text style={styles.actionText}>{video.views}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomInfo}>
          <Text style={styles.title}>{video.title}</Text>
          {video.description && (
            <Text style={styles.description} numberOfLines={2}>
              {video.description}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: COLORS.background,
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  rightActions: {
    position: 'absolute',
    right: 15,
    bottom: 120,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 25,
  },
  actionText: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 5,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 30,
    left: 15,
    right: 80,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
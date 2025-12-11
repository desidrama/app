// ============================================
// FILE: src/components/ReelCard.tsx
// ============================================
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { Video as ExpoVideo, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Video } from '../types';
import { videoService } from '../services/video.service';
import { COLORS } from '../utils/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReelCardProps {
  video: Video;
  isActive: boolean;
}

const ReelCard: React.FC<ReelCardProps> = ({ video, isActive }) => {
  const videoRef = useRef<ExpoVideo>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(video.likes);
  const [showReactions, setShowReactions] = useState(false);

  const [showInfo, setShowInfo] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [chosenQuality, setChosenQuality] = useState<'Auto' | '480p' | '720p' | '1080p'>('Auto');

  useEffect(() => {
    let isMounted = true;

    const controlPlayback = async () => {
      if (!videoRef.current) return;

      if (isActive) {
        try {
          await videoRef.current.setRateAsync(playbackSpeed, true);
          await videoRef.current.playAsync();
          if (isMounted) {
            videoService.incrementView(video._id).catch(() => {});
          }
        } catch (err) {
          console.warn('play error', err);
        }
      } else {
        try {
          await videoRef.current.pauseAsync();
        } catch (err) {
          console.warn('pause error', err);
        }
      }
    };

    controlPlayback();

    return () => {
      isMounted = false;
    };
  }, [isActive, playbackSpeed, video._id]);

  const handleLike = async () => {
    if (isLiked) return;
    setIsLiked(true);
    setLikes((prev) => prev + 1);
    try {
      await videoService.likeVideo(video._id);
    } catch {
      // optional rollback
    }
  };

  const handleReaction = (reaction: string) => {
    // you can send this to backend
    setShowReactions(false);
    if (reaction === 'love' || reaction === 'like') {
      handleLike();
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    // can check status.didJustFinish etc if needed
  };

  const onChangeSpeed = async (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      await videoRef.current.setRateAsync(speed, true);
    }
  };

  const onChangeQuality = (quality: 'Auto' | '480p' | '720p' | '1080p') => {
    setChosenQuality(quality);
    // Frontend only – real quality change would need HLS variant selection
  };

  return (
    <View style={styles.container}>
      {/* VIDEO */}
      <Pressable style={styles.videoContainer} onPress={() => setShowReactions(false)}>
        <ExpoVideo
          ref={videoRef}
          source={{ uri: video.masterPlaylistUrl }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping
          isMuted={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />
      </Pressable>

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topButton}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextEpisodePill}>
          <Text style={styles.nextEpisodeText}>Next Episode</Text>
          <Ionicons name="play" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      {/* RIGHT SIDE ICONS */}
      <View style={styles.rightSide}>
        {/* Rate */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowReactions((prev) => !prev)}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={30}
            color={isLiked ? COLORS.primary || '#FFD54A' : '#ffffff'}
          />
          <Text style={styles.actionLabel}>Rate</Text>
          <Text style={styles.actionCount}>{likes}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowComments(true)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={30} color="#ffffff" />
          <Text style={styles.actionLabel}>Comment</Text>
        </TouchableOpacity>

        {/* Settings (speed + quality) */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings-outline" size={30} color="#ffffff" />
          <Text style={styles.actionLabel}>Settings</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-social-outline" size={30} color="#ffffff" />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="bookmark-outline" size={30} color="#ffffff" />
          <Text style={styles.actionLabel}>Save</Text>
        </TouchableOpacity>

        {/* Episodes */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowEpisodes(true)}
        >
          <MaterialCommunityIcons name="grid" size={30} color="#ffffff" />
          <Text style={styles.actionLabel}>Episodes</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM TITLE AREA */}
      <View style={styles.bottomInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.titleText} numberOfLines={1}>
            {video.title || 'Untitled'}
          </Text>
          <TouchableOpacity onPress={() => setShowInfo(true)}>
            <Ionicons name="information-circle-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{video.year || '2024'}</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingBadgeText}>{video.ageRating || 'UA 16+'}</Text>
          </View>
          <Text style={styles.metaText}>{video.duration || '2h 22m'}</Text>
        </View>
      </View>

      {/* REACTIONS OVERLAY */}
      {showReactions && (
        <View style={styles.reactionsBackdrop}>
          <View style={styles.reactionsPill}>
            <TouchableOpacity onPress={() => handleReaction('love')}>
              <Text style={styles.reactionEmoji}>❤️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleReaction('like')}>
              <Text style={styles.reactionEmoji}>👍</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleReaction('sad')}>
              <Text style={styles.reactionEmoji}>😢</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleReaction('laugh')}>
              <Text style={styles.reactionEmoji}>😆</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* INFO MODAL */}
      <Modal visible={showInfo} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.infoCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{video.title}</Text>
              <TouchableOpacity onPress={() => setShowInfo(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.infoMeta}>
                {video.year || '2024'} · {video.ageRating || 'UA 16+'} ·{' '}
                {video.duration || '2h 22m'}
              </Text>

              <Text style={styles.infoDescription}>
                {video.description ||
                  'Short micro-drama episode. Perfect for a quick break with the family.'}
              </Text>

              <Text style={styles.infoSectionTitle}>Cast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['Actor 1', 'Actor 2', 'Actor 3', 'Actor 4'].map((name) => (
                  <View key={name} style={styles.castChip}>
                    <View style={styles.castAvatar} />
                    <Text style={styles.castName}>{name}</Text>
                  </View>
                ))}
              </ScrollView>

              <Text style={styles.infoSectionTitle}>More like this</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[1, 2, 3, 4].map((n) => (
                  <View key={n} style={styles.moreLikeCard} />
                ))}
              </ScrollView>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EPISODES MODAL */}
      <Modal visible={showEpisodes} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.episodesCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Episodes</Text>
              <TouchableOpacity onPress={() => setShowEpisodes(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.infoMeta}>
              {video.title} · {video.seasonLabel || 'Season 1'}
            </Text>

            {/* Episode ranges chips – for now static */}
            <View style={styles.episodeRangesRow}>
              {['1 - 18', '19 - 41', '41 - 62', '62 - 83'].map((label, index) => (
                <View
                  key={label}
                  style={[
                    styles.episodeRangeChip,
                    index === 0 && styles.episodeRangeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.episodeRangeText,
                      index === 0 && styles.episodeRangeTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Example 18 episodes */}
              {Array.from({ length: 18 }, (_, i) => i + 1).map((num) => (
                <View key={num} style={styles.episodeRow}>
                  <View style={styles.episodeThumb} />
                  <View style={styles.episodeTextCol}>
                    <Text style={styles.episodeTitle}>Episode {num}</Text>
                    <Text style={styles.episodeSubtitle}>
                      A short micro-episode perfect for quick viewing.
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.episodePlayButton}>
                    <Ionicons name="play" size={22} color="#000" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SETTINGS MODAL (Speed + Quality) */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.settingsCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Playback Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.infoSectionTitle}>Speed</Text>
            <View style={styles.speedRow}>
              {[0.75, 1, 1.25, 1.5, 2].map((speed) => {
                const active = speed === playbackSpeed;
                return (
                  <TouchableOpacity
                    key={String(speed)}
                    style={[
                      styles.speedChip,
                      active && styles.speedChipActive,
                    ]}
                    onPress={() => onChangeSpeed(speed)}
                  >
                    <Text
                      style={[
                        styles.speedChipText,
                        active && styles.speedChipTextActive,
                      ]}
                    >
                      {speed}x
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.infoSectionTitle}>Quality</Text>
            <View style={styles.speedRow}>
              {(['Auto', '480p', '720p', '1080p'] as const).map((q) => {
                const active = q === chosenQuality;
                return (
                  <TouchableOpacity
                    key={q}
                    style={[
                      styles.speedChip,
                      active && styles.speedChipActive,
                    ]}
                    onPress={() => onChangeQuality(q)}
                  >
                    <Text
                      style={[
                        styles.speedChipText,
                        active && styles.speedChipTextActive,
                      ]}
                    >
                      {q}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* COMMENTS MODAL (simple UI) */}
      <Modal visible={showComments} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.commentsCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {[1, 2, 3, 4, 5].map((n) => (
                <View key={n} style={styles.commentRow}>
                  <View style={styles.commentAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentName}>User {n}</Text>
                    <Text style={styles.commentText}>
                      Lovely episode! Perfect to watch together.
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ReelCard;

// ================== STYLES ==================

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  // TOP BAR
  topBar: {
    position: 'absolute',
    top: 40,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextEpisodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  nextEpisodeText: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
    color: '#000',
  },

  // RIGHT ACTIONS
  rightSide: {
    position: 'absolute',
    right: 14,
    top: SCREEN_HEIGHT * 0.26,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 22,
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  actionCount: {
    color: '#ffffff',
    fontSize: 11,
    marginTop: 2,
  },

  // BOTTOM INFO
  bottomInfo: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 80,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
    marginRight: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    color: '#f2f2f2',
    fontSize: 13,
    marginRight: 10,
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#1D4ED8',
    marginRight: 10,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },

  // REACTIONS
  reactionsBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '32%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  reactionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  reactionEmoji: {
    fontSize: 26,
    marginHorizontal: 6,
  },

  // GENERIC MODAL BACKDROP
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  infoCard: {
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: '#111118',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  episodesCard: {
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: '#111118',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  settingsCard: {
    maxHeight: SCREEN_HEIGHT * 0.55,
    backgroundColor: '#111118',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  commentsCard: {
    maxHeight: SCREEN_HEIGHT * 0.7,
    backgroundColor: '#111118',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  infoMeta: {
    color: '#B3B3C0',
    fontSize: 12,
    marginBottom: 10,
  },
  infoDescription: {
    color: '#E6E6F0',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  infoSectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // CAST
  castChip: {
    marginRight: 14,
    alignItems: 'center',
  },
  castAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#222227',
    marginBottom: 6,
  },
  castName: {
    color: '#E6E6F0',
    fontSize: 12,
  },

  // MORE LIKE THIS
  moreLikeCard: {
    width: 90,
    height: 130,
    borderRadius: 10,
    backgroundColor: '#222227',
    marginRight: 12,
    marginBottom: 12,
  },

  // EPISODES
  episodeRangesRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  episodeRangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1F1F26',
    marginRight: 10,
  },
  episodeRangeChipActive: {
    backgroundColor: '#FFD54A',
  },
  episodeRangeText: {
    color: '#D1D1DD',
    fontSize: 12,
    fontWeight: '600',
  },
  episodeRangeTextActive: {
    color: '#000000',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181F',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
  },
  episodeThumb: {
    width: 70,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#262633',
    marginRight: 10,
  },
  episodeTextCol: {
    flex: 1,
  },
  episodeTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  episodeSubtitle: {
    color: '#B3B3C0',
    fontSize: 11,
  },
  episodePlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD54A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SPEED / QUALITY
  speedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  speedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1F1F26',
    marginRight: 8,
    marginTop: 8,
  },
  speedChipActive: {
    backgroundColor: '#FFD54A',
  },
  speedChipText: {
    color: '#D1D1DD',
    fontSize: 13,
    fontWeight: '600',
  },
  speedChipTextActive: {
    color: '#000000',
  },

  // COMMENTS
  commentRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#262633',
    marginRight: 10,
  },
  commentName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  commentText: {
    color: '#D1D1DD',
    fontSize: 12,
    marginTop: 2,
  },
});

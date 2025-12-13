import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { videoService } from '../services/video.service';

const { width, height } = Dimensions.get('window');

type ReelItemProps = {
  reel: {
    id: string;
    title: string;
    description?: string;
    videoUrl: string;
  };
  isActive: boolean;
  initialTime?: number; // Initial playback position in seconds
};

const EMOJIS = ['😍', '👍', '😆', '😮', '😢', '😡'];

const PROGRESS_UPDATE_INTERVAL = 5000; // Save progress every 5 seconds
const MIN_PROGRESS_TO_SAVE = 3; // Only save if at least 3 seconds watched

export default function ReelItem({ reel, isActive, initialTime = 0 }: ReelItemProps) {
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);
  const hasSeekedRef = useRef(false);
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTimeRef = useRef(0);
  const isCompletedRef = useRef(false);
  const videoDurationRef = useRef(0);

  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showDescSheet, setShowDescSheet] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [progress, setProgress] = useState(0);

  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<string[]>([]);

  const sheetY = useRef(new Animated.Value(height)).current;

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

  useEffect(() => {
    if (isActive) {
      videoRef.current?.playAsync();
    } else {
      // When video becomes inactive, immediately clear the progress saving interval
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
      videoRef.current?.pauseAsync();
      setPlaybackSpeed(1.0);
      videoRef.current?.setRateAsync(1.0, true);
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
        await videoService.saveWatchProgress(reel.id, currentTimeSeconds, durationSeconds);
        lastSavedTimeRef.current = currentTimeSeconds;
      } else if (progressPercent >= 85) {
        isCompletedRef.current = true;
        // Delete watch progress when completed
        videoService.deleteWatchProgress(reel.id).catch(console.error);
      }
    } catch (error) {
      console.error('Error saving watch progress in ReelItem:', error);
    }
  };

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded && status.durationMillis) {
      const positionSeconds = status.positionMillis / 1000;
      const durationSeconds = status.durationMillis / 1000;
      videoDurationRef.current = durationSeconds;
      
      const progressPercent = (status.positionMillis / status.durationMillis) * 100;
      setProgress(progressPercent);
      
      // Only save progress if video is active AND playing
      // Don't save from status updates - let the interval handle it to avoid duplicate saves
      // This prevents saving when video is paused or closed
    }
  };

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
        // Double-check that video is still active before saving
        if (!isActive) {
          if (progressSaveIntervalRef.current) {
            clearInterval(progressSaveIntervalRef.current);
            progressSaveIntervalRef.current = null;
          }
          return;
        }

        if (videoRef.current && videoDurationRef.current > 0) {
          videoRef.current.getStatusAsync().then((status: any) => {
            // Only save if video is still active and playing
            if (status.isLoaded && status.positionMillis && status.isPlaying && isActive) {
              const currentTimeSeconds = status.positionMillis / 1000;
              saveProgress(currentTimeSeconds, videoDurationRef.current);
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

  // Save progress on unmount (only if video was active)
  useEffect(() => {
    return () => {
      // Clear interval immediately on unmount
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }

      // Only save on unmount if video was active
      if (isActive && videoRef.current && videoDurationRef.current > 0) {
        videoRef.current.getStatusAsync().then((status: any) => {
          if (status.isLoaded && status.positionMillis) {
            const currentTimeSeconds = status.positionMillis / 1000;
            const progressPercent = (status.positionMillis / status.durationMillis) * 100;
            
            // Save on unmount if progress is between 5% and 85%
            if (currentTimeSeconds >= MIN_PROGRESS_TO_SAVE && 
                progressPercent >= 5 && 
                progressPercent < 85 && 
                !isCompletedRef.current) {
              console.log(`💾 ReelItem: Saving progress on unmount for ${reel.title}`);
              saveProgress(currentTimeSeconds, videoDurationRef.current, true);
            }
          }
        }).catch(console.error);
      }
    };
  }, [reel.id, reel.title, isActive]);

  const handleScreenPress = () => {
    // Tap toggles between 1x and 2x
    if (playbackSpeed === 1.0) {
      setPlaybackSpeed(2.0);
      videoRef.current?.setRateAsync(2.0, true);
    } else {
      setPlaybackSpeed(1.0);
      videoRef.current?.setRateAsync(1.0, true);
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

  const openSheet = () => {
    Animated.timing(sheetY, {
      toValue: height * 0.25,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    setShowEpisodes(true);
  };

  const closeSheet = () => {
    Animated.timing(sheetY, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowEpisodes(false));
  };

  const handleReactionSelect = (emoji: string) => {
    setSelectedReaction(emoji);
    setShowReactions(false);
  };

  return (
    <View style={styles.container}>
      {/* VIDEO */}
      <Pressable 
        style={StyleSheet.absoluteFill}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Video
          ref={videoRef}
          source={{ uri: reel.videoUrl }}
          style={StyleSheet.absoluteFill}
          // @ts-ignore - expo-av accepts "cover" as valid resizeMode
          resizeMode="cover"
          shouldPlay={isActive}
          isLooping
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
      </Pressable>

      {/* PROGRESS BAR */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* SPEED INDICATOR */}
      {playbackSpeed === 2.0 && (
        <View style={styles.speedIndicator}>
          <Text style={styles.speedText}>2x</Text>
        </View>
      )}

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-social-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* RIGHT ACTIONS */}
      <View style={styles.rightActions}>
        {/* RATE WITH HORIZONTAL EMOJIS */}
        <View style={styles.rateSection}>
          {showReactions && (
            <View style={styles.emojiRow}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => handleReactionSelect(e)}
                  style={styles.emojiBtn}
                >
                  <Text style={styles.emoji}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowReactions(!showReactions)}
          >
            <View style={styles.iconCircle}>
              {selectedReaction ? (
                <Text style={styles.selectedEmoji}>{selectedReaction}</Text>
              ) : (
                <Ionicons name="heart" size={26} color="#fff" />
              )}
            </View>
            <Text style={styles.label}>Like</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowComments(true)}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubble" size={24} color="#fff" />
          </View>
          <Text style={styles.label}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={openSheet}>
          <View style={styles.iconCircle}>
            <Ionicons name="albums" size={24} color="#fff" />
          </View>
          <Text style={styles.label}>Episodes</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM INFO */}
      <View style={styles.bottomInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{reel.title}</Text>
          <TouchableOpacity 
            onPress={() => setShowDescSheet(true)}
            style={styles.infoBtn}
          >
            <Ionicons name="information-circle-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {reel.description && (
          <Text style={styles.desc} numberOfLines={1}>
            {reel.description.length > 50 ? reel.description.slice(0, 50) + '...' : reel.description}
            {reel.description.length > 50 && (
              <Text
                style={styles.more}
                onPress={() => setShowDescSheet(true)}
              >
                more
              </Text>
            )}
          </Text>
        )}
      </View>

      {/* DESCRIPTION SHEET */}
      {showDescSheet && (
        <Pressable style={styles.overlay} onPress={() => setShowDescSheet(false)}>
          <Pressable style={styles.descSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.descTitle}>{reel.title}</Text>
              <TouchableOpacity onPress={() => setShowDescSheet(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fullDesc}>{reel.description}</Text>
          </Pressable>
        </Pressable>
      )}

      {/* EPISODES SHEET */}
      {showEpisodes && (
        <>
          <Pressable 
            style={styles.sheetBackdrop} 
            onPress={closeSheet}
          />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.sheetTitle}>Jurassic Park</Text>
                <View style={styles.sheetMeta}>
                  <Text style={styles.sheetMetaText}>2024</Text>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>U/A 16+</Text>
                  </View>
                  <Text style={styles.sheetMetaText}>2h 22m</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Range Pills */}
            <View style={styles.rangeRow}>
              <TouchableOpacity style={[styles.rangePill, styles.rangePillActive]}>
                <Text style={[styles.rangeText, styles.rangeTextActive]}>1 - 18</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rangePill}>
                <Text style={styles.rangeText}>19 - 41</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rangePill}>
                <Text style={styles.rangeText}>41 - 62</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rangePill}>
                <Text style={styles.rangeText}>62 - 83</Text>
              </TouchableOpacity>
            </View>

            {/* Episode Grid */}
            <View style={styles.episodeGrid}>
              {Array.from({ length: 18 }).map((_, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[
                    styles.episodePill,
                    i < 5 && styles.episodePillActive,
                    i >= 5 && styles.episodePillLocked
                  ]}
                >
                  <Text style={[
                    styles.epText,
                    i < 5 && styles.epTextActive,
                    i >= 5 && styles.epTextLocked
                  ]}>
                    {i + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </>
      )}

      {/* COMMENTS */}
      {showComments && (
        <View style={styles.commentWrap}>
          <Pressable 
            style={styles.commentBackdrop} 
            onPress={() => setShowComments(false)}
          />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.commentKeyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={[styles.commentBox, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentTitle}>Comments</Text>
                <TouchableOpacity onPress={() => setShowComments(false)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={comments}
                keyExtractor={(i, idx) => idx.toString()}
                renderItem={({ item }) => (
                  <View style={styles.commentItemRow}>
                    <View style={styles.commentAvatar}>
                      <Ionicons name="person" size={16} color="#fff" />
                    </View>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentUser}>User</Text>
                      <Text style={styles.commentText}>{item}</Text>
                    </View>
                  </View>
                )}
                style={styles.commentList}
                contentContainerStyle={styles.commentListContent}
                keyboardShouldPersistTaps="handled"
              />

              <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 6) }]}>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Write a comment..."
                  placeholderTextColor="#888"
                  style={styles.input}
                  multiline={false}
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (comment.trim()) {
                      setComments([...comments, comment]);
                      setComment('');
                    }
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (comment.trim()) {
                      setComments([...comments, comment]);
                      setComment('');
                    }
                  }}
                  style={styles.sendBtn}
                >
                  <Ionicons name="send" size={20} color="#FFD54A" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width, height, backgroundColor: '#000' },

  topBar: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rightActions: {
    position: 'absolute',
    right: 12,
    bottom: 240,
    alignItems: 'center',
    zIndex: 5,
  },
  rateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emojiRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 24,
    marginRight: 10,
  },
  emojiBtn: {
    padding: 4,
  },
  emoji: { fontSize: 26, marginHorizontal: 4 },
  selectedEmoji: { fontSize: 26 },
  actionBtn: { 
    alignItems: 'center', 
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  bottomInfo: {
    position: 'absolute',
    left: 16,
    bottom: 155,
    right: 16,
    zIndex: 5,
  },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '800', 
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  infoBtn: {
    marginLeft: 4,
    padding: 2,
  },
  moreBtn: {
    marginLeft: 12,
    padding: 2,
  },
  desc: { 
    color: '#fff', 
    fontSize: 14,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  more: { color: '#FFD54A', fontWeight: '600' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  descSheet: {
    backgroundColor: '#111',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  descTitle: { color: '#fff', fontSize: 18, fontWeight: '800', flex: 1 },
  fullDesc: { color: '#ccc', fontSize: 14, lineHeight: 20 },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 50,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: height * 0.75,
    backgroundColor: '#140c0c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    zIndex: 51,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sheetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sheetMetaText: { color: '#bbb', fontSize: 12, marginRight: 8 },
  ratingBadge: {
    backgroundColor: 'rgba(66,165,245,0.2)',
    borderWidth: 1,
    borderColor: '#42a5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  ratingText: { color: '#42a5f5', fontSize: 10, fontWeight: '700' },

  rangeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  rangePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1b1419',
    borderWidth: 1,
    borderColor: '#2c222a',
    marginRight: 8,
    alignItems: 'center',
  },
  rangePillActive: {
    backgroundColor: '#FFD54A',
    borderColor: '#FFD54A',
  },
  rangeText: { fontSize: 13, color: '#f5f5f5', fontWeight: '700' },
  rangeTextActive: { color: '#000', fontWeight: '800' },

  episodeGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
  },
  episodePill: {
    width: (width - 40 - 5 * 8) / 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#252027',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 10,
  },
  episodePillActive: {
    backgroundColor: '#FFD54A',
  },
  episodePillLocked: {
    backgroundColor: '#18141a',
  },
  epText: { color: '#f5f5f5', fontWeight: '600', fontSize: 14 },
  epTextActive: { color: '#000', fontWeight: '800' },
  epTextLocked: { color: '#6c6c73' },

  commentWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  commentBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentKeyboardView: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  commentBox: {
    backgroundColor: '#1a1a1a',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.68,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  commentTitle: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '800' 
  },
  commentList: {
    flex: 1,
    marginBottom: 4,
  },
  commentListContent: {
    paddingBottom: 4,
  },
  commentItemRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 10,
  },
  commentUser: {
    color: '#FFD54A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  commentText: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 18,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressContainer: {
    position: 'absolute',
    bottom: 132,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    zIndex: 20,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD54A',
    shadowColor: '#FFD54A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
    borderRadius: 2,
  },
  speedIndicator: {
    position: 'absolute',
    top: height * 0.48,
    left: '50%',
    marginLeft: -40,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    zIndex: 15,
    borderWidth: 2,
    borderColor: '#FFD54A',
  },
  speedText: {
    color: '#FFD54A',
    fontSize: 18,
    fontWeight: '900',
  },
});
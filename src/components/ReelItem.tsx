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
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
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
    duration?: string;
  };
  isActive: boolean;
  initialTime?: number;
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

export default function ReelItem({ reel, isActive, initialTime = 0 }: ReelItemProps) {
  const insets = useSafeAreaInsets();
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

const [showEpisodes, setShowEpisodes] = useState(false);
const [showComments, setShowComments] = useState(false);
const [showDescSheet, setShowDescSheet] = useState(false);
const [showMore, setShowMore] = useState(false);

  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  const [activeRange, setActiveRange] = useState(RANGES[0]);
  const [activeEpisode, setActiveEpisode] = useState(1);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<string[]>([]);

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

  const openEpisodes = () => {
    setShowEpisodes(true);
    Animated.timing(episodeSheetY, {
      toValue: height * 0.22,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (isActive) {
      videoRef.current?.playAsync();
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
        const response = await videoService.saveWatchProgress(reel.id, currentTimeSeconds, durationSeconds);
        if (response?.success) {
          lastSavedTimeRef.current = currentTimeSeconds;
          console.log(`✅ Progress saved successfully for ${reel.title}`);
        } else {
          console.warn(`⚠️ Progress save returned unsuccessful for ${reel.title}`);
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
    toValue: height * 0.55,
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


  const openDesc = () => {
  setShowDescSheet(true);
  Animated.timing(descSheetY, {
    toValue: height * 0.55,
    duration: 240,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }).start();
};

const closeDesc = () => {
  Animated.timing(descSheetY, {
    toValue: height,
    duration: 220,
    useNativeDriver: true,
  }).start(() => setShowDescSheet(false));
};

  const episodes = Array.from({ length: 18 }).map(
    (_, i) => activeRange.start + i
  );

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
    resizeMode={ResizeMode.COVER}
    shouldPlay={isActive}
    isLooping
    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
  />
</Pressable>
      {/* TOP RIGHT SHARE (UI ONLY) */}
      <View style={styles.topRightActions}>
        <TouchableOpacity style={styles.topActionBtn}>
          <Ionicons name="share-social" size={22} color="#fff" />
        </TouchableOpacity>
      </View>


      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
      {playbackSpeed === 2.0 && (
  <Text style={styles.speedTextSimple}>2×</Text>
)}


      {/* RIGHT ACTIONS */}
      <View style={styles.rightActions}>
        {/* LIKE */}
        <View style={styles.likeWrapper}>
          {showReactions && (
            <View style={styles.emojiRow}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => {
                    setSelectedReaction(e);
                    setShowReactions(false);
                  }}
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
                <Text style={{ fontSize: 24 }}>{selectedReaction}</Text>
              ) : (
                <Ionicons name="heart" size={26} color="#fff" />
              )}
            </View>
            <Text style={styles.label}>Like</Text>
          </TouchableOpacity>
        </View>

        {/* COMMENTS */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowComments(true)}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubble" size={24} color="#fff" />
          </View>
          <Text style={styles.label}>Comment</Text>
        </TouchableOpacity>

        {/* EPISODES */}
        <TouchableOpacity style={styles.actionBtn} onPress={openEpisodes}>
          <View style={styles.iconCircle}>
            <Ionicons name="albums" size={24} color="#fff" />
          </View>
          <Text style={styles.label}>Episodes</Text>
        </TouchableOpacity>



        {/* MORE */}
        <TouchableOpacity style={styles.actionBtn} onPress={openMore}>
          <View style={styles.iconCircle}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </View>
          <Text style={styles.label}>More</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM INFO */}
      <View style={styles.bottomInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{reel.title}</Text>
          <TouchableOpacity
            onPress={openDesc}
            style={styles.infoBtn}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#ccc"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.meta}>
          Episode {activeEpisode} · {reel.duration || '2m'}
        </Text>
      </View>

      {/* INFO SHEET */}
{showDescSheet && (
  <>
    <Pressable style={styles.overlay} onPress={closeDesc} />
    <Animated.View
      style={[
        styles.descSheet,
        { transform: [{ translateY: descSheetY }] },
      ]}
    >
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{reel.title}</Text>
        <TouchableOpacity onPress={closeDesc}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* META ROW (like original) */}
<View style={styles.descMetaRow}>
  <Text style={styles.descMetaText}>2024</Text>
  <View style={styles.ratingBadge}>
    <Text style={styles.ratingText}>U/A 16+</Text>
  </View>
  <Text style={styles.descMetaText}>{reel.duration || '2m'}</Text>
</View>

        {/* DESCRIPTION */}
        <Text style={styles.fullDesc}>
          {reel.description || 'No description available.'}
        </Text>

        {/* EXTRA INFO BLOCKS */}
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Genre</Text>
          <Text style={styles.infoValue}>Drama · Romance</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Language</Text>
          <Text style={styles.infoValue}>Hindi</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Available Episodes</Text>
          <Text style={styles.infoValue}>83 Episodes</Text>
        </View>

    </Animated.View>
  </>
)}

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

            <View style={styles.rangeRow}>
              {RANGES.map(r => (
                <TouchableOpacity
                  key={r.label}
                  onPress={() => setActiveRange(r)}
                  style={[
                    styles.rangePill,
                    activeRange.label === r.label &&
                      styles.rangePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.rangeText,
                      activeRange.label === r.label &&
                        styles.rangeTextActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.episodeGrid}>
              {episodes.map(ep => (
                <TouchableOpacity
                  key={ep}
                  onPress={() => {
                    setActiveEpisode(ep);
                    closeEpisodes();
                  }}
                  style={[
                    styles.episodePill,
                    ep === activeEpisode &&
                      styles.episodePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.epText,
                      ep === activeEpisode &&
                        styles.epTextActive,
                    ]}
                  >
                    {ep}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </>
      )}

      {/* COMMENTS SHEET */}
      {showComments && (
        <View style={styles.commentWrap}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setShowComments(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View
              style={[
                styles.commentBox,
                { paddingBottom: Math.max(insets.bottom, 8) },
              ]}
            >
              <View style={styles.commentHeader}>
                <Text style={styles.sheetTitle}>Comments</Text>
                <TouchableOpacity
                  onPress={() => setShowComments(false)}
                >
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={comments}
                keyExtractor={(_, i) => i.toString()}
                renderItem={({ item }) => (
                  <Text style={styles.commentText}>{item}</Text>
                )}
              />

              <View style={styles.inputRow}>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Write a comment..."
                  placeholderTextColor="#888"
                  style={styles.input}
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
                >
                  <Ionicons name="send" size={20} color="#FFD54A" />
                </TouchableOpacity>
              </View>
            </View>
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
              { transform: [{ translateY: moreSheetY }] },
            ]}
          >
            <TouchableOpacity style={styles.moreItem}>
              <Text style={styles.moreText}>Add to Watchlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreItem}>
              <Text style={styles.moreText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreItem}>
              <Text style={styles.moreText}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.moreClose}
              onPress={closeMore}
            >
              <Text style={styles.moreCloseText}>Cancel</Text>
            </TouchableOpacity>
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
    right: 12,
    bottom: 72,
    alignItems: 'center',
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

  actionBtn: { alignItems: 'center', marginBottom: 14 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: '#fff', fontSize: 11 },

  likeWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 14,
  },

  emojiRow: {
  position: 'absolute',
  right: 55,              // aligned cleanly left of heart
  top: 3,                 // vertically centered with heart
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.75)',
  paddingLeft: 10,
  paddingRight: 22,   // 👈 tray grows to the RIGHT

  paddingVertical: 6,
  borderRadius: 28,
  minWidth: 240,
  zIndex: 30,
},






  emojiBtn: {
  paddingHorizontal: 6,
  paddingVertical: 2,
},





  emoji: {
  fontSize: 22,
  lineHeight: 26,
},


  bottomInfo: {
    position: 'absolute',
    left: 16,
    bottom: 72,
    right: 100,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: '#fff', fontSize: 16, fontWeight: '800' },
  infoBtn: { marginLeft: 6 },
  meta: { color: '#bbb', fontSize: 12 },

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

  commentWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  commentBox: {
    backgroundColor: '#111',
    height: height * 0.6,
    padding: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  commentText: { color: '#fff', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
  },

  moreSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: height * 0.45,
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  moreItem: { paddingVertical: 14 },
  moreText: { color: '#fff', fontSize: 16 },
  moreClose: { paddingVertical: 14, alignItems: 'center' },
  moreCloseText: { color: '#FFD54A', fontSize: 16 },
  topRightActions: {
  position: 'absolute',
  top: 48,          // 👈 aligned with back button height
  right: 12,
  zIndex: 50,
},

  topActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedTextSimple: {
  position: 'absolute',
  bottom: 56,          // 👈 just above progress bar (48)
  right: 20,
  color: '#FFD54A',
  fontSize: 13,
  fontWeight: '600',
  opacity: 0.9,
},


});

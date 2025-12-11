// ============================================
// FILE: src/screens/home/ReelsFeedScreen.tsx
// ============================================
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Animated,
  Easing,
  Share,
  FlatList,
  Image,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Reel = {
  id: string;
  title: string;
  year: string;
  rating: string;
  duration: string;
  videoUrl: string;
  initialLikes: number;
};

const REELS: Reel[] = [
  {
    id: 'r1',
    title: 'Jurassic Park',
    year: '2024',
    rating: 'UA 16+',
    duration: '2h 22m',
    videoUrl:
      'https://videos.pexels.com/video-files/855331/855331-hd_1920_1080_24fps.mp4',
    initialLikes: 370,
  },
  {
    id: 'r2',
    title: 'City Lights',
    year: '2023',
    rating: 'U',
    duration: '1h 45m',
    videoUrl:
      'https://videos.pexels.com/video-files/1448735/1448735-hd_1920_1080_24fps.mp4',
    initialLikes: 128,
  },
  {
    id: 'r3',
    title: 'Delhi Nights',
    year: '2022',
    rating: 'UA',
    duration: '58m',
    videoUrl:
      'https://videos.pexels.com/video-files/854149/854149-hd_1920_1080_24fps.mp4',
    initialLikes: 542,
  },
];

// small helper types / mocks for info sheet/episodes
const EPISODE_RANGES = [
  { id: '1-18', label: '1 - 18', start: 1, end: 18 },
  { id: '19-41', label: '19 - 41', start: 19, end: 41 },
  { id: '41-62', label: '41 - 62', start: 41, end: 62 },
  { id: '62-83', label: '62 - 83', start: 62, end: 83 },
];
const TOTAL_EPISODES = 18;

type Comment = {
  id: string;
  user: string;
  text: string;
};

export default function ReelsFeedScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <FlatList
        data={REELS}
        keyExtractor={(r) => r.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        renderItem={({ item }) => <FullReel reel={item} navigation={navigation} />}
      />
    </SafeAreaView>
  );
}

function FullReel({ reel, navigation }: { reel: Reel; navigation?: any }) {
  const videoRef = useRef<Video | null>(null);

  // states per reel
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(reel.initialLikes);
  const [isSaved, setIsSaved] = useState(false);

  const [showReactions, setShowReactions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showEpisodesSheet, setShowEpisodesSheet] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  const [comments, setComments] = useState<Comment[]>([
    { id: 'c1', user: 'Amit', text: 'Family movie night favourite 🍿' },
    { id: 'c2', user: 'Priya', text: 'Kids loved the dinosaurs!' },
  ]);
  const [newComment, setNewComment] = useState('');

  // for settings
  const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0] as const;
  const QUALITY_OPTIONS = ['Auto', '480p', '720p', '1080p'] as const;
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [quality, setQuality] = useState<typeof QUALITY_OPTIONS[number]>('Auto');

  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const infoTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const openEpisodesSheet = () => {
    setShowEpisodesSheet(true);
    Animated.timing(sheetTranslateY, {
      toValue: SCREEN_HEIGHT * 0.2,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };
  const closeEpisodesSheet = () => {
    Animated.timing(sheetTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 260,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => setShowEpisodesSheet(false));
  };

  const openInfoSheet = () => {
    setShowInfoSheet(true);
    Animated.timing(infoTranslateY, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };
  const closeInfoSheet = () => {
    Animated.timing(infoTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 260,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => setShowInfoSheet(false));
  };

  const handleLike = () => {
    setIsLiked((p) => !p);
    setLikes((p) => p + (isLiked ? -1 : 1));
    setShowReactions(true);
    setTimeout(() => setShowReactions(false), 1400);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${reel.title}" on Digital Kalakar!`,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const addComment = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    const c: Comment = { id: `c-${Date.now()}`, user: 'You', text: trimmed };
    setComments((p) => [c, ...p]);
    setNewComment('');
  };

  const cycleSpeed = async () => {
    const idx = SPEED_OPTIONS.indexOf(playbackSpeed as any);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setPlaybackSpeed(next);
    if (videoRef.current) {
      try {
        await videoRef.current.setStatusAsync({ rate: next, shouldPlay: true });
      } catch (e) {
        /* ignore in mock */
      }
    }
  };

  const cycleQuality = () => {
    const idx = QUALITY_OPTIONS.indexOf(quality);
    setQuality(QUALITY_OPTIONS[(idx + 1) % QUALITY_OPTIONS.length]);
  };

  // episodes helpers
  const [activeRangeId, setActiveRangeId] = useState(EPISODE_RANGES[0].id);
  const activeRange = EPISODE_RANGES.find((r) => r.id === activeRangeId)!;
  const episodesArray = Array.from({ length: activeRange.end - activeRange.start + 1 }, (_, i) => activeRange.start + i);

  return (
    <View style={styles.reelContainer}>
      <Video
        ref={videoRef}
        source={{ uri: reel.videoUrl }}
        style={styles.video}
        shouldPlay
        isLooping
        resizeMode="cover"
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation?.goBack?.()}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextEpisodeButton} onPress={() => { /* next episode logic */ }}>
          <Text style={styles.nextEpisodeText}>Next Episode</Text>
          <Ionicons name="play" size={16} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Reaction emojis (left of Rate) */}
      {showReactions && (
        <View style={styles.reactionBar}>
          <Text style={styles.reactionEmoji}>😍</Text>
          <Text style={styles.reactionEmoji}>👍</Text>
          <Text style={styles.reactionEmoji}>🥲</Text>
          <Text style={styles.reactionEmoji}>🤣</Text>
        </View>
      )}

      {/* Settings popover */}
      {showSettings && (
        <View style={styles.settingsPopup}>
          <TouchableOpacity style={styles.settingsItem} onPress={cycleSpeed}>
            <MaterialIcons name="slow-motion-video" size={20} color="#fff" />
            <Text style={styles.settingsText}>Speed {playbackSpeed.toFixed(1)}x</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={cycleQuality}>
            <Ionicons name="sparkles-outline" size={18} color="#fff" />
            <Text style={styles.settingsText}>Quality {quality}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Right action column */}
      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={34} color={isLiked ? '#FF6B6B' : '#fff'} />
          <Text style={styles.actionLabel}>Rate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#fff" />
          <Text style={styles.actionLabel}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettings((p) => !p)}>
          <Ionicons name="settings-outline" size={30} color="#fff" />
          <Text style={styles.actionLabel}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={28} color="#fff" />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => setIsSaved((p) => !p)}>
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={30} color="#fff" />
          <Text style={styles.actionLabel}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={openEpisodesSheet}>
          <Ionicons name="grid-outline" size={30} color="#fff" />
          <Text style={styles.actionLabel}>Episodes</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info (pulled up so it never overlaps with comments) */}
      <View style={styles.bottomInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.movieTitle}>{reel.title}</Text>
          <TouchableOpacity onPress={openInfoSheet} style={{ marginLeft: 8 }}>
            <Ionicons name="information-circle-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{reel.year}</Text>
          <View style={styles.ratingChip}>
            <Text style={styles.ratingChipText}>{reel.rating}</Text>
          </View>
          <Text style={styles.metaText}>{reel.duration}</Text>
        </View>
      </View>

      {/* COMMENTS OVERLAY (covers > 50% of screen; positioned so title/meta remain visible) */}
      {showComments && (
        <View style={styles.commentsOverlay}>
          <Pressable style={styles.commentsBackdrop} onPress={() => setShowComments(false)} />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.commentsCard}>
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments</Text>
                <TouchableOpacity onPress={() => setShowComments(false)}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 8 }}>
                {/* movie title + small meta inside comments sheet header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.commentsMovieTitle}>{reel.title}</Text>
                  <TouchableOpacity onPress={openInfoSheet} style={{ marginLeft: 8 }}>
                    <Ionicons name="information-circle-outline" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.commentSmallMeta}>{reel.year}</Text>
                  <View style={[styles.ratingChip, { marginHorizontal: 8 }]}>
                    <Text style={styles.ratingChipText}>{reel.rating}</Text>
                  </View>
                  <Text style={styles.commentSmallMeta}>{reel.duration}</Text>
                </View>
              </View>

              {/* comments list */}
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                style={{ maxHeight: SCREEN_HEIGHT * 0.45 }}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>{item.user.charAt(0)}</Text>
                    </View>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentUser}>{item.user}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />

              {/* input */}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a family-friendly comment..."
                  placeholderTextColor="#999"
                  value={newComment}
                  onChangeText={setNewComment}
                />
                <TouchableOpacity onPress={addComment} style={styles.sendBtn}>
                  <Ionicons name="send" size={20} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* EPISODES SHEET */}
      <Animated.View
        pointerEvents={showEpisodesSheet ? 'auto' : 'none'}
        style={[
          styles.episodesSheet,
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
      >
        <View style={styles.episodesHeader}>
          <View>
            <Text style={styles.episodesTitle}>{reel.title}</Text>
            <View style={styles.episodesMetaRow}>
              <Text style={styles.metaText}>{reel.year}</Text>
              <View style={styles.ratingChipSmall}>
                <Text style={styles.ratingChipSmallText}>{reel.rating}</Text>
              </View>
              <Text style={styles.metaText}>{reel.duration}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={closeEpisodesSheet}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.rangeRow}>
          {EPISODE_RANGES.map((r) => {
            const active = r.id === activeRangeId;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.rangeChip, active && styles.rangeChipActive]}
                onPress={() => setActiveRangeId(r.id)}
              >
                <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.episodesGrid}>
          {episodesArray.map((ep) => {
            const unlocked = ep <= TOTAL_EPISODES;
            const active = ep === 1; // for demo, episode 1 active
            return (
              <TouchableOpacity
                key={ep}
                disabled={!unlocked}
                style={[
                  styles.episodeNumber,
                  !unlocked && styles.episodeNumberLocked,
                  active && styles.episodeNumberActive,
                ]}
              >
                <Text style={[
                  styles.episodeNumberText,
                  !unlocked && styles.episodeNumberTextLocked,
                  active && styles.episodeNumberTextActive,
                ]}>
                  {ep}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* INFO SHEET */}
      {showInfoSheet && (
        <Animated.View style={[styles.infoSheetContainer, { transform: [{ translateY: infoTranslateY }] }]}>
          <Pressable style={styles.infoBackdrop} onPress={closeInfoSheet} />
          <View style={styles.infoSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.infoTopBar}>
                <View style={{ width: 28 }} />
                <View style={styles.infoHandle} />
                <TouchableOpacity onPress={closeInfoSheet}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.infoPosterRow}>
                <View style={styles.posterWrapper}>
                  <Image source={{ uri: 'https://picsum.photos/340/460?random=99' }} style={styles.posterImage} />
                  <TouchableOpacity style={styles.posterPlayOverlay}>
                    <Ionicons name="play" size={40} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.posterHeart}>
                    <Ionicons name="heart-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.infoTitle}>{reel.title}</Text>
              <View style={styles.infoMetaRow}>
                <Text style={styles.infoMetaText}>{reel.year}</Text>
                <View style={styles.ratingChipSmall}>
                  <Text style={styles.ratingChipSmallText}>{reel.rating}</Text>
                </View>
                <Text style={styles.infoMetaText}>{reel.duration}</Text>
              </View>

              <TouchableOpacity style={styles.infoPrimaryButton}>
                <Ionicons name="play" size={18} color="#000" />
                <Text style={styles.infoPrimaryText}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.infoSecondaryButton}>
                <Ionicons name="download-outline" size={18} color="#000" />
                <Text style={styles.infoPrimaryText}>Download</Text>
              </TouchableOpacity>

              <Text style={styles.infoDescription}>
                Quick description goes here. This area explains the show in family-friendly language so parents can decide easily.
              </Text>
            </ScrollView>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/* =========================
   STYLES
   ========================= */
const EPISODES_PER_ROW = 6;
const RANGE_PER_ROW = 4;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },

  reelContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },

  // top bar
  topBar: {
    position: 'absolute',
    top: 16,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextEpisodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  nextEpisodeText: {
    marginRight: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },

  // reactions - shown left of Rate button
  reactionBar: {
    position: 'absolute',
    right: 84, // left-of-rate placement
    top: SCREEN_HEIGHT * 0.34,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  reactionEmoji: {
    fontSize: 26,
    marginHorizontal: 6,
  },

  // settings popup
  settingsPopup: {
    position: 'absolute',
    right: 70,
    top: SCREEN_HEIGHT * 0.54,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingsText: {
    marginLeft: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // right actions
  rightActions: {
    position: 'absolute',
    right: 12,
    top: SCREEN_HEIGHT * 0.28,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 22,
  },
  actionLabel: {
    marginTop: 6,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // bottom info - pulled up so comments sheet doesn't hide it
  bottomInfo: {
    position: 'absolute',
    left: 16,
    bottom: 128, // higher than tabbar so visible above comments
    right: 110,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movieTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metaText: {
    color: '#f1f1f1',
    fontSize: 12,
    marginRight: 10,
  },
  ratingChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#42a5f5',
    marginRight: 8,
  },
  ratingChipText: {
    color: '#42a5f5',
    fontSize: 11,
    fontWeight: '700',
  },

  // COMMENTS overlay
  commentsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  commentsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  commentsCard: {
    backgroundColor: '#0e0b10',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    maxHeight: SCREEN_HEIGHT * 0.68, // covers > 50% but leaves top area visible
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  commentsMovieTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  commentSmallMeta: {
    color: '#cfcfd6',
    fontSize: 12,
    marginRight: 10,
  },

  commentRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22202b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  commentBubble: {
    backgroundColor: '#15141a',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
  },
  commentUser: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  commentText: {
    color: '#e2e2e6',
    fontSize: 13,
    marginTop: 4,
  },

  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#15141a',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    marginRight: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFD54A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // episodes sheet
  episodesSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.78,
    backgroundColor: '#120606',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  episodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  episodesTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  episodesMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingChipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#42a5f5',
    marginHorizontal: 6,
  },
  ratingChipSmallText: {
    color: '#42a5f5',
    fontSize: 11,
    fontWeight: '700',
  },

  rangeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  rangeChip: {
    width: (SCREEN_WIDTH - 40 - (RANGE_PER_ROW - 1) * 10) / RANGE_PER_ROW,
    paddingVertical: 12,
    borderRadius: 26,
    backgroundColor: '#1b1419',
    borderWidth: 1,
    borderColor: '#2c222a',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeChipActive: {
    backgroundColor: '#FFD54A',
    borderColor: '#FFD54A',
  },
  rangeChipText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '800',
  },
  rangeChipTextActive: {
    color: '#000',
  },

  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 40,
  },
  episodeNumber: {
    width: (SCREEN_WIDTH - 40 - (EPISODES_PER_ROW - 1) * 8) / EPISODES_PER_ROW,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252027',
  },
  episodeNumberLocked: {
    backgroundColor: '#18141a',
  },
  episodeNumberActive: {
    backgroundColor: '#FFD54A',
  },
  episodeNumberText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  episodeNumberTextLocked: {
    color: '#6c6c73',
  },
  episodeNumberTextActive: {
    color: '#000',
  },

  // info sheet
  infoSheetContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  infoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  infoSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_HEIGHT * 0.88,
    backgroundColor: '#050509',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  infoTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoHandle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
  },
  infoPosterRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  posterWrapper: {
    width: SCREEN_WIDTH * 0.6,
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  posterHeart: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginTop: 6,
  },
  infoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  infoPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#FFD54A',
    paddingVertical: 12,
    marginBottom: 10,
  },
  infoSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#ffdd63',
    paddingVertical: 12,
    marginBottom: 16,
  },
  infoPrimaryText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },

  // small util
  commentSmall: { color: '#cfcfd6' },
});

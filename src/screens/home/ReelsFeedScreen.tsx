// ============================================
// FILE: src/screens/home/ReelPlayerScreen.tsx
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
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ReelPlayerProps = {
  navigation?: any;
};

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

// ---- MOCK DATA FOR INFO SHEET ----
const MOCK_CAST = [
  { id: '1', name: 'Laura Dern', image: 'https://picsum.photos/80/80?random=11' },
  { id: '2', name: 'Jeff Goldblum', image: 'https://picsum.photos/80/80?random=12' },
  { id: '3', name: 'Sam Neill', image: 'https://picsum.photos/80/80?random=13' },
  { id: '4', name: 'Richard A.', image: 'https://picsum.photos/80/80?random=14' },
];

const MOCK_EPISODES = [
  {
    id: 'e1',
    title: 'A Wednesday',
    desc: 'Learning to tap into her powers as a psychic while unraveling mystery after.',
    image: 'https://picsum.photos/160/90?random=21',
  },
  {
    id: 'e2',
    title: 'Magician',
    desc: 'Learning to tap into her powers as a psychic while unraveling mystery after.',
    image: 'https://picsum.photos/160/90?random=22',
  },
  {
    id: 'e3',
    title: 'The Knight',
    desc: 'Learning to tap into her powers as a psychic while unraveling mystery after.',
    image: 'https://picsum.photos/160/90?random=23',
  },
];

const MOCK_MORE_LIKE = [
  { id: 'm1', image: 'https://picsum.photos/90/130?random=31' },
  { id: 'm2', image: 'https://picsum.photos/90/130?random=32' },
  { id: 'm3', image: 'https://picsum.photos/90/130?random=33' },
];

const EPISODE_RANGES = [
  { id: '1-18', label: '1 - 18', start: 1, end: 18 },
  { id: '19-41', label: '19 - 41', start: 19, end: 41 },
  { id: '41-62', label: '41 - 62', start: 41, end: 62 },
  { id: '62-83', label: '62 - 83', start: 62, end: 83 },
];

const TOTAL_EPISODES = 18; // mock

const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0] as const;
const QUALITY_OPTIONS = ['Auto', '480p', '720p', '1080p'] as const;
type Quality = (typeof QUALITY_OPTIONS)[number];

type Comment = {
  id: string;
  user: string;
  text: string;
};

const ReelPlayerScreen: React.FC<ReelPlayerProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={REELS}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        renderItem={({ item }) => <ReelItem reel={item} navigation={navigation} />}
      />
    </SafeAreaView>
  );
};

export default ReelPlayerScreen;

/**
 * Single full-screen reel item
 */
const ReelItem: React.FC<{ reel: Reel; navigation?: any }> = ({ reel, navigation }) => {
  const videoRef = useRef<Video | null>(null);

  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [likes, setLikes] = useState(reel.initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [showReactions, setShowReactions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [quality, setQuality] = useState<Quality>('Auto');

  const [activeRangeId, setActiveRangeId] = useState(EPISODE_RANGES[0].id);
  const [showEpisodesSheet, setShowEpisodesSheet] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  // comments
  const [comments, setComments] = useState<Comment[]>([
    { id: 'c1', user: 'Amit', text: 'Family movie night favourite 🍿' },
    { id: 'c2', user: 'Priya', text: 'Kids loved the dinosaurs!' },
  ]);
  const [newComment, setNewComment] = useState('');

  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const infoTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // ---- helpers ----
  const openEpisodesSheet = () => {
    if (showEpisodesSheet) return;
    setShowEpisodesSheet(true);
    Animated.timing(sheetTranslateY, {
      toValue: SCREEN_HEIGHT * 0.18,
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

  const handleNextEpisode = () => {
    const next = currentEpisode === TOTAL_EPISODES ? 1 : currentEpisode + 1;
    setCurrentEpisode(next);
  };

  const handleLike = () => {
    setIsLiked((prev) => !prev);
    setLikes((prev) => prev + (isLiked ? -1 : 1));
    setShowReactions(true);
    setTimeout(() => setShowReactions(false), 1200);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${reel.title}" on Digital Kalakar!`,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const handleEpisodePress = (ep: number) => {
    setCurrentEpisode(ep);
    closeEpisodesSheet();
  };

  // ---- Settings: Speed & Quality ----
  const cycleSpeed = async () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed as any);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    setPlaybackSpeed(nextSpeed);

    if (videoRef.current) {
      try {
        await videoRef.current.setStatusAsync({
          rate: nextSpeed,
          shouldPlay: true,
        });
      } catch (e) {
        console.warn('Error setting speed', e);
      }
    }
  };

  const cycleQuality = () => {
    const currentIndex = QUALITY_OPTIONS.indexOf(quality);
    const nextIndex = (currentIndex + 1) % QUALITY_OPTIONS.length;
    const nextQuality = QUALITY_OPTIONS[nextIndex];
    setQuality(nextQuality);
  };

  // ---- Episodes list ----
  const activeRange = EPISODE_RANGES.find((r) => r.id === activeRangeId)!;
  const episodesArray = Array.from(
    { length: activeRange.end - activeRange.start + 1 },
    (_, idx) => activeRange.start + idx,
  );

  const renderEpisodeNumber = (ep: number) => {
    const isActive = ep === currentEpisode;
    const isUnlocked = ep <= TOTAL_EPISODES;

    return (
      <TouchableOpacity
        key={ep}
        disabled={!isUnlocked}
        onPress={() => handleEpisodePress(ep)}
        style={[
          styles.episodeNumber,
          !isUnlocked && styles.episodeNumberLocked,
          isActive && styles.episodeNumberActive,
        ]}
      >
        <Text
          style={[
            styles.episodeNumberText,
            !isUnlocked && styles.episodeNumberTextLocked,
            isActive && styles.episodeNumberTextActive,
          ]}
        >
          {ep}
        </Text>
      </TouchableOpacity>
    );
  };

  // ---- Comment helpers ----
  const handleAddComment = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    setComments((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, user: 'You', text: trimmed },
    ]);
    setNewComment('');
  };

  return (
    <View style={styles.reelContainer}>
      {/* VIDEO */}
      <Video
        ref={videoRef}
        source={{ uri: reel.videoUrl }}
        style={styles.video}
        isLooping
        shouldPlay
        resizeMode="cover"
      />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextEpisodeButton}
          onPress={handleNextEpisode}
          activeOpacity={0.9}
        >
          <Text style={styles.nextEpisodeText}>Next Episode</Text>
          <Ionicons name="play" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      {/* REACTION BAR – placed to the left of Rate */}
      {showReactions && (
        <View style={styles.reactionBar}>
          <Text style={styles.reactionEmoji}>😍</Text>
          <Text style={styles.reactionEmoji}>👍</Text>
          <Text style={styles.reactionEmoji}>🥲</Text>
          <Text style={styles.reactionEmoji}>🤣</Text>
        </View>
      )}

      {/* SETTINGS POPOVER (bigger tappable options) */}
      {showSettings && (
        <View style={styles.settingsPopup}>
          <TouchableOpacity style={styles.settingsItem} onPress={cycleSpeed}>
            <MaterialIcons name="slow-motion-video" size={22} color="#fff" />
            <Text style={styles.settingsText}>Speed {playbackSpeed.toFixed(1)}x</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={cycleQuality}>
            <Ionicons name="sparkles-outline" size={22} color="#fff" />
            <Text style={styles.settingsText}>Quality {quality}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* COMMENTS OVERLAY (covers ~65%) */}
      {showComments && (
        <View style={styles.commentsOverlay}>
          <Pressable
            style={styles.commentsBackdrop}
            onPress={() => setShowComments(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.commentsCard}>
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments</Text>
                <TouchableOpacity onPress={() => setShowComments(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: SCREEN_HEIGHT * 0.52 }}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {item.user.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentUser}>{item.user}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  </View>
                )}
              />

              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a family-friendly comment..."
                  placeholderTextColor="#888"
                  value={newComment}
                  onChangeText={setNewComment}
                />
                <TouchableOpacity onPress={handleAddComment}>
                  <Ionicons name="send" size={22} color="#FFD54A" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* RIGHT ACTIONS - BIGGER ICONS (shifted down) */}
      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={34}
            color={isLiked ? '#FF6B6B' : '#fff'}
          />
          <Text style={styles.actionLabel}>Rate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowComments(true)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={30} color="#fff" />
          <Text style={styles.actionLabel}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowSettings((prev) => !prev)}
        >
          <Ionicons name="settings-outline" size={30} color="#fff" />
          <Text style={styles.actionLabel}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={28} color="#fff" />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setIsSaved((prev) => !prev)}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={28}
            color="#fff"
          />
          <Text style={styles.actionLabel}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={openEpisodesSheet}>
          <Ionicons name="grid-outline" size={30} color="#fff" />
          <Text style={styles.actionLabel}>Episodes</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM INFO – pulled further up so it never hides behind tab bar */}
      <View style={styles.bottomInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.movieTitle}>{reel.title}</Text>
          <TouchableOpacity onPress={openInfoSheet} style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={22} color="#fff" />
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

      {/* EPISODES BOTTOM SHEET (redesigned to match the reference) */}
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

        {/* Range chips */}
        <View style={styles.rangeRow}>
          {EPISODE_RANGES.map((range) => {
            const isActive = range.id === activeRangeId;
            return (
              <TouchableOpacity
                key={range.id}
                style={[styles.rangeChip, isActive && styles.rangeChipActive]}
                onPress={() => setActiveRangeId(range.id)}
              >
                <Text style={[styles.rangeChipText, isActive && styles.rangeChipTextActive]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Episodes grid */}
        <View style={styles.episodesGrid}>
          {episodesArray.map(renderEpisodeNumber)}
        </View>
      </Animated.View>

      {/* INFO SHEET (Play / Download / Description / Cast / Episodes / More Like This) */}
      {showInfoSheet && (
        <Animated.View
          style={[
            styles.infoSheetContainer,
            { transform: [{ translateY: infoTranslateY }] },
          ]}
        >
          {/* translucent backdrop tap to close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeInfoSheet}
            style={styles.infoBackdrop}
          />

          <View style={styles.infoSheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* top close */}
              <View style={styles.infoTopBar}>
                <View style={{ width: 28 }} />
                <View style={styles.infoHandle} />
                <TouchableOpacity onPress={closeInfoSheet}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Poster + heart */}
              <View style={styles.infoPosterRow}>
                <View style={styles.posterWrapper}>
                  <Image
                    source={{ uri: 'https://picsum.photos/340/460?random=99' }}
                    style={styles.posterImage}
                  />
                  <TouchableOpacity style={styles.posterPlayOverlay}>
                    <Ionicons name="play" size={40} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.posterHeart}>
                    <Ionicons name="heart-outline" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tags */}
              <View style={styles.tagRow}>
                <View style={styles.tagChip}>
                  <Text style={styles.tagText}>Action</Text>
                </View>
                <View style={styles.tagChip}>
                  <Text style={styles.tagText}>Thriller</Text>
                </View>
              </View>

              {/* Title + meta */}
              <Text style={styles.infoTitle}>{reel.title}</Text>
              <View style={styles.infoMetaRow}>
                <Text style={styles.infoMetaText}>{reel.year}</Text>
                <View style={styles.ratingChipSmall}>
                  <Text style={styles.ratingChipSmallText}>{reel.rating}</Text>
                </View>
                <Text style={styles.infoMetaText}>{reel.duration}</Text>
              </View>

              {/* Play / Download big buttons */}
              <TouchableOpacity style={styles.infoPrimaryButton}>
                <Ionicons name="play" size={20} color="#000" />
                <Text style={styles.infoPrimaryText}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.infoSecondaryButton}>
                <Ionicons name="download-outline" size={20} color="#000" />
                <Text style={styles.infoPrimaryText}>Download</Text>
              </TouchableOpacity>

              {/* Description */}
              <Text style={styles.infoDescription}>
                In Steven Spielberg&apos;s massive blockbuster, paleontologists Alan
                Grant and Ellie Sattler are among a select group chosen to tour an
                island theme park populated by dinosaurs created from prehistoric
                DNA.
              </Text>

              {/* quick actions row */}
              <View style={styles.infoQuickRow}>
                <TouchableOpacity style={styles.infoQuickItem}>
                  <Ionicons name="add" size={22} color="#fff" />
                  <Text style={styles.infoQuickText}>My list</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.infoQuickItem}>
                  <Ionicons name="share-social-outline" size={22} color="#fff" />
                  <Text style={styles.infoQuickText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.infoQuickItem}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={22}
                    color="#fff"
                  />
                  <Text style={styles.infoQuickText}>Comment</Text>
                </TouchableOpacity>
              </View>

              {/* Cast */}
              <Text style={styles.infoSectionHeading}>Cast</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
              >
                {MOCK_CAST.map((person) => (
                  <View key={person.id} style={styles.castItem}>
                    <Image
                      source={{ uri: person.image }}
                      style={styles.castAvatar}
                    />
                    <Text style={styles.castName}>{person.name}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* Episodes */}
              <Text style={styles.infoSectionHeading}>Episodes</Text>
              {MOCK_EPISODES.map((ep) => (
                <View key={ep.id} style={styles.infoEpisodeCard}>
                  <Image
                    source={{ uri: ep.image }}
                    style={styles.infoEpisodeImage}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoEpisodeTitle}>{ep.title}</Text>
                    <Text style={styles.infoEpisodeDesc} numberOfLines={2}>
                      {ep.desc}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.infoEpisodePlay}>
                    <Ionicons name="play" size={18} color="#000" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* More like this */}
              <Text style={styles.infoSectionHeading}>More Like This…</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {MOCK_MORE_LIKE.map((item) => (
                  <Image
                    key={item.id}
                    source={{ uri: item.image }}
                    style={styles.moreLikeImage}
                  />
                ))}
              </ScrollView>
            </ScrollView>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

// ============================================
// STYLES
// ============================================
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextEpisodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  nextEpisodeText: {
    marginRight: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },

  // reactions – placed to the left of Rate button
  reactionBar: {
    position: 'absolute',
    right: 86,
    top: SCREEN_HEIGHT * 0.34,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  reactionEmoji: {
    fontSize: 22,
    marginHorizontal: 6,
  },

  // settings popup
  settingsPopup: {
    position: 'absolute',
    right: 70,
    top: SCREEN_HEIGHT * 0.54,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingsText: {
    marginLeft: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // comments overlay
  commentsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  commentsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  commentsCard: {
    backgroundColor: '#111017',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    maxHeight: SCREEN_HEIGHT * 0.65, // covers ~65%
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 8,
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
    backgroundColor: '#1b1a23',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flex: 1,
  },
  commentUser: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  commentText: {
    color: '#e0e0e5',
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
    backgroundColor: '#1b1a23',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    marginRight: 8,
    fontSize: 14,
  },

  // right actions
  rightActions: {
    position: 'absolute',
    right: 12,
    top: SCREEN_HEIGHT * 0.29, // shifted down a bit
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

  // bottom info – higher above tab bar
  bottomInfo: {
    position: 'absolute',
    left: 16,
    bottom: 150,
    right: 110,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movieTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  infoButton: {
    marginLeft: 6,
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
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#42a5f5',
    marginRight: 10,
  },
  ratingChipText: {
    color: '#42a5f5',
    fontSize: 11,
    fontWeight: '700',
  },

  // episodes sheet – like reference
  episodesSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.82,
    backgroundColor: '#120606',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  episodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  episodesTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  episodesMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingChipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#42a5f5',
    marginHorizontal: 6,
  },
  ratingChipSmallText: {
    color: '#42a5f5',
    fontSize: 12,
    fontWeight: '700',
  },

  // range chips row (pill style)
  rangeRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 18,
  },
  rangeChip: {
    width:
      (SCREEN_WIDTH - 40 - (RANGE_PER_ROW - 1) * 12) / RANGE_PER_ROW, // 4 per row
    paddingVertical: 12,
    borderRadius: 28,
    backgroundColor: '#1b1419',
    borderWidth: 1,
    borderColor: '#2c222a',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeChipActive: {
    backgroundColor: '#FFD54A',
    borderColor: '#FFD54A',
  },
  rangeChipText: {
    fontSize: 16,
    color: '#f5f5f5',
    fontWeight: '800',
  },
  rangeChipTextActive: {
    color: '#000',
    fontWeight: '900',
  },

  // episodes grid as rounded squares
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  episodeNumber: {
    width:
      (SCREEN_WIDTH - 40 - (EPISODES_PER_ROW - 1) * 8) / EPISODES_PER_ROW,
    paddingVertical: 14,
    borderRadius: 14,
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
    color: '#f5f5f5',
    fontWeight: '700',
  },
  episodeNumberTextLocked: {
    color: '#6c6c73',
  },
  episodeNumberTextActive: {
    color: '#000',
    fontWeight: '800',
  },

  // INFO SHEET
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
    maxHeight: SCREEN_HEIGHT * 0.9,
    backgroundColor: '#050509',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
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
    width: SCREEN_WIDTH * 0.62,
    aspectRatio: 2 / 3,
    borderRadius: 18,
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
    right: 10,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  tagText: {
    color: '#f5f5f5',
    fontSize: 12,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
  },
  infoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  infoMetaText: {
    color: '#d7d7dd',
    fontSize: 12,
    marginHorizontal: 6,
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
  infoDescription: {
    color: '#f0f0f3',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  infoQuickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 18,
  },
  infoQuickItem: {
    alignItems: 'center',
  },
  infoQuickText: {
    marginTop: 4,
    color: '#e5e5ea',
    fontSize: 12,
  },

  infoSectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
  },

  castItem: {
    alignItems: 'center',
    marginRight: 12,
  },
  castAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 6,
  },
  castName: {
    color: '#f5f5f7',
    fontSize: 11,
  },

  infoEpisodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15151d',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  infoEpisodeImage: {
    width: 90,
    height: 54,
    borderRadius: 10,
    marginRight: 10,
  },
  infoEpisodeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoEpisodeDesc: {
    color: '#c7c7cf',
    fontSize: 11,
  },
  infoEpisodePlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD54A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  moreLikeImage: {
    width: 90,
    height: 130,
    borderRadius: 10,
    marginRight: 10,
  },
});

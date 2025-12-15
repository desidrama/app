import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const EPISODES_PER_ROW = 6;
const RANGE_PER_ROW = 4;

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  headerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
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

  // reactions – replaced with horizontal reaction row + rate
  reactionRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  reactionBubble: {
    marginHorizontal: 6,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmojiSmall: {
    fontSize: 20,
  },
  actionButtonHorizontal: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  selectedReactionLarge: {
    fontSize: 30,
    marginBottom: 4,
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
    paddingVertical: 6,
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
    zIndex: 999,
    elevation: 999,
  },
  commentsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  commentsCard: {
    backgroundColor: '#111017',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
    minHeight: SCREEN_HEIGHT * 0.62,
    maxHeight: SCREEN_HEIGHT * 0.78,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentsTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  // Movie info shown inside comments sheet (keeps context)
  commentsMovieRow: {
    marginBottom: 10,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22202b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  commentBubble: {
    backgroundColor: '#1b1a23',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
  },
  commentUser: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  commentText: {
    color: '#e0e0e5',
    fontSize: 12,
    marginTop: 2,
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
    paddingVertical: 6,
    color: '#fff',
    marginRight: 8,
    fontSize: 13,
  },

  // right actions
  rightActions: {
    position: 'absolute',
    right: 12,
    top: SCREEN_HEIGHT * 0.22,
    alignItems: 'center',
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 22,
  },
  actionLabel: {
    marginTop: 5,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // bottom info – higher above tab bar
  bottomInfo: {
    position: 'absolute',
    left: 16,
    bottom: 120, // pulled slightly above tab bar to be visible
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
    flex: 1,
  },
  infoButton: {
    marginLeft: 8,
    padding: 4,
  },
  description: {
    color: '#ececec',
    fontSize: 13,
    marginTop: 6,
    maxWidth: SCREEN_WIDTH - 150,
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
    height: SCREEN_HEIGHT * 0.75,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: '#42a5f5',
    marginHorizontal: 6,
  },
  ratingChipSmallText: {
    color: '#42a5f5',
    fontSize: 9,
    fontWeight: '700',
  },

  // range chips row
  rangeRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 18,
  },
  rangeChip: {
    width:
      (SCREEN_WIDTH - 40 - (RANGE_PER_ROW - 1) * 10) / RANGE_PER_ROW,
    paddingVertical: 10,
    borderRadius: 24,
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
    color: '#f5f5f5',
    fontWeight: '700',
  },
  rangeChipTextActive: {
    color: '#000',
    fontWeight: '800',
  },

  // episodes grid as pills
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  episodeNumber: {
    width:
      (SCREEN_WIDTH - 40 - (EPISODES_PER_ROW - 1) * 8) / EPISODES_PER_ROW,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 10,
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
    fontWeight: '600',
  },
  episodeNumberTextLocked: {
    color: '#6c6c73',
  },
  episodeNumberTextActive: {
    color: '#000',
    fontWeight: '800',
  },

  // INFO SHEET (if used)
  infoSheetContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  infoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  infoSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#050509',
    paddingHorizontal: 18,
    paddingTop: 10,
    zIndex: 1001,
    elevation: 1001,
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
    marginBottom: 16,
    marginTop: 8,
  },
  posterWrapper: {
    width: SCREEN_WIDTH * 0.62,
    aspectRatio: 2 / 3,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
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

  // Episode badge bottom-left
  episodeBadgeWrap: {
    position: 'absolute',
    left: 14,
    bottom: 90,
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeLogo: {
    width: 70,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  episodeLogoImage: {
    width: '100%',
    height: '100%',
  },
  episodeLabelRow: {
    marginLeft: 8,
  },
  episodeLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

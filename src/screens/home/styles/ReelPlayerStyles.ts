// ============================================
// ReelPlayerStyles.ts - TRUE FULLSCREEN FIX
// ============================================

import { StyleSheet, Dimensions } from 'react-native';

// ✅ FIX 1: Use Dimensions.get() instead of useWindowDimensions
const screenDimensions = Dimensions.get('window');
const SCREEN_WIDTH = screenDimensions.width;
const SCREEN_HEIGHT = screenDimensions.height;

export default StyleSheet.create({
  // ============================================
  // CONTAINER STYLES
  // ============================================
  
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
    backgroundColor: '#000',
  },
  
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },

  // ============================================
  // VIDEO LAYER STYLES
  // ============================================
  
  // ✅ CRITICAL: Video container uses absoluteFill
  reelContainer: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    overflow: 'hidden', // ✅ CRITICAL: Prevent overflow
  },
  
  // ✅ CRITICAL: Video fills parent completely
  video: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },

  // ============================================
  // VIDEO OVERLAY STYLES (gradient, vignette)
  // ============================================
  
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  
  vignetteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },

  // ============================================
  // GESTURE LAYER STYLES
  // ============================================
  
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    paddingRight: 70,
    paddingBottom: 100,
  },

  // ============================================
  // CONTROL LAYER STYLES
  // ============================================
  
  // Top header (back & share buttons)
  topHeader: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 999,
    pointerEvents: 'box-none',
    elevation: 999,
  },
  
  // Progress bar container
  progressBarContainer: {
    position: 'absolute',
    alignItems: 'flex-start',
    zIndex: 4000,
  },
  
  progressBarBackground: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'visible',
    position: 'relative',
  },
  
  progressBarFill: { 
    height: 3,
    backgroundColor: '#FFD54A',
    borderRadius: 2,
  },
  
  scrubberThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD54A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    top: -4.5,
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  
  playbackTimer: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Right action rail
  rightActions: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 500,
  },
  
  // Premium action button
  premiumActionBtn: {
    alignItems: 'center',
    marginBottom: 12,
    minWidth: 44,
  },
  
  premiumIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  
  premiumCountLabel: {
    color: '#E5E5E5',
    fontSize: 11,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // Bottom info section
  bottomInfo: {
    position: 'absolute',
    zIndex: 4000,
  },
  
  seriesNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  seriesNameText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.2,
  },
  
  seriesInfoIcon: {
    marginLeft: 6,
    alignSelf: 'center',
  },
  
  seasonEpisodeLabel: {
    color: '#FFD54A',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.2,
  },
  
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  
  descriptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.15,
  },
  
  moreButton: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 4,
  },
  
  moreButtonText: {
    color: '#FFD54A',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ============================================
  // PLAY ICON STYLES
  // ============================================
  
  centerPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 50,
  },
  
  centerPlayIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },

  // ============================================
  // OVERLAY LAYER STYLES (Sheets, Modals)
  // ============================================
  
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
  
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  // Comment sheet
  commentSheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '85%',
    maxHeight: '85%',
    width: '100%',
    zIndex: 10001,
  },
  
  commentSheet: {
    flex: 1,
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 21,
  },
  
  commentHandleBar: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  commentHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingRight: 4,
  },
  
  commentAvatar: {
    marginRight: 12,
  },
  
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD54A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  commentAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  
  commentAvatarText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  
  commentContent: {
    flex: 1,
  },
  
  commentBubble: {
    marginBottom: 4,
  },
  
  commentUsername: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  
  commentText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  
  commentTime: {
    color: '#999',
    fontSize: 12,
    marginRight: 12,
  },
  
  commentActionText: {
    color: '#999',
    fontSize: 12,
    marginRight: 12,
    fontWeight: '600',
  },
  
  commentLikesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  
  commentLikes: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  commentLikeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  
  commentEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  
  commentEmptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  
  commentEmptySubtext: {
    color: '#999',
    fontSize: 14,
  },
  
  commentInputSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingHorizontal: 0,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0E0E0E',
  },
  
  commentInputAvatar: {
    marginRight: 12,
    marginBottom: 4,
  },
  
  commentInputAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5C451',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  commentInputAvatarText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  
  commentInput: {
    flex: 1,
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  
  commentSendBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginLeft: 4,
    marginBottom: 4,
    alignSelf: 'flex-end',
    minHeight: 44,
  },
  
  commentSendBtnDisabled: {
    opacity: 0.5,
  },
  
  commentSendText: {
    color: '#FFD54A',
    fontSize: 14,
    fontWeight: '700',
  },
  
  commentSendTextDisabled: {
    color: '#666',
  },

  // Episode sheet
  episodeSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  episodeSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
    maxHeight: '40%',
    width: '100%',
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 16,
    zIndex: 10001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 21,
  },
  
  episodeSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
  },
  
  episodeSheetTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 12,
  },
  
  episodeSheetCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  episodeSheetDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  
  episodeInfoCard: {
    marginBottom: 20,
    alignItems: 'center',
  },
  
  episodeInfoText: {
    color: '#B0B0B0',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  
  episodeInfoTags: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  episodeInfoTag: {
    color: '#B0B0B0',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  
  episodeScrollView: {
    marginHorizontal: -20,
  },
  
  episodeScrollContainer: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  netflixEpisodePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    minHeight: 44,
    marginRight: 12,
  },
  
  netflixEpisodePillActive: {
    backgroundColor: '#F5C451',
    borderColor: '#F5C451',
  },
  
  netflixEpisodeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  
  netflixEpisodeTextActive: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
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

  // More sheet
  moreSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  moreSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
    maxHeight: '65%',
    width: '100%',
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    zIndex: 10001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 21,
  },
  
  moreSheetScroll: {
    flex: 1,
  },
  
  moreSheetScrollContent: {
    paddingBottom: 12,
  },
  
  moreHandleBar: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  
  moreSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 4,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  moreSheetTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  moreSheetCloseBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  moreSection: {
    marginBottom: 24,
  },
  
  moreSectionTitle: {
    color: '#B0B0B0',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  
  moreOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  
  moreOptionChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 10,
    marginBottom: 10,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  moreOptionChipActive: {
    backgroundColor: '#F5C451',
    borderColor: '#F5C451',
  },
  
  moreOptionChipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  
  moreOptionChipTextActive: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  
  moreDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
    marginBottom: 16,
  },
  
  moreActions: {
    marginBottom: 12,
  },
  
  moreActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  
  moreActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
});
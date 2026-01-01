import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


// Type for a single episode
type Episode = {
  _id?: string;
  episodeNumber?: number;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  isPublished?: boolean;
};


// Type for a range of episodes (for pagination)
type Range = { id: string; label: string; start: number; end: number };

// Default episode ranges for navigation
const DEFAULT_RANGES: Range[] = [
  { id: '1-18', label: '1 - 18', start: 1, end: 18 },
  { id: '19-41', label: '19 - 41', start: 19, end: 41 },
  { id: '41-62', label: '41 - 62', start: 41, end: 62 },
  { id: '62-83', label: '62 - 83', start: 62, end: 83 },
];


// Props for EpisodesSheet component
type Props = {
  visible: boolean;
  onClose: () => void;
  episodes?: Episode[]; // real episodes; optional
  loading?: boolean;
  activeRangeId?: string;
  ranges?: Range[];
  initialActiveRangeId?: string;
  onSelectEpisode?: (ep: Episode | number) => void;
  totalEpisodesFallback?: number; // used when no episodes provided for mock
};

/**
 * EpisodesSheet: Bottom sheet for selecting and viewing episodes in a series.
 */
const EpisodesSheet: React.FC<Props> = ({
  visible,
  onClose,
  episodes = [],
  loading = false,
  activeRangeId: activeRangeProp,
  ranges = DEFAULT_RANGES,
  initialActiveRangeId,
  onSelectEpisode,
  totalEpisodesFallback = 18,
}) => {
  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Local active range state (if caller doesn't control it)
  const activeRangeId = activeRangeProp ?? (initialActiveRangeId ?? ranges[0].id);

  // Animate open/close when visible toggles
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(sheetY, {
          toValue: SCREEN_HEIGHT * 0.2,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.45,
          duration: 260,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetY, {
          toValue: SCREEN_HEIGHT,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible, sheetY, backdropOpacity]);

  // Create a numeric array from active range when episodes not available
  const mockEpisodeNumbers = useMemo(() => {
    const r = ranges.find((x) => x.id === activeRangeId) || ranges[0];
    const arr = Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start + i);
    return arr;
  }, [activeRangeId, ranges]);

  // Helpers for closing and selecting episodes
  const handleBackdropPress = () => {
    onClose();
  };

  const handleEpisodePress = (ep: Episode | number) => {
    onSelectEpisode?.(ep);
    onClose();
  };

  // If not visible, still render with pointerEvents none on the container, but keep in tree to avoid unmount flicker
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop for closing the sheet */}
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity, backgroundColor: 'rgba(0,0,0,0.45)' },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Animated sheet with episode list */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.sheetContainer,
          {
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        <View style={styles.sheetHeaderRow}>
          <Text style={styles.sheetTitle}>Episodes</Text>

          {/* Close button inside sheet (top-right) */}
          <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn} accessibilityRole="button">
            <Text style={styles.sheetCloseText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.sheetContent}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Range chips for episode navigation */}
          <View style={styles.rangeRow}>
            {ranges.map((range) => {
              const active = range.id === activeRangeId;
              return (
                <View key={range.id} style={[styles.rangeChip, active && styles.rangeChipActive]}>
                  <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>
                    {range.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Episodes grid */}
          <View style={styles.episodesGridWrap}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#FFD54A" />
                <Text style={styles.loadingText}>Loading episodes...</Text>
              </View>
            ) : episodes && episodes.length > 0 ? (
              episodes
                .slice()
                .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0))
                .map((ep) => {
                  const epNum = ep.episodeNumber || 0;
                  const unlocked = ep.isPublished !== false;
                  return (
                    <TouchableOpacity
                      key={ep._id ?? epNum}
                      style={[styles.epChip, !unlocked && styles.epChipLocked]}
                      disabled={!unlocked}
                      onPress={() => handleEpisodePress(ep)}
                    >
                      <Text style={[styles.epText, !unlocked && styles.epTextLocked]}>{epNum}</Text>
                    </TouchableOpacity>
                  );
                })
            ) : (
              // mock numbers for placeholder
              mockEpisodeNumbers.map((n) => (
                <TouchableOpacity key={n} style={styles.epChip} onPress={() => handleEpisodePress(n)}>
                  <Text style={styles.epText}>{n}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default EpisodesSheet;

/* ------------------------
   Local styles (sheet)
   ------------------------ */
const EPISODES_PER_ROW = 6;
const EPISODE_CHIP_SIZE = Math.floor((SCREEN_WIDTH - 40 - (EPISODES_PER_ROW - 1) * 10) / EPISODES_PER_ROW);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.8,
    backgroundColor: '#120606',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 14,
    // ensure sheet is above nav and other UI
    zIndex: 999,
    elevation: Platform.select({ android: 30, ios: 999 }),
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  sheetCloseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  sheetCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sheetContent: {
    flex: 1,
  },

  rangeRow: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 12,
  },
  rangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1b1419',
    borderWidth: 1,
    borderColor: '#2c222a',
    marginRight: 10,
  },
  rangeChipActive: {
    backgroundColor: '#FFD54A',
    borderColor: '#FFD54A',
  },
  rangeChipText: {
    color: '#f5f5f5',
    fontWeight: '700',
    fontSize: 14,
  },
  rangeChipTextActive: {
    color: '#000',
  },

  episodesGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  epChip: {
    width: EPISODE_CHIP_SIZE,
    height: EPISODE_CHIP_SIZE,
    borderRadius: 14,
    backgroundColor: '#252027',
    marginRight: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  epChipLocked: {
    backgroundColor: '#18141a',
  },
  epText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  epTextLocked: {
    color: '#6c6c73',
  },

  loadingWrap: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
});

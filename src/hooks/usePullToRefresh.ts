import { useCallback, useRef, useState } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

type RefreshFn = () => Promise<void> | void;

type Options = {
  threshold?: number;
  completionDelayMs?: number;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reusable pull-to-refresh controller with haptic feedback and
 * pull-distance tracking for custom indicators.
 */
export function usePullToRefresh(refreshFn?: RefreshFn, options: Options = {}) {
  const threshold = options.threshold ?? 90;
  const completionDelayMs = options.completionDelayMs ?? 700;
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const thresholdHitRef = useRef(false);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const distance = Math.max(0, -event.nativeEvent.contentOffset.y);
      setPullDistance(distance);

      const hitThreshold = distance >= threshold;
      if (hitThreshold && !thresholdHitRef.current) {
        thresholdHitRef.current = true;
        // Light haptic when the threshold is crossed (mobile only)
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      } else if (!hitThreshold) {
        thresholdHitRef.current = false;
      }
    },
    [threshold],
  );

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (refreshFn) {
        await refreshFn();
      }
      await delay(completionDelayMs);
    } finally {
      setRefreshing(false);
      setPullDistance(0);
      thresholdHitRef.current = false;
    }
  }, [completionDelayMs, refreshFn, refreshing]);

  return {
    refreshing,
    onRefresh,
    handleScroll,
    pullDistance,
    threshold,
  };
}



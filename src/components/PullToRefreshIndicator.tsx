import React, { useMemo } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  pullDistance: number;
  threshold: number;
  refreshing: boolean;
  color?: string;
  topOffset?: number;
};

/**
 * Lightweight visual indicator for pull-to-refresh.
 * Shows an arrow that rotates and scales with pull distance, and a spinner while refreshing.
 */
const PullToRefreshIndicator: React.FC<Props> = ({
  pullDistance,
  threshold,
  refreshing,
  color = '#FFD54A',
  topOffset = 6,
}) => {
  const progress = Math.min(1, pullDistance / threshold);

  const animatedStyle = useMemo(
    () => ({
      opacity: refreshing ? 1 : progress * 0.9,
      transform: [
        { translateY: Math.min(pullDistance / 3, 24) },
        { scale: refreshing ? 1 : 0.8 + progress * 0.3 },
        { rotate: `${progress * 180}deg` },
      ],
    }),
    [progress, pullDistance, refreshing],
  );

  return (
    <View pointerEvents="none" style={[styles.container, { top: topOffset }]}>
      <Animated.View style={[styles.bubble, animatedStyle]}>
        {refreshing ? (
          <ActivityIndicator color={color} />
        ) : (
          <Ionicons
            name={progress >= 1 ? 'arrow-down-circle' : 'chevron-down-outline'}
            size={22}
            color={color}
          />
        )}
      </Animated.View>
    </View>
  );
};

export default PullToRefreshIndicator;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});



// FILE: src/components/CustomTabBar.tsx
import React, { useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

type TabAnim = {
  scale: Animated.Value;
  rotate: Animated.Value;
  translateY: Animated.Value;
  colorState: Animated.Value;
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const anims = useMemo<TabAnim[]>(
    () =>
      state.routes.map(() => ({
        scale: new Animated.Value(1),
        rotate: new Animated.Value(0),
        translateY: new Animated.Value(0),
        colorState: new Animated.Value(0),
      })),
    [state.routes.length]
  );

  const doHaptic = useCallback(() => {
    try {
      Haptics.selectionAsync();
    } catch {}
  }, []);

  const handlePress = useCallback(
    (index: number) => (e?: GestureResponderEvent) => {
      const isFocused = state.index === index;
      const route = state.routes[index];

      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (event.defaultPrevented) return;

      doHaptic();

      anims.forEach((a, i) => {
        Animated.timing(a.colorState, {
          toValue: i === index ? 1 : 0,
          duration: 230,
          useNativeDriver: false,
        }).start();
      });

      Animated.sequence([
        Animated.timing(anims[index].scale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
        Animated.timing(anims[index].scale, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();

      switch (route.name) {
        case 'Reels':
          Animated.sequence([
            Animated.timing(anims[index].rotate, { toValue: 1, duration: 480, useNativeDriver: true }),
            Animated.timing(anims[index].rotate, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]).start();
          break;

        case 'Profile':
          Animated.sequence([
            Animated.timing(anims[index].translateY, { toValue: -12, duration: 150, useNativeDriver: true }),
            Animated.timing(anims[index].translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start();
          break;

        case 'Rewards':
          Animated.sequence([
            Animated.timing(anims[index].rotate, { toValue: -0.15, duration: 100, useNativeDriver: true }),
            Animated.timing(anims[index].rotate, { toValue: 0.15, duration: 200, useNativeDriver: true }),
            Animated.timing(anims[index].rotate, { toValue: 0, duration: 100, useNativeDriver: true }),
          ]).start();
          break;

        case 'Home':
          Animated.sequence([
            Animated.timing(anims[index].rotate, { toValue: -0.08, duration: 80, useNativeDriver: true }),
            Animated.timing(anims[index].rotate, { toValue: 0.08, duration: 130, useNativeDriver: true }),
            Animated.timing(anims[index].rotate, { toValue: 0, duration: 120, useNativeDriver: true }),
          ]).start();
          break;
      }

      if (!isFocused) navigation.navigate(route.name);
    },
    [navigation, anims, state.index, state.routes, doHaptic]
  );

  const iconFor = (routeName: string, isActive: boolean) => {
    switch (routeName) {
      case 'Home':
        return isActive ? 'home' : 'home-outline';
      case 'Reels':
        return 'play-circle';
      case 'Rewards':
        return isActive ? 'wallet' : 'wallet-outline';
      case 'Profile':
        return isActive ? 'person' : 'person-outline';
      default:
        return 'ellipse';
    }
  };

  const tabBarHeight = Platform.OS === 'ios' ? 78 : 64;

  return (
    <View style={[styles.wrapper, { height: tabBarHeight }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const anim = anims[index];

          const rotate = anim.rotate.interpolate({
            inputRange: [-1, -0.15, 0, 0.15, 1],
            outputRange: ['-25deg', '-8deg', '0deg', '8deg', '360deg'],
          });

          const scale = anim.scale;
          const translateY = anim.translateY;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={handlePress(index)}
              style={styles.tabItem}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Animated.View
                style={[
                  styles.iconWrapper,
                  { transform: [{ translateY }, { scale }, { rotate }] },
                ]}
              >
                <Ionicons
                  name={iconFor(route.name, isFocused)}
                  size={28}
                  color={isFocused ? '#FFD54A' : '#FFFFFF'}
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 20,
    borderRadius: 18,
    ...Platform.select({
      android: { elevation: 6 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

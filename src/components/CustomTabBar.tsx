// FILE: src/components/CustomTabBar.tsx
import React, { useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  GestureResponderEvent,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabAnim = {
  scale: Animated.Value;
  rotate: Animated.Value;
  translateY: Animated.Value;
  colorState: Animated.Value;
  backgroundScale: Animated.Value;
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {

  const insets = useSafeAreaInsets();

  // 🔴 IMPORTANT: hide tab bar completely on Reels
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key]?.options;

  if (
    focusedRoute.name === 'Reels' ||
    focusedOptions?.tabBarStyle?.display === 'none'
  ) {
    return null;
  }

  const anims = useMemo<TabAnim[]>(
    () =>
      state.routes.map(() => ({
        scale: new Animated.Value(1),
        rotate: new Animated.Value(0),
        translateY: new Animated.Value(0),
        colorState: new Animated.Value(0),
        backgroundScale: new Animated.Value(0),
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
        Animated.parallel([
          Animated.timing(a.colorState, {
            toValue: i === index ? 1 : 0,
            duration: 230,
            useNativeDriver: false,
          }),
          Animated.spring(a.backgroundScale, {
            toValue: i === index ? 1 : 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      });

      Animated.sequence([
        Animated.timing(anims[index].scale, {
          toValue: 0.9,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(anims[index].scale, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();

      switch (route.name) {
        case 'Reels':
          Animated.sequence([
            Animated.timing(anims[index].rotate, {
              toValue: 1,
              duration: 480,
              useNativeDriver: true,
            }),
            Animated.timing(anims[index].rotate, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]).start();
          break;

        case 'Profile':
          Animated.sequence([
            Animated.timing(anims[index].translateY, {
              toValue: -12,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(anims[index].translateY, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
          break;

        case 'Rewards':
          Animated.sequence([
            Animated.timing(anims[index].rotate, {
              toValue: -0.15,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(anims[index].rotate, {
              toValue: 0.15,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(anims[index].rotate, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]).start();
          break;

        case 'Home':
          Animated.sequence([
            Animated.timing(anims[index].rotate, {
              toValue: -0.08,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.timing(anims[index].rotate, {
              toValue: 0.08,
              duration: 130,
              useNativeDriver: true,
            }),
            Animated.timing(anims[index].rotate, {
              toValue: 0,
              duration: 120,
              useNativeDriver: true,
            }),
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
        return isActive ? 'play-circle' : 'play-circle-outline';
      case 'Rewards':
        return isActive ? 'wallet' : 'wallet-outline';
      case 'Profile':
        return isActive ? 'person' : 'person-outline';
      default:
        return 'ellipse';
    }
  };

  const labelFor = (routeName: string) => {
    switch (routeName) {
      case 'Home':
        return 'Home';
      case 'Reels':
        return 'Reels';
      case 'Rewards':
        return 'Coins';
      case 'Profile':
        return 'Profile';
      default:
        return '';
    }
  };

  const tabBarHeight = 64; // Consistent height across all platforms
  const bottomInset = Math.max(insets.bottom, 0); // Ensure non-negative

  return (
    <View 
      style={[
        styles.wrapper, 
        { 
          paddingBottom: bottomInset,
        }
      ]}
    >
      <View style={[styles.tabBar, { height: tabBarHeight }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const anim = anims[index];

          const rotate = anim.rotate.interpolate({
            inputRange: [-1, -0.15, 0, 0.15, 1],
            outputRange: ['-25deg', '-8deg', '0deg', '8deg', '360deg'],
          });

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={handlePress(index)}
              style={styles.tabItem}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.iconWrapper,
                  {
                    transform: [
                      { translateY: anim.translateY },
                      { scale: anim.scale },
                      { rotate },
                    ],
                  },
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
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: '#050509',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      android: { 
        elevation: 10,
      },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -3 },
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    ...Platform.select({
      android: { 
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

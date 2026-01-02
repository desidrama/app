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
import { useTheme } from '../context/ThemeContext';

type TabAnim = {
  scale: Animated.Value;
  rotate: Animated.Value;
  translateY: Animated.Value;
  colorState: Animated.Value;
  backgroundScale: Animated.Value;
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {

  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();

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
      case 'Search':
        return isActive ? 'search' : 'search-outline'; // Magnifying glass
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
          backgroundColor: colors.surface,
          borderTopColor: theme === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)',
        }
      ]}
    >
      <View style={[
        styles.tabBar,
        {
          height: tabBarHeight,
          backgroundColor: colors.background,
        }
      ]}> 
        {/* Custom order: Home, Search, Reels (center), Rewards, Profile */}
        {[0, 1, 2, 3, 4].map((customIndex) => {
          // Map custom order: 0=Home, 1=Search, 2=Reels, 3=Rewards, 4=Profile
          const route = state.routes[customIndex];
          if (!route) return null;
          const isFocused = state.index === customIndex;
          const anim = anims[customIndex];
          const rotate = anim.rotate.interpolate({
            inputRange: [-1, -0.15, 0, 0.15, 1],
            outputRange: ['-25deg', '-8deg', '0deg', '8deg', '360deg'],
          });

          // Highlight and bulge the Reels icon (improved, no gold shadow/border)
          const isReels = route.name === 'Reels';
          const iconSize = isReels ? 38 : 28;
          const iconColor = isFocused ? colors.yellow : colors.textPrimary;
          const iconWrapperStyle = [
            styles.iconWrapper,
            isReels && {
              backgroundColor: colors.background,
              borderWidth: 0,
              borderColor: 'transparent',
              shadowColor: 'transparent',
              shadowOpacity: 0,
              shadowRadius: 0,
              shadowOffset: { width: 0, height: 0 },
              elevation: 0,
              transform: [
                { scale: anim.scale },
                { translateY: isFocused ? -12 : 0 },
                { rotate },
              ],
            },
            !isReels && {
              transform: [
                { translateY: anim.translateY },
                { scale: anim.scale },
                { rotate },
              ],
            },
          ];

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={handlePress(customIndex)}
              style={[styles.tabItem, isReels && styles.reelTabItem]}
              activeOpacity={0.8}
            >
              <Animated.View style={iconWrapperStyle}>
                <Ionicons
                  name={iconFor(route.name, isFocused)}
                  size={iconSize}
                  color={iconColor}
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
  reelTabItem: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    borderTopWidth: 1,
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
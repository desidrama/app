// ============================================
// FILE: src/components/CustomTabBar.tsx
// ============================================
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [reelsPlaying, setReelsPlaying] = useState(false);

  // Scale animations for each icon
  const scaleAnims = React.useRef(
    state.routes.map(() => new Animated.Value(1))
  ).current;

  // Rotation animation (for Reels)
  const rotateAnims = React.useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  // Tilt animation (for Home)
  const tiltAnims = React.useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  // Swing animation (for Rewards/Coins)
  const swingAnims = React.useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  // Bounce animation (for Profile)
  const bounceAnims = React.useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  // Color animation - keep yellow until another tab clicked
  const clickAnimations = React.useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  const handlePress = (route: any, index: number, isFocused: boolean) => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Update last clicked index
    setLastClickedIndex(index);

    // If clicking on a different tab, reset Reels icon to play
    if (lastClickedIndex !== null && lastClickedIndex !== index && route.name !== 'Reels') {
      setReelsPlaying(false);
    }

    // Reset previous click animation
    if (lastClickedIndex !== null && lastClickedIndex !== index) {
      Animated.timing(clickAnimations[lastClickedIndex], {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }

    // Color transition - keep yellow until another tab clicked
    Animated.timing(clickAnimations[index], {
      toValue: 1,
      duration: 250,
      useNativeDriver: false,
    }).start();

    // Professional icon-specific animations
    switch (route.name) {
      case 'Reels':
        // Smooth 360° rotation
        Animated.timing(rotateAnims[index], {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          rotateAnims[index].setValue(0);
          setReelsPlaying(!reelsPlaying);
        });
        break;

      case 'Home':
        // Subtle tilt/wiggle animation
        Animated.sequence([
          Animated.timing(tiltAnims[index], {
            toValue: -8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(tiltAnims[index], {
            toValue: 8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(tiltAnims[index], {
            toValue: -6,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(tiltAnims[index], {
            toValue: 6,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(tiltAnims[index], {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
        break;

      case 'Rewards':
        // Smooth swing animation (left-right)
        Animated.sequence([
          Animated.timing(swingAnims[index], {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(swingAnims[index], {
            toValue: -1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(swingAnims[index], {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
        break;

      case 'Profile':
        // Vertical bounce animation
        Animated.sequence([
          Animated.timing(bounceAnims[index], {
            toValue: -12,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnims[index], {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnims[index], {
            toValue: -6,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnims[index], {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
        break;

      default:
        break;
    }

    if (!isFocused) {
      navigation.navigate(route.name);
    }
  };

  const getIconName = (
    routeName: string,
    isFocused: boolean,
    isReelsPlaying?: boolean
  ): keyof typeof Ionicons.glyphMap => {
    switch (routeName) {
      case 'Home':
        return isFocused ? 'home' : 'home-outline';
      case 'Reels':
        return isReelsPlaying ? 'pause-circle' : 'play-circle';
      case 'Rewards':
        return isFocused ? 'wallet' : 'wallet-outline';
      case 'Profile':
        return isFocused ? 'person' : 'person-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getLabel = (routeName: string): string => {
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
        return routeName;
    }
  };

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isReelsTab = route.name === 'Reels';
          const isClicked = lastClickedIndex === index;

          const iconName = getIconName(route.name, isFocused, reelsPlaying);
          const label = getLabel(route.name);

          // Rotation for Reels icon
          const rotation = rotateAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
          });

          // Tilt for Home icon
          const tilt = tiltAnims[index].interpolate({
            inputRange: [-8, 8],
            outputRange: ['-8deg', '8deg'],
          });

          // Swing for Rewards icon
          const swing = swingAnims[index].interpolate({
            inputRange: [-1, 1],
            outputRange: ['-15deg', '15deg'],
          });

          // Border color - yellow outline when clicked
          const borderColor = clickAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(255, 215, 0, 0)', 'rgba(255, 215, 0, 1)'],
          });

          // Icon color - white always
          const iconColor = '#FFFFFF';

          // Label color - yellow when clicked
          const labelColor = clickAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['#888888', '#FFD700'],
          });

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={() => handlePress(route, index, isFocused)}
              style={styles.tabItem}
            >
              <Animated.View
                style={[
                  styles.tabContent,
                  {
                    transform: [
                      // Reels: rotation
                      isReelsTab && isClicked ? { rotate: rotation } : { rotate: '0deg' },
                      // Home: tilt
                      route.name === 'Home' && isClicked ? { rotate: tilt } : { rotate: '0deg' },
                      // Rewards: swing
                      route.name === 'Rewards' && isClicked ? { rotate: swing } : { rotate: '0deg' },
                      // Profile: vertical bounce
                      route.name === 'Profile' && isClicked
                        ? { translateY: bounceAnims[index] }
                        : { translateY: 0 },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.iconContainer,
                    {
                      borderColor: borderColor,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Animated.Text style={{ color: iconColor }}>
                    <Ionicons
                      name={iconName}
                      size={isReelsTab ? 26 : 24}
                      color={isClicked ? '#FFD700' : '#FFFFFF'}
                    />
                  </Animated.Text>
                </Animated.View>
                <Animated.Text
                  style={[
                    styles.label,
                    {
                      color: labelColor,
                    },
                  ]}
                >
                  {label}
                </Animated.Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    height: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    padding: 10,
    width: 50,
    height: 50,
  },
  label: {
    fontSize: 11,
    color: '#888888',
    marginTop: 6,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});

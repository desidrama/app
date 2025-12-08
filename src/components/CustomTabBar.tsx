// ============================================
// FILE: src/components/CustomTabBar.tsx
// ============================================
import React from 'react';
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
  const scaleAnims = React.useRef(
    state.routes.map(() => new Animated.Value(1))
  ).current;

  const handlePress = (route: any, index: number, isFocused: boolean) => {
    // Light haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Subtle scale animation
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (!isFocused) {
      navigation.navigate(route.name);
    }
  };

  const getIconName = (
    routeName: string,
    isFocused: boolean
  ): keyof typeof Ionicons.glyphMap => {
    switch (routeName) {
      case 'Home':
        return isFocused ? 'home' : 'home-outline';
      case 'Reels':
        return 'play-circle';
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

          const iconName = getIconName(route.name, isFocused);
          const label = getLabel(route.name);

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
                  { transform: [{ scale: scaleAnims[index] }] },
                  isReelsTab && isFocused && styles.reelsGlow,
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={isReelsTab ? 28 : 22}
                  color={isReelsTab && isFocused ? '#FFD700' : '#FFFFFF'}
                  style={isReelsTab && isFocused ? styles.reelsIcon : {}}
                />
                <Text style={[styles.label, isReelsTab && isFocused && styles.reelsLabel]}>
                  {label}
                </Text>
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
  label: {
    fontSize: 10,
    color: '#888888',
    marginTop: 4,
    fontWeight: '400',
  },
  reelsGlow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  reelsIcon: {
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  reelsLabel: {
    color: '#FFD700',
    fontWeight: '600',
  },
});

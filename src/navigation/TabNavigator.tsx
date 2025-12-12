// src/navigation/TabNavigator.tsx
// Clean + Stable + Production Ready (static imports, safe fallback)

import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Static imports — Metro can analyze these properly.
import HomeScreen from '../screens/home/HomeScreen';
import ReelsFeedScreen from '../screens/home/ReelsFeedScreen';
import RewardsScreen from '../screens/rewards/RewardsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Custom bottom bar
import CustomTabBar from '../components/CustomTabBar';

export type TabParamList = {
  Home: undefined;

  Reels: {
    targetVideoId?: string;
    resumeTime?: number;
    progress?: number;
  } | undefined;

 
  Rewards: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Fallback screen (unchanged)
const makeSafe = (Comp: any, name: string) => {
  if (Comp && (typeof Comp === 'function' || typeof Comp === 'object')) return Comp;

  const Missing: React.FC = () => (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#000',
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#fff',
          marginBottom: 8,
        }}
      >
        Screen unavailable
      </Text>
      <Text style={{ color: '#ddd', textAlign: 'center' }}>
        The screen "{name}" failed to load. Check its file for syntax errors or missing default export.
      </Text>
    </View>
  );

  (Missing as any).displayName = `MissingScreen(${name})`;
  return Missing;
};

const TabNavigator: React.FC = () => {
  const SafeHome = useMemo(() => makeSafe(HomeScreen, 'HomeScreen'), []);
  const SafeReels = useMemo(() => makeSafe(ReelsFeedScreen, 'ReelsFeedScreen'), []);
  const SafeRewards = useMemo(() => makeSafe(RewardsScreen, 'RewardsScreen'), []);
  const SafeProfile = useMemo(() => makeSafe(ProfileScreen, 'ProfileScreen'), []);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      <Tab.Screen name="Home" component={SafeHome} />

      {/* 🔥 IMPORTANT CHANGE — HIDE TAB BAR ON REELS */}
      <Tab.Screen
        name="Reels"
        component={SafeReels}
        options={{
          tabBarStyle: { display: 'none' }, // 👈 removes bottom bar on reels
        }}
      />

      <Tab.Screen name="Rewards" component={SafeRewards} />
      <Tab.Screen name="Profile" component={SafeProfile} />
    </Tab.Navigator>
  );
};

export default TabNavigator;

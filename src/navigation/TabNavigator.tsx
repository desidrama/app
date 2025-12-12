// ============================================
// FILE: src/navigation/TabNavigator.tsx
// ============================================
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import ReelsFeedScreen from '../screens/home/ReelsFeedScreen';
import RewardsScreen from '../screens/rewards/RewardsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Custom bottom bar
import CustomTabBar from '../components/CustomTabBar';

// ---- Types ----
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

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // keeps performance nice when switching tabs
        lazy: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Reels" component={ReelsFeedScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;

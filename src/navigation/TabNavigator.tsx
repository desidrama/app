// ============================================
// FILE: src/navigation/TabNavigator.tsx
// ============================================
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import screens
import HomeScreen from '../screens/home/HomeScreen';
import ReelsFeedScreen from '../screens/home/ReelsFeedScreen';
import RewardsScreen from '../screens/rewards/RewardsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';

// Import custom tab bar
import CustomTabBar from '../components/CustomTabBar';

// TypeScript types
type TabParamList = {
  Home: undefined;
  Reels: undefined;
  Rewards: undefined;
  ProfileStack: undefined;
};

type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{
          animationEnabled: true,
        }}
      />
    </ProfileStack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Reels" component={ReelsFeedScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="ProfileStack" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}


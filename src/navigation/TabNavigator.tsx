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
import EditProfileScreen from '../screens/profile/EditProfileScreen';

// Custom bottom bar
import CustomTabBar from '../components/CustomTabBar';

// ---- Types ----
export type TabParamList = {
  Home: undefined;
  Reels: undefined;
  Rewards: undefined;
  Profile: undefined;
};

type ProfileParamList = {
  Profile: undefined;
  EditProfile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Profile = createNativeStackNavigator<ProfileParamList>();

function ProfileNavigator() {
  return (
    <Profile.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Profile.Screen name="Profile" component={ProfileScreen} />
      <Profile.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{
          gestureEnabled: true,
        }}
      />
    </Profile.Navigator>
  );
}

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
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
};

export default TabNavigator;

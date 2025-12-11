// ============================================
// FILE: src/navigation/AppNavigator.tsx
// ============================================
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';

import { RootState } from '../redux/store';

import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import TabNavigator from './TabNavigator';
import SplashScreen from '../screens/Splash/splashscreen';
import * as storage from '../utils/storage';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OTPScreen: { phoneNumber: string } | undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [hasCheckedToken, setHasCheckedToken] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // if you keep token in async-storage
        const token = await storage.getToken();
        // OPTIONAL: dispatch redux action here to set isAuthenticated true/false
        // depending on token
      } finally {
        setHasCheckedToken(true);
      }
    };

    checkAuth();
  }, []);

  // until we know auth state, just show splash full-screen
  if (!hasCheckedToken) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            {/* Animated posters splash – this will navigate to Login by itself
                after the animation using navigation.replace('Login') */}
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTPScreen" component={OTPScreen} />
          </>
        ) : null}

        {/* Main tab navigator (Home / Reels / Coins / Profile) */}
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

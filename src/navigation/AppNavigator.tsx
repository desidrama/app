// ============================================
// FILE: src/navigation/AppNavigator.tsx
// ============================================
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '../redux/store';
import { setAuthChecked, restoreAuth, logout } from '../redux/slices/authSlice';

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
  const dispatch = useDispatch();
  const { isAuthenticated, authChecked } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token exists in AsyncStorage
        const token = await storage.getToken();
        
        if (token) {
          // Token found - restore authentication state
          const refreshToken = await storage.getRefreshToken();
          const userData = await storage.getUser();
          
          // Dispatch action to restore auth in Redux
          dispatch(
            restoreAuth({
              token,
              refreshToken: refreshToken || undefined,
              user: userData ? JSON.parse(userData) : undefined,
            })
          );
        } else {
          // No token found - user needs to login
          dispatch(logout());
        }
      } catch (error) {
        console.error('Auth check error:', error);
        dispatch(logout());
      } finally {
        // Mark that we've checked authentication
        dispatch(setAuthChecked(true));
      }
    };

    checkAuth();
  }, [dispatch]);

  // Until we know auth state, show splash full-screen
  if (!authChecked) {
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
            {/* Auth screens - shown only if not authenticated */}
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

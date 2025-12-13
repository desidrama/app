// ============================================
// FILE: src/navigation/AppNavigator.tsx
// ============================================
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { CommonActions } from '@react-navigation/native';

import { RootState } from '../redux/store';
import { setAuthChecked, restoreAuth, logout } from '../redux/slices/authSlice';

import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import TabNavigator from './TabNavigator';
import SplashScreen from '../screens/Splash/splashscreen';
import SearchScreen from '../screens/home/SearchScreen';
import * as storage from '../utils/storage';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OTPScreen: { phoneNumber: string } | undefined;
  Main: undefined;
  Search: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, authChecked } = useSelector((state: RootState) => state.auth);
  const navigationRef = useRef<any>(null);

  // Check/restore auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await storage.getToken();

        if (token) {
          const refreshToken = await storage.getRefreshToken();
          const userData = await storage.getUser();

          dispatch(
            restoreAuth({
              token,
              refreshToken: refreshToken || undefined,
              user: userData ? JSON.parse(userData) : undefined,
            })
          );
        } else {
          // Ensure redux knows user is not authenticated
          dispatch(logout());
        }
      } catch (error) {
        console.error('Auth check error:', error);
        dispatch(logout());
      } finally {
        dispatch(setAuthChecked(true));
      }
    };

    checkAuth();
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Reset navigation when auth status becomes known or changes.
  // If authChecked is false we show the splash screen only, so no resets needed.
  useEffect(() => {
    if (!authChecked) return;

    // Wait until navigation is ready before dispatching resets
    const tryReset = () => {
      if (!navigationRef.current || !navigationRef.current.isReady?.()) return;

      try {
        if (isAuthenticated) {
          // Ensure stack is reset to Main (so user can't go back to Login)
          navigationRef.current.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            })
          );
        } else {
          // Not authenticated -> reset to Login stack
          navigationRef.current.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
        }
      } catch (err) {
        // If reset fails for any reason, don't crash — component rendering will still show the right screens.
        // The conditional rendering below ensures the correct screens are mounted.
        // eslint-disable-next-line no-console
        console.warn('Navigation reset failed', err);
      }
    };

    // If navigation not ready yet, retry on next tick
    if (navigationRef.current?.isReady?.()) {
      tryReset();
    } else {
      const id = setTimeout(tryReset, 250);
      return () => clearTimeout(id);
    }
  }, [isAuthenticated, authChecked]);

  // While we haven't checked auth yet, show Splash exclusively.
  if (!authChecked) {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // After authChecked: conditionally show stacks depending on isAuthenticated
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            {/* Only show auth screens when not authenticated */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTPScreen" component={OTPScreen} />
          </>
        ) : null}

        {/* Main tab navigator (Home / Reels / Coins / Profile) */}
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Search" component={SearchScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


// ============================================
// FILE: src/navigation/AppNavigator.tsx
// ============================================
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, CommonActions, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';

import { useTheme } from '../context/ThemeContext';
import { RootState } from '../redux/store';
import { setAuthChecked, restoreAuth, logout } from '../redux/slices/authSlice';

import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import SplashScreen from '../screens/Splash/splashscreen';
import SearchScreen from '../screens/home/SearchScreen';
import EpisodePlayerScreen from '../screens/home/EpisodePlayerScreen';
import ReelInfoScreen from '../screens/reels/ReelInfoScreen';

import TabNavigator from './TabNavigator';
import AddCoinsScreen from '../components/AddCoinsScreen';
import * as storage from '../utils/storage';


// --------------------------------------------
// TYPES
// --------------------------------------------
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OTPScreen: { phoneNumber: string } | undefined;
  Main: undefined;
  Search: undefined;
  AddCoins: undefined;
  EpisodePlayer: {
    targetVideoId?: string;
    resumeTime?: number;
    progress?: number;
  } | undefined;
  ReelInfo: {
    reelId: string;
    title: string;
    year?: string;
    rating?: string;
    duration?: string;
    thumbnailUrl?: string;
    description?: string;
    seasonId?: any;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();


// ============================================
// APP NAVIGATOR
// ============================================
export default function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, authChecked } = useSelector(
    (state: RootState) => state.auth
  );

  const { colors } = useTheme();

  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList> | null>(null);

  // --------------------------------------------
  // AUTH RESTORE (ON APP START)
  // --------------------------------------------
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
          dispatch(logout());
        }
      } catch (error) {
        console.error('Auth restore failed:', error);
        dispatch(logout());
      } finally {
        dispatch(setAuthChecked(true));
      }
    };

    checkAuth();
  }, [dispatch]);

  // --------------------------------------------
  // RESET NAVIGATION ON AUTH CHANGE
  // --------------------------------------------
  useEffect(() => {
    if (!authChecked || !navigationRef.current?.isReady()) return;

    const routeName = isAuthenticated ? 'Main' : 'Login';

    navigationRef.current.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: routeName }],
      })
    );
  }, [isAuthenticated, authChecked]);

  // --------------------------------------------
  // THEME
  // --------------------------------------------
  const navigationTheme = {
    dark: true,
    colors: {
      primary: colors.yellow,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.borderLight,
      notification: colors.error,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '900' },
    },
  };

  // --------------------------------------------
  // SPLASH (UNTIL AUTH CHECKED)
  // --------------------------------------------
  if (!authChecked) {
    return (
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // --------------------------------------------
  // MAIN NAVIGATION
  // --------------------------------------------
  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {!isAuthenticated && (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTPScreen" component={OTPScreen} />
          </>
        )}

        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="AddCoins" component={AddCoinsScreen} />
        <Stack.Screen 
          name="EpisodePlayer" 
          component={EpisodePlayerScreen}
          options={{
            animationEnabled: true,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen 
          name="ReelInfo" 
          component={ReelInfoScreen}
          options={{
            animationEnabled: true,
            presentation: 'card',
          }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
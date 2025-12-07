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

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getToken();
      // TODO: if needed, dispatch redux action to restore auth from token
    } finally {
      setIsLoading(false);
    }
  };

  // While loading, show splash inside navigation so hooks work
  if (isLoading) {
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
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={isAuthenticated ? 'Main' : 'Splash'}
      >
        {!isAuthenticated && (
          <>
            {/* Animated posters splash */}
            <Stack.Screen name="Splash" component={SplashScreen} />

            {/* Login & OTP flow */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTPScreen" component={OTPScreen} />
          </>
        )}

        {/* Main app (tabs) */}
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

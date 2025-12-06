// ============================================
// FILE: src/navigation/AppNavigator.tsx
// ============================================
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

import LoginScreen from '../screens/auth/LoginScreen';
import TabNavigator from './TabNavigator';
import SplashScreen from '../screens/Splash/splashscreen';
import * as storage from '../utils/storage'; // ensure this helper exists and returns token etc.

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    const token = await storage.getToken(); // adjust to your storage API
    // optionally dispatch to restore auth state here
    setIsLoading(false);
  };

  // While loading, render Splash INSIDE a NavigationContainer so useNavigation() is available
  if (isLoading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // After loading: regular app navigation
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

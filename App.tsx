// import "./global.css";
//import { SafeAreaProvider } from "react-native-safe-area-context";
//import { View, Text } from "react-native";

//export default function App() {
  //return (
    //<SafeAreaProvider>
      //<View className="flex-1 items-center justify-center bg-white p-safe">
        //<Text className="text-xl font-bold text-blue-500">
          //Welcome to Nativewind v5 🚀
        //</Text>
      //</View>
    //</SafeAreaProvider>
  //);
//}


 import "./global.css";
import React from 'react';
import { Provider } from 'react-redux';
import { StatusBar as RNStatusBar } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

function ThemeAwareStatusBar() {
  const { theme, colors } = useTheme();
  const rnBarStyle = theme === 'dark' ? 'light-content' : 'dark-content';
  const expoStyle = theme === 'dark' ? 'light' : 'dark';
  return (
    <>
      <RNStatusBar backgroundColor={colors.background} barStyle={rnBarStyle} />
      <ExpoStatusBar style={expoStyle} />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ThemeAwareStatusBar />
          <AppNavigator />
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>
  );
}
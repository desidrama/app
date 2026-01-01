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
 import { StatusBar } from 'expo-status-bar';
 import { SafeAreaProvider } from "react-native-safe-area-context";
 import { store } from './src/redux/store';
 import AppNavigator from './src/navigation/AppNavigator';
 import { ThemeProvider } from './src/context/ThemeContext';

 export default function App() {
   return (
     <Provider store={store}>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>
  );
 }
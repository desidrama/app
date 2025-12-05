import "./global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text } from "react-native";

export default function App() {
  return (
    <SafeAreaProvider>
      <View className="flex-1 items-center justify-center bg-white p-safe">
        <Text className="text-xl font-bold text-blue-500">
          Welcome to Nativewind v5 🚀
        </Text>
      </View>
    </SafeAreaProvider>
  );
}

import React, { useEffect, useState } from "react"; 
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native"; 
import mobileAds, { 
  RewardedAd, 
  RewardedAdEventType, 
  TestIds 
} from "react-native-google-mobile-ads"; 

export default function App() { 
  const [loaded, setLoaded] = useState(false); 
  const [rewarded, setRewarded] = useState(null);

  useEffect(() => { 
    // Initialize mobile ads
    mobileAds().initialize();

    // Create rewarded ad instance
    const rewardedAd = RewardedAd.createForAdRequest(TestIds.REWARDED);
    setRewarded(rewardedAd);

    // Load the ad
    rewardedAd.load();

    // Subscribe to ad events
    const unsubscribeLoaded = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED, 
      () => { 
        console.log("REWARDED LOADED"); 
        setLoaded(true); 
      } 
    ); 

    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD, 
      (reward) => { 
        console.log("REWARD:", reward); 
      } 
    ); 

    const unsubscribeClosed = rewardedAd.addAdEventListener(
      'closed',  // Try string literal instead of enum
      () => { 
        console.log("REWARDED CLOSED — RELOADING"); 
        setLoaded(false); 
        rewardedAd.load(); 
      } 
    ); 

    // Cleanup subscriptions
    return () => { 
      unsubscribeLoaded(); 
      unsubscribeEarned(); 
      unsubscribeClosed(); 
    }; 
  }, []); 

  const showAd = () => { 
    if (loaded && rewarded) {
      rewarded.show();
    }
  }; 

  return ( 
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}> 
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Rewarded VIDEO Test</Text> 

      <TouchableOpacity 
        onPress={showAd} 
        disabled={!loaded} 
        style={{ 
          backgroundColor: loaded ? "black" : "gray", 
          padding: 16, 
          borderRadius: 10 
        }} 
      > 
        <Text style={{ color: "white", fontSize: 18 }}> 
          {loaded ? "Show Video Ad" : "Loading..."} 
        </Text> 
      </TouchableOpacity> 
    </SafeAreaView> 
  ); 
}
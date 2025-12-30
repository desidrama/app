import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

// Safely import ads module - handle case when native module is not available
let mobileAds: any = null;
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let AdEventType: any = null;
let TestIds: any = null;
let adsAvailable = false;

try {
  const adsModule = require("react-native-google-mobile-ads");
  mobileAds = adsModule.default;
  RewardedAd = adsModule.RewardedAd;
  RewardedAdEventType = adsModule.RewardedAdEventType;
  AdEventType = adsModule.AdEventType;
  TestIds = adsModule.TestIds;
  adsAvailable = true;
} catch (error) {
  // Ads module not available - running in Expo Go or module not properly installed
  console.warn('Google Mobile Ads module not available:', error);
  adsAvailable = false;
}

type Props = {
  show: boolean;          // 👈 controls when ad shows
  onAdFinished: () => void;
};


export default function RewardedEpisodeAd({ show, onAdFinished }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [rewarded, setRewarded] = useState<any>(null);
  const hasShownRef = useRef(false);

  useEffect(() => {
    // If ads module is not available, skip initialization
    if (!adsAvailable || !mobileAds || !RewardedAd) {
      console.warn('Ads module not available, skipping ad initialization');
      return;
    }

    let isMounted = true;

    try {
      mobileAds().initialize();

      const rewardedAd = RewardedAd.createForAdRequest(TestIds.REWARDED);
      setRewarded(rewardedAd);

      rewardedAd.load();

      const unsubscribeLoaded = rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          if (isMounted) setLoaded(true);
        }
      );

      const unsubscribeClosed = rewardedAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          if (!isMounted) return;

          hasShownRef.current = false;
          setLoaded(false);
          rewardedAd.load();
          onAdFinished();
        }
      );

      return () => {
        isMounted = false;
        unsubscribeLoaded();
        unsubscribeClosed();
      };
    } catch (error) {
      console.error('Error initializing ads:', error);
      // Call onAdFinished immediately if ads fail to load (for development/testing)
      if (isMounted) {
        onAdFinished();
      }
    }
  }, [onAdFinished]);

  useEffect(() => {
    // If ads not available or not loaded, call onAdFinished immediately when show is true
    if (show && !adsAvailable) {
      console.warn('Ads not available, calling onAdFinished immediately');
      onAdFinished();
      return;
    }

    if (show && loaded && rewarded && !hasShownRef.current) {
      try {
        hasShownRef.current = true;
        rewarded.show();
      } catch (error) {
        console.error('Error showing ad:', error);
        onAdFinished();
      }
    }
  }, [show, loaded, rewarded, onAdFinished]);


  return <View />;
}

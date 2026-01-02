import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";

// Lazy-load Google Mobile Ads module (only available in dev builds, not Expo Go)
// Using function to delay module access until runtime to avoid native module errors
const getAdsModule = () => {
  try {
    return require("react-native-google-mobile-ads");
  } catch (error) {
    // Module not available - return null gracefully
    return null;
  }
};

type Props = {
  show: boolean;          // 👈 controls when ad shows
  onAdFinished: () => void;
};


export default function RewardedEpisodeAd({ show, onAdFinished }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [rewarded, setRewarded] = useState<any>(null);
  const hasShownRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeLoaded: (() => void) | null = null;
    let unsubscribeClosed: (() => void) | null = null;

    // Lazy-load module at runtime
    const adsModule = getAdsModule();
    if (!adsModule) {
      // Module not available - skip silently (Expo Go or module not installed)
      return;
    }

    const { default: mobileAds, RewardedAd, RewardedAdEventType, AdEventType, TestIds } = adsModule;

    try {
      mobileAds().initialize();
    } catch (error) {
      console.warn('Google Mobile Ads initialization failed:', error);
      return;
    }

    try {
      const rewardedAd = RewardedAd.createForAdRequest(TestIds.REWARDED);
      setRewarded(rewardedAd);
      rewardedAd.load();

      unsubscribeLoaded = rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          if (isMounted) setLoaded(true);
        }
      );

      unsubscribeClosed = rewardedAd.addAdEventListener(
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
        if (unsubscribeLoaded) unsubscribeLoaded();
        if (unsubscribeClosed) unsubscribeClosed();
      };
    } catch (error) {
      console.warn('RewardedAd creation failed:', error);
      return () => {
        isMounted = false;
      };
    }
  }, [onAdFinished]);

  useEffect(() => {
    if (show && loaded && rewarded && !hasShownRef.current) {
      hasShownRef.current = true;
      try {
        rewarded.show();
      } catch (error) {
        console.warn('RewardedAd show failed:', error);
        onAdFinished(); // Call callback even if ad fails to show
      }
    }
  }, [show, loaded, rewarded, onAdFinished]);


  return <View />;
}

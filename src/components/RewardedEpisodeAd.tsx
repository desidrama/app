import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

type Props = {
  show: boolean;          // 👈 controls when ad shows
  onAdFinished: () => void;
};


export default function RewardedEpisodeAd({ show, onAdFinished }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [rewarded, setRewarded] = useState<RewardedAd | null>(null);
  const hasShownRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

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
  }, []);

  useEffect(() => {
  if (show && loaded && rewarded && !hasShownRef.current) {
    hasShownRef.current = true;
    rewarded.show();
  }
}, [show, loaded]);


  return <View />;
}

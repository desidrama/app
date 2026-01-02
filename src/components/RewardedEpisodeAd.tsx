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
  const pendingShowRef = useRef(false);
  const initializedRef = useRef(false);
  const rewardedAdRef = useRef<any>(null); // Keep reference to ad with listeners
  const isLoadingRef = useRef(false); // Track if ad is currently loading to prevent duplicate loads

  useEffect(() => {
    console.log('[RewardedAd] 🔄 Initialization useEffect running...');
    
    let isMounted = true;
    let unsubscribeLoaded: (() => void) | null = null;
    let unsubscribeError: (() => void) | null = null;
    let unsubscribeClosed: (() => void) | null = null;

    // Lazy-load module at runtime
    const adsModule = getAdsModule();
    if (!adsModule) {
      console.warn('[RewardedAd] ⚠️ Ads module not available, skipping ad initialization');
      return;
    }

    const { default: mobileAds, RewardedAd, RewardedAdEventType, AdEventType, TestIds } = adsModule;
    console.log('[RewardedAd] adsAvailable: true, mobileAds:', !!mobileAds, 'RewardedAd:', !!RewardedAd);

    // Prevent re-initialization if already initialized
    if (initializedRef.current) {
      console.log('[RewardedAd] ✅ Ad already initialized, skipping...');
      return;
    }

    console.log('[RewardedAd] 🚀 Initializing ad...');

    const initAd = async () => {
      try {
        // Initialize mobile ads (might be async)
        const initResult = mobileAds().initialize();
        if (initResult && typeof initResult.then === 'function') {
          await initResult;
        }
        console.log('[RewardedAd] Mobile ads initialized');

        const rewardedAd = RewardedAd.createForAdRequest(TestIds.REWARDED);
        rewardedAdRef.current = rewardedAd; // Store reference
        console.log('[RewardedAd] ✅ Rewarded ad created');
        
        // IMPORTANT: Set up event listeners BEFORE calling load()
        console.log('[RewardedAd] Setting up event listeners...');
        
        unsubscribeLoaded = rewardedAd.addAdEventListener(
          RewardedAdEventType.LOADED,
          () => {
            if (isMounted) {
              console.log('[RewardedAd] ✅ Ad loaded successfully');
              setLoaded(true);
              isLoadingRef.current = false; // Ad is now loaded, not loading anymore
              // If we were waiting to show the ad, show it now (with a small delay to ensure native side is ready)
              if (pendingShowRef.current && !hasShownRef.current) {
                console.log('[RewardedAd] Showing pending ad...');
                // Small delay to ensure native SDK is fully ready
                setTimeout(() => {
                  if (!isMounted || hasShownRef.current) return;
                  
                  try {
                    hasShownRef.current = true;
                    pendingShowRef.current = false;
                    console.log('[RewardedAd] Calling show()...');
                    rewardedAd.show();
                  } catch (error: any) {
                    console.error('[RewardedAd] Error showing ad after load:', error);
                    hasShownRef.current = false;
                    setLoaded(false);
                    
                    // If error says ad not loaded, try reloading and wait
                    if (error?.message?.includes('not loaded')) {
                      console.log('[RewardedAd] Ad not ready, reloading...');
                      if (!isLoadingRef.current) {
                        try {
                          isLoadingRef.current = true;
                          rewardedAd.load();
                          // Reset pending so it will show when loaded
                          pendingShowRef.current = true;
                        } catch (e) {
                          console.error('[RewardedAd] Error reloading:', e);
                          isLoadingRef.current = false;
                          onAdFinished();
                        }
                      }
                    } else {
                      // Other errors - try to reload
                      if (!isLoadingRef.current) {
                        try {
                          isLoadingRef.current = true;
                          rewardedAd.load();
                        } catch (e) {
                          console.error('[RewardedAd] Error reloading:', e);
                          isLoadingRef.current = false;
                        }
                      }
                      onAdFinished();
                    }
                  }
                }, 200); // 200ms delay to ensure native side is ready
              }
            }
          }
        );

        unsubscribeError = rewardedAd.addAdEventListener(
          AdEventType.ERROR,
          (error: any) => {
            console.error('[RewardedAd] ❌ Ad error:', error);
            if (isMounted) {
              setLoaded(false);
              isLoadingRef.current = false; // Reset loading state on error
              
              // Don't auto-retry on error - let the user trigger it again by clicking the button
              // Auto-retries can cause internal errors with concurrent loads
              console.log('[RewardedAd] Ad error occurred - user can retry by clicking Watch Ad again');
            }
          }
        );

        // Also listen for when ad starts loading (if available)
        try {
          const unsubscribeLoadStart = rewardedAd.addAdEventListener?.(
            AdEventType.LOAD,
            () => {
              console.log('[RewardedAd] 📥 Ad load started...');
            }
          );
          if (unsubscribeLoadStart) {
            // Store it for cleanup if needed
          }
        } catch (e) {
          // LOAD event might not be available, that's okay
          console.log('[RewardedAd] LOAD event not available (this is okay)');
        }

        unsubscribeClosed = rewardedAd.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            if (!isMounted) return;

            console.log('[RewardedAd] Ad closed');
            hasShownRef.current = false;
            pendingShowRef.current = false;
            setLoaded(false);
            isLoadingRef.current = false; // Reset loading state
            // Reload the ad for next time (only if not already loading)
            if (!isLoadingRef.current) {
              try {
                isLoadingRef.current = true;
                rewardedAd.load();
              } catch (error) {
                console.error('[RewardedAd] Error reloading ad after close:', error);
                isLoadingRef.current = false;
              }
            }
            onAdFinished();
          }
        );

        console.log('[RewardedAd] ✅ All event listeners attached');
        
        // NOW set the ad in state and call load()
        setRewarded(rewardedAd);
        initializedRef.current = true;
        
        console.log('[RewardedAd] 🚀 Calling load()...');
        isLoadingRef.current = true;
        rewardedAd.load();
        console.log('[RewardedAd] ⏳ load() called, waiting for LOADED event...');

        // Return cleanup function
        return () => {
          isMounted = false;
          if (unsubscribeLoaded) unsubscribeLoaded();
          if (unsubscribeError) unsubscribeError();
          if (unsubscribeClosed) unsubscribeClosed();
        };
      } catch (error) {
        console.error('[RewardedAd] Error initializing ads:', error);
        initializedRef.current = false;
        // Call onAdFinished immediately if ads fail to load (for development/testing)
        if (isMounted) {
          onAdFinished();
        }
        return () => {
          isMounted = false;
        };
      }
    };

    let cleanupFn: (() => void) | undefined;
    initAd().then((fn) => {
      cleanupFn = fn;
    }).catch((error) => {
      console.error('[RewardedAd] Error in initAd:', error);
    });

    return () => {
      isMounted = false;
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [onAdFinished]); // Empty deps - only run once on mount

  useEffect(() => {
    // If ads module not available, call onAdFinished immediately when show is true
    if (show && !getAdsModule()) {
      console.warn('[RewardedAd] Ads not available, calling onAdFinished immediately');
      onAdFinished();
      return;
    }

    // Reset state when show becomes false (allows showing again next time)
    if (!show) {
      pendingShowRef.current = false;
      hasShownRef.current = false; // Reset to allow showing again
      return;
    }

    // If rewarded ad is not initialized yet, wait for it
    if (!rewarded) {
      console.log('[RewardedAd] Waiting for ad to initialize...');
      return;
    }

    // If show is true but ad isn't loaded yet, mark it as pending
    if (show && !loaded && !hasShownRef.current) {
      console.log('[RewardedAd] Ad not loaded yet, marking as pending...');
      console.log('[RewardedAd] Current state - loaded:', loaded, 'rewarded:', !!rewarded, 'rewardedAdRef:', !!rewardedAdRef.current, 'hasShown:', hasShownRef.current, 'isLoading:', isLoadingRef.current);
      pendingShowRef.current = true;
      // Use the ref (which has listeners) instead of state
      const adToLoad = rewardedAdRef.current || rewarded;
      if (adToLoad && !isLoadingRef.current) {
        try {
          console.log('[RewardedAd] Calling load() to load ad...');
          isLoadingRef.current = true;
          adToLoad.load();
          console.log('[RewardedAd] load() called successfully, waiting for LOADED event...');
        } catch (error) {
          console.error('[RewardedAd] Error loading ad:', error);
          isLoadingRef.current = false;
        }
      } else if (isLoadingRef.current) {
        console.log('[RewardedAd] Ad is already loading, waiting for LOADED event...');
      } else {
        console.warn('[RewardedAd] ⚠️ Rewarded ad object is null, cannot load');
        console.warn('[RewardedAd] This means initialization did not complete. Check if ads module is available.');
      }
      return;
    }

    // If show is true and ad is loaded, show it (only once)
    if (show && loaded && rewarded && !hasShownRef.current) {
      console.log('[RewardedAd] Attempting to show ad...');
      
      // Small delay to ensure native SDK is fully ready
      setTimeout(() => {
        if (!show || hasShownRef.current) return;
        
        try {
          hasShownRef.current = true;
          pendingShowRef.current = false;
          rewarded.show();
        } catch (error: any) {
          console.error('[RewardedAd] Error showing ad:', error);
          hasShownRef.current = false;
          setLoaded(false);
          
          // If error says ad not loaded, try reloading and wait
          if (error?.message?.includes('not loaded')) {
            console.log('[RewardedAd] Ad not ready, reloading and marking as pending...');
            if (!isLoadingRef.current) {
              try {
                isLoadingRef.current = true;
                rewarded.load();
                // Reset pending so it will show when loaded
                pendingShowRef.current = true;
              } catch (e) {
                console.error('[RewardedAd] Error reloading:', e);
                isLoadingRef.current = false;
                onAdFinished();
              }
            }
          } else {
            // Other errors - try to reload
            if (!isLoadingRef.current) {
              try {
                isLoadingRef.current = true;
                rewarded.load();
              } catch (e) {
                console.error('[RewardedAd] Error reloading:', e);
                isLoadingRef.current = false;
              }
            }
            onAdFinished();
          }
        }
      }, 200); // 200ms delay to ensure native side is ready
    }
  }, [show, loaded, rewarded, onAdFinished]);

  return <View />;
}
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../../redux/store';
import { setUser } from '../../redux/slices/userSlice';
import { getUserProfile, getCoinHistory, claimDailyCheckIn, rewardAdView } from '../../services/api';
import { getToken, setMissionStates, getMissionStates } from '../../utils/storage';
import { CoinTransaction } from '../../types';
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useTheme } from '../../context/ThemeContext';
import RewardedEpisodeAd from '../../components/RewardedEpisodeAd';

const TAB_BAR_SAFE_PADDING = 140;

const DAILY_REWARDS = [
  { day: 1, coins: 5 },
  { day: 2, coins: 5 },
  { day: 3, coins: 5 },
  { day: 4, coins: 5 },
  { day: 5, coins: 5 },
  { day: 6, coins: 5 },
  { day: 7, coins: 5 },
];

const MISSIONS = [
  {
    id: 'youtube_watch_v2',
    title: 'Watch on YouTube',
    coins: 10,
    cta: 'Watch',
    type: 'external',
    platform: 'youtube',
    oneTime: true,
    icon: 'youtube',
    color: '#FF0000',
    url: 'https://www.youtube.com/@digitalkalakaar',
    appUrl: 'youtube://@digitalkalakaar', // Correct YouTube app URL scheme
  },
  {
    id: 'instagram_visit',
    title: 'Visit Instagram',
    coins: 10,
    cta: 'Visit',
    type: 'external',
    platform: 'instagram',
    oneTime: true,
    icon: 'instagram',
    color: '#E4405F',
    url: 'https://www.instagram.com/digitalkalakaar/?hl=en',
    appUrl: 'instagram://user?username=digitalkalakaar',
  },
];

/* ================= UTILITY FUNCTIONS ================= */

/**
 * Get icon name based on transaction source and type
 */
const getSourceIcon = (source: string, type: string): any => {
  switch (source) {
    case 'daily_check_in':
      return 'calendar';
    case 'ad_view':
      return 'play-circle';
    case 'mission_youtube_watch':
    case 'youtube_watch':
      return 'logo-youtube';
    case 'mission_instagram_visit':
    case 'instagram_visit':
      return 'logo-instagram';
    case 'purchase':
      return 'card';
    case 'episode_unlock':
      return 'book';
    case 'admin_adjustment':
      return 'settings';
    default:
      return type === 'earned' ? 'add-circle' : 'remove-circle';
  }
};

/**
 * Get human-readable name for transaction source
 */
const getSourceName = (source: string): string => {
  switch (source) {
    case 'daily_check_in':
      return 'Daily Check-in';
    case 'ad_view':
      return 'Ad Reward';
    case 'mission_youtube_watch':
    case 'youtube_watch':
      return 'YouTube Mission';
    case 'mission_instagram_visit':
    case 'instagram_visit':
      return 'Instagram Mission';
    case 'purchase':
      return 'Coin Purchase';
    case 'episode_unlock':
      return 'Episode Unlock';
    case 'admin_adjustment':
      return 'Admin Adjustment';
    default:
      return 'Transaction';
  }
};

/**
 * Format date to readable string
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
};

/* ================= MAIN COMPONENT ================= */

const CoinsScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const { colors } = useTheme();

  const user = useSelector((s: RootState) => s.user.profile);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  const coins = user?.coinsBalance ?? user?.coins ?? 0;

  const [selectedDay, setSelectedDay] = useState(1);
  const [hasClaimedToday, setHasClaimedToday] = useState(false);
  const [currentDay, setCurrentDay] = useState<number | undefined>();
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<CoinTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [showAd, setShowAd] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);

  // Mission state tracking
  const [missionStates, setMissionStatesLocal] = useState<Record<string, { completed: boolean; startedAt?: number; rewarded?: boolean }>>({});
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [lastRewardedMission, setLastRewardedMission] = useState<{ id: string; coins: number; title: string } | null>(null);

  /* ---------------- LOAD MISSION STATES ---------------- */
  useEffect(() => {
    const loadMissionStates = async () => {
      try {
        const saved = await getMissionStates();
        if (saved) {
          setMissionStatesLocal(saved);
        }
      } catch (error) {
        console.error('Error loading mission states:', error);
      }
    };
    loadMissionStates();
  }, []);

  /* ---------------- USER ---------------- */
  const fetchUser = useCallback(async () => {
    const token = await getToken();
    if (!token || !isAuthenticated) return;

    try {
      setLoading(true);
      const res = await getUserProfile();
      if (res?.success && res.data) {
        dispatch(setUser(res.data));

        // Check if user has claimed today
        const lastCheckInDate = res.data.lastDailyCheckInDate
          ? new Date(res.data.lastDailyCheckInDate)
          : null;

        const today = new Date();
        const isSameDay = lastCheckInDate &&
          lastCheckInDate.getDate() === today.getDate() &&
          lastCheckInDate.getMonth() === today.getMonth() &&
          lastCheckInDate.getFullYear() === today.getFullYear();

        setHasClaimedToday(!!isSameDay);
        
        // The currentCheckInDay from backend is the day they JUST CLAIMED (if today)
        // Or the day they should claim next (if haven't claimed today)
        // We need to show the NEXT day if they've already claimed today
        let dayToShow = res.data.currentCheckInDay || 1;
        
        if (isSameDay) {
          // They've already claimed today, so show the NEXT day (for tomorrow)
          dayToShow = dayToShow >= 7 ? 1 : dayToShow + 1;
        }
        // If they haven't claimed today, dayToShow stays as currentCheckInDay
        
        setCurrentDay(dayToShow);
        setSelectedDay(dayToShow);

        console.log('Fetch User - Last Check-in:', lastCheckInDate?.toDateString());
        console.log('Fetch User - Today:', today.toDateString());
        console.log('Fetch User - Has claimed today:', isSameDay);
        console.log('Fetch User - Backend currentCheckInDay:', res.data.currentCheckInDay);
        console.log('Fetch User - Day to show (currentDay):', dayToShow);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, isAuthenticated]);

  /* ---------------- HISTORY ---------------- */
  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingHistory(true);
      const res = await getCoinHistory(1);
      if (res?.success) setHistory(res.data.transactions || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      fetchUser();
      fetchHistory();
    }, [fetchUser, fetchHistory])
  );

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user?.coinsBalance]);

  useEffect(() => {
    fetchUser();
    fetchHistory();
  }, [fetchUser, fetchHistory, isAuthenticated]);

  /* ---------------- CLAIM ---------------- */
  const handleClaim = async () => {
    if (hasClaimedToday) {
      Alert.alert('Already Claimed', 'You have already claimed your daily reward today. Come back tomorrow! 🎁');
      return;
    }

    setClaiming(true);
    try {
      const res = await claimDailyCheckIn();
      console.log('Claim response:', res);
      
      if (res.success) {
        // Backend returns currentDay which is the day JUST CLAIMED
        // We need to show the NEXT day for tomorrow's claim
        const claimedDay = res.data.currentDay || (currentDay || 1);
        const nextDay = claimedDay >= 7 ? 1 : claimedDay + 1;
        
        setCurrentDay(nextDay);
        setSelectedDay(nextDay);
        setHasClaimedToday(true);
        
        Alert.alert(
          'Success! 🎉',
          `You earned ${res.data.coins} coin${res.data.coins > 1 ? 's' : ''}!\nCome back tomorrow for Day ${nextDay}.`,
          [
            {
              text: 'OK',
              onPress: async () => {
                // Fetch updated user data to sync with backend
                await fetchUser();
                await fetchHistory();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error claiming:', error);
      const errorMessage = error.response?.data?.message || 'Failed to claim daily reward. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setClaiming(false);
    }
  };

  /* ---------------- WATCH AD ---------------- */
  const handleWatchAd = async () => {
    setWatchingAd(true);
    setShowAd(true);
  };

  const handleAdFinished = async () => {
    setShowAd(false);
    
    try {
      const res = await rewardAdView('rewarded');
      if (res.success) {
        // Update user coins in redux
        await fetchUser();
        await fetchHistory();
        
        Alert.alert(
          'Success! 🎉',
          `You earned ${res.data.coins} coin${res.data.coins > 1 ? 's' : ''}! Thank you for watching.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setWatchingAd(false);
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error rewarding ad:', error);
      const errorMessage = error.response?.data?.message || 'Failed to reward ad. Please try again.';
      Alert.alert('Error', errorMessage);
      setWatchingAd(false);
    }
  };

  /* ---------------- MISSION REWARD HANDLER ---------------- */
  const rewardMission = async (missionId: string, coinAmount: number) => {
    try {
      // Call backend API to verify and reward
      const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      const token = await getToken();
      
      console.log('Rewarding mission:', { missionId, coinAmount, apiUrl, hasToken: !!token });
      
      const response = await fetch(`${apiUrl}/api/reward/missions/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          missionId,
        }),
      });

      console.log('Mission reward response status:', response.status);
      
      const data = await response.json();
      console.log('Mission reward response data:', data);
      
      return data;
    } catch (error) {
      console.error('Error calling reward mission API:', error);
      throw error;
    }
  };

  const handleMissionPress = async (mission: typeof MISSIONS[0]) => {
    if (missionStates[mission.id]?.completed) {
      Alert.alert('Already Completed', 'You have already completed this mission.');
      return;
    }

    try {
      let opened = false;

      // Special handling for YouTube
      if (mission.platform === 'youtube') {
        // Try multiple YouTube URL schemes
        const youtubeUrls = [
          'youtube://@digitalkalakaar', // Recommended format for channel
          'youtube://channel/@digitalkalakaar',
          'vnd.youtube://www.youtube.com/@digitalkalakaar',
          'vnd.youtube://@digitalkalakaar',
        ];

        // Try each YouTube app URL
        for (const youtubeUrl of youtubeUrls) {
          try {
            const canOpen = await Linking.canOpenURL(youtubeUrl);
            if (canOpen) {
              await Linking.openURL(youtubeUrl);
              opened = true;
              console.log('Opened YouTube app with:', youtubeUrl);
              break;
            }
          } catch (error) {
            console.log('Failed with URL:', youtubeUrl, error);
          }
        }

        // If YouTube app didn't work, open in browser
        if (!opened) {
          await Linking.openURL(mission.url);
          opened = true;
          console.log('Opened YouTube in browser');
        }
      }
      // Special handling for Instagram
      else if (mission.platform === 'instagram') {
        // Try Instagram app first
        const instagramAppUrl = 'instagram://user?username=digitalkalakaar';
        try {
          const canOpenInstagramApp = await Linking.canOpenURL(instagramAppUrl);
          if (canOpenInstagramApp) {
            await Linking.openURL(instagramAppUrl);
            opened = true;
            console.log('Opened Instagram app');
          }
        } catch (error) {
          console.log('Instagram app not available, trying web URL');
        }

        // If Instagram app didn't work, open in browser
        if (!opened) {
          await Linking.openURL(mission.url);
          opened = true;
          console.log('Opened Instagram in browser');
        }
      }
      // Generic external link handling
      else {
        await Linking.openURL(mission.url);
        opened = true;
      }

      if (opened) {
        // Reward coins immediately on successful redirect
        try {
          const res = await rewardMission(mission.id, mission.coins);
          if (res.success) {
            // Update mission state
            const updatedStates = {
              ...missionStates,
              [mission.id]: {
                completed: true,
                rewarded: true,
              },
            };
            setMissionStatesLocal(updatedStates);
            await setMissionStates(updatedStates);

            // Show reward modal
            setLastRewardedMission({
              id: mission.id,
              coins: mission.coins,
              title: mission.title,
            });
            setShowRewardModal(true);

            // Update user coins
            await fetchUser();
            await fetchHistory();
          }
        } catch (error) {
          console.error('Error rewarding mission:', error);
          Alert.alert('Error', 'Failed to process reward. Please try again.');
        }
      } else {
        Alert.alert('Unable to Open', 'Please ensure the required app is installed or try again later.');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      
      // As a last resort, try opening the web URL directly
      try {
        await Linking.openURL(mission.url);
        
        // Still reward the user even if we had to fallback
        try {
          const res = await rewardMission(mission.id, mission.coins);
          if (res.success) {
            const updatedStates = {
              ...missionStates,
              [mission.id]: {
                completed: true,
                rewarded: true,
              },
            };
            setMissionStatesLocal(updatedStates);
            await setMissionStates(updatedStates);

            setLastRewardedMission({
              id: mission.id,
              coins: mission.coins,
              title: mission.title,
            });
            setShowRewardModal(true);

            await fetchUser();
            await fetchHistory();
          }
        } catch (rewardError) {
          console.error('Error rewarding after fallback:', rewardError);
        }
      } catch (fallbackError) {
        Alert.alert('Error', 'Unable to open the link. Please try again later.');
      }
    }
  };

  /* ---------------- PULL REFRESH ---------------- */
  const refreshData = async () => {
    await Promise.all([fetchUser(), fetchHistory()]);
  };

  const {
    refreshing,
    onRefresh,
    handleScroll,
    pullDistance,
    threshold,
  } = usePullToRefresh(refreshData, { completionDelayMs: 800 });

  const topOffset = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topOffset }]}>
      <StatusBar barStyle="light-content" backgroundColor='#0A0A0A' />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation?.goBack?.()}>
          <Ionicons name="arrow-back" size={22} color="#FFC107" />
        </TouchableOpacity>

        <Text style={styles.title}>Rewards</Text>

        <View style={styles.coinBadge}>
          <FontAwesome5 name="coins" size={18} color="#FFC107" />
        </View>
      </View>

      {(pullDistance > 0 || refreshing) && (
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          threshold={threshold}
          refreshing={refreshing}
          color="#FFC107"
          topOffset={topOffset + 60}
        />
      )}

      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFC107']}
            tintColor="#FFC107"
            progressViewOffset={-1000}
          />
        }
        contentContainerStyle={{ paddingBottom: TAB_BAR_SAFE_PADDING }}
        showsVerticalScrollIndicator={false}
      >
        {/* BALANCE */}
        <View style={styles.balance}>
          <FontAwesome5 name="coins" size={36} color="#FFC107" />
          <Text style={styles.balanceText}>{coins} Coins</Text>
          <Text style={styles.balanceSub}>Spend or earn more daily ✨</Text>
        </View>

        {/* DAILY CHECK-IN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Check-in</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DAILY_REWARDS.map(d => {
              // A day is "done" if it's less than the current day
              const done = currentDay ? d.day < currentDay : false;
              // Today's day is the current day and has been claimed
              const isToday = d.day === currentDay;
              const todayAndClaimed = isToday && hasClaimedToday;

              return (
                <TouchableOpacity
                  key={d.day}
                  style={[
                    styles.day,
                    d.day === selectedDay && !todayAndClaimed && styles.dayActive,
                    (done || todayAndClaimed) && styles.dayDone,
                  ]}
                  disabled={done || todayAndClaimed}
                  onPress={() => {
                    if (!done && !todayAndClaimed) {
                      setSelectedDay(d.day);
                    }
                  }}
                >
                  <FontAwesome5
                    name={done || todayAndClaimed ? 'check' : 'coins'}
                    size={16}
                    color={done || todayAndClaimed ? '#10B981' : '#FFC107'}
                  />
                  <Text style={styles.dayLabel}>Day {d.day}</Text>
                  {isToday && !hasClaimedToday && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayText}>Today</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            onPress={handleClaim}
            disabled={hasClaimedToday || claiming}
            style={[styles.claim, (hasClaimedToday || claiming) && styles.claimDisabled]}
          >
            <Text style={styles.claimText}>
              {claiming 
                ? 'Claiming...' 
                : hasClaimedToday 
                  ? '✓ Claimed Today' 
                  : `Claim ${DAILY_REWARDS.find(d => d.day === selectedDay)?.coins} Coin`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* MISSIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earn by Watching & Visiting</Text>

          {/* Watch Ad Mission - First */}
          <View style={styles.mission}>
            <View style={[styles.icon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="play" size={20} color="#FFF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.missionTitle}>Watch Ads</Text>
              <Text style={styles.missionCoins}>+10 Coins</Text>
            </View>

            <TouchableOpacity 
              style={[styles.missionBtn, watchingAd && styles.missionBtnDisabled]}
              onPress={handleWatchAd}
              disabled={watchingAd}
            >
              <Text style={styles.missionBtnText}>
                {watchingAd ? 'Loading...' : 'Watch'}
              </Text>
            </TouchableOpacity>
          </View>

          {MISSIONS.map(m => {
            const isCompleted = missionStates[m.id]?.completed;
            return (
              <View 
                key={m.id} 
                style={[
                  styles.mission,
                  isCompleted && styles.missionCompleted
                ]}
              >
                <View style={[styles.icon, { backgroundColor: isCompleted ? '#888' : m.color }]}>
                  {isCompleted ? (
                    <FontAwesome5 name="check" size={18} color="#FFF" />
                  ) : (
                    <FontAwesome5 name={m.icon as any} size={18} color="#FFF" />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.missionTitle, isCompleted && styles.missionTitleCompleted]}>
                    {m.title}
                  </Text>
                  <Text style={[styles.missionCoins, isCompleted && styles.missionCoinsCompleted]}>
                    +{m.coins} Coins
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[
                    styles.missionBtn,
                    isCompleted && styles.missionBtnCompleted
                  ]}
                  onPress={() => handleMissionPress(m)}
                  disabled={isCompleted}
                >
                  <Text style={[
                    styles.missionBtnText,
                    isCompleted && styles.missionBtnTextCompleted
                  ]}>
                    {isCompleted ? '✓ Completed' : m.cta}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* BUY COINS BANNER */}
        <TouchableOpacity
          onPress={() => navigation.navigate('AddCoins')}
          style={styles.buyBanner}
          activeOpacity={0.9}
        >
          <View style={styles.buyContent}>
            <FontAwesome5 name="coins" size={32} color="#FFC107" />
            <View style={styles.buyInfo}>
              <Text style={styles.buyTitle}>Need More Coins?</Text>
              <Text style={styles.buySubtitle}>Buy coins to unlock premium content</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFC107" />
        </TouchableOpacity>

        {/* HISTORY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          {loadingHistory ? (
            <View style={styles.historyLoadingContainer}>
              <ActivityIndicator color="#FFC107" size="large" />
              <Text style={styles.historyLoadingText}>Loading activity...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyHistoryContainer}>
              <Ionicons name="receipt-outline" size={48} color="#666" />
              <Text style={styles.emptyHistoryText}>No transactions yet</Text>
              <Text style={styles.emptyHistorySubtext}>
                Start earning coins to see your activity here
              </Text>
            </View>
          ) : (
            history.map(h => (
              <View key={h._id} style={styles.historyItem}>
                <View style={styles.historyItemLeft}>
                  <View style={[
                    styles.historyIconContainer,
                    h.type === 'earned' ? styles.historyIconEarned : styles.historyIconRedeemed
                  ]}>
                    <Ionicons 
                      name={getSourceIcon(h.source, h.type)} 
                      size={20} 
                      color={h.type === 'earned' ? '#10B981' : '#EF4444'} 
                    />
                  </View>
                  
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyItemTitle}>{getSourceName(h.source)}</Text>
                    <Text style={styles.historyItemDescription}>{h.description}</Text>
                    <Text style={styles.historyItemDate}>{formatDate(h.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.historyItemRight}>
                  <Text style={[
                    styles.historyItemAmount,
                    h.type === 'earned' ? styles.historyAmountEarned : styles.historyAmountRedeemed
                  ]}>
                    {h.type === 'earned' ? '+' : '-'}{h.amount}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Rewarded Ad Component */}
      <RewardedEpisodeAd 
        show={showAd}
        onAdFinished={handleAdFinished}
      />

      {/* Reward Modal */}
      <Modal
        visible={showRewardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRewardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalSuccessIcon}>
              <FontAwesome5 name="check-circle" size={60} color="#10B981" />
            </View>
            
            <Text style={styles.modalTitle}>🎉 Success!</Text>
            
            <Text style={styles.modalMessage}>
              You earned {lastRewardedMission?.coins} Coins for {lastRewardedMission?.title.toLowerCase()}.
            </Text>
            
            <Text style={styles.modalSubtext}>
              This mission is now completed.
            </Text>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowRewardModal(false)}
            >
              <Text style={styles.modalButtonText}>Awesome!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CoinsScreen;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', padding: 16, justifyContent: 'space-between', alignItems: 'center' },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#252525', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  coinBadge: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#252525', borderRadius: 20 },
  coinText: { color: '#FFC107', fontWeight: '800' },

  balance: { alignItems: 'center', margin: 16, padding: 24, backgroundColor: '#252525', borderRadius: 20 },
  balanceText: { fontSize: 28, fontWeight: '900', color: '#FFC107' },
  balanceSub: { marginTop: 4, color: '#999' },

  section: { marginHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 12 },

  day: { 
    width: 70, 
    height: 86, 
    backgroundColor: '#1A1A1A', 
    borderRadius: 16, 
    marginRight: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
    position: 'relative',
  },
  dayActive: { borderWidth: 2, borderColor: '#FFC107' },
  dayDone: { borderWidth: 2, borderColor: '#10B981' },
  dayLabel: { fontSize: 12, marginTop: 6, color: '#999' },
  todayBadge: {
    position: 'absolute',
    top: -6,
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  claim: { marginTop: 16, backgroundColor: '#FFC107', padding: 16, borderRadius: 16, alignItems: 'center' },
  claimDisabled: { opacity: 0.5 },
  claimText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },

  mission: { flexDirection: 'row', backgroundColor: '#252525', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
  missionCompleted: { opacity: 0.6, backgroundColor: '#1A1A1A' },
  icon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  missionTitle: { color: '#FFF', fontWeight: '800' },
  missionTitleCompleted: { color: '#999' },
  missionCoins: { color: '#FFC107', fontSize: 12, fontWeight: '700' },
  missionCoinsCompleted: { color: '#666' },
  missionBtn: { 
    minWidth: 90,
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: '#FFC107',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionBtnText: { color: '#FFC107', fontWeight: '800', fontSize: 13 },
  missionBtnCompleted: { 
    borderColor: '#666',
  },
  missionBtnTextCompleted: { color: '#10B981' },
  missionBtnDisabled: { 
    opacity: 0.5,
    borderColor: '#999',
  },

  buyBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#252525', 
    borderRadius: 20, 
    padding: 20, 
    marginHorizontal: 16, 
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#FFC107',
  },
  buyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  buyInfo: { flex: 1 },
  buyTitle: { fontSize: 16, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  buySubtitle: { fontSize: 12, fontWeight: '600', color: '#999' },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#252525',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '80%',
  },
  modalSuccessIcon: {
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  // Enhanced History Styles
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: '#252525',
  },
  historyIconEarned: {
    backgroundColor: '#10B98120',
  },
  historyIconRedeemed: {
    backgroundColor: '#EF444420',
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  historyItemDescription: {
    fontSize: 13,
    color: '#CCC',
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 11,
    color: '#999',
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyItemAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  historyAmountEarned: {
    color: '#10B981',
  },
  historyAmountRedeemed: {
    color: '#EF4444',
  },
  historyLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
  },
  historyLoadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  emptyHistoryContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
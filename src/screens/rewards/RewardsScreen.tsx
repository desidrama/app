import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../../redux/store';
import { setUser } from '../../redux/slices/userSlice';
import { getUserProfile, getCoinHistory, claimDailyCheckIn } from '../../services/api';
import { getToken } from '../../utils/storage';
import { CoinTransaction } from '../../types';
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useTheme } from '../../context/ThemeContext';

const TAB_BAR_SAFE_PADDING = 140;

const DAILY_REWARDS = [
  { day: 1, coins: 1 },
  { day: 2, coins: 1 },
  { day: 3, coins: 1 },
  { day: 4, coins: 1 },
  { day: 5, coins: 1 },
  { day: 6, coins: 1 },
  { day: 7, coins: 1 },
];

const MISSIONS = [
  { id: 'insta1', title: 'Instagram', coins: 5, cta: 'Follow', icon: 'instagram', color: '#E4405F' },
  { id: 'yt', title: 'Youtube', coins: 5, cta: 'Subscribe', icon: 'youtube-play', color: '#FF0000' },
  { id: 'tw', title: 'Twitter', coins: 5, cta: 'Follow', icon: 'x-twitter', color: '#000', fa5: true },
  { id: 'game', title: 'Clash Royale', coins: 5, cta: 'Login', icon: 'gamepad', color: '#3B82F6', fa5: true },
];

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
        
        // Set current day - this should be the day they're on or need to claim
        const dayToShow = res.data.currentCheckInDay || 1;
        setCurrentDay(dayToShow);
        setSelectedDay(dayToShow);

        console.log('Fetch User - Last Check-in:', lastCheckInDate?.toDateString());
        console.log('Fetch User - Today:', today.toDateString());
        console.log('Fetch User - Has claimed today:', isSameDay);
        console.log('Fetch User - Current day:', dayToShow);
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
        // Update local state immediately
        const newDay = res.data.currentDay || (currentDay || 0) + 1;
        
        // Reset to day 1 if we've completed all 7 days
        const nextDay = newDay > 7 ? 1 : newDay;
        
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
                // Fetch updated user data
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

  /* ---------------- HELPERS ---------------- */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const getSourceName = (source: string) => {
    const sourceMap: Record<string, string> = {
      ad_view: 'Ad View',
      social_follow: 'Social Follow',
      daily_login: 'Daily Login',
      referral: 'Referral',
      signup_bonus: 'Signup Bonus',
      reel_watch: 'Reel Watch',
    };
    return sourceMap[source] || source;
  };

  const getSourceIcon = (source: string, type?: 'earned' | 'redeemed') => {
    if (type === 'redeemed') return 'arrow-down-circle';
    
    const map: Record<string, any> = {
      ad_view: 'play-circle',
      social_follow: 'people',
      daily_login: 'calendar',
      referral: 'person-add',
      signup_bonus: 'gift',
      reel_watch: 'videocam',
    };
    return map[source] || 'arrow-up-circle';
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
          <Text style={styles.sectionTitle}>Earn More</Text>

          {/* Watch Ad Mission - First */}
          <View style={styles.mission}>
            <View style={[styles.icon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="play" size={20} color="#FFF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.missionTitle}>Watch Ads</Text>
              <Text style={styles.missionCoins}>+5 Coins</Text>
            </View>

            <TouchableOpacity style={styles.missionBtn}>
              <Text style={styles.missionBtnText}>Watch</Text>
            </TouchableOpacity>
          </View>

          {MISSIONS.map(m => (
            <View key={m.id} style={styles.mission}>
              <View style={[styles.icon, { backgroundColor: m.color }]}>
                {m.fa5 ? (
                  <FontAwesome5 name={m.icon as any} size={18} color="#FFF" />
                ) : (
                  <FontAwesome name={m.icon as any} size={20} color="#FFF" />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.missionTitle}>{m.title}</Text>
                <Text style={styles.missionCoins}>+{m.coins} Coins</Text>
              </View>

              <TouchableOpacity style={styles.missionBtn}>
                <Text style={styles.missionBtnText}>{m.cta}</Text>
              </TouchableOpacity>
            </View>
          ))}
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
            <ActivityIndicator color="#FFC107" />
          ) : history.length === 0 ? (
            <Text style={styles.empty}>No transactions yet</Text>
          ) : (
            history.map(h => (
              <View key={h._id} style={styles.history}>
                <View>
                  <Text style={styles.historyTitle}>{getSourceName(h.source)}</Text>
                  <Text style={styles.historyDesc}>{h.description}</Text>
                  <Text style={{ color: '#999', fontSize: 11 }}>{formatDate(h.createdAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Ionicons name={getSourceIcon(h.source, h.type)} size={16} color="#FFC107" />
                  <Text style={{ color: h.type === 'earned' ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                    {h.type === 'earned' ? '+' : '-'}{h.amount}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  icon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  missionTitle: { color: '#FFF', fontWeight: '800' },
  missionCoins: { color: '#FFC107', fontSize: 12, fontWeight: '700' },
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

  history: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#252525', padding: 16, borderRadius: 14, marginBottom: 10 },
  historyTitle: { color: '#FFF', fontWeight: '700', marginBottom: 3 },
  historyDesc: { fontSize: 12, color: '#CCC', marginBottom: 4 },

  empty: { color: '#999', textAlign: 'center', marginTop: 12 },
});
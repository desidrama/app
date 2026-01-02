// FILE: src/screens/rewards/CoinsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../../redux/store';
import { setUser } from '../../redux/slices/userSlice';
import { getUserProfile, getCoinHistory, claimDailyCheckIn } from '../../services/api';
import { getToken } from '../../utils/storage';
import { CoinTransaction } from '../../types';
import { Alert } from 'react-native';
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useTheme } from '../../context/ThemeContext';

type DailyReward = {
  day: number;
  coins: number;
};

type Mission = {
  id: string;
  title: string;
  subtitle: string;
  coins: number;
  cta: string;
  iconType: 'instagram' | 'youtube' | 'x' | 'game' | 'ad';
};

const DAILY_REWARDS: DailyReward[] = [
  { day: 1, coins: 1 },
  { day: 2, coins: 1 },
  { day: 3, coins: 1 },
  { day: 4, coins: 1 },
  { day: 5, coins: 1 },
  { day: 6, coins: 1 },
  { day: 7, coins: 1 },
];

const MISSIONS: Mission[] = [
  {
    id: 'insta1',
    title: 'Instagram',
    subtitle: '5 Coins',
    coins: 5,
    cta: 'Follow',
    iconType: 'instagram',
  },
  {
    id: 'yt',
    title: 'Youtube',
    subtitle: '5 Coins',
    coins: 5,
    cta: 'Subscribe',
    iconType: 'youtube',
  },
  {
    id: 'insta2',
    title: 'Twitter',
    subtitle: '5 Coins',
    coins: 5,
    cta: 'Follow',
    iconType: 'x',
  },
  {
    id: 'game',
    title: 'Clash Royale',
    subtitle: '5 Coins',
    coins: 5,
    cta: 'Login',
    iconType: 'game',
  },
];

const TAB_BAR_SAFE_PADDING = 140; // ensure content visible above tab bar / home indicator

const CoinsScreen: React.FC<any> = ({ navigation }) => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const user = useSelector((state: RootState) => state.user.profile);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [coinHistory, setCoinHistory] = useState<CoinTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [hasClaimedToday, setHasClaimedToday] = useState(false);
  const [currentCheckInDay, setCurrentCheckInDay] = useState<number | undefined>(undefined);

  // Get coins from user profile (coinsBalance from backend or coins from frontend)
  const userCoins = user?.coinsBalance ?? user?.coins ?? 0;

  // Fetch user profile to get latest coins
  const fetchUserCoins = useCallback(async () => {
    const token = await getToken();
    
    if (!isAuthenticated || !token) {
      return;
    }

    try {
      setLoading(true);
      const response = await getUserProfile();
      if (response.success && response.data) {
        dispatch(setUser(response.data));
        
        // Check if user has claimed today
        const userData = response.data;
        if (userData.lastDailyCheckInDate) {
          const lastCheckIn = new Date(userData.lastDailyCheckInDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          lastCheckIn.setHours(0, 0, 0, 0);
          setHasClaimedToday(lastCheckIn.getTime() === today.getTime());
          
          // Update selected day based on current check-in day
          if (userData.currentCheckInDay) {
            setCurrentCheckInDay(userData.currentCheckInDay);
            setSelectedDay(userData.currentCheckInDay);
          }
        } else {
          setHasClaimedToday(false);
          setCurrentCheckInDay(undefined);
        }
      }
    } catch (error: any) {
      console.error('Error fetching user coins:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, isAuthenticated]);

  // Fetch coin transaction history
  const fetchCoinHistory = useCallback(async () => {
    const token = await getToken();
    
    if (!isAuthenticated || !token) {
      return;
    }

    try {
      setLoadingHistory(true);
      const response = await getCoinHistory(1);
      if (response.success && response.data) {
        setCoinHistory(response.data.transactions || []);
      }
    } catch (error: any) {
      console.error('Error fetching coin history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [isAuthenticated]);

  // Load coins and history when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchUserCoins();
      fetchCoinHistory();
    }, [fetchCoinHistory, fetchUserCoins, isAuthenticated])
  );

  // Also refresh when user profile changes (e.g., coins deducted)
  useEffect(() => {
    if (user) {
      // Refresh coin history when user profile changes to show latest transactions
      fetchCoinHistory();
    }
  }, [user?.coinsBalance]);

  // Also load on mount
  useEffect(() => {
    fetchUserCoins();
    fetchCoinHistory();
  }, [fetchCoinHistory, fetchUserCoins, isAuthenticated]);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchUserCoins(), fetchCoinHistory()]);
  }, [fetchCoinHistory, fetchUserCoins]);

  const {
    refreshing,
    onRefresh,
    handleScroll: handlePullScroll,
    pullDistance,
    threshold,
  } = usePullToRefresh(refreshData, { completionDelayMs: 800 });

  const handleClaim = async () => {
    if (hasClaimedToday) {
      Alert.alert('Already Claimed', 'You have already claimed your daily reward today. Come back tomorrow!');
      return;
    }

    try {
      setClaiming(true);
      const response = await claimDailyCheckIn();
      
      if (response.success) {
        // Update current check-in day from response
        if (response.data.currentDay) {
          setCurrentCheckInDay(response.data.currentDay);
        }
        
        Alert.alert(
          'Success!',
          `You earned ${response.data.coins} coins!`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh coins and history after claim
                fetchUserCoins();
                fetchCoinHistory();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error claiming daily check-in:', error);
      const errorMessage = error.response?.data?.message || 'Failed to claim daily reward. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setClaiming(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }
  };

  // Get source display name
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

  // Get source icon
  const getSourceIcon = (source: string, type: 'earned' | 'redeemed') => {
    if (type === 'redeemed') {
      return 'remove-circle';
    }
    switch (source) {
      case 'ad_view':
        return 'play-circle';
      case 'social_follow':
        return 'people';
      case 'daily_login':
        return 'calendar';
      case 'referral':
        return 'person-add';
      case 'signup_bonus':
        return 'gift';
      case 'reel_watch':
        return 'videocam';
      default:
        return 'coin';
    }
  };

  const renderMissionIcon = (mission: Mission) => {
    switch (mission.iconType) {
      case 'instagram':
        return (
          <View style={[styles.missionIconCircle, { backgroundColor: '#F56040' }]}>
            <FontAwesome name="instagram" size={18} color={colors.textPrimary === '#000000' ? '#000000' : '#fff'} />
          </View>
        );
      case 'youtube':
        return (
          <View style={[styles.missionIconCircle, { backgroundColor: '#FF0000' }]}>
            <FontAwesome name="youtube-play" size={18} color={colors.textPrimary === '#000000' ? '#000000' : '#fff'} />
          </View>
        );
      case 'x':
        return (
          <View style={[styles.missionIconCircle, { backgroundColor: '#111827' }]}>
            <FontAwesome5 name="x-twitter" size={16} color={colors.textPrimary === '#000000' ? '#000000' : '#fff'} />
          </View>
        );
      case 'game':
        return (
          <View style={[styles.missionIconCircle, { backgroundColor: '#2563EB' }]}>
            <FontAwesome5 name="gamepad" size={16} color={colors.textPrimary === '#000000' ? '#000000' : '#fff'} />
          </View>
        );
      case 'ad':
      default:
        return (
          <View style={[styles.missionIconCircle, { backgroundColor: '#10B981' }]}>
            <Ionicons name="play-outline" size={16} color={colors.textPrimary === '#000000' ? '#000000' : '#fff'} />
          </View>
        );
    }
  };

  const topOffset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topOffset, backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack?.()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text
            style={[styles.headerTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
            accessible
            accessibilityRole="header"
          >
            Coins & Rewards
          </Text>

          <View style={[styles.coinPill, { backgroundColor: colors.surfaceElevated }]} accessible accessibilityLabel={`${userCoins} coins`}>
            <Text style={[styles.coinText, { color: colors.textPrimary }]}>{loading ? '...' : userCoins}</Text>
            <FontAwesome5 name="coins" size={14} color={colors.yellow} />
          </View>
        </View>

        {/* Pull-to-Refresh Indicator */}
        {(pullDistance > 0 || refreshing) && (
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            threshold={threshold}
            refreshing={refreshing}
            color={colors.yellow}
            topOffset={topOffset + 60}
          />
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: TAB_BAR_SAFE_PADDING }]}
          showsVerticalScrollIndicator={false}
          onScroll={handlePullScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.yellow}
              colors={[colors.yellow]}
              progressViewOffset={-1000}
            />
          }
        >
          {/* Daily Rewards */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Daily Rewards</Text>

          <View style={[styles.dailyCard, { backgroundColor: colors.surface }]}>
             <ScrollView
               horizontal
               showsHorizontalScrollIndicator={false}
               contentContainerStyle={styles.dailyScrollContent}
             >
               {DAILY_REWARDS.map(reward => {
                 const isSelected = reward.day === selectedDay;
                 // Day is completed if it's less than or equal to currentCheckInDay (when user has claimed)
                 const isCompleted = currentCheckInDay !== undefined && reward.day < currentCheckInDay;
                 const isTodayCompleted = hasClaimedToday && reward.day === currentCheckInDay;
                 const showCompleted = isCompleted || isTodayCompleted;
                 
                 return (
                   <TouchableOpacity
                     key={reward.day}
                     style={[
                       styles.dayItem,
                       { borderColor: colors.borderLight, backgroundColor: colors.surface },
                       isSelected && { borderColor: colors.yellow, backgroundColor: colors.surfaceElevated, borderWidth: 2 },
                       showCompleted && { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderWidth: 2 },
                     ]}
                     onPress={() => !hasClaimedToday && setSelectedDay(reward.day)}
                     activeOpacity={0.8}
                     disabled={hasClaimedToday && !showCompleted}
                   >
                     {showCompleted && (
                       <View style={[styles.completedBadge, { backgroundColor: colors.background }]}>
                         <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                       </View>
                     )}
                     <View style={[
                       styles.dayCoinCircle,
                       { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
                       showCompleted && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }
                     ]}>
                       {showCompleted ? (
                         <Ionicons name="checkmark" size={18} color="#10B981" />
                       ) : (
                         <FontAwesome5
                           name="coins"
                           size={16}
                           color={isSelected ? colors.yellow : colors.textMuted}
                         />
                       )}
                     </View>
                     <Text
                       style={[
                         styles.dayLabel,
                         { color: colors.textMuted },
                         isSelected && !showCompleted && { color: colors.yellow, fontWeight: '700' },
                         showCompleted && { color: '#10B981', fontWeight: '700' },
                       ]}
                     >
                       Day {reward.day}
                     </Text>
                   </TouchableOpacity>
                 );
               })}
             </ScrollView>

            <TouchableOpacity
              onPress={handleClaim}
              activeOpacity={0.9}
              style={[
                styles.claimButton,
                { backgroundColor: colors.yellow },
                (hasClaimedToday || claiming) && styles.claimButtonDisabled
              ]}
              disabled={hasClaimedToday || claiming}
            >
              <Text style={[styles.claimButtonText, { color: colors.textOnYellow }]}>
                {claiming 
                  ? 'Claiming...' 
                  : hasClaimedToday 
                    ? 'Already Claimed Today' 
                    : `Get ${DAILY_REWARDS.find(r => r.day === selectedDay)?.coins ?? 0} Coin`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Missions */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Missions</Text>

          {MISSIONS.map(m => (
            <View key={m.id} style={[styles.missionCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={styles.missionLeft}>
                {renderMissionIcon(m)}
                <View>
                  <Text style={[styles.missionTitle, { color: colors.textPrimary }]}>{m.title}</Text>
                  <Text style={[styles.missionSubtitle, { color: colors.textSecondary }]}>{m.coins} Coins</Text>
                </View>
              </View>

              <TouchableOpacity style={[styles.missionCTA, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.missionCTAText, { color: colors.textPrimary }]}>{m.cta}</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Watch Ad and earn */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Watch Ad and earn</Text>

          <View style={[styles.missionCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.missionLeft}>
              {renderMissionIcon({
                id: 'ad',
                title: 'Watch Ads',
                subtitle: '5 Coins',
                coins: 5,
                cta: 'Watch',
                iconType: 'ad',
              })}
              <View>
                <Text style={[styles.missionTitle, { color: colors.textPrimary }]}>Watch Ads</Text>
                <Text style={[styles.missionSubtitle, { color: colors.textSecondary }]}>5 Coins</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.missionCTA, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.missionCTAText, { color: colors.textPrimary }]}>Watch</Text>
            </TouchableOpacity>
          </View>

          {/* Buy Coins Section */}
          <View style={styles.buyCoinsContainer}>
            <View style={styles.buyCoinsContent}>
              <View style={styles.buyCoinsTextSection}>
                <Text style={[styles.buyCoinsTitle, { color: colors.textPrimary }]}>Need More Coins?</Text>
                <Text style={[styles.buyCoinsSubtitle, { color: colors.textSecondary }]}>Buy coins to unlock premium episodes</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddCoins')}
                style={[styles.buyCoinsButton, { backgroundColor: colors.yellow }]}
                activeOpacity={0.85}
              >
                <FontAwesome5 name="coins" size={16} color={colors.textOnYellow} />
                <Text style={[styles.buyCoinsButtonText, { color: colors.textOnYellow }]}>Buy Coins</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Coin History */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transaction History</Text>

          {loadingHistory ? (
            <View style={styles.historyLoadingContainer}>
              <Text style={[styles.historyLoadingText, { color: colors.textSecondary }]}>Loading history...</Text>
            </View>
          ) : coinHistory.length === 0 ? (
            <View style={[styles.emptyHistoryContainer, { backgroundColor: 'transparent' }]}>
              <Ionicons name="time-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyHistoryText, { color: colors.textPrimary }]}>No transactions yet</Text>
              <Text style={[styles.emptyHistorySubtext, { color: colors.textSecondary }]}>Your coin transactions will appear here</Text>
            </View>
          ) : (
            <View style={styles.historyContainer}>
              {coinHistory.map((transaction) => (
                <View key={transaction._id} style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                  <View style={styles.historyItemLeft}>
                    <View style={[
                      styles.historyIconContainer,
                      { backgroundColor: colors.surfaceElevated },
                      transaction.type === 'earned' ? { backgroundColor: 'rgba(16, 185, 129, 0.15)' } : { backgroundColor: 'rgba(239, 68, 68, 0.15)' }
                    ]}>
                      <Ionicons
                        name={getSourceIcon(transaction.source, transaction.type) as any}
                        size={20}
                        color={transaction.type === 'earned' ? '#10B981' : '#EF4444'}
                      />
                    </View>
                    <View style={styles.historyItemContent}>
                      <Text style={[styles.historyItemTitle, { color: colors.textPrimary }]}>
                        {transaction.type === 'earned' ? 'Earned' : 'Redeemed'} - {getSourceName(transaction.source)}
                      </Text>
                      <Text style={[styles.historyItemDescription, { color: colors.textSecondary }]}>{transaction.description}</Text>
                      <Text style={[styles.historyItemDate, { color: colors.textMuted }]}>{formatDate(transaction.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.historyItemRight}>
                    <Text style={[
                      styles.historyItemAmount,
                      transaction.type === 'earned' ? styles.historyAmountEarned : styles.historyAmountRedeemed,
                      { color: transaction.type === 'earned' ? '#10B981' : '#EF4444' }
                    ]}>
                      {transaction.type === 'earned' ? '+' : '-'}{transaction.amount}
                    </Text>
                    <FontAwesome5 name="coins" size={12} color={colors.yellow} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default CoinsScreen;

// ================= STYLES =================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090407', // Will be overridden by dynamic styles
  },
  container: {
    flex: 1,
    backgroundColor: '#090407', // Will be overridden by dynamic styles
    paddingHorizontal: 16,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 0,
  },
  coinPill: {
    minWidth: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF7EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    justifyContent: 'center',
  },
  coinText: {
    marginRight: 6,
    fontWeight: '700',
    fontSize: 14,
    color: '#111827',
  },

  scroll: {
    flex: 1,
  },

  scrollContentContainer: {
    paddingTop: 6,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
    marginTop: 6,
  },

  // Daily card
  dailyCard: {
    backgroundColor: '#1a1012',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 22,
  },
  dailyScrollContent: {
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
   dayItem: {
     width: 68,
     height: 80,
     borderRadius: 10,
     borderWidth: 1,
     borderColor: '#3f3f46',
     backgroundColor: '#111827',
     alignItems: 'center',
     justifyContent: 'center',
     marginRight: 10,
     position: 'relative',
   },
   dayItemActive: {
     borderColor: '#FFA500',
     backgroundColor: '#1d1b10',
     borderWidth: 2,
   },
   dayItemCompleted: {
     borderColor: '#10B981',
     backgroundColor: '#0f1f15',
     borderWidth: 2,
   },
   completedBadge: {
     position: 'absolute',
     top: -6,
     right: -6,
     backgroundColor: '#090407',
     borderRadius: 12,
     zIndex: 10,
     shadowColor: '#10B981',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.6,
     shadowRadius: 4,
     elevation: 5,
   },
   dayCoinCircle: {
     width: 36,
     height: 36,
     borderRadius: 18,
     backgroundColor: '#27272f',
     alignItems: 'center',
     justifyContent: 'center',
     marginBottom: 8,
     borderWidth: 2,
     borderColor: 'transparent',
   },
   dayCoinCircleCompleted: {
     backgroundColor: 'rgba(16, 185, 129, 0.15)',
     borderColor: '#10B981',
   },
   dayLabel: {
     fontSize: 12,
     color: '#e5e5e5',
     fontWeight: '600',
   },
   dayLabelActive: {
     color: '#FFA500',
     fontWeight: '700',
   },
   dayLabelCompleted: {
     color: '#10B981',
     fontWeight: '700',
   },
  claimButton: {
    marginTop: 10,
    backgroundColor: '#FFA500',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  claimButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#9CA3AF',
  },

  // Missions
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a20',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  missionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  missionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  missionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  missionSubtitle: {
    fontSize: 12,
    color: '#d4d4d8',
    marginTop: 2,
  },
  // equal-width CTA for Follow / Subscribe / Login / Watch
  missionCTA: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F5F5F5',
  },
  missionCTAText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },

  // Buy Coins Section
  buyCoinsContainer: {
    marginVertical: 20,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  buyCoinsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'linear-gradient(135deg, rgba(255, 165, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.2)',
  },
  buyCoinsTextSection: {
    flex: 1,
  },
  buyCoinsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  buyCoinsSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  buyCoinsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA500',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 12,
    gap: 6,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buyCoinsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Coin History
  historyContainer: {
    marginBottom: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a20',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a30',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#27272f',
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
    color: '#ffffff',
    marginBottom: 4,
  },
  historyItemDescription: {
    fontSize: 13,
    color: '#d4d4d8',
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  historyItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyItemAmount: {
    fontSize: 16,
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
  },
  historyLoadingText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  emptyHistoryContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a20',
    borderRadius: 12,
    marginBottom: 20,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

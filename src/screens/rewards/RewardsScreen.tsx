// ============================================
// FILE: src/screens/rewards/CoinsScreen.tsx
// ============================================
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';

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
    title: 'Instagram',
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

const CoinsScreen: React.FC<any> = ({ navigation }) => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [userCoins, setUserCoins] = useState(0);

  const handleClaim = () => {
    const reward = DAILY_REWARDS.find(r => r.day === selectedDay);
    if (reward) {
      setUserCoins(prev => prev + reward.coins);
      // TODO: call API / redux here in real app
    }
  };

  const renderMissionIcon = (mission: Mission) => {
    switch (mission.iconType) {
      case 'instagram':
        return (
          <View style={[styles.missionIconCircle, { backgroundColor: '#F56040' }]}>
            <FontAwesome name="instagram" size={20} color="#fff" />
          </View>
        );
      case 'youtube':
        return (
          <View style={[styles.missionIconCircle, { backgroundColor: '#FF0000' }]}>
            <FontAwesome name="youtube-play" size={20} color="#fff" />
          </View>
        );
      case 'x':
        return (
          <View style={[styles.missionIconCircle, { backgroundColor: '#111827' }]}>
            <FontAwesome5 name="x-twitter" size={18} color="#fff" />
          </View>
        );
      case 'game':
        return (
          <View style={[styles.missionIconCircle, { backgroundColor: '#2563EB' }]}>
            <FontAwesome5 name="gamepad" size={18} color="#fff" />
          </View>
        );
      case 'ad':
      default:
        return (
          <View style={[styles.missionIconCircle, { backgroundColor: '#10B981' }]}>
            <Ionicons name="play-outline" size={18} color="#fff" />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack?.()}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Coins & Rewards</Text>

          <View style={styles.coinPill}>
            <Text style={styles.coinText}>{userCoins}</Text>
            <FontAwesome5 name="rupee-sign" size={16} color="#F5B800" />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Daily Rewards */}
          <Text style={styles.sectionTitle}>Daily Rewards</Text>

          <View style={styles.dailyCard}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dailyScrollContent}
            >
              {DAILY_REWARDS.map(reward => {
                const isSelected = reward.day === selectedDay;
                return (
                  <TouchableOpacity
                    key={reward.day}
                    style={[
                      styles.dayItem,
                      isSelected && styles.dayItemActive,
                    ]}
                    onPress={() => setSelectedDay(reward.day)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dayCoinCircle}>
                      <FontAwesome5
                        name="rupee-sign"
                        size={18}
                        color="#F5B800"
                      />
                    </View>
                    <Text
                      style={[
                        styles.dayLabel,
                        isSelected && styles.dayLabelActive,
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
              style={styles.claimButton}
            >
              <Text style={styles.claimButtonText}>Get 1 Coin</Text>
            </TouchableOpacity>
          </View>

          {/* Missions */}
          <Text style={styles.sectionTitle}>Missions</Text>

          {MISSIONS.map(m => (
            <View key={m.id} style={styles.missionCard}>
              <View style={styles.missionLeft}>
                {renderMissionIcon(m)}
                <View>
                  <Text style={styles.missionTitle}>{m.title}</Text>
                  <Text style={styles.missionSubtitle}>{m.coins} Coins</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.missionCTA}>
                <Text style={styles.missionCTAText}>{m.cta}</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Watch Ad and earn */}
          <Text style={styles.sectionTitle}>Watch Ad and earn</Text>

          <View style={styles.missionCard}>
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
                <Text style={styles.missionTitle}>Watch Ads</Text>
                <Text style={styles.missionSubtitle}>5 Coins</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.missionCTA}>
              <Text style={styles.missionCTAText}>Watch</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#090407', // deep dark brown/black
  },
  container: {
    flex: 1,
    backgroundColor: '#090407',
    paddingHorizontal: 12,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 12,
  },
  backButton: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'left',
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 2,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF7EA',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
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
    paddingHorizontal: 2,
    paddingBottom: 10,
  },
  dayItem: {
    width: 64,
    height: 76,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3f3f46',
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dayItemActive: {
    borderColor: '#F5B800',
    backgroundColor: '#1d1b10',
  },
  dayCoinCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#27272f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dayLabel: {
    fontSize: 11,
    color: '#e5e5e5',
    fontWeight: '600',
  },
  dayLabelActive: {
    color: '#F5B800',
  },
  claimButton: {
    marginTop: 6,
    backgroundColor: '#FFD54A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  // Missions
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a20',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  missionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  missionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    width: 100, // 👈 all buttons same width now
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
});

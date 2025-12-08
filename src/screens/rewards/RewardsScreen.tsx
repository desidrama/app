// ============================================
// FILE: src/screens/rewards/RewardsScreen.tsx
// ============================================
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function RewardsScreen() {
  const [activeTab, setActiveTab] = React.useState('coins');

  const rewardsData = [
    {
      id: '1',
      title: 'Daily Login Bonus',
      coins: 50,
      icon: 'calendar-outline',
      completed: true,
    },
    {
      id: '2',
      title: 'Watch 3 Videos',
      coins: 150,
      icon: 'play-circle-outline',
      completed: true,
    },
    {
      id: '3',
      title: 'Referral Reward',
      coins: 500,
      icon: 'share-social-outline',
      completed: false,
    },
    {
      id: '4',
      title: 'Weekly Challenge',
      coins: 300,
      icon: 'trophy-outline',
      completed: false,
    },
  ];

  const transactionHistory = [
    {
      id: '1',
      type: 'earned',
      description: 'Daily Bonus',
      coins: 50,
      date: 'Today',
    },
    {
      id: '2',
      type: 'earned',
      description: 'Video Watch Reward',
      coins: 100,
      date: 'Yesterday',
    },
    {
      id: '3',
      type: 'spent',
      description: 'Premium Unlock',
      coins: 200,
      date: '2 days ago',
    },
    {
      id: '4',
      type: 'earned',
      description: 'Referral Bonus',
      coins: 500,
      date: '1 week ago',
    },
  ];

  const renderRewardCard = ({ item }: any) => (
    <TouchableOpacity style={styles.rewardCard}>
      <View style={styles.rewardIconContainer}>
        <Ionicons name={item.icon} size={32} color="#FFD700" />
      </View>
      <View style={styles.rewardInfo}>
        <Text style={styles.rewardTitle}>{item.title}</Text>
        <View style={styles.rewardFooter}>
          <Text style={styles.rewardCoins}>+{item.coins} Coins</Text>
          {item.completed && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#FFD700" />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTransaction = ({ item }: any) => (
    <View style={styles.transactionItem}>
      <View
        style={[
          styles.transactionIcon,
          item.type === 'earned' && styles.earnedIcon,
        ]}
      >
        <Ionicons
          name={item.type === 'earned' ? 'arrow-down' : 'arrow-up'}
          size={16}
          color={item.type === 'earned' ? '#4CAF50' : '#FF6B6B'}
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{item.date}</Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          item.type === 'earned' && styles.earnedAmount,
        ]}
      >
        {item.type === 'earned' ? '+' : '-'}{item.coins}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header with Coins Balance */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rewards & Coins</Text>
      </View>

      {/* Coin Balance Card */}
      <View style={styles.balanceCardContainer}>
        <LinearGradient
          colors={['#FFD700', '#FFC107']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>Total Coins</Text>
            <View style={styles.coinDisplay}>
              <Ionicons name="cash" size={32} color="#000" />
              <Text style={styles.coinAmount}>2,450</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.withdrawButton}>
            <Text style={styles.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'coins' && styles.activeTab]}
          onPress={() => setActiveTab('coins')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'coins' && styles.activeTabText,
            ]}
          >
            Available Coins
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tasks' && styles.activeTab]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'tasks' && styles.activeTabText,
            ]}
          >
            Earn Coins
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && styles.activeTabText,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {activeTab === 'coins' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="gift-outline" size={24} color="#FFD700" />
              <Text style={styles.actionButtonText}>Redeem Gift Card</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="swap-horizontal-outline" size={24} color="#FFD700" />
              <Text style={styles.actionButtonText}>Convert to Credits</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'tasks' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Tasks</Text>
            <FlatList
              data={rewardsData}
              renderItem={renderRewardCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <FlatList
              data={transactionHistory}
              renderItem={renderTransaction}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  balanceCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceContent: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 8,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  withdrawButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  withdrawText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FFD700',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#FFD700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  rewardIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardCoins: {
    color: '#FFD700',
    fontWeight: '700',
    fontSize: 13,
  },
  completedBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnedIcon: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 2,
  },
  transactionDate: {
    color: '#666',
    fontSize: 12,
  },
  transactionAmount: {
    color: '#FF6B6B',
    fontWeight: '700',
    fontSize: 13,
  },
  earnedAmount: {
    color: '#4CAF50',
  },
  divider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: 0,
  },
  bottomPadding: {
    height: 100,
  },
});

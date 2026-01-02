// src/screens/rewards/AddCoinsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useTheme } from '../context/ThemeContext';
import {
  CFSession,
  CFEnvironment,
  CFDropCheckoutPayment,
  CFThemeBuilder,
} from 'cashfree-pg-api-contract';
import { createCoinPurchaseOrder, verifyCoinPayment } from '../services/api';
import { useNavigation } from '@react-navigation/native';

// Conditionally import Cashfree SDK - it's a native module that requires a development build
let CFPaymentGatewayService: any = null;
let CFErrorResponse: any = null;
let isCashfreeAvailable = false;

try {
  const cashfreeModule = require('react-native-cashfree-pg-sdk');
  CFPaymentGatewayService = cashfreeModule.CFPaymentGatewayService;
  CFErrorResponse = cashfreeModule.CFErrorResponse;
  isCashfreeAvailable = true;
} catch (error) {
  console.warn('Cashfree SDK not available - requires development build:', error);
  isCashfreeAvailable = false;
}

type CoinPackage = {
  id: string;
  price: number;
  coins: number;
  bonus: number;
  popular?: boolean;
  bestValue?: boolean;
};

const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'pack_50',
    price: 50,
    coins: 500,
    bonus: 0,
  },
  {
    id: 'pack_100',
    price: 100,
    coins: 1000,
    bonus: 0,
    popular: true,
  },
  {
    id: 'pack_200',
    price: 200,
    coins: 2500,
    bonus: 500,
  },
  {
    id: 'pack_300',
    price: 300,
    coins: 4000,
    bonus: 1000,
    bestValue: true,
  },
];

const AddCoinsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const user = useSelector((state: RootState) => state.user.profile);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [loading, setLoading] = useState(false);

  const userCoins = user?.coinsBalance ?? user?.coins ?? 0;

  React.useEffect(() => {
    // Set up Cashfree callback only if available
    if (isCashfreeAvailable && CFPaymentGatewayService) {
      try {
        CFPaymentGatewayService.setCallback({
          onVerify(orderID: string): void {
            console.log('✅ Payment verification started:', orderID);
            handleVerifyPayment(orderID);
          },
          onError(error: any, orderID: string): void {
            console.error('❌ Payment error:', error, orderID);
            Alert.alert('Payment Failed', error?.message || 'Please try again');
            setLoading(false);
          },
        });
      } catch (error) {
        console.warn('Failed to set Cashfree callback:', error);
      }

      return () => {
        try {
          if (CFPaymentGatewayService && CFPaymentGatewayService.removeCallback) {
            CFPaymentGatewayService.removeCallback();
          }
        } catch (error) {
          console.warn('Failed to remove Cashfree callback:', error);
        }
      };
    }
  }, []);

  const handleVerifyPayment = async (orderID: string) => {
    try {
      console.log('🔍 Verifying payment for order:', orderID);
      const response = await verifyCoinPayment(orderID);
      
      if (response.success) {
        Alert.alert(
          'Success! 🎉',
          `${response.data.coinsAdded} coins added to your account!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Select Package', 'Please select a coin package');
      return;
    }

    // Check if Cashfree SDK is available
    if (!isCashfreeAvailable || !CFPaymentGatewayService) {
      Alert.alert(
        'Payment Not Available',
        'Payment functionality requires a development build. Please rebuild the app with: npx expo run:ios or npx expo run:android'
      );
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Creating coin purchase order:', selectedPackage);

      const response = await createCoinPurchaseOrder({
        amount: selectedPackage.price,
        coins: selectedPackage.coins,
        packageId: selectedPackage.id,
      });

      const { orderId, paymentSessionId } = response.data;
      console.log('📦 Order created:', { orderId, paymentSessionId });

      // Create CFSession object
      const session = new CFSession(
        paymentSessionId,
        orderId,
        CFEnvironment.SANDBOX // Change to PRODUCTION for live
      );

      // Create theme
      const theme = new CFThemeBuilder()
        .setNavigationBarBackgroundColor('#FFA500')
        .setNavigationBarTextColor('#FFFFFF')
        .setButtonBackgroundColor('#FFA500')
        .setButtonTextColor('#FFFFFF')
        .setPrimaryTextColor('#333333')
        .setSecondaryTextColor('#757575')
        .build();

      // Create drop checkout payment
      const dropPayment = new CFDropCheckoutPayment(session, null, theme);

      console.log('💳 Starting payment...');
      CFPaymentGatewayService.doPayment(dropPayment);
    } catch (err: any) {
      console.error('❌ Purchase Error:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to start payment');
      setLoading(false);
    }
  };

  const renderPackageCard = (pkg: CoinPackage) => {
    const isSelected = selectedPackage?.id === pkg.id;

    return (
      <TouchableOpacity
        key={pkg.id}
        style={[
          styles.packageCard,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
          isSelected && { borderColor: colors.yellow, borderWidth: 2, backgroundColor: colors.surfaceElevated },
        ]}
        onPress={() => setSelectedPackage(pkg)}
        activeOpacity={0.8}
        disabled={loading}
      >
        {pkg.popular && (
          <View style={[styles.badge, { backgroundColor: colors.yellow }]}>
            <Text style={[styles.badgeText, { color: colors.textOnYellow }]}>Popular</Text>
          </View>
        )}
        {pkg.bestValue && (
          <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
            <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>Best Value</Text>
          </View>
        )}

        <View style={styles.packageContent}>
          <View style={styles.packageLeft}>
            <View style={[styles.coinIconContainer, { backgroundColor: colors.surfaceElevated }]}>
              <FontAwesome5 name="coins" size={24} color={colors.yellow} />
            </View>
            <View>
              <Text style={[styles.packageCoins, { color: colors.textPrimary }]}>
                {pkg.coins.toLocaleString()} Coins
              </Text>
              {pkg.bonus > 0 && (
                <View style={styles.bonusContainer}>
                  <Ionicons name="gift" size={14} color="#10B981" />
                  <Text style={styles.bonusText}>+{pkg.bonus} Bonus</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.packageRight}>
            <Text style={[styles.packagePrice, { color: colors.textPrimary }]}>₹{pkg.price}</Text>
            <View style={[
              styles.selectButton,
              { backgroundColor: colors.surfaceElevated },
              isSelected && { backgroundColor: colors.yellow }
            ]}>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.textOnYellow} />
              ) : (
                <View style={[styles.radioOuter, { borderColor: colors.borderLight }]}>
                  <View style={styles.radioInner} />
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const topOffset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topOffset, backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Buy Coins</Text>

          <View style={[styles.coinPill, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.coinText, { color: colors.textPrimary }]}>
              {userCoins.toLocaleString()}
            </Text>
            <FontAwesome5 name="coins" size={14} color={colors.yellow} />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(255, 165, 0, 0.15)' }]}>
              <Ionicons name="information-circle" size={24} color={colors.yellow} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
                How it works
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Purchase coins to unlock premium features, send gifts, and support your favorite creators!
              </Text>
            </View>
          </View>

          {/* Packages */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Choose Your Package
          </Text>

          {COIN_PACKAGES.map(renderPackageCard)}

          {/* Benefits */}
          <View style={[styles.benefitsCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.benefitsTitle, { color: colors.textPrimary }]}>
              What you can do with coins
            </Text>

            <View style={styles.benefitItem}>
              <Ionicons name="gift" size={20} color="#10B981" />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                Send gifts to creators
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="unlock" size={20} color="#3B82F6" />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                Unlock exclusive content
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="star" size={20} color={colors.yellow} />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                Get featured in comments
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="trophy" size={20} color="#F59E0B" />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                Access premium features
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Purchase Button */}
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              { backgroundColor: colors.yellow },
              (!selectedPackage || loading) && styles.purchaseButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={!selectedPackage || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnYellow} />
            ) : (
              <>
                <Text style={[styles.purchaseButtonText, { color: colors.textOnYellow }]}>
                  {selectedPackage
                    ? `Buy ${selectedPackage.coins.toLocaleString()} Coins for ₹${selectedPackage.price}`
                    : 'Select a Package'}
                </Text>
                {selectedPackage && (
                  <Ionicons name="arrow-forward" size={20} color={colors.textOnYellow} />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AddCoinsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
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
    fontSize: 20,
    fontWeight: '800',
  },
  coinPill: {
    minWidth: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    justifyContent: 'center',
  },
  coinText: {
    marginRight: 6,
    fontWeight: '700',
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  packageCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  packageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coinIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  packageCoins: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bonusText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  packageRight: {
    alignItems: 'flex-end',
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  selectButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  benefitsCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
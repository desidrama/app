// app/src/screens/rewards/BuyCoinsScreen.tsx
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { setUser } from '../../redux/slices/userSlice';
import { paymentService, CoinPackage } from '../../services/payment.service';
import { getUserProfile } from '../../services/api';
import {
  CFPaymentGatewayService,
  CFErrorResponse,
} from 'react-native-cashfree-pg-sdk';
import {
  CFSession,
  CFEnvironment,
  CFDropCheckoutPayment,
  CFThemeBuilder,
} from 'cashfree-pg-api-contract';

const BuyCoinsScreen: React.FC<any> = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.profile);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const userCoins = user?.coinsBalance ?? user?.coins ?? 0;

  useEffect(() => {
    // Set callback on component mount
    try {
      CFPaymentGatewayService.setCallback({
        onVerify(orderID: string): void {
          console.log('✅ Payment verification started:', orderID);
          handleVerifyPayment(orderID);
        },
        onError(error: CFErrorResponse, orderID: string): void {
          console.error('❌ Payment error:', error, orderID);
          Alert.alert('Payment Failed', 'Payment could not be processed. Please try again.');
          setProcessing(false);
          setSelectedPackage(null);
        },
      });
    } catch (error: any) {
      console.error('❌ Failed to set Cashfree callback:', error);
      // This will happen if native module is not linked - user needs to rebuild
    }

    // Cleanup callback on unmount
    return () => {
      try {
        CFPaymentGatewayService.removeCallback();
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Fetch coin packages
  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await paymentService.getCoinPackages();
      setPackages(data);
    } catch (error: any) {
      console.error('Error fetching packages:', error);
      Alert.alert('Error', 'Failed to load coin packages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user profile to update coins
  const fetchUserCoins = useCallback(async () => {
    try {
      const response = await getUserProfile();
      if (response.success && response.data) {
        dispatch(setUser(response.data));
      }
    } catch (error) {
      console.error('Error fetching user coins:', error);
    }
  }, [dispatch]);

  useFocusEffect(
    React.useCallback(() => {
      fetchPackages();
      fetchUserCoins();
    }, [fetchPackages, fetchUserCoins])
  );

  const handleVerifyPayment = async (orderID: string) => {
    try {
      console.log('🔍 Verifying payment for order:', orderID);
      const verification = await paymentService.verifyPayment(orderID);

      if (verification.status === 'success') {
        // Refresh user coins
        await fetchUserCoins();

        Alert.alert(
          'Payment Successful!',
          `You have successfully purchased ${verification.coins} coins!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setOrderId(null);
                setSelectedPackage(null);
                setProcessing(false);
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Payment Pending', 'Your payment is being processed. Please wait a moment.');
        setOrderId(null);
        setSelectedPackage(null);
        setProcessing(false);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      Alert.alert('Error', 'Payment verification failed');
      setProcessing(false);
      setSelectedPackage(null);
    }
  };

  // Handle package selection and payment initiation
  const handleBuyCoins = async (pkg: CoinPackage) => {
    try {
      setProcessing(true);
      setSelectedPackage(pkg);

      console.log('🚀 Creating payment order for package:', pkg.id);

      // Call backend to create payment order (secure - credentials stay on backend)
      const paymentData = await paymentService.initiatePayment(pkg.id);
      const { orderId: paymentOrderId, paymentSessionId } = paymentData;

      if (!paymentOrderId || !paymentSessionId) {
        throw new Error('Payment order creation failed');
      }

      console.log('📦 Order created:', { orderId: paymentOrderId, paymentSessionId });

      setOrderId(paymentOrderId);

      // Determine environment - default to SANDBOX for testing
      // You can set this via environment variable or config
      const env = CFEnvironment.SANDBOX; // Change to CFEnvironment.PRODUCTION for production

      // ✅ Create CFSession object
      const session = new CFSession(
        paymentSessionId,
        paymentOrderId,
        env
      );

      console.log('🔧 Session object created');

      // ✅ Create theme (optional but recommended)
      const theme = new CFThemeBuilder()
        .setNavigationBarBackgroundColor('#090407')
        .setNavigationBarTextColor('#FFFFFF')
        .setButtonBackgroundColor('#FFD54A')
        .setButtonTextColor('#090407')
        .setPrimaryTextColor('#FFFFFF')
        .setSecondaryTextColor('#9CA3AF')
        .build();

      console.log('🎨 Theme created');

      // ✅ Create drop checkout payment object
      const dropPayment = new CFDropCheckoutPayment(
        session,
        null, // payment components (null = all modes)
        theme
      );

      console.log('💳 Starting payment with drop checkout...');

      // ✅ Start payment
      try {
        CFPaymentGatewayService.doPayment(dropPayment);
      } catch (error: any) {
        console.error('❌ Cashfree SDK Error:', error);
        if (error.message?.includes("doesn't seem to be linked")) {
          Alert.alert(
            'Rebuild Required',
            'Please rebuild the app to use Cashfree payment. Run: npx expo prebuild && npx expo run:android'
          );
        } else {
          Alert.alert('Payment Error', 'Failed to start payment. Please try again.');
        }
        setProcessing(false);
        setSelectedPackage(null);
      }

    } catch (err: any) {
      console.error('❌ Payment Error:', err);
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to start payment');
      setProcessing(false);
      setSelectedPackage(null);
    }
  };

  const topOffset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topOffset }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack?.()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1} accessible accessibilityRole="header">
            Buy Coins
          </Text>

          <View style={styles.coinPill} accessible accessibilityLabel={`${userCoins} coins`}>
            <Text style={styles.coinText}>{userCoins}</Text>
            <FontAwesome5 name="coins" size={14} color="#F5B800" />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD54A" />
            <Text style={styles.loadingText}>Loading packages...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Choose a Package</Text>
            <Text style={styles.sectionSubtitle}>Select a coin package to purchase</Text>

            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={[
                  styles.packageCard,
                  selectedPackage?.id === pkg.id && styles.packageCardSelected,
                ]}
                onPress={() => !processing && handleBuyCoins(pkg)}
                disabled={processing}
                activeOpacity={0.8}
              >
                <View style={styles.packageContent}>
                  <View style={styles.packageLeft}>
                    <View style={styles.coinIconContainer}>
                      <FontAwesome5 name="coins" size={24} color="#F5B800" />
                    </View>
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      <Text style={styles.packageCoins}>{pkg.coins} Coins</Text>
                    </View>
                  </View>
                  <View style={styles.packageRight}>
                    <Text style={styles.packagePrice}>₹{pkg.amount}</Text>
                    {processing && selectedPackage?.id === pkg.id && (
                      <ActivityIndicator size="small" color="#FFD54A" style={styles.processingIndicator} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#FFD54A" />
              <Text style={styles.infoText}>
                Your coins will be credited immediately after successful payment.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default BuyCoinsScreen;

// ================= STYLES =================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090407',
  },
  container: {
    flex: 1,
    backgroundColor: '#090407',
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
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
    marginTop: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  packageCard: {
    backgroundColor: '#1a1a20',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a30',
  },
  packageCardSelected: {
    borderColor: '#FFD54A',
    backgroundColor: '#1d1b10',
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
    backgroundColor: '#27272f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  packageCoins: {
    fontSize: 13,
    color: '#d4d4d8',
  },
  packageRight: {
    alignItems: 'flex-end',
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFD54A',
  },
  processingIndicator: {
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a20',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#2a2a30',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#d4d4d8',
    marginLeft: 12,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#9CA3AF',
  },
});

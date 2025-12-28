// src/screens/wallet/WalletScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchBalance, fetchTransactions } from '../../store/slices/walletSlice';
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
import { walletAPI } from '../../services/api';
import { format } from 'date-fns';

const WalletScreen = () => {
  const [showRecharge, setShowRecharge] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { balance, transactions } = useSelector((state: RootState) => state.wallet);

  useEffect(() => {
    loadWalletData();
    
    // Set callback on component mount
    CFPaymentGatewayService.setCallback({
      onVerify(orderID: string): void {
        console.log('✅ Payment verification started:', orderID);
        handleVerifyPayment(orderID);
      },
      onError(error: CFErrorResponse, orderID: string): void {
        console.error('❌ Payment error:', error, orderID);
        Alert.alert('Payment Failed', error?.message || 'Please try again');
        setLoading(false);
      },
    });

    // Cleanup callback on unmount
    return () => {
      CFPaymentGatewayService.removeCallback();
    };
  }, []);

  const loadWalletData = async () => {
    await dispatch(fetchBalance());
    await dispatch(fetchTransactions({}));
  };

  const handleVerifyPayment = async (orderID: string) => {
    try {
      console.log('🔍 Verifying payment for order:', orderID);
      await walletAPI.verifyPayment(orderID);
      Alert.alert('Success', 'Wallet recharged successfully!');
      setAmount('');
      setShowRecharge(false);
      loadWalletData();
    } catch (err) {
      console.error('Verification error:', err);
      Alert.alert('Error', 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10) {
      Alert.alert('Invalid', 'Minimum ₹10');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Creating recharge order for amount:', amt);
      
      const { data } = await walletAPI.createRechargeOrder(amt);
      const { orderId, paymentSessionId } = data;

      console.log('📦 Order created:', { orderId, paymentSessionId });

      // ✅ Create CFSession object
      const session = new CFSession(
        paymentSessionId,
        orderId,
        CFEnvironment.SANDBOX
      );

      console.log('🔧 Session object created');

      // ✅ Create theme (optional but recommended)
      const theme = new CFThemeBuilder()
        .setNavigationBarBackgroundColor('#6C63FF')
        .setNavigationBarTextColor('#FFFFFF')
        .setButtonBackgroundColor('#6C63FF')
        .setButtonTextColor('#FFFFFF')
        .setPrimaryTextColor('#333333')
        .setSecondaryTextColor('#757575')
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
      CFPaymentGatewayService.doPayment(dropPayment);

    } catch (err: any) {
      console.error('❌ Recharge Error:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to start payment');
      setLoading(false);
    }
  };

  const renderTransaction = ({ item }: any) => {
    const isCredit = ['recharge', 'referral', 'gift_received'].includes(item.type);
    return (
      <View className="bg-white p-4 flex-row items-center mb-2 rounded-xl">
        <View
          className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${
            isCredit ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <Icon
            name={isCredit ? 'arrow-down' : 'arrow-up'}
            size={20}
            color={isCredit ? '#10B981' : '#EF4444'}
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-[#333] mb-1">
            {item.description}
          </Text>
          <Text className="text-xs text-[#999]">
            {format(new Date(item.createdAt), 'dd MMM yyyy, HH:mm')}
          </Text>
        </View>
        <Text
          className={`text-base font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}
        >
          {isCredit ? '+' : '-'}₹{item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Balance Card */}
      <LinearGradient colors={['#6C63FF', '#5A52E0']} className="p-6 pt-12 rounded-b-3xl">
        <Text className="text-purple-200 text-sm mb-2">Available Balance</Text>
        <Text className="text-white text-5xl font-bold mb-6">₹{balance.toFixed(2)}</Text>

        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-white py-3 rounded-xl items-center"
            onPress={() => setShowRecharge(true)}
          >
            <Text className="text-[#6C63FF] font-semibold">Add Money</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-white/20 py-3 rounded-xl items-center border border-white/30">
            <Text className="text-white font-semibold">Send Gift</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Quick Recharge */}
      <View className="p-4">
        <Text className="text-base font-semibold text-[#333] mb-3">Quick Recharge</Text>
        <View className="flex-row flex-wrap gap-2">
          {[100, 500, 1000, 2000].map((amt) => (
            <TouchableOpacity
              key={amt}
              className="flex-1 min-w-[80] bg-white py-3 rounded-xl items-center"
              onPress={() => {
                setAmount(String(amt));
                setShowRecharge(true);
              }}
            >
              <Text className="text-[#6C63FF] font-semibold">₹{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transactions */}
      <View className="flex-1 px-4">
        <Text className="text-base font-semibold text-[#333] mb-3">Recent Transactions</Text>
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(i) => i._id}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-gray-500">No transactions yet</Text>
            </View>
          }
        />
      </View>

      {/* Recharge Modal */}
      <Modal visible={showRecharge} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-[#333]">Add Money</Text>
              <TouchableOpacity
                disabled={loading}
                onPress={() => setShowRecharge(false)}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm text-gray-600 mb-2">Enter Amount</Text>
            <TextInput
              className="bg-gray-100 rounded-xl p-4 text-2xl font-bold text-center mb-6 border border-gray-300"
              placeholder="₹0"
              keyboardType="number-pad"
              value={amount}
              editable={!loading}
              onChangeText={setAmount}
            />

            <TouchableOpacity
              className={`py-4 rounded-xl items-center ${loading ? 'bg-gray-400' : 'bg-[#6C63FF]'}`}
              disabled={loading}
              onPress={handleRecharge}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Continue to Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default WalletScreen;

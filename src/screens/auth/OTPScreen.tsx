// ============================================
// FILE: src/screens/auth/OTPScreen.tsx
// ============================================
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const logoImage = require('../../../assets/App Logo.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OTPScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const phone: string = route.params?.phone || '';

  const [otp, setOtp] = useState('');

  const handleVerify = () => {
    if (otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the OTP you received.');
      return;
    }

    // TODO:
    // 1. Call your backend to verify OTP
    // 2. On success, update Redux auth state & navigate to Main

    navigation.replace('Main'); // temporary behaviour
  };

  const maskedPhone =
    phone && phone.length === 10
      ? `+91 ${phone.slice(0, 2)}*****${phone.slice(7)}`
      : phone;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      {/* Brand at top center */}
      <View style={styles.brandWrapper}>
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
        <View style={styles.textContainer}>
          <Text style={styles.textDigital}>digital</Text>
          <Text style={styles.textKalakar}>कलाकार</Text>
        </View>
      </View>

      {/* OTP form */}
      <View style={styles.formWrapper}>
        <Text style={styles.title}>Verify OTP</Text>
        {phone ? (
          <Text style={styles.subtitle}>
            Enter the OTP sent to {maskedPhone}
          </Text>
        ) : (
          <Text style={styles.subtitle}>Enter the OTP sent to your mobile</Text>
        )}

        <TextInput
          style={styles.otpInput}
          placeholder="••••••"
          placeholderTextColor="#8C8C8C"
          keyboardType="numeric"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          textAlign="center"
        />

        <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
          <Text style={styles.verifyButtonText}>Verify & Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.changeNumberText}>Change mobile number</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default OTPScreen;

// =============== STYLES ===============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // top brand
  brandWrapper: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.12,
    marginBottom: SCREEN_HEIGHT * 0.04,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  textDigital: {
    fontSize: 22,
    fontWeight: '800',
    color: '#B6B6B6',
  },
  textKalakar: {
    marginTop: -2,
    fontSize: 28,
    fontWeight: '900',
    color: '#FFD54A',
  },

  // OTP form
  formWrapper: {
    width: SCREEN_WIDTH * 0.9,
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 24,
  },
  otpInput: {
    fontSize: 24,
    color: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderColor: '#777777',
    marginBottom: 32,
    letterSpacing: 12,
  },
  verifyButton: {
    backgroundColor: '#FFD54A',
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  changeNumberText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 15,
  },
});

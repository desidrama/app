// src/screens/auth/OTPScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { verifyOTP, sendOTP } from '../../services/api';
import { setToken } from '../../redux/slices/authSlice';
import * as storage from '../../utils/storage';

const logoImage = require('../../../assets/App Logo.png');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OTPScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();

  const phone: string = route.params?.phone || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const otpInputRef = useRef<TextInput>(null);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Auto-focus on mount
  useEffect(() => {
    setTimeout(() => {
      otpInputRef.current?.focus();
    }, 500);
  }, []);

  const handleVerify = async () => {
    if (otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the complete OTP.');
      return;
    }

    try {
      setLoading(true);
      
      const response = await verifyOTP(phone, otp);

      console.log('✅ Verify OTP Response:', response);

      if (response?.success === false) {
        Alert.alert('Verification Failed', response?.message || 'Invalid OTP');
        setLoading(false);
        setOtp(''); // Clear OTP field
        return;
      }

      // Extract token and user data
      const token = response?.data?.token;
      const refreshToken = response?.data?.refreshToken;
      const user = response?.data?.user;

      if (!token) {
        Alert.alert('Error', 'Authentication token not received. Please try again.');
        setLoading(false);
        return;
      }

      // Store tokens and user data in AsyncStorage
      await storage.setToken(token);
      if (refreshToken) {
        await storage.setRefreshToken(refreshToken);
      }
      if (user) {
        await storage.setUser(JSON.stringify(user));
      }

      // Dispatch Redux action to update authentication state
      dispatch(
        setToken({
          token,
          refreshToken,
          user,
        })
      );

      console.log('✅ Login successful:', user);
      
      setLoading(false);
      
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });

    } catch (error: any) {
      setLoading(false);
      console.error('❌ Verify OTP error:', error);
      
      if (error.response) {
        // Server responded with error
        const message = error.response.data?.message || 'Invalid OTP. Please try again.';
        Alert.alert('Verification Failed', message);
        setOtp(''); // Clear OTP field
      } else if (error.request) {
        // No response from server
        Alert.alert(
          'Network Error', 
          'Unable to connect to server. Please check your internet connection.'
        );
      } else {
        // Other errors
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      setResending(true);
      
      const response = await sendOTP(phone);

      console.log('✅ Resend OTP Response:', response);
      
      setResending(false);

      if (response?.success === false) {
        Alert.alert('Error', response?.message || 'Failed to resend OTP.');
        return;
      }

      // Reset timer and state
      setTimer(60);
      setCanResend(false);
      setOtp('');
      
      // Show dev OTP in development
      if (response?.devOtp && __DEV__) {
        console.log('🔐 DEV OTP:', response.devOtp);
        Alert.alert(
          'OTP Resent',
          `A new OTP has been sent to your WhatsApp.\n\n(Dev OTP: ${response.devOtp})`
        );
      } else {
        Alert.alert(
          'OTP Resent',
          'A new OTP has been sent to your WhatsApp.'
        );
      }

    } catch (error: any) {
      setResending(false);
      console.error('❌ Resend OTP error:', error);
      
      if (error.response) {
        Alert.alert('Error', error.response.data?.message || 'Failed to resend OTP.');
      } else if (error.request) {
        Alert.alert('Network Error', 'Unable to connect to server.');
      } else {
        Alert.alert('Error', 'Failed to resend OTP. Please try again.');
      }
    }
  };

  const maskedPhone =
    phone && phone.length === 10
      ? `+91 ${phone.slice(0, 2)}*****${phone.slice(7)}`
      : `+91 ${phone}`;

  const formatOTP = (text: string) => {
    // Only allow digits
    return text.replace(/\D/g, '').slice(0, 6);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.brandWrapper}>
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
        <View style={styles.textContainer}>
          <Text style={styles.textDigital}>digital</Text>
          <Text style={styles.textKalakar}>कलाकार</Text>
        </View>
      </View>

      <View style={styles.formWrapper}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>
          Enter the OTP sent to {maskedPhone}
        </Text>

        <TextInput
          ref={otpInputRef}
          style={styles.otpInput}
          placeholder="Enter 6-digit OTP"
          placeholderTextColor="#8C8C8C"
          keyboardType="numeric"
          maxLength={6}
          value={otp}
          onChangeText={(text) => setOtp(formatOTP(text))}
          textAlign="center"
          editable={!loading}
          autoFocus
        />

        <TouchableOpacity
          style={[
            styles.verifyButton, 
            (loading || otp.length < 4) && styles.verifyButtonDisabled
          ]}
          onPress={handleVerify}
          disabled={loading || otp.length < 4}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendWrapper}>
          {!canResend ? (
            <Text style={styles.timerText}>
              Resend OTP in {timer}s
            </Text>
          ) : (
            <TouchableOpacity 
              onPress={handleResendOTP}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator size="small" color="#FFD54A" />
              ) : (
                <Text style={styles.resendText}>Resend OTP</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.changeNumberButton}
        >
          <Text style={styles.changeNumberText}>Change mobile number</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default OTPScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000' 
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  brandWrapper: { 
    alignItems: 'center', 
    marginTop: SCREEN_HEIGHT * 0.12, 
    marginBottom: SCREEN_HEIGHT * 0.04 
  },
  logo: { 
    width: 80, 
    height: 80, 
    marginBottom: 8 
  },
  textContainer: { 
    alignItems: 'center' 
  },
  textDigital: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#B6B6B6' 
  },
  textKalakar: { 
    marginTop: -2, 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#FFD54A' 
  },
  formWrapper: { 
    width: SCREEN_WIDTH * 0.9, 
    alignSelf: 'center' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 14, 
    color: '#CCCCCC', 
    marginBottom: 32 
  },
  otpInput: { 
    fontSize: 28, 
    color: '#FFFFFF', 
    paddingVertical: 16, 
    borderBottomWidth: 2, 
    borderColor: '#FFD54A', 
    marginBottom: 32, 
    letterSpacing: 12,
    fontWeight: '600',
  },
  verifyButton: { 
    backgroundColor: '#FFD54A', 
    paddingVertical: 14, 
    borderRadius: 40, 
    alignItems: 'center', 
    marginBottom: 24 
  },
  verifyButtonDisabled: {
    backgroundColor: '#665522',
    opacity: 0.6,
  },
  verifyButtonText: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#000000' 
  },
  resendWrapper: {
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 24,
  },
  timerText: {
    color: '#999999',
    fontSize: 14,
  },
  resendText: {
    color: '#FFD54A',
    fontSize: 16,
    fontWeight: '600',
  },
  changeNumberButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  changeNumberText: { 
    textAlign: 'center', 
    color: '#FFFFFF', 
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
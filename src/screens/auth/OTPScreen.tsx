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
import { verifyOTP, sendOTP, updateFcmToken } from '../../services/api';
import { setToken } from '../../redux/slices/authSlice';
import * as storage from '../../utils/storage';
import { getFcmToken } from '../../utils/fcm';
import { collectClientMetadata } from '../../utils/metadata';


const logoImage = require('../../../assets/App Logo.png');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const OTP_BOX_WIDTH = Math.min(SCREEN_WIDTH * 0.12, 55);

const OTPScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();

  const phone: string = route.params?.phone || '';
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  
  const otpInputRefs = useRef<Array<TextInput | null>>([]);
  const hiddenInputRef = useRef<TextInput | null>(null);

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
      otpInputRefs.current[0]?.focus();
    }, 500);
  }, []);

  // Handle OTP digit change
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digits = value.replace(/\D/g, '');
    
    // If multiple digits detected (paste event), handle paste and distribute
    if (digits.length > 1) {
      handlePaste(digits);
      return;
    }
    
    // Single digit input - take only the last character (handles edge cases)
    if (digits) {
      const digit = digits.slice(-1); // Take last character in case of edge cases
      const newOtpDigits = [...otpDigits];
      newOtpDigits[index] = digit;
      setOtpDigits(newOtpDigits);

      // Auto-focus next box
      if (index < 5) {
        otpInputRefs.current[index + 1]?.focus();
        setFocusedIndex(index + 1);
      }
    } else {
      // Clear current box
      const newOtpDigits = [...otpDigits];
      newOtpDigits[index] = '';
      setOtpDigits(newOtpDigits);
    }
  };

  // Handle paste from hidden input or any box
  const handleHiddenInputChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    if (digits.length > 0) {
      handlePaste(digits);
    }
  };

  // Handle backspace
  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  };

  // Handle paste - distributes digits across all boxes starting from index 0
  const handlePaste = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    const newOtpDigits = ['', '', '', '', '', ''];
    
    // Fill boxes starting from the beginning
    digits.forEach((digit, idx) => {
      if (idx < 6) {
        newOtpDigits[idx] = digit;
      }
    });
    
    setOtpDigits(newOtpDigits);
    
    // Clear hidden input
    if (hiddenInputRef.current) {
      hiddenInputRef.current.setNativeProps({ text: '' });
    }
    
    // Focus the last filled box or the last box
    const lastFilledIndex = Math.min(digits.length - 1, 5);
    setTimeout(() => {
      if (lastFilledIndex >= 0) {
        otpInputRefs.current[lastFilledIndex]?.focus();
        setFocusedIndex(lastFilledIndex);
      }
    }, 50);
  };

  // Get OTP string from digits array
  const getOtpString = () => otpDigits.join('');

  // Clear OTP boxes
  const clearOtp = () => {
    setOtpDigits(['', '', '', '', '', '']);
    setFocusedIndex(0);
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 100);
  };

  const handleVerify = async () => {
    const otp = getOtpString();
    
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);

      // Clear any cached auth/session data before a new login to avoid stale state
      await storage.clearAll();

      // Get FCM token (best effort)
      let fcmToken: string | undefined;
      try {
        fcmToken = await getFcmToken();
      } catch (tokenErr) {
        console.warn('⚠️ Could not fetch FCM token', tokenErr);
      }
      console.log('FCM token before verify:', fcmToken);
      

      const metadata = await collectClientMetadata();

      const response = await verifyOTP(phone, otp, fcmToken, metadata);

      console.log('✅ Verify OTP Response:', response);

      if (response?.success === false) {
        Alert.alert('Verification Failed', response?.message || 'Invalid OTP');

        setLoading(false);
        clearOtp(); // Clear OTP boxes
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

      // Ensure FCM token is stored on the backend after login (best effort)
      if (fcmToken) {
        try {
          await updateFcmToken(fcmToken);
        } catch (updateErr) {
          console.warn('⚠️ Could not update FCM token after login', updateErr);
        }
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
        clearOtp(); // Clear OTP boxes
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
      clearOtp();

      Alert.alert(
        'OTP Resent',
        'A new OTP has been sent to your WhatsApp.'
      );

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

        {/* Hidden input for iOS AutoFill and paste detection */}
        <TextInput
          ref={hiddenInputRef}
          style={styles.hiddenInput}
          value=""
          onChangeText={handleHiddenInputChange}
          keyboardType="numeric"
          maxLength={6}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          editable={!loading}
        />

        <View style={styles.otpContainer}>
          {otpDigits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                otpInputRefs.current[index] = ref;
              }}
              style={[
                styles.otpBox,
                focusedIndex === index && styles.otpBoxFocused,
                digit && styles.otpBoxFilled
              ]}
              value={digit}
              onChangeText={(text) => handleOtpChange(index, text)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="numeric"
              textAlign="center"
              editable={!loading}
              selectTextOnFocus
              onFocus={() => setFocusedIndex(index)}
              // Remove maxLength to allow paste - we handle validation in onChange
              maxLength={6}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.verifyButton, 
            (loading || getOtpString().length !== 6) && styles.verifyButtonDisabled
          ]}
          onPress={handleVerify}
          disabled={loading || getOtpString().length !== 6}
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
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
    left: -1000,
    zIndex: -1,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 5,
  },
  otpBox: {
    width: OTP_BOX_WIDTH,
    height: 65,
    borderWidth: 2,
    borderColor: '#777777',
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  otpBoxFocused: {
    borderColor: '#FFD54A',
    backgroundColor: '#2A2A2A',
    borderWidth: 2.5,
  },
  otpBoxFilled: {
    borderColor: '#FFD54A',
    backgroundColor: '#1F1F1F',
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
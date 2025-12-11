// src/screens/auth/LoginScreen.tsx
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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/api';

const logoImage = require('../../../assets/App Logo.png');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    // Remove all non-digits
    const onlyDigits = phone.replace(/\D/g, '');
    
    // Validate 10-digit number
    if (onlyDigits.length !== 10) {
      Alert.alert(
        'Invalid Number', 
        'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    // Validate starts with 6-9
    if (!/^[6-9]/.test(onlyDigits)) {
      Alert.alert(
        'Invalid Number', 
        'Mobile number must start with 6, 7, 8, or 9.'
      );
      return;
    }

    try {
      setLoading(true);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/send-otp`,
        { phone: onlyDigits },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      console.log('✅ Send OTP Response:', response.data);

      if (response.data?.success === false) {
        Alert.alert('Error', response.data?.message || 'Failed to send OTP');
        setLoading(false);
        return;
      }

      // Success - navigate to OTP screen
      setLoading(false);
      
      // Show dev OTP in development (if provided)
      if (response.data?.devOtp && __DEV__) {
        Alert.alert(
          'OTP Sent',
          `OTP has been sent to your WhatsApp.\n\n(Dev OTP: ${response.data.devOtp})`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('OTPScreen', { phone: onlyDigits })
            }
          ]
        );
      } else {
        Alert.alert(
          'OTP Sent',
          'OTP has been sent to your WhatsApp number.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('OTPScreen', { phone: onlyDigits })
            }
          ]
        );
      }

    } catch (error: any) {
      setLoading(false);
      
      if (error.response) {
        // Server responded with error
        const message = error.response.data?.message || 'Failed to send OTP';
        Alert.alert('Error', message);
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

  const formatPhoneNumber = (text: string) => {
    // Only allow digits
    const digits = text.replace(/\D/g, '');
    return digits.slice(0, 10);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.brandWrapper}>
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
        <View style={styles.textContainer}>
          <Text style={styles.textDigital}>digital</Text>
          <Text style={styles.textKalakar}>कलाकार</Text>
        </View>
      </View>

      <View style={styles.formWrapper}>
        <Text style={styles.inputLabel}>Mobile Number</Text>
        <View style={styles.phoneInputWrapper}>
          <Text style={styles.countryCode}>+91</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter mobile number"
            placeholderTextColor="#8C8C8C"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={(text) => setPhone(formatPhoneNumber(text))}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.otpButton, 
            loading && styles.otpButtonDisabled,
            phone.length !== 10 && styles.otpButtonDisabled
          ]}
          onPress={handleSendOtp}
          disabled={loading || phone.length !== 10}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.otpButtonText}>Send OTP</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000' 
  },
  brandWrapper: { 
    alignItems: 'center', 
    marginTop: SCREEN_HEIGHT * 0.12, 
    marginBottom: SCREEN_HEIGHT * 0.06 
  },
  logo: { 
    width: 90, 
    height: 90, 
    marginBottom: 8 
  },
  textContainer: { 
    alignItems: 'center' 
  },
  textDigital: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#B6B6B6' 
  },
  textKalakar: { 
    marginTop: -2, 
    fontSize: 30, 
    fontWeight: '900', 
    color: '#FFD54A' 
  },
  formWrapper: { 
    width: SCREEN_WIDTH * 0.9, 
    alignSelf: 'center' 
  },
  inputLabel: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    marginBottom: 12 
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.2,
    borderColor: '#777777',
    marginBottom: 28,
  },
  countryCode: {
    fontSize: 18,
    color: '#FFFFFF',
    marginRight: 8,
    paddingVertical: 10,
  },
  input: { 
    flex: 1,
    fontSize: 18, 
    color: '#FFFFFF', 
    paddingVertical: 10,
  },
  otpButton: { 
    backgroundColor: '#FFD54A', 
    paddingVertical: 14, 
    borderRadius: 40, 
    alignItems: 'center', 
    marginBottom: 16 
  },
  otpButtonDisabled: {
    backgroundColor: '#665522',
    opacity: 0.6,
  },
  otpButtonText: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#000000' 
  },
  termsText: { 
    textAlign: 'center', 
    color: '#999999', 
    fontSize: 12,
    paddingHorizontal: 20,
  },
});
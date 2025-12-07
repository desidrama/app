// ============================================
// FILE: src/screens/auth/LoginScreen.tsx
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

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // if coming from splash with phone param
  const [phone, setPhone] = useState<string>(route.params?.phone || '');

  const handleSendOtp = () => {
    const onlyDigits = phone.replace(/\D/g, '');
    if (onlyDigits.length !== 10) {
      Alert.alert('Invalid number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    navigation.navigate('OTPScreen', { phone: onlyDigits });
  };

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

      {/* Form in the middle */}
      <View style={styles.formWrapper}>
        <Text style={styles.inputLabel}>Mobile Number</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter mobile number"
          placeholderTextColor="#8C8C8C"
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
        />

        <TouchableOpacity style={styles.otpButton} onPress={handleSendOtp}>
          <Text style={styles.otpButtonText}>Send OTP</Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.signupText}>New user? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

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
    marginBottom: SCREEN_HEIGHT * 0.06,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  textDigital: {
    fontSize: 24,
    fontWeight: '800',
    color: '#B6B6B6',
  },
  textKalakar: {
    marginTop: -2,
    fontSize: 30,
    fontWeight: '900',
    color: '#FFD54A',
  },

  // center form
  formWrapper: {
    width: SCREEN_WIDTH * 0.9,
    alignSelf: 'center',
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    fontSize: 18,
    color: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1.2,
    borderColor: '#777777',
    marginBottom: 28,
  },
  otpButton: {
    backgroundColor: '#FFD54A',
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: 'center',
    marginBottom: 24,
  },
  otpButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  signupText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 15,
  },
});

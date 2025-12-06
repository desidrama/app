// src/screens/Splash/splashscreen.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Text,
} from 'react-native';
import { COLORS } from '../../utils/constants';

const splashBg = require('../../../assets/splash-bg.jpeg');
const logoImage = require('../../../assets/App Logo.jpeg');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Only Y offset to avoid layout animation issues
const GROUP_Y_OFFSET = SCREEN_HEIGHT * 0.22;

const SplashScreen: React.FC = () => {

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;

  const groupTranslateY = useRef(new Animated.Value(0)).current;

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const logoIn = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      }),
    ]);

    const textIn = Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(textTranslateY, {
        toValue: 0,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]);

    const moveDown = Animated.parallel([
      Animated.timing(groupTranslateY, {
        toValue: GROUP_Y_OFFSET,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    Animated.sequence([logoIn, textIn, moveDown]).start(() => {
      setShowLogin(true);
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });

  }, []);

  return (
    <View style={styles.container}>
      
      {/* Background Image */}
      <Animated.Image
        source={splashBg}
        resizeMode="cover"
        style={[styles.bgImage, { opacity: bgOpacity }]}
      />

      {/* Curved Bottom Login Card */}
      <Animated.View style={[styles.bottomCard, { opacity: bgOpacity }]} />

      {/* Centered Logo + Text */}
      <Animated.View
        style={[
          styles.brandGroup,
          {
            transform: [
              { translateY: groupTranslateY },
            ],
          },
        ]}
      >
        <Animated.Image
          source={logoImage}
          resizeMode="contain"
          style={[
            styles.logo,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        />

        <View style={styles.textContainer}>
          <Animated.Text
            style={[
              styles.textDigital,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            digital
          </Animated.Text>

          <Animated.Text
            style={[
              styles.textKalakar,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            कलाकार
          </Animated.Text>
        </View>
      </Animated.View>

      {/* LOGIN UI */}
      {showLogin && (
        <Animated.View style={[styles.loginWrapper, { opacity: cardOpacity }]}>
          <Text style={styles.inputLabel}>Mobile Number</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter mobile number"
            placeholderTextColor="#6F6F6F"
            keyboardType="phone-pad"
          />

          <TouchableOpacity style={styles.otpButton}>
            <Text style={styles.otpButtonText}>Send OTP</Text>
          </TouchableOpacity>

          <TouchableOpacity>
            <Text style={styles.signupText}>New user? Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

export default SplashScreen;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },

  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: '#050816',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },

  brandGroup: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.35,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    width: 75,
    height: 75,
    marginRight: 10,
  },

  textContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  textDigital: {
    fontSize: 22,
    fontWeight: '700',
    color: '#666A6F',
  },

  textKalakar: {
    marginTop: -4,
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
  },

  loginWrapper: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.05,
    width: SCREEN_WIDTH * 0.9,
    alignSelf: 'center',
  },

  inputLabel: {
    color: '#fff',
    marginBottom: 6,
    fontSize: 16,
    fontWeight: '600',
  },

  input: {
    height: 50,
    borderBottomWidth: 1.5,
    borderBottomColor: '#777',
    marginBottom: 20,
    color: '#fff',
    fontSize: 18,
  },

  otpButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 12,
  },

  otpButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },

  signupText: {
    textAlign: 'center',
    color: '#fff',
    marginTop: 18,
  },
});

// ============================================
// FILE: src/screens/Splash/splashscreen.tsx
// ============================================
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Text,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const splashBg = require('../../../assets/splash-bg.jpeg');
const logoImage = require('../../../assets/App Logo.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// how far logo+text move from center
const GROUP_Y_OFFSET = SCREEN_HEIGHT * 0.12; // down move
const GROUP_X_OFFSET = -SCREEN_WIDTH * 0.2;  // left move

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  // 1) logo animation
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;

  // 2) text animation
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;

  // 3) group movement (logo + text)
  const groupTranslateY = useRef(new Animated.Value(0)).current;
  const groupTranslateX = useRef(new Animated.Value(0)).current;

  // 4) overlay + login + black strip
  const overlayOpacity = useRef(new Animated.Value(1)).current; // black -> transparent
  const loginOpacity = useRef(new Animated.Value(0)).current;
  const bottomStripOpacity = useRef(new Animated.Value(0)).current;

  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Phase 1 – logo only
    const logoIn = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1)),
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1)),
      }),
    ]);

    // Phase 2 – text with "hiccup" bounce
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

    // Phase 3 – move group + fade overlay
    const moveDownAndReveal = Animated.parallel([
      Animated.timing(groupTranslateY, {
        toValue: GROUP_Y_OFFSET,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(groupTranslateX, {
        toValue: GROUP_X_OFFSET,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0, // remove full black, show posters
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    Animated.sequence([logoIn, textIn, moveDownAndReveal]).start(() => {
      setShowLogin(true);

      // Phase 4 – fade in bottom black strip + login
      Animated.parallel([
        Animated.timing(bottomStripOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(loginOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [
    logoOpacity,
    logoScale,
    textOpacity,
    textTranslateY,
    groupTranslateY,
    groupTranslateX,
    overlayOpacity,
    loginOpacity,
    bottomStripOpacity,
  ]);

  // 👉 tap anywhere on "Enter mobile number" or Send OTP -> go to Login
  const goToLogin = () => {
    navigation.replace('Login');
  };

  return (
    <ImageBackground source={splashBg} style={styles.bg} resizeMode="cover">
      {/* Full black overlay that fades away */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />

      {/* Bottom black strip (behind logo + login) */}
      <Animated.View
        style={[styles.bottomStrip, { opacity: bottomStripOpacity }]}
      />

      {/* Logo + text: center -> down-left */}
      <View style={styles.brandWrapper}>
        <Animated.View
          style={[
            styles.brandGroup,
            {
              transform: [
                { translateY: groupTranslateY },
                { translateX: groupTranslateX },
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
      </View>

      {/* Login section – anchored to bottom, over black strip */}
      {showLogin && (
        <Animated.View style={[styles.loginSection, { opacity: loginOpacity }]}>
          <Text style={styles.inputLabel}>Mobile Number</Text>

          {/* Fake input: tap -> go to Login screen */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.fakeInput}
            onPress={goToLogin}
          >
            <Text style={styles.fakeInputText}>Enter mobile number</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.otpButton} onPress={goToLogin}>
            <Text style={styles.otpButtonText}>Send OTP</Text>
          </TouchableOpacity>

          <TouchableOpacity>
            <Text style={styles.signupText}>New user? Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ImageBackground>
  );
};

export default SplashScreen;

// =============== STYLES ===============

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },

  // black strip at bottom behind logo + login
  bottomStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.45, // covers bottom ~45%
    backgroundColor: '#000',
  },

  // Center brand initially
  brandWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  logo: {
    width: 80,
    height: 80,
    marginRight: -14, // closer to text
  },
  textContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  textDigital: {
    fontSize: 24,
    fontWeight: '800',
    color: '#B6B6B6',
  },
  textKalakar: {
    marginTop: -8,
    fontSize: 30,
    fontWeight: '900',
    color: '#FFD54A',
  },

  // Login block pinned to bottom (no overlap with logo)
  loginSection: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.06,   // ~6% from bottom
    width: SCREEN_WIDTH * 0.9,
    alignSelf: 'center',
    zIndex: 3,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },

  // fake input that looks like a TextInput
  fakeInput: {
    paddingVertical: 10,
    borderBottomWidth: 1.2,
    borderColor: '#777777',
    marginBottom: 26,
  },
  fakeInputText: {
    fontSize: 18,
    color: '#8C8C8C',
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

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Alert,
  Switch,
  Dimensions,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { logout as logoutAPI, getUserProfile, updateProfile } from '../../services/api';
import { RootState } from '../../redux/store';
import { logout } from '../../redux/slices/authSlice';
import { setUser } from '../../redux/slices/userSlice';
import { getToken } from '../../utils/storage';
import { COLORS, TAB_COLORS } from '../../utils/constants';
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

// Generate a random username
const generateRandomUsername = (): string => {
  const adjectives = ['Cool', 'Swift', 'Bright', 'Bold', 'Smart', 'Fast', 'Brave', 'Wise', 'Sharp', 'Elite'];
  const nouns = ['Tiger', 'Eagle', 'Wolf', 'Lion', 'Falcon', 'Panther', 'Hawk', 'Dragon', 'Phoenix', 'Viper'];
  const numbers = Math.floor(Math.random() * 9999) + 1;
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}${noun}${numbers}`;
};

export default function ProfileScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { theme, toggleTheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.user.profile);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userCoins = user?.coinsBalance ?? user?.coins ?? 0;
  const [autoPlay, setAutoPlay] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [username, setUsername] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [editingUsername, setEditingUsername] = useState<string>('');
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Predefined list of avatars
  const AVATAR_LIST = [
    '🔵', // Blue circle - default
    '👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓',
    '👨‍⚕️', '👩‍⚕️', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀',
    '🦸', '🦸‍♀️', '🧙', '🧙‍♀️', '🧚', '🧚‍♀️', '🧛', '🧛‍♀️',
    '🎭', '🤖', '👽', '👾', '🤡', '😎', '🥷', '🕵️',
  ];

  // Initialize with blue emoji as default
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🔵');

  const handleAvatarPress = () => {
    setAvatarModalVisible(true);
  };

  const handleUsernamePress = () => {
    setEditingUsername(username || '');
    setUsernameModalVisible(true);
  };

  const handleSaveUsername = async () => {
    if (editingUsername.trim().length > 0) {
      try {
        setSaving(true);
        await updateProfile({ username: editingUsername.trim() });
        setUsername(editingUsername.trim());
        setUsernameModalVisible(false);
        // Update Redux store
        const response = await getUserProfile();
        if (response.success && response.data) {
          dispatch(setUser(response.data));
        }
      } catch (error: any) {
        console.error('Error saving username:', error);
        Alert.alert('Error', 'Failed to save username. Please try again.');
      } finally {
        setSaving(false);
      }
    } else {
      Alert.alert('Invalid Username', 'Username cannot be empty');
    }
  };

  const handleSelectAvatar = async (avatar: string) => {
    try {
      setSaving(true);
      await updateProfile({ profilePicture: avatar });
      setSelectedAvatar(avatar);
      setAvatarModalVisible(false);
      // Update Redux store
      const response = await getUserProfile();
      if (response.success && response.data) {
        dispatch(setUser(response.data));
      }
    } catch (error: any) {
      console.error('Error saving avatar:', error);
      Alert.alert('Error', 'Failed to save avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Fetch user profile data from database
  const fetchUserProfileData = useCallback(async () => {
    // Check if user is authenticated and token exists before making API call
    const token = await getToken();
    
    if (!isAuthenticated || !token) {
      setPhoneNumber(user?.phone || '');
      setUsername(user?.username || generateRandomUsername());
      setSelectedAvatar(user?.profilePicture || '🔵');
      return;
    }

    try {
      setLoading(true);
      const response = await getUserProfile();
      if (response.success && response.data) {
        const userData = response.data;
        setPhoneNumber(userData.phone || '');
        // Set username from database or generate one if not exists
        if (userData.username) {
          setUsername(userData.username);
        } else {
          // Generate and save a username if it doesn't exist
          const generatedUsername = generateRandomUsername();
          setUsername(generatedUsername);
          try {
            await updateProfile({ username: generatedUsername });
          } catch (error) {
            console.error('Error saving generated username:', error);
          }
        }
        // Set avatar from database or use default
        setSelectedAvatar(userData.profilePicture || '🔵');
        // Update Redux store with latest user data
        dispatch(setUser(userData));
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      // Fallback to Redux store data if API fails
      setPhoneNumber(user?.phone || '');
      setUsername(user?.username || generateRandomUsername());
      setSelectedAvatar(user?.profilePicture || '🔵');
      
      // If it's a 401 error, the user might need to login again
      if (error.response?.status === 401) {
        console.warn('Authentication failed, user may need to login again');
      }
    } finally {
      setLoading(false);
    }
  }, [dispatch, isAuthenticated, user?.phone, user?.profilePicture, user?.username]);

  useEffect(() => {
    fetchUserProfileData();
  }, [fetchUserProfileData]);

  const {
    refreshing,
    onRefresh,
    handleScroll: handlePullScroll,
    pullDistance,
    threshold,
  } = usePullToRefresh(fetchUserProfileData, { completionDelayMs: 750 });

  const profileData = {
    name: username || user?.username || '',
    phone: phoneNumber || user?.phone || '',
    avatar: selectedAvatar || user?.profilePicture || '🔵',
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call logout API to clear server-side session
              await logoutAPI();
            } catch (error) {
              console.error('Logout API error:', error);
              // Continue with logout even if API fails
            } finally {
              // Clear Redux state - AppNavigator will handle navigation to Login screen
              dispatch(logout());
              dispatch(setUser(null));
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />

      {/* Pull-to-Refresh Indicator */}
      {(pullDistance > 0 || refreshing) && (
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          threshold={threshold}
          refreshing={refreshing}
          color="#FFC107"
          topOffset={60}
        />
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handlePullScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFC107"
            colors={["#FFC107"]}
            progressViewOffset={-1000}
          />
        }
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarEmoji}>{selectedAvatar}</Text>
            <View style={styles.avatarEditIndicator}>
              <Ionicons name="camera" size={16} color="#1A1A1A" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleUsernamePress}
            activeOpacity={0.7}
          >
            <View style={styles.usernameContainer}>
              <Text style={styles.usernameText}>{username || 'Loading...'}</Text>
              <Ionicons name="create-outline" size={18} color="#FFC107" style={styles.editIcon} />
            </View>
          </TouchableOpacity>
        </View>
       
        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletContent}>
            <Text style={styles.walletTitle}>Balance</Text>
            <View style={styles.walletBadge}>
              <FontAwesome5 name="coins" size={18} color="#FFC107" />
              <Text style={styles.walletBadgeText}>{userCoins}</Text>
            </View>
          </View>
        </View>
        
        {/* Settings Card */}
        <View style={styles.settingsCard}>
          {/* Phone Number Row */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="call-outline" size={20} color="#FFC107" style={styles.settingIcon} />
              <Text style={styles.settingLabel}>Phone Number</Text>
            </View>
            {loading ? (
              <Text style={styles.settingValue}>Loading...</Text>
            ) : (
              <Text style={styles.settingValue}>{profileData.phone || 'N/A'}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* AutoPlay Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="play-circle-outline" size={20} color="#FFC107" style={styles.settingIcon} />
              <Text style={styles.settingLabel}>AutoPlay</Text>
            </View>
            <Switch
              value={autoPlay}
              onValueChange={setAutoPlay}
              trackColor={{ false: '#333333', true: '#FFC107' }}
              thumbColor={autoPlay ? '#FFC107' : '#f4f3f4'}
              ios_backgroundColor="#333333"
              style={styles.toggle}
            />
          </View>

          <View style={styles.divider} />

          {/* Notifications Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color="#FFC107" style={styles.settingIcon} />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#333333', true: '#FFC107' }}
              thumbColor={notifications ? '#FFC107' : '#f4f3f4'}
              ios_backgroundColor="#333333"
              style={styles.toggle}
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="gift-outline"
            title="Earn Rewards"
            onPress={() => {
              navigation.navigate('Rewards', {
                transition: 'slide_from_bottom',
              });
            }}
          />
          <MenuItem
            icon="list-outline"
            title="My Watchlist"
            onPress={() => {
              navigation.navigate('Home');
            }}
          />
          {/* <MenuItem
            icon="settings-outline"
            title="App Settings"
            onPress={() => {}}
          />
          <MenuItem
            icon="language-outline"
            title="Language Preferences"
            onPress={() => {}}
          /> */}
          <MenuItem
            icon="help-circle-outline"
            title="Help Centre"
            onPress={() => setHelpModalVisible(true)}
          />
          <MenuItem
            icon="log-out-outline"
            title="Log out"
            onPress={handleLogout}
            isLogout={true}
          />
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.footerText}>Terms & Conditions</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}> | </Text>
          <Text style={styles.footerText}>Version: 1.3.4 (159)</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Avatar Selection Modal */}
      <Modal
        visible={avatarModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Your Avatar</Text>
              <TouchableOpacity
                onPress={() => setAvatarModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView 
              contentContainerStyle={styles.avatarGrid}
              showsVerticalScrollIndicator={false}
            >
              {AVATAR_LIST.map((avatar, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.avatarGridOption,
                    selectedAvatar === avatar && styles.avatarGridOptionSelected
                  ]}
                  onPress={() => handleSelectAvatar(avatar)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.avatarGridEmoji}>{avatar}</Text>
                  {selectedAvatar === avatar && (
                    <View style={styles.selectedCheckmark}>
                      <Ionicons name="checkmark-circle" size={24} color="#FFC107" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Username Edit Modal */}
      <Modal
        visible={usernameModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUsernameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Username</Text>
              <TouchableOpacity
                onPress={() => setUsernameModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.usernameInputContainer}>
              <TextInput
                style={styles.usernameInput}
                value={editingUsername}
                onChangeText={setEditingUsername}
                placeholder="Enter username"
                placeholderTextColor="#999"
                maxLength={30}
                autoFocus={true}
              />
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveUsername}
                activeOpacity={0.8}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Centre Modal */}
      <Modal
        visible={helpModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.helpModalOverlay}>
          <View style={styles.helpModalContainer}>
            <TouchableOpacity
              style={styles.helpCloseButton}
              onPress={() => setHelpModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.helpModalHeader}>
              <Ionicons name="help-circle" size={40} color="#FFC107" />
              <Text style={styles.helpModalTitle}>Help & Support</Text>
              <Text style={styles.helpModalSubtitle}>Get in touch with us</Text>
            </View>

            <View style={styles.helpItemsContainer}>
              {/* Email Item */}
              <TouchableOpacity
                style={styles.helpCard}
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert('Email', 'Email address copied to clipboard', [{ text: 'OK' }]);
                }}
              >
                <View style={styles.helpCardContent}>
                  <View style={[styles.helpIconWrapper, styles.helpEmailIcon]}>
                    <Ionicons name="mail" size={24} color="#FF6B6B" />
                  </View>
                  <View style={styles.helpTextContainer}>
                    <Text style={styles.helpCardLabel}>Email Support</Text>
                    <Text style={styles.helpCardValue}>teammicrokahani@gmail.com</Text>
                    <Text style={styles.helpCardSubtext}>Click to copy</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFC107" />
              </TouchableOpacity>

              {/* Phone Item */}
              <TouchableOpacity
                style={styles.helpCard}
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert('Phone', 'Phone number copied to clipboard', [{ text: 'OK' }]);
                }}
              >
                <View style={styles.helpCardContent}>
                  <View style={[styles.helpIconWrapper, styles.helpPhoneIcon]}>
                    <Ionicons name="call" size={24} color="#4ECDC4" />
                  </View>
                  <View style={styles.helpTextContainer}>
                    <Text style={styles.helpCardLabel}>Phone Support</Text>
                    <Text style={styles.helpCardValue}>+91 9876543210</Text>
                    <Text style={styles.helpCardSubtext}>Click to copy</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFC107" />
              </TouchableOpacity>
            </View>

            <View style={styles.helpFooter}>
              <Text style={styles.helpFooterText}>
                We're here to help! Reach out anytime.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const MenuItem = ({ icon, title, onPress, isLogout = false }: any) => (
  <TouchableOpacity 
    style={[
      styles.menuItem, 
      isLogout && styles.menuItemLogout
    ]} 
    onPress={onPress} 
    activeOpacity={0.7}
  >
    <View style={styles.menuItemLeft}>
      <Ionicons name={icon} size={20} color={isLogout ? '#EF4444' : '#FFC107'} />
      <Text style={[styles.menuItemText, isLogout && styles.menuItemTextLogout]}>{title}</Text>
    </View>
    {!isLogout && <Ionicons name="chevron-forward" size={20} color="#999" />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 24,
    marginBottom: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    marginBottom: 24,
    width: '100%',
  },
  avatarContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#252525',
    borderWidth: 3,
    borderColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 70,
  },
  avatarEditIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1A1A1A',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  usernameText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFF',
    marginRight: 10,
    letterSpacing: 0.5,
  },
  editIcon: {
    marginLeft: 4,
  },
  walletCard: {
    width: width - 40,
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    backgroundColor: '#252525',
    borderWidth: 1.5,
    borderColor: '#FFC107',
  },
  walletContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  walletTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  walletBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFC107',
  },
  settingsCard: {
    width: width - 40,
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 24,
    overflow: 'hidden',
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 56,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 14,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.2,
    color: '#FFF',
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginHorizontal: 20,
  },
  toggle: {
    transform: [{ scaleX: 1.0 }, { scaleY: 1.0 }],
  },
  menuSection: {
    width: width - 40,
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: 24,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 56,
    backgroundColor: '#252525',
    borderColor: '#333',
  },
  menuItemLogout: {
    borderColor: '#EF444440',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: '#FFF',
  },
  menuItemTextLogout: {
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#252525',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 20,
    gap: 12,
  },
  avatarGridOption: {
    width: (width - 80) / 4,
    height: (width - 80) / 4,
    borderRadius: (width - 80) / 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarGridOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFC107',
    backgroundColor: '#252525',
  },
  avatarGridEmoji: {
    fontSize: 40,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  usernameInputContainer: {
    padding: 20,
  },
  usernameInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    color: '#FFF',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#FFC107',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  helpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpModalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#252525',
    borderRadius: 28,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: '#FFC107',
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  helpCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  helpModalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  helpModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 12,
    letterSpacing: 0.3,
  },
  helpModalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
    marginTop: 6,
  },
  helpItemsContainer: {
    gap: 14,
    marginBottom: 24,
  },
  helpCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#333',
  },
  helpCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  helpIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpEmailIcon: {
    backgroundColor: '#FF6B6B20',
  },
  helpPhoneIcon: {
    backgroundColor: '#4ECDC420',
  },
  helpTextContainer: {
    flex: 1,
  },
  helpCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  helpCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  helpCardSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFC107',
  },
  helpFooter: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  helpFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  bottomSpacer: {
    height: 20,
  },
});
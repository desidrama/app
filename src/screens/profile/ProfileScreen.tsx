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
import { Ionicons } from '@expo/vector-icons';
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
  const user = useSelector((state: RootState) => state.user.profile);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [autoPlay, setAutoPlay] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [username, setUsername] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [editingUsername, setEditingUsername] = useState<string>('');

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

  // Create dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    background: {
      backgroundColor: colors.background,
    },
    cardBg: {
      backgroundColor: colors.surface,
    },
    cardText: {
      color: colors.textPrimary,
    },
    textPrimary: {
      color: colors.textPrimary,
    },
    textSecondary: {
      color: colors.textSecondary,
    },
    accentGold: {
      color: colors.yellow,
    },
    accentRed: {
      color: colors.error,
    },
    border: {
      borderColor: colors.borderLight,
    },
  });

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
    <View style={[styles.container, dynamicStyles.background]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />

      {/* Pull-to-Refresh Indicator */}
      {(pullDistance > 0 || refreshing) && (
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          threshold={threshold}
          refreshing={refreshing}
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
            tintColor="#050509"
            colors={['#050509']}
            progressViewOffset={-1000}
          />
        }
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={[styles.avatarContainer, { backgroundColor: colors.surface, borderColor: colors.yellow }]}
            onPress={handleAvatarPress}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarEmoji}>{selectedAvatar}</Text>
            <View style={[styles.avatarEditIndicator, { backgroundColor: colors.yellow, borderColor: colors.background }]}>
              <Ionicons name="camera" size={16} color={colors.textPrimary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleUsernamePress}
            activeOpacity={0.7}
          >
            <View style={styles.usernameContainer}>
              <Text style={[styles.usernameText, { color: colors.textPrimary }]}>{username || 'Loading...'}</Text>
              <Ionicons name="create-outline" size={18} color={colors.yellow} style={styles.editIcon} />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Settings Card */}
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {/* Phone Number Row */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="call-outline" size={20} color={colors.yellow} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Phone Number</Text>
            </View>
            {loading ? (
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Loading...</Text>
            ) : (
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{profileData.phone || 'N/A'}</Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* AutoPlay Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="play-circle-outline" size={20} color={colors.yellow} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>AutoPlay</Text>
            </View>
            <Switch
              value={autoPlay}
              onValueChange={setAutoPlay}
              trackColor={{ false: '#333333', true: colors.yellow }}
              thumbColor={autoPlay ? '#FFFFFF' : '#f4f3f4'}
              ios_backgroundColor="#333333"
              style={styles.toggle}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Notifications Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.yellow} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#333333', true: colors.yellow }}
              thumbColor={notifications ? '#FFFFFF' : '#f4f3f4'}
              ios_backgroundColor="#333333"
              style={styles.toggle}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Theme Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name={theme === 'dark' ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.yellow} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{theme === 'dark' ? 'Dark' : 'Light'} Theme</Text>
            </View>
            <Switch
              value={theme === 'light'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#333333', true: colors.yellow }}
              thumbColor={theme === 'light' ? '#FFFFFF' : '#f4f3f4'}
              ios_backgroundColor="#333333"
              style={styles.toggle}
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() => {}}
            colors={colors}
          />
          <MenuItem
            icon="information-circle-outline"
            title="About"
            onPress={() => {}}
            colors={colors}
          />
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.error + '40' }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
          </TouchableOpacity>
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Choose Your Avatar</Text>
              <TouchableOpacity
                onPress={() => setAvatarModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: colors.background }]}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
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
                    { backgroundColor: colors.background, borderColor: colors.borderLight },
                    selectedAvatar === avatar && { ...styles.avatarGridOptionSelected, backgroundColor: colors.surface, borderColor: colors.yellow }
                  ]}
                  onPress={() => handleSelectAvatar(avatar)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.avatarGridEmoji}>{avatar}</Text>
                  {selectedAvatar === avatar && (
                    <View style={[styles.selectedCheckmark, { backgroundColor: colors.background }]}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.yellow} />
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Username</Text>
              <TouchableOpacity
                onPress={() => setUsernameModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: colors.background }]}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.usernameInputContainer}>
              <TextInput
                style={[styles.usernameInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.borderLight }]}
                value={editingUsername}
                onChangeText={setEditingUsername}
                placeholder="Enter username"
                placeholderTextColor={colors.textSecondary}
                maxLength={30}
                autoFocus={true}
              />
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.yellow }, saving && styles.saveButtonDisabled]}
                onPress={handleSaveUsername}
                activeOpacity={0.8}
                disabled={saving}
              >
                <Text style={[styles.saveButtonText, { color: colors.background }]}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const MenuItem = ({ icon, title, onPress, colors }: any) => (
  <TouchableOpacity 
    style={[
      styles.menuItem, 
      { 
        backgroundColor: colors.surface, 
        borderColor: colors.borderLight
      }
    ]} 
    onPress={onPress} 
    activeOpacity={0.7}
  >
    <View style={styles.menuItemLeft}>
      <Ionicons name={icon} size={20} color={colors.yellow} />
      <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>{title}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    marginBottom: 12,
    width: '100%',
  },
  avatarContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  usernameText: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 10,
    letterSpacing: 0.3,
  },
  editIcon: {
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarGridOptionSelected: {
    borderWidth: 3,
  },
  avatarGridEmoji: {
    fontSize: 40,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
  },
  usernameInputContainer: {
    padding: 20,
  },
  usernameInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  saveButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  settingsCard: {
    width: width - 40,
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    width: '100%',
  },
  toggle: {
    transform: [{ scaleX: 1.0 }, { scaleY: 1.0 }],
  },
  menuSection: {
    width: width - 40,
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: 20,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 56,
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
  },
  logoutSection: {
    width: width - 40,
    maxWidth: 400,
    alignSelf: 'center',
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 56,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  bottomSpacer: {
    height: 32,
  },
});
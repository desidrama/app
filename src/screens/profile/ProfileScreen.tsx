import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { logout as logoutAPI, getUserProfile } from '../../services/api';
import { RootState } from '../../redux/store';
import { logout } from '../../redux/slices/authSlice';
import { setUser } from '../../redux/slices/userSlice';
import { getToken } from '../../utils/storage';
import { COLORS, TAB_COLORS } from '../../utils/constants';

const { width } = Dimensions.get('window');

const PROFILE_COLORS = {
  background: '#050509', // Match app theme
  cardBg: '#15151C', // Dark card background
  cardBgSecondary: '#221107', // Secondary card background
  cardText: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF', // Match app theme
  textTertiary: '#666666',
  accentGold: '#FFD54A', // Match app gold theme
  accentGoldDark: '#FFD700',
  accentRed: '#EF4444', // Match app danger color
  border: '#1F2933', // Match app border color
};

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
  const user = useSelector((state: RootState) => state.user.profile);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [autoPlay, setAutoPlay] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [randomUsername, setRandomUsername] = useState<string>(generateRandomUsername());
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
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

  const handleAvatarPress = () => {
    setAvatarModalVisible(true);
  };

  const handleUsernamePress = () => {
    setEditingUsername(randomUsername);
    setUsernameModalVisible(true);
  };

  const handleSaveUsername = () => {
    if (editingUsername.trim().length > 0) {
      setRandomUsername(editingUsername.trim());
      setUsernameModalVisible(false);
    } else {
      Alert.alert('Invalid Username', 'Username cannot be empty');
    }
  };

  const handleSelectAvatar = (avatar: string) => {
    setSelectedAvatar(avatar);
    setAvatarModalVisible(false);
  };

  // Fetch user phone number from database
  useEffect(() => {
    const fetchUserPhone = async () => {
      // Check if user is authenticated and token exists before making API call
      const token = await getToken();
      
      if (!isAuthenticated || !token) {
        console.log('User not authenticated or token not available, using Redux store data');
        setPhoneNumber(user?.phone || '');
        return;
      }

      try {
        setLoading(true);
        const response = await getUserProfile();
        if (response.success && response.data) {
          setPhoneNumber(response.data.phone || '');
          // Update Redux store with latest user data
          dispatch(setUser(response.data));
        }
      } catch (error: any) {
        console.error('Error fetching user profile:', error);
        // Fallback to Redux store phone if API fails
        setPhoneNumber(user?.phone || '');
        
        // If it's a 401 error, the user might need to login again
        if (error.response?.status === 401) {
          console.warn('Authentication failed, user may need to login again');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserPhone();
  }, [isAuthenticated, user?.phone]);

  const profileData = {
    name: randomUsername,
    phone: phoneNumber || user?.phone || '',
    avatar: user?.avatar || 'https://via.placeholder.com/150',
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PROFILE_COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
              <Ionicons name="camera" size={16} color={PROFILE_COLORS.textPrimary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleUsernamePress}
            activeOpacity={0.7}
          >
            <View style={styles.usernameContainer}>
              <Text style={styles.usernameText}>{randomUsername}</Text>
              <Ionicons name="create-outline" size={18} color={PROFILE_COLORS.accentGold} style={styles.editIcon} />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Settings Card */}
        <View style={styles.settingsCard}>
          {/* Phone Number Row */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="call-outline" size={20} color={PROFILE_COLORS.accentGold} style={styles.settingIcon} />
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
              <Ionicons name="play-circle-outline" size={20} color={PROFILE_COLORS.accentGold} style={styles.settingIcon} />
              <Text style={styles.settingLabel}>AutoPlay</Text>
            </View>
            <Switch
              value={autoPlay}
              onValueChange={setAutoPlay}
              trackColor={{ false: '#333333', true: PROFILE_COLORS.accentGold }}
              thumbColor={autoPlay ? '#FFFFFF' : '#f4f3f4'}
              ios_backgroundColor="#333333"
              style={styles.toggle}
            />
          </View>

          <View style={styles.divider} />

          {/* Notifications Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color={PROFILE_COLORS.accentGold} style={styles.settingIcon} />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#333333', true: PROFILE_COLORS.accentGold }}
              thumbColor={notifications ? '#FFFFFF' : '#f4f3f4'}
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
          />
          <MenuItem
            icon="information-circle-outline"
            title="About"
            onPress={() => {}}
          />
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={PROFILE_COLORS.accentRed} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
                <Ionicons name="close" size={24} color={PROFILE_COLORS.textPrimary} />
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
                      <Ionicons name="checkmark-circle" size={24} color={PROFILE_COLORS.accentGold} />
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
                <Ionicons name="close" size={24} color={PROFILE_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.usernameInputContainer}>
              <TextInput
                style={styles.usernameInput}
                value={editingUsername}
                onChangeText={setEditingUsername}
                placeholder="Enter username"
                placeholderTextColor={PROFILE_COLORS.textSecondary}
                maxLength={30}
                autoFocus={true}
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveUsername}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const MenuItem = ({ icon, title, onPress }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuItemLeft}>
      <Ionicons name={icon} size={20} color={PROFILE_COLORS.accentGold} />
      <Text style={styles.menuItemText}>{title}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={PROFILE_COLORS.textSecondary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PROFILE_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: PROFILE_COLORS.background,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PROFILE_COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: PROFILE_COLORS.cardBg,
    borderWidth: 3,
    borderColor: PROFILE_COLORS.accentGold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    backgroundColor: PROFILE_COLORS.accentGold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: PROFILE_COLORS.background,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  usernameText: {
    fontSize: 22,
    fontWeight: '700',
    color: PROFILE_COLORS.textPrimary,
    marginRight: 8,
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
    backgroundColor: PROFILE_COLORS.cardBg,
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
    borderBottomColor: PROFILE_COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PROFILE_COLORS.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PROFILE_COLORS.background,
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
    backgroundColor: PROFILE_COLORS.background,
    borderWidth: 2,
    borderColor: PROFILE_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarGridOptionSelected: {
    borderColor: PROFILE_COLORS.accentGold,
    borderWidth: 3,
    backgroundColor: PROFILE_COLORS.cardBgSecondary,
  },
  avatarGridEmoji: {
    fontSize: 40,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: PROFILE_COLORS.background,
    borderRadius: 12,
  },
  usernameInputContainer: {
    padding: 20,
  },
  usernameInput: {
    backgroundColor: PROFILE_COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: PROFILE_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.border,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: PROFILE_COLORS.accentGold,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: PROFILE_COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  settingsCard: {
    backgroundColor: PROFILE_COLORS.cardBg,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PROFILE_COLORS.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: PROFILE_COLORS.textPrimary,
    flex: 1,
  },
  settingValue: {
    fontSize: 15,
    color: PROFILE_COLORS.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: PROFILE_COLORS.border,
    marginHorizontal: 16,
  },
  toggle: {
    transform: [{ scaleX: 1.0 }, { scaleY: 1.0 }],
  },
  menuSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: PROFILE_COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: PROFILE_COLORS.textPrimary,
  },
  logoutSection: {
    paddingHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: PROFILE_COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.accentRed + '40',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: PROFILE_COLORS.accentRed,
  },
});
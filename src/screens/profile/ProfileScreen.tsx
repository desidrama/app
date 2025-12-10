import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../../redux/store';
import { logout } from '../../redux/slices/authSlice';
import { setUser } from '../../redux/slices/userSlice';
import ProfilePhotoUpload from '../../components/ProfilePhotoUpload';

const { width } = Dimensions.get('window');

const PROFILE_COLORS = {
  background: '#000000',
  cardBg: '#FFF8E7',
  cardText: '#000000',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#888888',
  accentOrange: '#FF6B35',
  accentRed: '#FF3B30',
  accentBlue: '#2196F3',
};

export default function ProfileScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.profile);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const profileData = {
    name: user?.name || 'User name',
    email: user?.email || 'Digital***@gmail.com',
    password: '••••••••',
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
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              dispatch(logout());
              dispatch(setUser(null));
            } catch (error) {
              console.error('Logout error:', error);
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
        <Text style={styles.headerTitle}>User name</Text>
        <TouchableOpacity 
          style={{ width: 40 }}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="create-outline" size={28} color={PROFILE_COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
            style={styles.avatarTouchable}
          >
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons 
                name="person-circle" 
                size={120} 
                color={PROFILE_COLORS.textPrimary} 
              />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Settings Card */}
        <View style={styles.settingsCard}>
          {/* Email Row */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Email</Text>
            <Text style={styles.settingValue}>{profileData.email}</Text>
          </View>

          {/* Password Row */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <Text style={styles.settingValue}>{profileData.password}</Text>
              <TouchableOpacity style={styles.editPasswordButton}>
                <Ionicons name="pencil" size={16} color={PROFILE_COLORS.cardText} />
              </TouchableOpacity>
            </View>
          </View>

          {/* AutoPlay Toggle */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>AutoPlay</Text>
            <Switch
              value={autoPlay}
              onValueChange={setAutoPlay}
              trackColor={{ false: '#767577', true: '#FFD700' }}
              thumbColor={autoPlay ? '#FFD700' : '#f4f3f4'}
              style={styles.toggle}
            />
          </View>

          {/* Notifications Toggle */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#767577', true: '#FFD700' }}
              thumbColor={notifications ? '#FFD700' : '#f4f3f4'}
              style={styles.toggle}
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="create-outline"
            title="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
          />
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

      {/* Photo Upload Modal */}
      <ProfilePhotoUpload
        visible={photoModalVisible}
        onClose={() => setPhotoModalVisible(false)}
        currentPhotoUri={profileData.avatar}
      />
    </View>
  );
}

const MenuItem = ({ icon, title, onPress }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.menuItemLeft}>
      <Ionicons name={icon} size={20} color={PROFILE_COLORS.textPrimary} />
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
    fontSize: 18,
    fontWeight: '600',
    color: PROFILE_COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarTouchable: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  settingsCard: {
    backgroundColor: PROFILE_COLORS.cardBg,
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 0,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: PROFILE_COLORS.cardText,
    flex: 1,
  },
  settingValue: {
    fontSize: 14,
    color: PROFILE_COLORS.textTertiary,
    marginRight: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editPasswordButton: {
    padding: 6,
  },
  toggle: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: PROFILE_COLORS.accentRed,
  },
});
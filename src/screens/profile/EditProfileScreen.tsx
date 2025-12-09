import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { RootState } from '../../redux/store';
import { setUser } from '../../redux/slices/userSlice';
import ProfilePhotoUpload from '../../components/ProfilePhotoUpload';

const COLORS = {
  background: '#0A0A0A',
  cardDark: '#1C1C1E',
  cardLight: '#2C2C2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#A8A8A8',
  textTertiary: '#6B6B6B',
  accent: '#FFD700',
  accentOrange: '#FF9500',
  accentRed: '#FF3B30',
  border: '#3A3A3C',
  inputBg: '#1C1C1E',
  inputFocus: '#2C2C2E',
};

const MAX_BIO_LENGTH = 150;
const MAX_NAME_LENGTH = 50;
const MAX_USERNAME_LENGTH = 30;
const MAX_LOCATION_LENGTH = 50;

export default function EditProfileScreen({ navigation }: any) {
  const user = useSelector((state: RootState) => state.user.profile);
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || 'johndoe',
    bio: user?.bio || '',
    location: user?.location || '',
  });

  const [loading, setLoading] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hasChanges = () => {
    return (
      formData.name !== (user?.name || '') ||
      formData.username !== (user?.username || 'johndoe') ||
      formData.bio !== (user?.bio || '') ||
      formData.location !== (user?.location || '')
    );
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > MAX_NAME_LENGTH) {
      newErrors.name = `Max ${MAX_NAME_LENGTH} characters`;
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Only letters, numbers, and underscore';
    } else if (formData.username.length > MAX_USERNAME_LENGTH) {
      newErrors.username = `Max ${MAX_USERNAME_LENGTH} characters`;
    }

    if (formData.bio.length > MAX_BIO_LENGTH) {
      newErrors.bio = `Max ${MAX_BIO_LENGTH} characters`;
    }

    if (formData.location.length > MAX_LOCATION_LENGTH) {
      newErrors.location = `Max ${MAX_LOCATION_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (user) {
        dispatch(setUser({
          ...user,
          name: formData.name.trim(),
          username: formData.username.trim(),
          bio: formData.bio.trim(),
          location: formData.location.trim(),
        }));
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive', 
            onPress: () => navigation.goBack() 
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <LinearGradient
        colors={['rgba(10, 10, 10, 0.98)', 'rgba(10, 10, 10, 0.95)']}
        style={styles.header}
      >
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !hasChanges()}
          style={styles.headerButton}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.accent} size="small" />
          ) : (
            <Ionicons 
              name="checkmark" 
              size={28} 
              color={hasChanges() ? COLORS.accent : COLORS.textTertiary} 
            />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Avatar Section */}
        <Animated.View 
          style={[
            styles.avatarSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <TouchableOpacity
            onPress={() => setPhotoModalVisible(true)}
            activeOpacity={0.9}
            style={styles.avatarContainer}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentOrange]}
              style={styles.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.avatarInner}>
                <Ionicons 
                  name="person" 
                  size={48} 
                  color={COLORS.accent} 
                />
              </View>
            </LinearGradient>
            <View style={styles.cameraButton}>
              <LinearGradient
                colors={[COLORS.accentOrange, '#FF6B00']}
                style={styles.cameraGradient}
              >
                <Ionicons name="camera" size={14} color={COLORS.textPrimary} />
              </LinearGradient>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPhotoModalVisible(true)}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Form */}
        <Animated.View 
          style={[
            styles.form,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} /> Name
            </Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'name' && styles.inputContainerFocused,
              errors.name && styles.inputContainerError,
            ]}>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                  if (errors.name) {
                    const newErrors = { ...errors };
                    delete newErrors.name;
                    setErrors(newErrors);
                  }
                }}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textTertiary}
                maxLength={MAX_NAME_LENGTH}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="at-outline" size={14} color={COLORS.textSecondary} /> Username
            </Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'username' && styles.inputContainerFocused,
              errors.username && styles.inputContainerError,
            ]}>
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(text) => {
                  setFormData({ ...formData, username: text.toLowerCase() });
                  if (errors.username) {
                    const newErrors = { ...errors };
                    delete newErrors.username;
                    setErrors(newErrors);
                  }
                }}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                placeholder="Choose a username"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
                maxLength={MAX_USERNAME_LENGTH}
              />
            </View>
            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
          </View>

          {/* Bio Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="create-outline" size={14} color={COLORS.textSecondary} /> Bio
            </Text>
            <View style={[
              styles.inputContainer,
              styles.textAreaContainer,
              focusedField === 'bio' && styles.inputContainerFocused,
              errors.bio && styles.inputContainerError,
            ]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bio}
                onChangeText={(text) => {
                  setFormData({ ...formData, bio: text });
                  if (errors.bio) {
                    const newErrors = { ...errors };
                    delete newErrors.bio;
                    setErrors(newErrors);
                  }
                }}
                onFocus={() => setFocusedField('bio')}
                onBlur={() => setFocusedField(null)}
                placeholder="Tell us about yourself"
                placeholderTextColor={COLORS.textTertiary}
                multiline
                numberOfLines={4}
                maxLength={MAX_BIO_LENGTH}
                textAlignVertical="top"
              />
            </View>
            <Text style={styles.charCount}>
              {formData.bio.length}/{MAX_BIO_LENGTH}
            </Text>
            {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
          </View>

          {/* Location Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} /> Location
            </Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'location' && styles.inputContainerFocused,
              errors.location && styles.inputContainerError,
            ]}>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(text) => {
                  setFormData({ ...formData, location: text });
                  if (errors.location) {
                    const newErrors = { ...errors };
                    delete newErrors.location;
                    setErrors(newErrors);
                  }
                }}
                onFocus={() => setFocusedField('location')}
                onBlur={() => setFocusedField(null)}
                placeholder="City, Country"
                placeholderTextColor={COLORS.textTertiary}
                maxLength={MAX_LOCATION_LENGTH}
              />
            </View>
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButtonContainer, (!hasChanges() || loading) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading || !hasChanges()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={hasChanges() && !loading ? [COLORS.accent, COLORS.accentOrange] : [COLORS.textTertiary, COLORS.textTertiary]}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.textPrimary} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>

      <ProfilePhotoUpload
        visible={photoModalVisible}
        onClose={() => setPhotoModalVisible(false)}
        currentPhotoUri={user?.avatar || 'https://via.placeholder.com/150'}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: 8,
    width: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    backgroundColor: COLORS.cardDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cameraGradient: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
    borderRadius: 16,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
    letterSpacing: 0.3,
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputContainer: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.inputFocus,
  },
  inputContainerError: {
    borderColor: COLORS.accentRed,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  textAreaContainer: {
    minHeight: 110,
  },
  textArea: {
    paddingTop: 14,
    height: 110,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 8,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.accentRed,
    marginTop: 6,
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  saveButtonContainer: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
});
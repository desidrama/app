import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { setUser } from '../../redux/slices/userSlice';
import ProfilePhotoUpload from '../../components/ProfilePhotoUpload';

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
  inputBg: '#FAFAFA',
  inputBorder: '#E0D7C3',
  inputText: '#000000',
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
    username: user?.username || '',
    bio: user?.bio || '',
    location: user?.location || '',
  });

  const [loading, setLoading] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const hasChanges = () => {
    return (
      formData.name !== (user?.name || '') ||
      formData.username !== (user?.username || '') ||
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

    if (formData.location.length > MAX_LOCATION_LENGTH) {
      newErrors.location = `Max ${MAX_LOCATION_LENGTH} characters`;
    }

    if (formData.bio.length > MAX_BIO_LENGTH) {
      newErrors.bio = `Max ${MAX_BIO_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      navigation.goBack();
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (user && user._id) {
        const updatedUser: any = {
          ...user,
          ...formData,
        };

        dispatch(setUser(updatedUser));
      }
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Do you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PROFILE_COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity 
          onPress={handleSave}
          style={styles.headerButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={PROFILE_COLORS.accentOrange} />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={() => setPhotoModalVisible(true)}
              activeOpacity={0.8}
              style={styles.avatarButton}
            >
              <Ionicons
                name="person-circle"
                size={100}
                color={PROFILE_COLORS.cardBg}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPhotoModalVisible(true)}
              style={styles.changePhotoButton}
            >
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name Field */}
            <View style={styles.formGroup}>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.charCount}>
                  {formData.name.length}/{MAX_NAME_LENGTH}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  errors.name && styles.inputError,
                ]}
                placeholder="Enter your name"
                placeholderTextColor={PROFILE_COLORS.textTertiary}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                maxLength={MAX_NAME_LENGTH}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            {/* Username Field */}
            <View style={styles.formGroup}>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Username</Text>
                <Text style={styles.charCount}>
                  {formData.username.length}/{MAX_USERNAME_LENGTH}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  errors.username && styles.inputError,
                ]}
                placeholder="Enter username"
                placeholderTextColor={PROFILE_COLORS.textTertiary}
                value={formData.username}
                onChangeText={(text) =>
                  setFormData({ ...formData, username: text })
                }
                maxLength={MAX_USERNAME_LENGTH}
              />
              {errors.username && (
                <Text style={styles.errorText}>{errors.username}</Text>
              )}
            </View>

            {/* Bio Field */}
            <View style={styles.formGroup}>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Bio</Text>
                <Text style={styles.charCount}>
                  {formData.bio.length}/{MAX_BIO_LENGTH}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  errors.bio && styles.inputError,
                ]}
                placeholder="Tell us about yourself"
                placeholderTextColor={PROFILE_COLORS.textTertiary}
                value={formData.bio}
                onChangeText={(text) =>
                  setFormData({ ...formData, bio: text })
                }
                maxLength={MAX_BIO_LENGTH}
                multiline
                numberOfLines={4}
              />
              {errors.bio && (
                <Text style={styles.errorText}>{errors.bio}</Text>
              )}
            </View>

            {/* Location Field */}
            <View style={styles.formGroup}>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Location</Text>
                <Text style={styles.charCount}>
                  {formData.location.length}/{MAX_LOCATION_LENGTH}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  errors.location && styles.inputError,
                ]}
                placeholder="City, Country"
                placeholderTextColor={PROFILE_COLORS.textTertiary}
                value={formData.location}
                onChangeText={(text) =>
                  setFormData({ ...formData, location: text })
                }
                maxLength={MAX_LOCATION_LENGTH}
              />
              {errors.location && (
                <Text style={styles.errorText}>{errors.location}</Text>
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo Upload Modal */}
      <ProfilePhotoUpload
        visible={photoModalVisible}
        onClose={() => setPhotoModalVisible(false)}
        currentPhotoUri={user?.avatar || ''}
      />
    </View>
  );
}

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
    paddingBottom: 16,
    backgroundColor: PROFILE_COLORS.background,
  },
  headerButton: {
    width: 70,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PROFILE_COLORS.textPrimary,
  },
  cancelButton: {
    fontSize: 16,
    color: PROFILE_COLORS.textSecondary,
    fontWeight: '500',
  },
  saveButton: {
    fontSize: 16,
    color: PROFILE_COLORS.textSecondary,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 0,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarButton: {
    marginBottom: 8,
  },
  changePhotoButton: {
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  changePhotoText: {
    fontSize: 14,
    color: PROFILE_COLORS.textSecondary,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: PROFILE_COLORS.cardBg,
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 0,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  formGroup: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: PROFILE_COLORS.cardText,
  },
  charCount: {
    fontSize: 12,
    color: PROFILE_COLORS.textTertiary,
    fontWeight: '500',
  },
  input: {
    backgroundColor: PROFILE_COLORS.inputBg,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: PROFILE_COLORS.inputText,
    fontWeight: '500',
  },
  inputError: {
    borderColor: PROFILE_COLORS.accentRed,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  textArea: {
    paddingVertical: 12,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  errorText: {
    fontSize: 12,
    color: PROFILE_COLORS.accentRed,
    marginTop: 6,
    fontWeight: '500',
  },
});
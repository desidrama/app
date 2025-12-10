import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

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
  overlay: 'rgba(0, 0, 0, 0.6)',
};

interface ProfilePhotoUploadProps {
  visible: boolean;
  onClose: () => void;
  currentPhotoUri: string;
}

export default function ProfilePhotoUpload({
  visible,
  onClose,
  currentPhotoUri,
}: ProfilePhotoUploadProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera roll access is needed');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access is needed');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setLoading(true);
    try {
      // Simulated upload - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert('Success', 'Photo updated successfully', [
        { text: 'OK', onPress: onClose },
      ]);
      setSelectedImage(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Simulated removal - replace with actual API call
              await new Promise((resolve) => setTimeout(resolve, 1000));
              Alert.alert('Success', 'Photo removed successfully', [
                { text: 'OK', onPress: onClose },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove photo');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.5)" />

      {/* Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Update Photo</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={PROFILE_COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Preview Section */}
          {selectedImage && (
            <View style={styles.previewSection}>
              <View style={styles.previewImageContainer}>
                <Ionicons
                  name="person-circle"
                  size={140}
                  color={PROFILE_COLORS.cardBg}
                />
              </View>
              <Text style={styles.previewLabel}>Preview</Text>
            </View>
          )}

          {/* Action Buttons Card */}
          <View style={styles.actionCard}>
            <ActionButton
              icon="image-outline"
              title="Choose from Gallery"
              onPress={pickImage}
              disabled={loading}
            />
            <View style={styles.divider} />
            <ActionButton
              icon="camera-outline"
              title="Take Photo"
              onPress={takePhoto}
              disabled={loading}
            />
            <View style={styles.divider} />
            <ActionButton
              icon="trash-outline"
              title="Remove Photo"
              onPress={handleRemove}
              color={PROFILE_COLORS.accentRed}
              disabled={loading}
            />
          </View>

          {/* Info Section */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons
                name="information-circle"
                size={18}
                color={PROFILE_COLORS.cardText}
              />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Size Requirements</Text>
                <Text style={styles.infoDesc}>Minimum 400x400px</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={PROFILE_COLORS.cardText}
              />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Format</Text>
                <Text style={styles.infoDesc}>JPG, PNG, or WebP</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons
                name="cloud-upload-outline"
                size={18}
                color={PROFILE_COLORS.cardText}
              />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>File Size</Text>
                <Text style={styles.infoDesc}>Maximum 5MB</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        {selectedImage && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={() => setSelectedImage(null)}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.uploadButton]}
              onPress={handleUpload}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={PROFILE_COLORS.textPrimary} />
              ) : (
                <Text style={styles.uploadButtonText}>Upload</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const ActionButton = ({ icon, title, onPress, color = PROFILE_COLORS.cardText, disabled }: any) => (
  <TouchableOpacity
    style={styles.actionButton}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <Ionicons name={icon} size={20} color={color} />
    <Text style={[styles.actionButtonText, { color }]}>{title}</Text>
    <Ionicons name="chevron-forward" size={20} color={PROFILE_COLORS.textTertiary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PROFILE_COLORS.overlay,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85%',
    backgroundColor: PROFILE_COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PROFILE_COLORS.textPrimary,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  previewSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  previewImageContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: PROFILE_COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 12,
    color: PROFILE_COLORS.textTertiary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  actionCard: {
    backgroundColor: PROFILE_COLORS.cardBg,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginLeft: 50,
  },
  infoCard: {
    backgroundColor: PROFILE_COLORS.cardBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PROFILE_COLORS.cardText,
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
    color: PROFILE_COLORS.textTertiary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: PROFILE_COLORS.background,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: PROFILE_COLORS.textSecondary,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: PROFILE_COLORS.textPrimary,
  },
  uploadButton: {
    backgroundColor: PROFILE_COLORS.accentOrange,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: PROFILE_COLORS.textPrimary,
  },
});
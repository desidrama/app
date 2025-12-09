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
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

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
  overlay: 'rgba(0, 0, 0, 0.9)',
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
  const [preview, setPreview] = useState<string | null>(null);

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
      Alert.alert('Coming Soon', 'Image picker will be available soon');
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      Alert.alert('Coming Soon', 'Camera will be available soon');
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select or take a photo first');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert('Success', 'Profile photo updated successfully');
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setPreview(null);
    onClose();
  };

  const removeCurrentPhoto = () => {
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
              await new Promise(resolve => setTimeout(resolve, 800));
              Alert.alert('Success', 'Profile photo removed');
              handleClose();
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
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      <Animated.View 
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.handleBar} />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Change Profile Photo</Text>
            <Text style={styles.headerSubtitle}>Choose or take a new photo</Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Preview Section */}
          <View style={styles.previewSection}>
            {preview ? (
              <View style={styles.previewImageContainer}>
                <LinearGradient
                  colors={[COLORS.accent, COLORS.accentOrange]}
                  style={styles.previewGradient}
                >
                  <View style={styles.previewImageInner}>
                    <Ionicons name="image" size={60} color={COLORS.accent} />
                  </View>
                </LinearGradient>
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <LinearGradient
                  colors={[COLORS.cardLight, COLORS.cardDark]}
                  style={styles.placeholderGradient}
                >
                  <Ionicons name="camera-outline" size={48} color={COLORS.textTertiary} />
                  <Text style={styles.placeholderText}>No photo selected</Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            <ActionButton
              icon="images"
              title="Choose from Gallery"
              subtitle="Select from your photos"
              onPress={pickImage}
              gradient={[COLORS.accent, COLORS.accentOrange]}
            />
            
            <ActionButton
              icon="camera"
              title="Take a Photo"
              subtitle="Use your camera"
              onPress={takePhoto}
              gradient={['#8B5CF6', '#A78BFA']}
            />

            {currentPhotoUri && currentPhotoUri !== 'https://via.placeholder.com/150' && (
              <ActionButton
                icon="trash"
                title="Remove Current Photo"
                subtitle="Delete your profile photo"
                onPress={removeCurrentPhoto}
                gradient={[COLORS.accentRed, '#FF6B6B']}
                danger
              />
            )}
          </View>

          {/* Info Cards */}
          <View style={styles.infoSection}>
            <InfoCard
              icon="resize"
              title="Recommended Size"
              description="Square image, minimum 400x400 pixels"
            />
            <InfoCard
              icon="checkmark-circle"
              title="Supported Formats"
              description="JPG, PNG, WebP (max 5MB)"
            />
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadButtonContainer, !preview && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={!preview || loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={preview && !loading ? [COLORS.accent, COLORS.accentOrange] : [COLORS.textTertiary, COLORS.textTertiary]}
              style={styles.uploadButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color={COLORS.textPrimary} />
                  <Text style={styles.uploadButtonText}>Upload Photo</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const ActionButton = ({ icon, title, subtitle, onPress, gradient, danger }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradient}
          style={styles.actionIconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={icon} size={22} color={COLORS.textPrimary} />
        </LinearGradient>
        <View style={styles.actionButtonContent}>
          <Text style={[styles.actionButtonTitle, danger && { color: COLORS.accentRed }]}>
            {title}
          </Text>
          <Text style={styles.actionButtonSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const InfoCard = ({ icon, title, description }: any) => (
  <View style={styles.infoCard}>
    <View style={styles.infoIconContainer}>
      <Ionicons name={icon} size={18} color={COLORS.accent} />
    </View>
    <View style={styles.infoCardContent}>
      <Text style={styles.infoCardTitle}>{title}</Text>
      <Text style={styles.infoCardDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.92,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textTertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 24,
  },
  previewSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  previewImageContainer: {
    width: 160,
    height: 160,
  },
  previewGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
    padding: 4,
  },
  previewImageInner: {
    width: '100%',
    height: '100%',
    borderRadius: 76,
    backgroundColor: COLORS.cardDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    width: 160,
    height: 160,
  },
  placeholderGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    marginTop: 8,
    letterSpacing: 0.2,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  actionIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 0.1,
  },
  infoSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  infoCardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 0.1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.cardDark,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  uploadButtonContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
});
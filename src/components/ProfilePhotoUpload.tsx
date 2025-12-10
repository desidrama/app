import React, { useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

  const handlePickImage = () => {
    Alert.alert('Coming Soon', 'Image picker functionality will be added soon');
  };

  const handleTakePhoto = () => {
    Alert.alert('Coming Soon', 'Camera functionality will be added soon');
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
          onPress: () => {
            Alert.alert('Success', 'Photo removed successfully');
            onClose();
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
          <View style={styles.previewSection}>
            <View style={styles.placeholderContainer}>
              <Ionicons
                name="person-circle"
                size={120}
                color={PROFILE_COLORS.cardBg}
              />
            </View>
            <Text style={styles.previewLabel}>Current Photo</Text>
          </View>

          {/* Action Buttons Card */}
          <View style={styles.actionCard}>
            <ActionButton
              icon="image-outline"
              title="Choose from Gallery"
              onPress={handlePickImage}
            />
            <View style={styles.divider} />
            <ActionButton
              icon="camera-outline"
              title="Take Photo"
              onPress={handleTakePhoto}
            />
            <View style={styles.divider} />
            <ActionButton
              icon="trash-outline"
              title="Remove Photo"
              onPress={handleRemove}
              color={PROFILE_COLORS.accentRed}
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
      </Animated.View>
    </Modal>
  );
}

const ActionButton = ({ icon, title, onPress, color = PROFILE_COLORS.cardText }: any) => (
  <TouchableOpacity
    style={styles.actionButton}
    onPress={onPress}
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
  placeholderContainer: {
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
});

// src/screens/home/components/SettingsPopup.tsx
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import styles from '../styles/ReelPlayerStyles';

const SettingsPopup: React.FC<{ onCycleSpeed: () => void; onCycleQuality: () => void; speed: number; quality: string }> = ({ onCycleSpeed, onCycleQuality, speed, quality }) => {
  return (
    <View style={styles.settingsPopup}>
      <TouchableOpacity style={styles.settingsItem} onPress={onCycleSpeed}>
        <MaterialIcons name="slow-motion-video" size={24} color="#fff" />
        <Text style={styles.settingsText}>Speed {speed.toFixed(1)}x</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsItem} onPress={onCycleQuality}>
        <Ionicons name="sparkles-outline" size={22} color="#fff" />
        <Text style={styles.settingsText}>Quality {quality}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SettingsPopup;

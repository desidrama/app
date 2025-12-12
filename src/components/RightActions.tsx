// src/components/RightActions.tsx
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../screens/home/styles/ReelPlayerStyles';

type Props = {
  onLike?: () => void;
  selectedReaction?: string | null;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onOpenEpisodes?: () => void;
};

const RightActions: React.FC<Props> = ({ onLike, selectedReaction, onComment, onShare, onSave, onOpenEpisodes }) => {
  return (
    <View style={styles.rightActions}>
      <TouchableOpacity style={styles.actionButton} onPress={onLike}>
        <Text style={{ fontSize: 30 }}>{selectedReaction ?? '🤍'}</Text>
        <Text style={styles.actionLabel}>Rate</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={onComment}>
        <Ionicons name="chatbubble-ellipses-outline" size={26} color="#fff" />
        <Text style={styles.actionLabel}>Comment</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={onShare}>
        <Ionicons name="share-social-outline" size={24} color="#fff" />
        <Text style={styles.actionLabel}>Share</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={onSave}>
        <Ionicons name="bookmark-outline" size={24} color="#fff" />
        <Text style={styles.actionLabel}>Save</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={onOpenEpisodes}>
        <Ionicons name="grid-outline" size={26} color="#fff" />
        <Text style={styles.actionLabel}>Episodes</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RightActions;

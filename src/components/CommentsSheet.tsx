// src/components/CommentsSheet.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import styles from '../screens/home/styles/ReelPlayerStyles';

type Props = { visible: boolean; onClose: () => void };
type Comment = { id: string; user: string; text: string };

const initialComments: Comment[] = [
  { id: 'c1', user: 'Amit', text: 'Family movie night favourite 🍿' },
  { id: 'c2', user: 'Priya', text: 'Kids loved the dinosaurs!' },
];

const CommentsSheet: React.FC<Props> = ({ visible, onClose }) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState('');

  if (!visible) return null;

  const addComment = () => {
    const t = text.trim();
    if (!t) return;
    setComments((p) => [...p, { id: `c-${Date.now()}`, user: 'You', text: t }]);
    setText('');
  };

  return (
    <View style={styles.commentsOverlay}>
      <TouchableOpacity style={styles.commentsBackdrop} onPress={onClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.commentsCard}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: '#fff' }}>Close</Text></TouchableOpacity>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(i) => i.id}
            style={{ maxHeight: 280 }}
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{item.user.charAt(0)}</Text></View>
                <View style={styles.commentBubble}>
                  <Text style={styles.commentUser}>{item.user}</Text>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
              </View>
            )}
          />

          <View style={styles.commentInputRow}>
            <TextInput value={text} onChangeText={setText} style={styles.commentInput} placeholder="Add a family-friendly comment..." placeholderTextColor="#888" />
            <TouchableOpacity onPress={addComment}><Text style={{ color: '#FFD54A' }}>Send</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default CommentsSheet;

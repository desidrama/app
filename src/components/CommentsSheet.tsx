// CommentsSheet: Bottom sheet for displaying and adding comments.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import styles from '../screens/home/styles/ReelPlayerStyles';

// Props for CommentsSheet component
type Props = { visible: boolean; onClose: () => void };
// Type for a single comment
type Comment = { id: string; user: string; text: string };

// Initial comments for demonstration
const initialComments: Comment[] = [
  { id: 'c1', user: 'Amit', text: 'Family movie night favourite 🍿' },
  { id: 'c2', user: 'Priya', text: 'Kids loved the dinosaurs!' },
];


/**
 * CommentsSheet: Bottom sheet for displaying and adding comments to content.
 */
const CommentsSheet: React.FC<Props> = ({ visible, onClose }) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState('');

  // Don't render if not visible
  if (!visible) return null;

  // Add a new comment to the list
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
          {/* Header with close button */}
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: '#fff' }}>Close</Text></TouchableOpacity>
          </View>

          {/* List of comments */}
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

          {/* Input for new comment */}
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

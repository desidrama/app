// CommentsSheet: Bottom sheet for displaying and adding comments.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { videoService } from '../services/video.service';
import styles from '../screens/home/styles/ReelPlayerStyles';

// Type for a single comment
type Comment = {
  id: string;
  username: string;
  text: string;
  likes: number;
  timeAgo: string;
  isLiked: boolean;
  avatar?: string;
  user?: {
    id: string;
    username: string;
    name?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

// Props for CommentsSheet component
type Props = {
  visible: boolean;
  onClose: () => void;
  postId: string; // Video/reel ID
  initialComments?: Comment[];
};

/**
 * CommentsSheet: Bottom sheet for displaying and adding comments to content.
 */
const CommentsSheet: React.FC<Props> = ({ visible, onClose, postId, initialComments = [] }) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load comments when component becomes visible (only once)
  useEffect(() => {
    if (visible && postId && comments.length === 0) {
      loadComments(true);
    }
  }, [visible, postId]);

  const loadComments = async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await videoService.getComments(postId, reset ? 1 : page, 20);
      if (response?.success && Array.isArray(response.data)) {
        const formattedComments = response.data.map((comment: any) => ({
          id: comment.id || comment._id,
          username: comment.user?.username || comment.user?.name || 'User',
          text: comment.text,
          likes: comment.likes || 0,
          timeAgo: comment.timeAgo || 'now',
          isLiked: comment.isLiked || comment.liked || false,
          avatar: comment.user?.avatar || comment.user?.profilePicture,
          createdAt: comment.createdAt,
          user: comment.user,
        }));

        if (reset) {
          setComments(formattedComments);
        } else {
          setComments(prev => [...prev, ...formattedComments]);
        }

        // Check if there are more comments to load
        setHasMore(response.pagination?.hasMore || response.data.length === 20);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      if (reset) {
        setComments([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadComments(true);
  }, [postId]);

  // Load more comments when reaching end of list
  const loadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      await loadComments(false);
    }
  }, [loadingMore, hasMore, postId]);

  // Add a new comment to the list
  const addComment = async () => {
    const t = text.trim();
    if (!t) return;
    if (!postId) {
      Alert.alert('Error', 'Cannot post comment: invalid post ID');
      return;
    }

    try {
      const response = await videoService.postComment(postId, t);
      if (response?.success && response.data) {
        const newComment = {
          id: response.data.id || response.data._id || `c-${Date.now()}`,
          username: response.data.user?.username || response.data.user?.name || 'You',
          text: response.data.text || t,
          likes: 0,
          timeAgo: 'now',
          isLiked: false,
          avatar: response.data.user?.avatar || response.data.user?.profilePicture,
          createdAt: response.data.createdAt,
          user: response.data.user,
        };
        
        setComments(prev => [newComment, ...prev]);
        setText('');
      } else {
        Alert.alert('Error', response?.message || 'Failed to post comment');
      }
    } catch (error: any) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', error.message || 'Failed to post comment. Please try again.');
    }
  };

  // Toggle like for a comment
  const toggleCommentLike = async (commentId: string, currentLiked: boolean) => {
    try {
      let response;
      if (currentLiked) {
        // Unlike the comment
        response = await videoService.unlikeComment(commentId);
      } else {
        // Like the comment
        response = await videoService.likeComment(commentId);
      }

      if (response?.success) {
        setComments(prev => 
          prev.map(comment => 
            comment.id === commentId 
              ? { 
                  ...comment, 
                  isLiked: !currentLiked, 
                  likes: response.data?.likes !== undefined 
                    ? response.data.likes 
                    : (currentLiked ? comment.likes - 1 : comment.likes + 1) 
                } 
              : comment
          )
        );
      } else {
        Alert.alert('Error', 'Failed to update like status');
      }
    } catch (error: any) {
      console.error('Error toggling comment like:', error);
      Alert.alert('Error', error.message || 'Failed to update like status. Please try again.');
    }
  };

  // Render a single comment
  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentRow}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>
          {item.avatar ? '' : (item.username.charAt(0).toUpperCase())}
        </Text>
      </View>
      <View style={styles.commentBubble}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.commentUser}>{item.username}</Text>
          <Text style={{ color: '#888', fontSize: 11 }}>{item.timeAgo}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}
            onPress={() => toggleCommentLike(item.id, item.isLiked)}
          >
            <Ionicons 
              name={item.isLiked ? "heart" : "heart-outline"} 
              size={14} 
              color={item.isLiked ? "#FF6B6B" : "#888"} 
            />
            <Text style={{ color: item.isLiked ? "#FF6B6B" : "#888", fontSize: 12, marginLeft: 4 }}>
              {item.likes}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="return-down-back-outline" size={14} color="#888" />
            <Text style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Don't render if not visible
  if (!visible) return null;

  return (
    <View style={styles.commentsOverlay}>
      <TouchableOpacity style={styles.commentsBackdrop} onPress={onClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.commentsCard}>
          {/* Header with close button */}
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: '#fff' }}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* List of comments */}
          {loading ? (
            <View style={styles.episodesLoadingContainer}>
              <ActivityIndicator size="small" color="#FFD54A" />
              <Text style={styles.episodesLoadingText}>Loading comments...</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 280 }}
              renderItem={renderComment}
              onRefresh={onRefresh}
              refreshing={refreshing}
              onEndReached={loadMore}
              onEndReachedThreshold={0.1}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.episodesLoadingContainer}>
                    <ActivityIndicator size="small" color="#FFD54A" />
                  </View>
                ) : null
              }
            />
          )}

          {/* Input for new comment */}
          <View style={styles.commentInputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              style={styles.commentInput}
              placeholder="Add a family-friendly comment..."
              placeholderTextColor="#888"
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              onPress={addComment} 
              disabled={!text.trim()}
            >
              <Text style={{ color: text.trim() ? '#FFD54A' : '#666' }}>
                Post
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default CommentsSheet;
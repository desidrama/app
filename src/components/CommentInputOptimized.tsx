/**
 * OPTIMIZED COMMENT INPUT COMPONENT
 * 
 * Features:
 * - Auto-focus on open
 * - Keyboard-aware layout (iOS + Android)
 * - API integration with loading/error handling
 * - Optimized with useCallback/useMemo
 * - Production-ready error handling
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { videoService } from '../services/video.service';

interface CommentInputProps {
  postId: string; // Video/reel ID
  onCommentAdded: (comment: any) => void; // Callback when comment is successfully added
  visible: boolean; // Whether comment sheet is visible
  inputSectionStyle?: any; // Optional custom styles
  inputStyle?: any;
  sendButtonStyle?: any;
  sendButtonDisabledStyle?: any;
  sendButtonTextStyle?: any;
  sendButtonTextDisabledStyle?: any;
  placeholder?: string;
}

/**
 * Optimized Comment Input Component
 * 
 * Integrate this into your comment sheet:
 * 
 * <CommentInputOptimized
 *   postId={reel.id}
 *   visible={showComments}
 *   onCommentAdded={(comment) => {
 *     setComments(prev => [...prev, comment]);
 *   }}
 *   inputSectionStyle={styles.commentInputSection}
 *   inputStyle={styles.commentInput}
 *   sendButtonStyle={styles.commentSendBtn}
 *   sendButtonDisabledStyle={styles.commentSendBtnDisabled}
 *   sendButtonTextStyle={styles.commentSendText}
 *   sendButtonTextDisabledStyle={styles.commentSendTextDisabled}
 * />
 */
export const CommentInputOptimized: React.FC<CommentInputProps> = ({
  postId,
  onCommentAdded,
  visible,
  inputStyle,
  sendButtonStyle,
  sendButtonDisabledStyle,
  sendButtonTextStyle,
  sendButtonTextDisabledStyle,
  placeholder = 'Join the conversation...',
}) => {
  // State
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const inputRef = useRef<TextInput>(null);

  // Auto-focus input when comment sheet opens
  useEffect(() => {
    if (visible) {
      // Small delay to ensure sheet animation completes, then focus
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    } else {
      // Clear input and dismiss keyboard when sheet closes
      setCommentText('');
      Keyboard.dismiss();
      setError(null);
    }
  }, [visible]);

  // Handle comment submission (optimized with useCallback)
  const handleSubmit = useCallback(async () => {
    const trimmedText = commentText.trim();
    
    if (!trimmedText || isSubmitting) return;
    if (!postId) {
      setError('Invalid post ID');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Call API to post comment
      const response = await videoService.postComment(postId, trimmedText);
      
      // Check if API call was successful
      if (response?.success !== false) {
        // Create comment object for local state from backend response
        const commentData = response?.data;
        const newComment = {
          id: commentData?.id || commentData?._id || Date.now().toString(),
          username: commentData?.user?.username || commentData?.user?.name || 'You',
          text: commentData?.text || trimmedText,
          likes: 0, // Comment likes not implemented yet
          timeAgo: 'now',
          isLiked: false,
          avatar: commentData?.user?.avatar || commentData?.user?.profilePicture,
        };

        // Clear input
        setCommentText('');
        Keyboard.dismiss();

        // Notify parent component
        onCommentAdded(newComment);
      } else {
        throw new Error(response?.message || 'Failed to post comment');
      }
    } catch (error: any) {
      console.error('Error posting comment:', error);
      
      const errorMessage = error?.message || 'Failed to post comment. Please try again.';
      setError(errorMessage);
      
      // Show user-friendly error alert
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK', onPress: () => setError(null) }]
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [commentText, postId, isSubmitting, onCommentAdded]);

  // Memoize button disabled state
  const isButtonDisabled = useMemo(() => {
    return !commentText.trim() || isSubmitting;
  }, [commentText, isSubmitting]);

  // Memoize button styles
  const buttonStyles = useMemo(() => {
    return [
      sendButtonStyle,
      isButtonDisabled && sendButtonDisabledStyle,
    ];
  }, [sendButtonStyle, sendButtonDisabledStyle, isButtonDisabled]);

  const buttonTextStyles = useMemo(() => {
    return [
      sendButtonTextStyle,
      isButtonDisabled && sendButtonTextDisabledStyle,
    ];
  }, [sendButtonTextStyle, sendButtonTextDisabledStyle, isButtonDisabled]);

  // Handle input change (optimized)
  const handleTextChange = useCallback((text: string) => {
    setCommentText(text);
    // Clear error when user starts typing
    if (error) setError(null);
  }, [error]);

  const spacing = getSpacing();
  const touchTarget = getTouchTargetSize();

  return (
    <>
      <TextInput
        ref={inputRef}
        value={commentText}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor="#888"
        style={[
          inputStyle,
          {
            fontSize: rf(13, 15, 14),
            paddingVertical: spacing.xs,
            minHeight: touchTarget,
          },
        ]}
        multiline
        maxLength={2200}
        blurOnSubmit={false}
        editable={!isSubmitting}
        onSubmitEditing={handleSubmit}
        returnKeyType="send"
      />
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isButtonDisabled}
        style={[
          buttonStyles,
          {
            minHeight: touchTarget,
            minWidth: touchTarget,
          },
        ]}
        activeOpacity={0.7}
        hitSlop={{
          top: spacing.xs,
          bottom: spacing.xs,
          left: spacing.xs,
          right: spacing.xs,
        }}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={[
            buttonTextStyles,
            {
              fontSize: rf(13, 15, 14),
            },
          ]}>Post</Text>
        )}
      </TouchableOpacity>
    </>
  );
};


// src/screens/home/components/InfoSheet.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Text,
  ActivityIndicator,
  Dimensions,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import styles from '../screens/home/styles/ReelPlayerStyles';
import { Video as VideoType } from '../types';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

type Reel = {
  id: string;
  title: string;
  year: string;
  rating: string;
  duration: string;
  thumbnailUrl?: string;
  description?: string;
  seasonId?: any;
};

const InfoSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  reel: Reel;
  seasonEpisodes: VideoType[];
  loadingEpisodes: boolean;
  onPressEpisode: (ep: any) => void;
  onLike: () => void;
}> = ({ visible, onClose, reel, seasonEpisodes, loadingEpisodes, onPressEpisode, onLike }) => {
  const insets = useSafeAreaInsets();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);
  
  const slideAnim = useRef(new Animated.Value(dimensions.height)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(dimensions.height);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: dimensions.height,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim, dimensions.height]);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.infoSheetContainer, 
        { 
          opacity: opacityAnim,
        }
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={onClose} 
        style={[styles.infoBackdrop, { opacity: opacityAnim }]} 
      />
      <Animated.View
        style={[
          styles.infoSheet,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
          style={{ flex: 1 }}
        >
          <View style={styles.infoTopBar}>
            <View style={{ width: 28 }} />
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={onClose} style={styles.infoCloseButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoPosterRow}>
            <View style={styles.posterWrapper}>
              <Image 
                source={{ uri: reel.thumbnailUrl || 'https://picsum.photos/340/460?random=99' }} 
                style={styles.posterImage} 
              />
              <TouchableOpacity style={styles.posterPlayOverlay} activeOpacity={0.8}>
                <View style={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: 30, 
                  backgroundColor: 'rgba(255,255,255,0.9)', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Ionicons name="play" size={32} color="#000" style={{ marginLeft: 3 }} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.posterHeart} onPress={onLike}>
                <Ionicons name="heart-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tagRow}>
            <View style={styles.tagChip}><Text style={styles.tagText}>Action</Text></View>
            <View style={styles.tagChip}><Text style={styles.tagText}>Thriller</Text></View>
          </View>

          <Text style={styles.infoTitle}>{reel.title}</Text>
          <View style={styles.infoMetaRow}>
            <Text style={styles.infoMetaText}>{reel.year}</Text>
            <View style={styles.ratingChipSmall}>
              <Text style={styles.ratingChipSmallText}>{reel.rating}</Text>
            </View>
            <Text style={styles.infoMetaText}>{reel.duration}</Text>
          </View>

          <TouchableOpacity style={styles.infoPrimaryButton}>
            <Ionicons name="play" size={20} color="#000" />
            <Text style={styles.infoPrimaryText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoSecondaryButton}>
            <Ionicons name="download-outline" size={20} color="#000" />
            <Text style={styles.infoPrimaryText}>Download</Text>
          </TouchableOpacity>

          {/* Episodes section - show if seasonId exists or if episodes are loaded */}
          {(reel.seasonId || seasonEpisodes.length > 0) && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.infoSectionHeading}>
                {seasonEpisodes.length > 0 && seasonEpisodes[0].seasonNumber 
                  ? `Season ${seasonEpisodes[0].seasonNumber} • Eps ${seasonEpisodes.length}`
                  : 'Episodes'}
              </Text>
              {loadingEpisodes ? (
                <View style={styles.episodesLoadingContainer}>
                  <ActivityIndicator size="small" color="#FFD54A" />
                  <Text style={styles.episodesLoadingText}>Loading episodes...</Text>
                </View>
              ) : seasonEpisodes.length > 0 ? (
                seasonEpisodes
                  .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0))
                  .map(ep => (
                    <TouchableOpacity 
                      key={ep._id} 
                      style={styles.infoEpisodeCard} 
                      onPress={() => onPressEpisode(ep)}
                    >
                      <Image 
                        source={{ 
                          uri: ep.thumbnailUrl || ep.thumbnail || 'https://picsum.photos/160/90?random=21' 
                        }} 
                        style={styles.infoEpisodeImage} 
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoEpisodeTitle}>
                          {ep.title || `Episode ${ep.episodeNumber || ''}`}
                        </Text>
                        <Text numberOfLines={2} style={styles.infoEpisodeDesc}>
                          {ep.description || 'No description available'}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.infoEpisodePlay} 
                        onPress={() => onPressEpisode(ep)}
                      >
                        <Ionicons name="play" size={18} color="#000" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
              ) : (
                <Text style={styles.episodesLoadingText}>No episodes available</Text>
              )}
            </View>
          )}

          <Text style={styles.infoDescription}>
            {reel.description || 'No description available'}
          </Text>

          <View style={styles.infoQuickRow}>
            <TouchableOpacity style={styles.infoQuickItem}>
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={styles.infoQuickText}>My list</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoQuickItem}>
              <Ionicons name="share-social-outline" size={22} color="#fff" />
              <Text style={styles.infoQuickText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoQuickItem}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
              <Text style={styles.infoQuickText}>Comment</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.infoSectionHeading}>Cast</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.castItem}>
              <Image style={styles.castAvatar} source={{ uri: 'https://picsum.photos/80/80?random=11' }} />
              <Text style={styles.castName}>Laura Dern</Text>
            </View>
            <View style={styles.castItem}>
              <Image style={styles.castAvatar} source={{ uri: 'https://picsum.photos/80/80?random=12' }} />
              <Text style={styles.castName}>Jeff Goldblum</Text>
            </View>
            <View style={styles.castItem}>
              <Image style={styles.castAvatar} source={{ uri: 'https://picsum.photos/80/80?random=13' }} />
              <Text style={styles.castName}>Sam Neill</Text>
            </View>
          </ScrollView>

          <Text style={styles.infoSectionHeading}>More Like This…</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Image style={styles.moreLikeImage} source={{ uri: 'https://picsum.photos/90/130?random=31' }} />
            <Image style={styles.moreLikeImage} source={{ uri: 'https://picsum.photos/90/130?random=32' }} />
          </ScrollView>

        </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Animated.View>
  );
};

export default InfoSheet;
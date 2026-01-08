// ReelInfoScreen: Full screen info page for reel details
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { videoService } from '../../services/video.service';
import { Video as VideoType } from '../../types';
import styles from '../home/styles/ReelPlayerStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RootStackParamList = {
  ReelInfo: {
    reelId: string;
    title: string;
    year?: string;
    rating?: string;
    duration?: string;
    thumbnailUrl?: string;
    description?: string;
    seasonId?: any;
  };
};

type ReelInfoScreenRouteProp = RouteProp<RootStackParamList, 'ReelInfo'>;
type ReelInfoScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReelInfo'>;

export default function ReelInfoScreen() {
  const navigation = useNavigation<ReelInfoScreenNavigationProp>();
  const route = useRoute<ReelInfoScreenRouteProp>();
  const { reelId, title, year, rating, duration, thumbnailUrl, description, seasonId } = route.params;

  const [seasonEpisodes, setSeasonEpisodes] = useState<VideoType[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    // Fetch episodes if seasonId exists
    if (seasonId) {
      loadEpisodes();
    }
  }, [seasonId]);

  const loadEpisodes = async () => {
    try {
      setLoadingEpisodes(true);
      const response = await videoService.getEpisodes(seasonId);
      if (response.success && response.data) {
        setSeasonEpisodes(response.data);
      }
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const handleEpisodePress = (episode: VideoType) => {
    // Navigate to episode player
    navigation.navigate('EpisodePlayer' as never, {
      targetVideoId: episode._id,
    } as never);
  };

  const handleLike = async () => {
    try {
      await videoService.likeVideo(reelId);
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050509' }} edges={['top', 'bottom']}>
      {/* Header with Back Button */}
      <View style={styles.infoTopBar}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.infoCloseButton}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 18 }}
      >
        {/* Poster */}
        <View style={styles.infoPosterRow}>
          <View style={styles.posterWrapper}>
            <Image 
              source={{ uri: thumbnailUrl || 'https://picsum.photos/340/460?random=99' }} 
              style={styles.posterImage} 
            />
            <TouchableOpacity style={styles.posterPlayOverlay} activeOpacity={0.8}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="play" size={32} color="#000" style={{ marginLeft: 3 }} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.posterHeart} onPress={handleLike}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "#FF4444" : "#fff"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tagRow}>
          <View style={styles.tagChip}><Text style={styles.tagText}>Action</Text></View>
          <View style={styles.tagChip}><Text style={styles.tagText}>Thriller</Text></View>
        </View>

        {/* Title */}
        <Text style={styles.infoTitle}>{title}</Text>

        {/* Meta Info */}
        <View style={styles.infoMetaRow}>
          <Text style={styles.infoMetaText}>{year || '2024'}</Text>
          <View style={styles.ratingChipSmall}>
            <Text style={styles.ratingChipSmallText}>{rating || 'U/A 16+'}</Text>
          </View>
          <Text style={styles.infoMetaText}>{duration || '2m'}</Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.infoPrimaryButton}>
          <Ionicons name="play" size={20} color="#000" />
          <Text style={styles.infoPrimaryText}>Play</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.infoSecondaryButton}>
          <Ionicons name="download-outline" size={20} color="#000" />
          <Text style={styles.infoPrimaryText}>Download</Text>
        </TouchableOpacity>

        {/* Description */}
        <Text style={styles.infoDescription}>
          {description || 'No description available'}
        </Text>

        {/* Quick Actions */}
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

        {/* Cast Section */}
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

        {/* Episodes Section */}
        {(seasonId || seasonEpisodes.length > 0) && (
          <>
            <Text style={styles.infoSectionHeading}>Episodes</Text>
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
                    onPress={() => handleEpisodePress(ep)}
                  >
                    <Image 
                      source={{ uri: ep.thumbnailUrl || ep.thumbnail || 'https://picsum.photos/160/90?random=21' }} 
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
                      onPress={() => handleEpisodePress(ep)}
                    >
                      <Ionicons name="play" size={18} color="#000" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
            ) : (
              <Text style={styles.episodesLoadingText}>No episodes available</Text>
            )}
          </>
        )}

        {/* More Like This */}
        <Text style={styles.infoSectionHeading}>More Like This…</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Image style={styles.moreLikeImage} source={{ uri: 'https://picsum.photos/90/130?random=31' }} />
          <Image style={styles.moreLikeImage} source={{ uri: 'https://picsum.photos/90/130?random=32' }} />
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

// src/screens/home/components/InfoSheet.tsx
import React from 'react';
import {
  Animated,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/ReelPlayerStyles';
import { Video as VideoType } from '../../../types';

type Reel = {
  id: string;
  title: string;
  year: string;
  rating: string;
  duration: string;
  thumbnailUrl?: string;
  description?: string;
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
  if (!visible) return null;

  return (
    <Animated.View style={[styles.infoSheetContainer, { transform: [{ translateY: 0 }] }]}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.infoBackdrop} />
      <View style={styles.infoSheet}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.infoTopBar}>
            <View style={{ width: 28 }} />
            <View style={styles.infoHandle} />
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoPosterRow}>
            <View style={styles.posterWrapper}>
              <Image source={{ uri: reel.thumbnailUrl || 'https://picsum.photos/340/460?random=99' }} style={styles.posterImage} />
              <TouchableOpacity style={styles.posterPlayOverlay}>
                <Ionicons name="play" size={40} color="#fff" />
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
            <View style={styles.ratingChipSmall}><Text style={styles.ratingChipSmallText}>{reel.rating}</Text></View>
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

          <Text style={styles.infoDescription}>{reel.description || 'No description available'}</Text>

          <View style={styles.infoQuickRow}>
            <TouchableOpacity style={styles.infoQuickItem}><Ionicons name="add" size={22} color="#fff" /><Text style={styles.infoQuickText}>My list</Text></TouchableOpacity>
            <TouchableOpacity style={styles.infoQuickItem}><Ionicons name="share-social-outline" size={22} color="#fff" /><Text style={styles.infoQuickText}>Share</Text></TouchableOpacity>
            <TouchableOpacity style={styles.infoQuickItem}><Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" /><Text style={styles.infoQuickText}>Comment</Text></TouchableOpacity>
          </View>

          <Text style={styles.infoSectionHeading}>Cast</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {/* mock cast */}
            <View style={styles.castItem}><Image style={styles.castAvatar} source={{ uri: 'https://picsum.photos/80/80?random=11' }} /><Text style={styles.castName}>Laura Dern</Text></View>
            <View style={styles.castItem}><Image style={styles.castAvatar} source={{ uri: 'https://picsum.photos/80/80?random=12' }} /><Text style={styles.castName}>Jeff Goldblum</Text></View>
          </ScrollView>

          {reel && (
            <>
              {reel && <>
                {reel && reel.title && null}
              </>}
            </>
          )}

          {reel && reel.title && reel && reel && reel.title /* no-op to keep parity */ }

          {reel && reel.title && reel.seasonId && (
            <>
              <Text style={styles.infoSectionHeading}>Episodes</Text>
              {loadingEpisodes ? (
                <View style={styles.episodesLoadingContainer}><ActivityIndicator size="small" color="#FFD54A" /><Text style={styles.episodesLoadingText}>Loading episodes...</Text></View>
              ) : seasonEpisodes.length > 0 ? (
                seasonEpisodes.sort((a,b) => (a.episodeNumber || 0) - (b.episodeNumber || 0)).map(ep => (
                  <TouchableOpacity key={ep._id} style={styles.infoEpisodeCard} onPress={() => onPressEpisode(ep)}>
                    <Image source={{ uri: ep.thumbnailUrl || ep.thumbnail || 'https://picsum.photos/160/90?random=21' }} style={styles.infoEpisodeImage} />
                    <View style={{ flex: 1 }}><Text style={styles.infoEpisodeTitle}>{ep.title || `Episode ${ep.episodeNumber || ''}`}</Text><Text numberOfLines={2} style={styles.infoEpisodeDesc}>{ep.description || 'No description available'}</Text></View>
                    <TouchableOpacity style={styles.infoEpisodePlay} onPress={() => onPressEpisode(ep)}><Ionicons name="play" size={18} color="#000" /></TouchableOpacity>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.episodesLoadingText}>No episodes available</Text>
              )}
            </>
          )}

          <Text style={styles.infoSectionHeading}>More Like This…</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Image style={styles.moreLikeImage} source={{ uri: 'https://picsum.photos/90/130?random=31' }} />
            <Image style={styles.moreLikeImage} source={{ uri: 'https://picsum.photos/90/130?random=32' }} />
          </ScrollView>

        </ScrollView>
      </View>
    </Animated.View>
  );
};

export default InfoSheet;

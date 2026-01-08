// FILE: src/screens/home/SearchScreen.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { videoService } from '../../services/video.service';
import { Video as VideoType } from '../../types';
import VideoCard from '../../components/VideoCard';
import { API_BASE_URL } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (width - (HORIZONTAL_PADDING * 2) - CARD_GAP) / NUM_COLUMNS;

type RootStackParamList = {
  Main: undefined;
  Search: undefined;
};

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

interface SeriesGroup {
  seriesName: string;
  videos: VideoType[];
  thumbnail: string;
  totalEpisodes: number;
}

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingSeries, setTrendingSeries] = useState<SeriesGroup[]>([]);
  const [searchResults, setSearchResults] = useState<SeriesGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const MOST_SEARCHED = [
    'Ghost',
    'Digilocker',
    'Meridian Exposed',
    'Firewall of Lies',
    'eyes',
    'Machine',
  ];

  // Group videos by series name
  const groupVideosBySeries = (videos: VideoType[]): SeriesGroup[] => {
    const seriesMap = new Map<string, VideoType[]>();

    videos.forEach(video => {
      const seriesName = video.seasonId?.title || video.seriesName || video.title;
      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, []);
      }
      seriesMap.get(seriesName)?.push(video);
    });

    return Array.from(seriesMap.entries()).map(([seriesName, videos]) => ({
      seriesName,
      videos,
      thumbnail: videos[0].thumbnailUrl || videos[0].thumbnail || 'https://picsum.photos/200/300',
      totalEpisodes: videos.length,
    }));
  };

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await videoService.searchVideos(query, 1);
      if (response.success && response.data) {
        const groupedSeries = groupVideosBySeries(response.data);
        setSearchResults(groupedSeries);
      } else {
        setSearchResults([]);
        setError('No results found');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTrendingVideos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await videoService.searchVideos(' ', 1);
      if (response.success && response.data) {
        const groupedSeries = groupVideosBySeries(response.data);
        // Take top 10 series
        setTrendingSeries(groupedSeries.slice(0, 10));
      }
    } catch (err) {
      console.error('Trending load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasSearched && trendingSeries.length === 0) {
      loadTrendingVideos();
    }
  }, [loadTrendingVideos, hasSearched, trendingSeries.length]);

  // Real-time search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  const handleSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    performSearch(searchQuery);
  };

  const handleMostSearchedPress = (term: string) => {
    setSearchQuery(term);
  };

  const handleSeriesPress = (series: SeriesGroup) => {
    // Navigate to first episode of the series
    const firstVideo = series.videos[0];
    (navigation as any).navigate('Main', {
      screen: 'Reels',
      params: {
        targetVideoId: firstVideo._id,
      },
    });
  };

  const renderTrendingItem = ({ item, index }: { item: SeriesGroup; index: number }) => {
    const imageUrl = item.thumbnail;
    const fullImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${API_BASE_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;

    return (
      <TouchableOpacity
        style={styles.trendingCard}
        onPress={() => handleSeriesPress(item)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: fullImageUrl }}
          style={styles.trendingThumbnail}
          resizeMode="cover"
        />

        <View style={styles.trendingInfo}>
          <Text style={styles.trendingTitle} numberOfLines={2}>
            {item.seriesName}
          </Text>
          <Text style={styles.trendingEpisodes}>{item.totalEpisodes} Episodes</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchResultItem = ({ item, index }: { item: SeriesGroup; index: number }) => {
    const imageUrl = item.thumbnail;
    const fullImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${API_BASE_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;

    return (
      <TouchableOpacity
        style={styles.searchCard}
        onPress={() => handleSeriesPress(item)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: fullImageUrl }}
          style={styles.searchThumbnail}
          resizeMode="cover"
        />
        
        <View style={styles.searchInfo}>
          <Text style={styles.searchTitle} numberOfLines={2}>
            {item.seriesName}
          </Text>
          <Text style={styles.searchEpisodes}>{item.totalEpisodes} Episodes</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.loaderWrapper}>
            <ActivityIndicator size="large" color="#FFC107" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle" size={56} color="#FF5252" />
          </View>
          <Text style={styles.emptyTitle}>{error}</Text>
          <Text style={styles.emptySubtitle}>Please try again</Text>
        </View>
      );
    }

    if (hasSearched && searchResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="search" size={56} color="#666666" />
          </View>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <View style={styles.searchIconWrapper}>
              <Ionicons name="search" size={20} color="#999" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search series, movies..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasSearched(false);
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!hasSearched && searchQuery.length === 0 && (
          <View style={styles.mostSearchedSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={16} color="#FFC107" />
              <Text style={styles.sectionTitle}>Trending Searches</Text>
            </View>
            <View style={styles.chipsContainer}>
              {MOST_SEARCHED.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.chip}
                  onPress={() => handleMostSearchedPress(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {hasSearched && searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResultItem}
            keyExtractor={(item, index) => `${item.seriesName}-${index}`}
            key="two-columns"
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.columnWrapper}
          />
        ) : !hasSearched && trendingSeries.length > 0 ? (
          <FlatList
            data={trendingSeries}
            renderItem={renderTrendingItem}
            keyExtractor={(item, index) => `${item.seriesName}-${index}`}
            contentContainerStyle={styles.trendingContainer}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
              <View style={styles.trendingHeader}>
                <View style={styles.trendingHeaderLeft}>
                  <FontAwesome5 name="fire" size={20} color="#FFC107" />
                  <Text style={styles.trendingHeaderTitle}>Top 10 Series</Text>
                </View>
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyWrapper}>
            {renderEmptyState()}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIconWrapper: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFF',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  mostSearchedSection: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#252525',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  trendingContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 100,
  },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  trendingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trendingHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  trendingCard: {
    backgroundColor: '#252525',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  trendingThumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: '#1A1A1A',
  },
  trendingInfo: {
    padding: 16,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  trendingEpisodes: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  gridContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  searchCard: {
    width: CARD_WIDTH,
    backgroundColor: '#252525',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  searchThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#1A1A1A',
  },
  searchInfo: {
    padding: 12,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  searchEpisodes: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loaderWrapper: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
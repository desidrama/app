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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { videoService } from '../../services/video.service';
import { Video as VideoType } from '../../types';
import VideoCard from '../../components/VideoCard';
import SearchVideoCard from '../../components/SearchVideoCard';
import { API_BASE_URL } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';

type RootStackParamList = {
  Main: undefined;
  Search: undefined;
};

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VideoType[]>([]);
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
        setSearchResults(response.data);
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
        setSearchResults(response.data);
      }
    } catch (err) {
      console.error('Trending load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasSearched && searchResults.length === 0) {
      loadTrendingVideos();
    }
  }, [loadTrendingVideos, hasSearched, searchResults.length]);

  // Real-time search with debounce
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search query is empty, clear results immediately
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    // Debounce the search - wait 400ms after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 400);

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  const handleSearch = () => {
    // Clear timeout and search immediately when Enter is pressed
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    performSearch(searchQuery);
  };

  const handleMostSearchedPress = (term: string) => {
    setSearchQuery(term);
    // The useEffect will handle the search automatically
  };

  const handleVideoPress = (video: VideoType) => {
    // Navigate to Reels tab with the selected video
    (navigation as any).navigate('Main', {
      screen: 'Reels',
      params: {
        targetVideoId: video._id,
      },
    });
  };

  const renderVideoItem = ({ item }: { item: VideoType }) => {
    const imageUrl = item.thumbnailUrl || item.thumbnail || 'https://picsum.photos/110/160?random=1';
    const fullImageUrl = imageUrl.startsWith('http')
      ? imageUrl
      : `${API_BASE_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;

    return (
      <View
        style={hasSearched ? styles.videoItemSearch : styles.videoItemTrending}
      >
        <SearchVideoCard
          imageUrl={fullImageUrl}
          onPress={() => handleVideoPress(item)}
        />
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.yellow} />
          <Text style={[styles.emptyText, { color: colors.textPrimary }]}>Searching...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.emptyText, { color: colors.textPrimary }]}>{error}</Text>
        </View>
      );
    }

    if (hasSearched && searchResults.length === 0) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No results found</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Try a different search term</Text>
        </View>
      );
    }

    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="search-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textPrimary }]}>Start searching for videos</Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Enter a keyword to find content</Text>
      </View>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.textPrimary === '#1A1A1A' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeAreaInner} edges={['bottom', 'left', 'right']}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.yellow} />
            </TouchableOpacity>

            <View style={[styles.searchContainerPremium, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Ionicons
                name="search"
                size={20}
                color={colors.yellow}
                style={styles.searchIcon}
              />
              <TextInput
                style={[styles.searchInputPremium, { color: colors.textPrimary }]}
                placeholder="Search premium videos..."
                placeholderTextColor={colors.textMuted}
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
                >
                  <Ionicons name="close-circle" size={22} color={colors.yellow} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {/* Most searched */}
          {!hasSearched && searchQuery.length === 0 && (
            <View style={[styles.mostSearchedContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.mostSearchedTitle, { color: colors.textPrimary }]}>Most searched</Text>

              <View style={styles.mostSearchedRow}>
                {MOST_SEARCHED.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.mostSearchedChip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
                    onPress={() => handleMostSearchedPress(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.mostSearchedText, { color: colors.textPrimary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {/* Results */}
          {searchResults.length > 0 ? (
            <>
              {/* Trending label */}
              {!hasSearched && (
                <Text style={[styles.trendingLabel, { color: colors.textPrimary }]}>Trending now</Text>
              )}

              <FlatList
                data={searchResults}
                renderItem={renderVideoItem}
                keyExtractor={(item) => item._id}
                numColumns={2}
                contentContainerStyle={styles.resultsContainerPremium}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
              />
            </>
          ) : (
            <View style={styles.contentPremium}>
              {renderEmptyState()}
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainerPremium: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 32,
    paddingHorizontal: 18,
    height: 48,
    borderWidth: 1,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  searchInputPremium: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
    marginLeft: 8,
  },
  resultsContainerPremium: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  contentPremium: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    borderRadius: 18,
    margin: 8,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  safeArea: {
    flex: 1,
  },
  safeAreaInner: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 12) : 16,
    paddingBottom: 12,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    paddingHorizontal: 14,
    height: 40,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  resultsContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'flex-start',
  },
  videoItemSearch: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 20,
  },
  videoItemTrending: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 20,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  trendingLabel: {
    marginLeft: 18,
    marginBottom: 8,
    marginTop: 6,
    fontSize: 20,
    fontWeight: '700',
  },

  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },

  // 👇 MOST SEARCHED STYLES — ADD HERE
  mostSearchedContainer: {
    marginHorizontal: 18,
    marginBottom: 12,
  },

  mostSearchedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },

  mostSearchedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  mostSearchedChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },

  mostSearchedText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
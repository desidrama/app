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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { videoService } from '../../services/video.service';
import { Video as VideoType } from '../../types';
import VideoCard from '../../components/VideoCard';
import { API_BASE_URL } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const CARD_GAP = 8;
const NUM_COLUMNS = 3;
const CARD_WIDTH = (width - (HORIZONTAL_PADDING * 2) - (CARD_GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;
const HORIZONTAL_CARD_WIDTH = 130;
const HORIZONTAL_CARD_GAP = 12;

type RootStackParamList = {
  Main: undefined;
  Search: undefined;
};

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

interface CategorySection {
  title: string;
  data: VideoType[];
}

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [allVideos, setAllVideos] = useState<VideoType[]>([]);
  const [searchResults, setSearchResults] = useState<VideoType[]>([]);
  const [categorizedResults, setCategorizedResults] = useState<CategorySection[]>([]);
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

  const CATEGORIES = ['Horror', 'Thriller', 'Comedy', 'Drama', 'Action', 'Romance', 'Sci-Fi'];

  const categorizeVideos = (videos: VideoType[]): CategorySection[] => {
    const categoryMap: { [key: string]: VideoType[] } = {};
    
    CATEGORIES.forEach(cat => {
      categoryMap[cat] = [];
    });

    CATEGORIES.forEach(category => {
      for (let i = 0; i < 4 && i < videos.length; i++) {
        categoryMap[category].push(videos[i]);
      }
    });

    return CATEGORIES.map(category => ({
      title: category,
      data: categoryMap[category],
    })).filter(section => section.data.length > 0);
  };

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      if (allVideos.length > 0) {
        setCategorizedResults(categorizeVideos(allVideos));
      }
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await videoService.searchVideos(query, 1);
      if (response.success && response.data) {
        setSearchResults(response.data);
        setCategorizedResults([]);
      } else {
        setSearchResults([]);
        setCategorizedResults([]);
        setError('No results found');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
      setSearchResults([]);
      setCategorizedResults([]);
    } finally {
      setLoading(false);
    }
  }, [allVideos]);

  const loadTrendingVideos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await videoService.searchVideos(' ', 1);
      if (response.success && response.data) {
        setAllVideos(response.data);
        setCategorizedResults(categorizeVideos(response.data));
      }
    } catch (err) {
      console.error('Trending load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasSearched && allVideos.length === 0) {
      loadTrendingVideos();
    }
  }, [loadTrendingVideos, hasSearched, allVideos.length]);

  // Real-time search with debounce - combining both branches
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search query is empty, clear results immediately and restore categories
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      if (allVideos.length > 0) {
        setCategorizedResults(categorizeVideos(allVideos));
      }
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
  }, [searchQuery, performSearch, allVideos]);

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
    (navigation as any).navigate('Main', {
      screen: 'Reels',
      params: {
        targetVideoId: video._id,
      },
    });
  };

  const renderHorizontalVideoItem = ({ item }: { item: VideoType }) => {
    const imageUrl = item.thumbnailUrl || item.thumbnail || 'https://picsum.photos/110/160?random=1';
    const fullImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${API_BASE_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;

    return (
      <TouchableOpacity
        style={styles.horizontalCard}
        onPress={() => handleVideoPress(item)}
        activeOpacity={0.9}
      >
        <View style={styles.horizontalCardWrapper}>
          <View style={styles.horizontalThumbnailContainer}>
            <Image
              source={{ uri: fullImageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          </View>
          
          <View style={styles.horizontalTitleContainer}>
            <Text
              style={styles.horizontalVideoTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGridVideoItem = ({ item, index }: { item: VideoType; index: number }) => {
    const imageUrl = item.thumbnailUrl || item.thumbnail || 'https://picsum.photos/110/160?random=1';
    const fullImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${API_BASE_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;

    return (
      <TouchableOpacity
        style={styles.videoCard}
        onPress={() => handleVideoPress(item)}
        activeOpacity={0.9}
      >
        <View style={styles.cardWrapper}>
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: fullImageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          </View>
          
          <View style={styles.titleContainer}>
            <Text
              style={styles.videoTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategorySection = (section: CategorySection) => (
    <View key={section.title} style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitleRow}>
          <View style={styles.categoryDot} />
          <Text style={styles.categoryTitle}>{section.title}</Text>
        </View>
        <Text style={styles.categoryCount}>{section.data.length}</Text>
      </View>
      
      <FlatList
        data={section.data}
        renderItem={renderHorizontalVideoItem}
        keyExtractor={(item) => `${section.title}-${item._id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        ItemSeparatorComponent={() => <View style={{ width: HORIZONTAL_CARD_GAP }} />}
      />
    </View>
  );

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
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <View style={styles.searchIconWrapper}>
              <Ionicons
                name="search"
                size={22}
                color="#888888"
              />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search videos, movies, shows..."
              placeholderTextColor="#555555"
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
                  setCategorizedResults(categorizeVideos(allVideos));
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={22} color="#888888" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!hasSearched && searchQuery.length === 0 && (
          <View style={styles.mostSearchedSection}>
            <Text style={styles.sectionTitle}>Most Searched</Text>
            <View style={styles.chipsContainer}>
              {MOST_SEARCHED.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.chip}
                  onPress={() => handleMostSearchedPress(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trending-up" size={12} color="#999999" style={styles.chipIcon} />
                  <Text style={styles.chipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {hasSearched && searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={renderGridVideoItem}
            keyExtractor={(item, index) => `${item._id}-${index}`}
            key="three-columns"
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.columnWrapper}
          />
        ) : !hasSearched && categorizedResults.length > 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {categorizedResults.map(section => renderCategorySection(section))}
          </ScrollView>
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
    backgroundColor: '#0A0A0A',
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 16,
    backgroundColor: '#0A0A0A',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    borderRadius: 28,
    paddingHorizontal: 18,
    height: 56,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  searchIconWrapper: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  mostSearchedSection: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFC107',
  },
  chipIcon: {
    marginRight: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CCCCCC',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFC107',
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999999',
    backgroundColor: '#252525',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  horizontalList: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  horizontalCard: {
    width: HORIZONTAL_CARD_WIDTH,
  },
  horizontalCardWrapper: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  horizontalThumbnailContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#0A0A0A',
    overflow: 'hidden',
  },
  horizontalTitleContainer: {
    padding: 10,
    backgroundColor: '#1A1A1A',
    minHeight: 22,
    justifyContent: 'center',
  },
  horizontalVideoTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 11,
    letterSpacing: 0.2,
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
  videoCard: {
    width: CARD_WIDTH,
  },
  cardWrapper: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#0A0A0A',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    padding: 10,
    backgroundColor: '#1A1A1A',
    minHeight: 44,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 13,
    letterSpacing: 0.2,
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
    color: '#FFFFFF',
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
    borderColor: '#333333',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999999',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
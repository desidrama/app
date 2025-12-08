// ============================================
// FILE: src/screens/home/HomeScreen.tsx
// ============================================
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VideoCard from '../../components/VideoCard';

export default function HomeScreen({ navigation }: any) {
  const [searchText, setSearchText] = React.useState('');

  const continueWatchingData = [
    { title: 'Jurassic Park', imageUrl: 'https://picsum.photos/110/160?random=1' },
    { title: 'Oldboy', imageUrl: 'https://picsum.photos/110/160?random=2' },
    { title: 'John Wick', imageUrl: 'https://picsum.photos/110/160?random=3' },
  ];

  const latestTrendingData = [
    { title: 'Series 1', imageUrl: 'https://picsum.photos/110/160?random=4' },
    { title: 'Series 2', imageUrl: 'https://picsum.photos/110/160?random=5' },
    { title: 'Series 3', imageUrl: 'https://picsum.photos/110/160?random=6' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header with Search Bar - Always Visible */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search...."
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity>
            <Ionicons name="mic-outline" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {['New & Hot', 'Popular', 'Originals', 'Categories'].map((cat, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.categoryTab, i === 0 && styles.categoryTabActive]}
            >
              <Text
                style={[styles.categoryText, i === 0 && styles.categoryTextActive]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured/Hero Section */}
        <View style={styles.featuredSection}>
          <View style={styles.featuredCard}>
            <View style={styles.featuredImage}>
              <Text style={styles.placeholderText}>Featured</Text>
            </View>
            <View style={styles.featuredOverlay}>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.smallButton}>
                  <Ionicons name="play" size={16} color="#000" />
                  <Text style={styles.smallButtonText}>Action</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>Thriller</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Continue Watching Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Watching</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
          >
            {continueWatchingData.map((item, i) => (
              <VideoCard
                key={i}
                title={item.title}
                imageUrl={item.imageUrl}
                onPress={() => {}}
              />
            ))}
          </ScrollView>
        </View>

        {/* Latest & Trending Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest & Trending</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
          >
            {latestTrendingData.map((item, i) => (
              <VideoCard
                key={i}
                title={item.title}
                imageUrl={item.imageUrl}
                onPress={() => {}}
              />
            ))}
          </ScrollView>
        </View>

        {/* Bottom padding to avoid tab bar overlap */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 28,
    paddingBottom: 16,
    backgroundColor: '#000',
    zIndex: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 0,
  },
  content: {
    flex: 1,
  },
  categoryScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  categoryTabActive: {
    backgroundColor: '#FFD700',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  categoryTextActive: {
    color: '#000',
  },
  featuredSection: {
    paddingHorizontal: 12,
    marginVertical: 12,
  },
  featuredCard: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  featuredImage: {
    flex: 1,
    backgroundColor: '#1a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 12,
    paddingLeft: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  horizontalScroll: {
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  bottomPadding: {
    height: 130,
  },
});

// FILE: src/components/ContinueWatching.tsx

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ContinueWatchingItem {
  _id?: string;
  videoId: {
    _id: string;
    title: string;
    thumbnailUrl?: string;
  };
  currentTime: number;
  progress: number;
}

interface ContinueWatchingProps {
  items: ContinueWatchingItem[];
  loading: boolean;
  onItemPress: (item: ContinueWatchingItem) => void;
}

export default function ContinueWatching({
  items,
  loading,
  onItemPress,
}: ContinueWatchingProps) {
  if (items.length === 0 && !loading) return null;

  return (
    <View style={styles.wrapper}>
      {/* FULL WIDTH – NO SIDE GAPS */}
      <LinearGradient
  colors={[
    'rgba(234, 182, 9, 0.66)', // strong golden top
    'rgba(234, 181, 9, 0.45)', // mid fade
    'rgba(0, 0, 0, 0.65)',     // 👈 dark fade at bottom (IMPORTANT)
  ]}
  locations={[0, 0.55, 1]}   // 👈 controls fade length
  start={{ x: 0.5, y: 0 }}
  end={{ x: 0.5, y: 1 }}
  style={styles.gradientContainer}
>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Continue Watching</Text>

          <View style={{ height: 14 }} />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFD54A" />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContainer}
              decelerationRate="fast"
              snapToInterval={122}
              snapToAlignment="start"
            >
              {items.map((item, index) => {
                const key =
                  item._id || `${item.videoId._id}-${index}`;

                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.85}
                    onPress={() => onItemPress(item)}
                    style={styles.videoCardWrapper}
                  >
                    <View style={styles.cardContainer}>
                      <Image
                        source={{
                          uri:
                            item.videoId.thumbnailUrl ||
                            'https://picsum.photos/110/160',
                        }}
                        style={styles.thumbnail}
                      />

                      <View style={styles.overlay} />

                      <View style={styles.titleContainer}>
                        <Text style={styles.titleText} numberOfLines={1}>
                          {item.videoId.title}
                        </Text>
                      </View>

                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(item.progress, 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  /* IMPORTANT: no horizontal margin */
  wrapper: {
    marginTop: 22,
  },

  gradientContainer: {
    width: '100%',
    paddingVertical: 18,

   

    // subtle premium glow
    shadowColor: '#FFD54A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    minHeight: 240,            // 👈 ensures fade reaches bottom

    
    
  },

  content: {
    paddingHorizontal: 16, // normal inner padding
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },

  horizontalScrollContainer: {
    flexDirection: 'row',
  },

  videoCardWrapper: {
    marginRight: 12,
  },

  cardContainer: {
    width: 110,
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',

    shadowColor: '#FFD54A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },

  thumbnail: {
    width: '100%',
    height: '100%',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  titleContainer: {
    position: 'absolute',
    bottom: 14,
    left: 8,
    right: 8,
  },

  titleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  progressBarBackground: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    right: 8,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD54A',
    borderRadius: 4,
  },
});

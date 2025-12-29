import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  coins: number;
  skipCost: number;
  onSkipWithCoins: () => void;
  onWatchAd: () => void;
};

export default function AdCoinsBar({
  coins,
  skipCost,
  onSkipWithCoins,
  onWatchAd,
}: Props) {
  const canSkip = coins >= skipCost;

  return (
    <View style={styles.container}>
      <Text style={styles.coins}>💰 Coins: {coins}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          disabled={!canSkip}
          onPress={onSkipWithCoins}
          style={[styles.skipBtn, !canSkip && styles.disabled]}
        >
          <Text style={styles.skipText}>
            Skip ({skipCost})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onWatchAd} style={styles.watchBtn}>
          <Text style={styles.watchText}>Watch Ad</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0b0b14',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#232338',
  },
  coins: {
    color: '#FFD54A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skipBtn: {
    backgroundColor: '#232338',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  skipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  watchBtn: {
    backgroundColor: '#FFD54A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  watchText: {
    color: '#000',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.4,
  },
});

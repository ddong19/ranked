import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import SwipeableItem from '@/components/SwipeableItem';
import { useRankings } from '@/hooks/useRankings';
import { RankingWithItems } from '@/types/rankings';

export default function RankingDetailScreen() {
  const { id, rankingData } = useLocalSearchParams<{ id: string; rankingData?: string }>();
  const router = useRouter();
  const { getRanking, rankings, refreshRankings, deleteItem } = useRankings();
  const [ranking, setRanking] = useState<RankingWithItems | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Refresh data whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshRankings();
    }, [refreshRankings])
  );

  // Update local ranking when rankings change (e.g., after adding an item)
  useEffect(() => {
    if (id && rankings.length > 0) {
      const updatedRanking = getRanking(parseInt(id));
      if (updatedRanking) {
        setRanking(updatedRanking);
      }
    }
  }, [rankings, id, getRanking]);

  useEffect(() => {
    if (initialized) return; // Prevent multiple runs
    
    // First try to use passed ranking data
    if (rankingData) {
      try {
        const parsedRanking = JSON.parse(rankingData);
        setRanking(parsedRanking);
        setInitialized(true);
        return;
      } catch (error) {
        console.error('Failed to parse ranking data:', error);
      }
    }

    // Fallback to useRankings if no data passed or parsing failed
    if (id) {
      const foundRanking = getRanking(parseInt(id));
      if (foundRanking) {
        setRanking(foundRanking);
      } else {
        Alert.alert('Error', 'Ranking not found');
        router.back();
      }
      setInitialized(true);
    }
  }, [id]); // Only depend on stable id

  const handleAddItem = () => {
    router.push(`/ranking/${id}/add-item`);
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await deleteItem(itemId);
    } catch (error) {
      console.error('Failed to delete item:', error);
      Alert.alert('Error', 'Failed to delete item. Please try again.');
    }
  };


  // Don't render anything until we have ranking data
  if (!ranking) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, !ranking.description && styles.sectionTitleNoDescription]}>
          {ranking.title}
        </Text>
        {ranking.description && (
          <Text style={styles.sectionDescription}>
            {ranking.description}
          </Text>
        )}
        
        <FlatList
          data={ranking.item || []}
          renderItem={({ item }) => {
            const getRankTextStyle = () => {
              if (item.rank === 1) return styles.goldText;
              if (item.rank === 2) return styles.silverText;
              if (item.rank === 3) return styles.bronzeText;
              return styles.rankNumberText;
            };

            return (
              <SwipeableItem onDelete={() => handleDeleteItem(item.id)}>
                <View style={styles.itemCard}>
                  <View style={styles.rankNumber}>
                    <Text style={getRankTextStyle()}>
                      {item.rank}
                    </Text>
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                </View>
              </SwipeableItem>
            );
          }}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No items yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Item" to start ranking</Text>
            </View>
          }
        />

        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddItem}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#666" />
          <Text style={styles.addButtonText}>ADD ITEM</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151718',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 10
  },
  sectionTitleNoDescription: {
    marginBottom: 16,
  },
  sectionDescription: {
    color: '#999',
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
    marginLeft: 10
  },
  listContainer: {
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  rankNumber: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goldText: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '900',
  },
  silverText: {
    color: '#C0C0C0',
    fontSize: 16,
    fontWeight: '900',
  },
  bronzeText: {
    color: '#CD7F32',
    fontSize: 16,
    fontWeight: '900',
  },
  rankNumberText: {
    color: '#606060',
    fontSize: 16,
    fontWeight: '900',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 20,
  },
  addButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader'
import RankingCard from '../components/RankingCard';
import { useRankings } from '../logic/useRankings';
import { closeAllSwipeables } from '../components/SwipeableItem';

type RankingItem = {
  id: number;
  title: string;
  description?: string | null;
  itemCount: number;
};

export default function HomeScreen() {
  const router = useRouter();
  const { rankings, refreshRankings, deleteRanking } = useRankings();

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshRankings();
    }, [refreshRankings])
  );

  const handleRankingPress = (ranking: RankingItem) => {
    // TODO: Navigate to ranking detail
    console.log('Pressed ranking:', ranking.id);
  };

  const handleAddRanking = () => {
    closeAllSwipeables();
    router.push('/add-ranking');
    console.log('Add ranking pressed');
  };

  const handleDeleteRanking = (rankingId: number) => {
    const ranking = rankings.find(r => r.id === rankingId);
    if (!ranking) return;

    const itemCount = ranking.items?.length || 0;
    const itemText = itemCount === 1 ? 'Item' : 'Items';
    
    Alert.alert(
      'Delete Ranking',
      `Are you sure you want to delete "${ranking.title}" and its ${itemCount} ${itemText.toLowerCase()}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => closeAllSwipeables(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteRanking(rankingId),
        },
      ],
      { cancelable: true }
    );
  };

  const confirmDeleteRanking = async (rankingId: number) => {
    try {
      await deleteRanking(rankingId);
      closeAllSwipeables();
    } catch (error) {
      console.error('Failed to delete ranking:', error);
      Alert.alert('Error', 'Failed to delete ranking. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Your Rankings</Text>


        <FlatList
          data={rankings}
          renderItem={({ item }) => (
            <RankingCard
            ranking={{
              id: item.id,
              title: item.title,
              description: item.description,
              itemCount: item.items.length,
            }}
            onPress={() => {}}
            onDelete={() => handleDeleteRanking(item.id)}
          />
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={closeAllSwipeables}

          // message when there are no rankings
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateTitle}>No Rankings Yet!</Text>
              <Text style={styles.emptyStateText}>
                Your ranking universe awaits.{'\n'}
                Tap below to create your first ranking!
              </Text>
            </View>
          }
        />

        {/* Add Ranking button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddRanking}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#666" />
            <Text style={styles.addButtonText}>ADD RANKING</Text>
          </TouchableOpacity>
        </View>

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
    marginBottom: 24,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  buttonContainer: {
    backgroundColor: '#151718',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  addButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyStateEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
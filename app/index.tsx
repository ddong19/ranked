import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import SwipeableItem, { closeAllSwipeables } from '@/components/SwipeableItem';
import { useRankings } from '@/hooks/useRankings';
import { RankingWithItems } from '@/types/rankings';

export default function Index() {
  const router = useRouter();
  const { rankings, refreshRankings, deleteRanking } = useRankings();

  // Refresh data whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshRankings();
    }, [refreshRankings])
  );

  const handleRankingPress = (ranking: RankingWithItems) => {
    router.push({
      pathname: `/ranking/[id]`,
      params: { 
        id: ranking.id.toString(), 
        rankingData: JSON.stringify(ranking) 
      }
    });
  };

  const handleAddRanking = () => {
    closeAllSwipeables();
    router.push('/add-ranking');
  };

  const handleDeleteRanking = (rankingId: number) => {
    const ranking = rankings.find(r => r.id === rankingId);
    if (!ranking) return;

    const itemCount = ranking.item?.length || 0;
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
    } catch (error) {
      console.error('Failed to delete ranking:', error);
      Alert.alert('Error', 'Failed to delete ranking. Please try again.');
    }
  };

  const renderRankingCard = ({ item }: { item: RankingWithItems }) => (
    <View style={styles.cardWrapper}>
      <SwipeableItem 
        onDelete={() => handleDeleteRanking(item.id)}
        onPress={() => handleRankingPress(item)}
      >
        <View style={styles.rankingCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.description && (
                <Text style={styles.cardDescription}>
                  {item.description}
                </Text>
              )}
              <Text style={styles.itemCount}>
                {item.item?.length || 0} {(item.item?.length || 0) === 1 ? 'Item' : 'Items'}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </View>
        </View>
      </SwipeableItem>
    </View>
  );


  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Your Rankings</Text>
        
        <FlatList
          data={rankings}
          renderItem={renderRankingCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={closeAllSwipeables}
        />

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
    paddingBottom: 100, // Space for add button
  },
  cardWrapper: {
    marginBottom: 4, // 4 + 12 from SwipeableItem = 16 total
  },
  rankingCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  cardLeft: {
    flex: 1,
    marginRight: 16,
  },
  cardRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  itemCount: {
    color: '#666',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
});

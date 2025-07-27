import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import { useRankings } from '@/hooks/useRankings';
import { RankingWithItems } from '@/types/rankings';

export default function Index() {
  const router = useRouter();
  const { rankings, loading, refreshRankings } = useRankings();

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
    router.push('/add-ranking');
  };

  const renderRankingCard = ({ item }: { item: RankingWithItems }) => (
    <TouchableOpacity 
      style={styles.rankingCard}
      onPress={() => handleRankingPress(item)}
      activeOpacity={0.7}
    >
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
    </TouchableOpacity>
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
        />

        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddRanking}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#666" />
          <Text style={styles.addButtonText}>ADD RANKING</Text>
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
    marginBottom: 24,
  },
  listContainer: {
    paddingBottom: 100, // Space for add button
  },
  rankingCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginBottom: 16,
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
});

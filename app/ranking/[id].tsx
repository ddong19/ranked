import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRankings } from '@/hooks/useRankings';
import { RankingWithItems } from '@/types/rankings';

export default function RankingDetailScreen() {
  const { id, rankingData } = useLocalSearchParams<{ id: string; rankingData?: string }>();
  const router = useRouter();
  const { getRanking, loading } = useRankings();
  const [ranking, setRanking] = useState<RankingWithItems | null>(null);
  const [initialized, setInitialized] = useState(false);

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
    if (id && !loading) {
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
    // TODO: Navigate to add item screen
    Alert.alert('Add Item', 'This will open the add item screen');
  };

  const handleReorder = (newItems: any[]) => {
    // TODO: Implement reordering logic
    console.log('Reordering items:', newItems);
  };

  // Don't render anything until we have ranking data
  if (!ranking) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="list" size={24} color="#fff" />
          <Text style={styles.appTitle}>RANKED</Text>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{ranking.title}</Text>
        <Text style={styles.sectionDescription}>
          {ranking.description || ''}
        </Text>
        
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
              <View style={styles.itemCard}>
                <View style={styles.rankNumber}>
                  <Text style={getRankTextStyle()}>
                    {item.rank}
                  </Text>
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.notes && (
                    <Text style={styles.itemNotes}>{item.notes}</Text>
                  )}
                </View>
              </View>
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  profileButton: {
    padding: 4,
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
  },
  sectionDescription: {
    color: '#999',
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
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
    marginBottom: 12,
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
    fontWeight: 'bold',
  },
  silverText: {
    color: '#C0C0C0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bronzeText: {
    color: '#CD7F32',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 1,
  },
  itemNotes: {
    color: '#999',
    fontSize: 14,
    lineHeight: 18,
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
import { View, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RankingList } from '@/types/rankings';

export default function RankingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [ranking, setRanking] = useState<RankingList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, [id]);

  const loadRanking = async () => {
    try {
      // TODO: Replace with actual API call to your Supabase backend
      // For now, we'll use mock data
      const mockRanking: RankingList = {
        id: parseInt(id),
        title: 'Travel Locations',
        description: 'Favorite places I\'ve traveled to',
        items: [
          { id: 1, name: 'Lake Lucerne, Switzerland', rank: 1, ranking: parseInt(id) },
          { id: 2, name: 'Zion National Park, Utah', rank: 2, ranking: parseInt(id) },
          { id: 3, name: 'Bryce Canyon, Utah', rank: 3, ranking: parseInt(id) },
          { id: 4, name: 'Lake Louise, Banff', rank: 4, ranking: parseInt(id) },
          { id: 5, name: 'Johnson Canyon, Banff', rank: 5, ranking: parseInt(id) },
        ]
      };
      
      setRanking(mockRanking);
    } catch (error) {
      Alert.alert('Error', 'Failed to load ranking');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    // TODO: Navigate to add item screen
    Alert.alert('Add Item', 'This will open the add item screen');
  };

  const handleReorder = (newItems: any[]) => {
    // TODO: Implement reordering logic
    console.log('Reordering items:', newItems);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          {/* TODO: Add loading spinner */}
        </View>
      </SafeAreaView>
    );
  }

  if (!ranking) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* TODO: Add header with title and edit button */}
        {/* TODO: Add draggable list component */}
        {/* TODO: Add floating add button */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151718', // Dark background to match your design
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ItemForm from '../components/ItemForm';
import { useRankings } from '../logic/useRankings';

export default function EditItemScreen() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const router = useRouter();
  const { getRanking, updateItem, updateItemRanks, loading: rankingsLoading, refreshRankings } = useRankings();
  const [item, setItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Refresh rankings when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      refreshRankings();
    }, [refreshRankings])
  );

  // Load item data
  useEffect(() => {
    if (rankingsLoading || !id || !itemId) return;

    const ranking = getRanking(parseInt(id));
    const foundItem = ranking?.items.find(item => item.id === parseInt(itemId));

    if (foundItem) {
      setItem(foundItem);
    } else {
      Alert.alert(
        'Error',
        'Item not found',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
    setInitializing(false);
  }, [id, itemId, getRanking, rankingsLoading, router]);

  const handleSave = async (data: { name: string; notes?: string; rank: number }) => {
    if (!item) return;

    setSaving(true);
    try {
      // Get current ranking to validate rank bounds
      const ranking = getRanking(parseInt(id!));
      if (!ranking) throw new Error('Ranking not found');

      const maxRank = ranking.items?.length || 1;
      const validRank = data.rank ? Math.min(data.rank, maxRank) : item.rank;
      const rankChanged = validRank !== item.rank;

      // Always update name and notes
      await updateItem(item.id, {
        name: data.name,
        notes: data.notes
      });

      // If rank changed, reorder the entire list
      if (rankChanged) {
        const items = [...ranking.items];
        const itemToMove = items.find(i => i.id === item.id);
        if (itemToMove) {
          // Remove item from current position
          const filteredItems = items.filter(i => i.id !== item.id);
          // Insert at new position (validRank - 1 because array is 0-indexed)
          filteredItems.splice(validRank - 1, 0, { ...itemToMove, rank: validRank });

          await updateItemRanks(parseInt(id!), filteredItems);
        }
      }

      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (rankingsLoading || initializing || !item) {
    return (
      <SafeAreaView style={styles.loadingContainer} />
    );
  }

  return (
    <ItemForm
      mode="edit"
      initialData={item}
      onSave={handleSave}
      onCancel={handleCancel}
      loading={saving}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#151718',
  },
});

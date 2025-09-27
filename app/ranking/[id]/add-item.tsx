import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import ItemForm from '@/components/ItemForm';
import { CreateItemRequest } from '@/types/rankings';
import { useRankings } from '@/hooks/useRankings';

export default function AddItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem, getRanking, updateItemRanks } = useRankings();
  const [loading, setLoading] = useState(false);

  const rankingId = parseInt(id || '0');

  const handleSave = async (data: CreateItemRequest) => {
    if (loading) return;

    setLoading(true);
    try {
      // Get current ranking to calculate next rank
      const currentRanking = getRanking(rankingId);
      
      if (!currentRanking) {
        Alert.alert('Error', 'Ranking not found');
        return;
      }

      // Always create item at end to avoid unique constraint violation
      const currentItemCount = currentRanking.item?.length || 0;
      const endRank = currentItemCount + 1;
      const desiredRank = data.rank ? Math.min(data.rank, endRank) : endRank;
      
      const newItemData: CreateItemRequest = {
        name: data.name,
        notes: data.notes,
        rank: endRank, // Always create at end first
        ranking_id: rankingId
      };

      // Create item in local database
      const newItem = await addItem(rankingId, newItemData);
      
      // If user specified a different rank, reorder the list
      if (data.rank && desiredRank !== endRank) {
        // Build the new list with the created item
        const items = [...currentRanking.item, newItem];
        // Remove new item from end and insert at desired position
        const filteredItems = items.filter(item => item.id !== newItem.id);
        filteredItems.splice(desiredRank - 1, 0, newItem);
        // Reorder entire list
        await updateItemRanks(rankingId, filteredItems);
      }
      
      // Navigate back to previous screen
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ItemForm
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
      loading={loading}
    />
  );
}
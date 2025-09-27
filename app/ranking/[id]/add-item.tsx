import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import ItemForm from '@/components/ItemForm';
import { CreateItemRequest } from '@/types/rankings';
import { useRankings } from '@/hooks/useRankings';

export default function AddItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem, getRanking } = useRankings();
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

      // Use custom rank if provided, otherwise calculate next rank
      // If rank is larger than list, set to end of list
      const maxRank = (currentRanking.item?.length || 0) + 1;
      const nextRank = data.rank ? Math.min(data.rank, maxRank) : maxRank;
      
      const newItemData: CreateItemRequest = {
        name: data.name,
        notes: data.notes,
        rank: nextRank,
        ranking_id: rankingId
      };

      // Create item in local database
      await addItem(rankingId, newItemData);
      
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
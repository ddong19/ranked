import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import RankingForm from '@/components/RankingForm';
import { CreateRankingRequest } from '@/types/rankings';
import { useRankings } from '@/hooks/useRankings';

export default function AddRankingScreen() {
  const router = useRouter();
  const { createRanking } = useRankings();
  const [loading, setLoading] = useState(false);

  const handleSave = async (data: CreateRankingRequest) => {
    setLoading(true);
    try {
      await createRanking(data);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create ranking');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <RankingForm
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
      loading={loading}
    />
  );
}


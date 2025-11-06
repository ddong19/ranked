import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import RankingForm, { RankingFormData } from '../components/RankingForm';
import { useRankings } from '../logic/useRankings';

export default function AddRankingScreen() {
  const router = useRouter();
  const { createRanking } = useRankings();
  const [loading, setLoading] = useState(false);

  const handleSave = async (data: RankingFormData) => {
    setLoading(true);
    try {
      // Call the hook to create the ranking
      const newRanking = await createRanking(data);
      console.log('Ranking created successfully:', newRanking);
      
      // Navigate back to home
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
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
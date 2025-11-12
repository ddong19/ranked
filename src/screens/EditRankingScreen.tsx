import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import RankingForm from '../components/RankingForm';
import { useRankings } from '../logic/useRankings';

export default function EditRankingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getRanking, updateRanking, loading: rankingsLoading, refreshRankings } = useRankings();
  const [ranking, setRanking] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Refresh rankings when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      refreshRankings();
    }, [refreshRankings])
  );

  // Load ranking data
  useEffect(() => {
    if (rankingsLoading || !id) return;

    const foundRanking = getRanking(parseInt(id));
    if (foundRanking) {
      setRanking(foundRanking);
    } else {
      Alert.alert(
        'Error',
        'Ranking not found',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
    setInitializing(false);
  }, [id, getRanking, rankingsLoading, router]);

  const handleSave = async (data: { title: string; description: string }) => {
    if (!ranking) return;

    setSaving(true);
    try {
      await updateRanking(ranking.id, data);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update ranking');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (rankingsLoading || initializing || !ranking) {
    return (
      <SafeAreaView style={styles.loadingContainer} />
    );
  }

  return (
    <RankingForm
      mode="edit"
      initialData={ranking}
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

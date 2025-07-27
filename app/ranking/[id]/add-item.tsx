import { View, StyleSheet, Alert, TextInput, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native';

import { CreateItemRequest } from '@/types/rankings';
import { useRankings } from '@/hooks/useRankings';

export default function AddItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem, getRanking } = useRankings();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const rankingId = parseInt(id || '0');
  const ranking = getRanking(rankingId);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for this item');
      return;
    }

    if (!ranking) {
      Alert.alert('Error', 'Ranking not found');
      return;
    }

    setLoading(true);
    try {
      // Calculate the next rank position (last position + 1)
      const nextRank = (ranking.item?.length || 0) + 1;
      
      const newItemData: CreateItemRequest = {
        name: name.trim(),
        notes: notes.trim() || undefined,
        rank: nextRank,
        ranking_id: rankingId
      };

      // Create item using Supabase
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
    if (name.trim() || notes.trim()) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Item</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          disabled={loading}
        >
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., The Godfather"
            placeholderTextColor="#666"
            maxLength={255}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about this item..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    color: '#999',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: '#0a7ea4',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  textArea: {
    minHeight: 100,
  },
});
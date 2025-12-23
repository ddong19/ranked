import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ItemData {
  name: string;
  notes?: string;
  rank: number;
}

interface ItemFormProps {
  mode: 'create' | 'edit';
  initialData?: {
    name: string;
    notes: string | null;
    rank: number;
  };
  onSave: (data: ItemData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ItemForm({
  mode,
  initialData,
  onSave,
  onCancel,
  loading = false
}: ItemFormProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [rank, setRank] = useState('');

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setName(initialData.name);
      setNotes(initialData.notes || '');
      setRank(initialData.rank.toString());
    }
  }, [mode, initialData]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for this item');
      return;
    }

    if (loading) {
      return; // Prevent double-tap
    }

    const parsedRank = rank.trim() ? parseInt(rank.trim()) : (initialData?.rank || 0);

    const itemData: ItemData = {
      name: name.trim(),
      notes: notes.trim() || undefined,
      rank: parsedRank,
    };

    await onSave(itemData);
  };

  const handleCancel = () => {
    const originalName = initialData?.name || '';
    const originalNotes = initialData?.notes || '';
    const originalRank = initialData?.rank?.toString() || '';
    const hasChanges = name !== originalName || notes !== originalNotes || rank !== originalRank;

    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onCancel }
        ]
      );
    } else {
      onCancel();
    }
  };

  const headerTitle = mode === 'create' ? 'New Item' : 'Edit Item';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
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
          <View style={styles.rowLabels}>
            <Text style={[styles.label, styles.nameLabel]}>Name *</Text>
            <Text style={[styles.label, styles.rankLabel]}>Rank</Text>
          </View>
          <View style={styles.nameRankRow}>
            <TextInput
              style={[styles.input, styles.nameInput]}
              value={name}
              onChangeText={setName}
              placeholder="e.g., The Godfather"
              placeholderTextColor="#666"
              maxLength={255}
            />
            <TextInput
              style={[styles.input, styles.rankInput]}
              value={rank}
              onChangeText={setRank}
              placeholder="#"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note for your item"
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
  rowLabels: {
    flexDirection: 'row',
  },
  nameRankRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
  },
  rankInput: {
    width: 60,
  },
  nameLabel: {
    flex: 1,
  },
  rankLabel: {
    width: 60,
  },
});

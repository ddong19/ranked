import { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateRankingRequest, RankingWithItems } from '@/types/rankings';
import { parseRankingListInput } from '@/utils/parseRankingListInput';

interface RankingFormProps {
  mode: 'create' | 'edit';
  initialData?: RankingWithItems;
  onSave: (data: CreateRankingRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function RankingForm({ 
  mode, 
  initialData, 
  onSave, 
  onCancel, 
  loading = false 
}: RankingFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importText, setImportText] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
    }
  }, [mode, initialData]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your ranking');
      return;
    }

    if (loading) {
      return;
    }

    const rankingData: CreateRankingRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
    };

    // Parse imported text if provided
    if (mode === 'create' && importText.trim()) {
      const parsedItems = parseRankingListInput(importText.trim());
      if (parsedItems.length > 0) {
        rankingData.importedItems = parsedItems;
      }
    }

    await onSave(rankingData);
  };

  const handleCancel = () => {
    const originalTitle = initialData?.title || '';
    const originalDescription = initialData?.description || '';
    const hasChanges = title !== originalTitle || description !== originalDescription;
    
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

  const headerTitle = mode === 'create' ? 'New Ranking' : 'Edit Ranking';

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
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., My Favorite Movies"
            placeholderTextColor="#666"
            maxLength={255}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add a description for your ranking"
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {mode === 'create' && (
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.labelInRow}>Import Items</Text>
              <TouchableOpacity 
                style={styles.helpIcon} 
                onPress={() => setShowHelpModal(true)}
              >
                <Text style={styles.helpIconText}>?</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea, styles.importTextArea]}
              value={importText}
              onChangeText={setImportText}
              placeholder="Enter your items, one per line"
              placeholderTextColor="#666"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={2000}
            />
          </View>
        )}
      </View>

      <Modal
        visible={showHelpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Import Format Help</Text>
            
            <Text style={styles.modalSectionTitle}>Supported Formats:</Text>
            <Text style={styles.modalText}>• Plain text - one item per line</Text>
            <Text style={styles.modalText}>• Numbered lists - 1. Item, 2. Item...</Text>
            <Text style={styles.modalText}>• Bullet points - • Item, - Item, * Item</Text>
            <Text style={styles.modalText}>• Notes in parentheses - Item (optional notes)</Text>
            
            <Text style={styles.modalSectionTitle}>Examples:</Text>
            <View style={styles.exampleContainer}>
              <Text style={styles.exampleText}>The Matrix{'\n'}Inception{'\n'}Interstellar (sci-fi classic)</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowHelpModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  labelInRow: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  importTextArea: {
    minHeight: 120,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 20,
  },
  helpIcon: {
    marginLeft: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpIconText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 350,
    width: '100%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  exampleContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  exampleText: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
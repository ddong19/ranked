import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseRankingListInput, ParsedItem } from '../utils/parseRankingListInput';

export interface RankingFormData {
    title: string;
    description: string;
    importedItems?: ParsedItem[];
  }

  interface RankingFormProps {
    mode?: 'create' | 'edit';
    initialData?: {
      title: string;
      description: string | null;
    };
    onSave: (data: RankingFormData) => void;
    onCancel: () => void;
    loading?: boolean;
  }

export default function RankingForm({
  mode = 'create',
  initialData,
  onSave,
  onCancel,
  loading = false
}: RankingFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importText, setImportText] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Load initial data for edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
    }
  }, [mode, initialData]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your ranking');
      return;
    }

    if (loading) {
      return; // Prevent double-tap
    }

    // Prepare the data to pass back
    const formData: RankingFormData = {
      title: title.trim(),
      description: description.trim(),
    };

    // Parse imported items if provided (only for create mode)
    if (mode === 'create' && importText.trim()) {
      const parsedItems = parseRankingListInput(importText.trim());
      if (parsedItems.length > 0) {
        formData.importedItems = parsedItems;
      }
    }

    // Pass data back to parent
    onSave(formData);
  };

  const handleCancel = () => {
    const originalTitle = initialData?.title || '';
    const originalDescription = initialData?.description || '';
    const hasChanges = title !== originalTitle || description !== originalDescription || importText.trim() !== '';

    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onCancel },
        ]
      );
    } else {
      onCancel();
    }
  };

  const headerTitle = mode === 'edit' ? 'Edit Ranking' : 'New Ranking';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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

      {/* Form Content */}
      <View style={styles.content}>
        {/* Title Input */}
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

        {/* Description Input */}
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

        {/* Import Items Input - Only show in create mode */}
        {mode === 'create' && (
          <View style={styles.inputGroup}>
            {/* Help Icon */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Import Items</Text>
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

      {/* Help Modal */}
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
              <Text style={styles.exampleText}>
                The Matrix{'\n'}Inception{'\n'}Interstellar (sci-fi classic)
              </Text>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpIcon: {
    marginLeft: 8,
    marginTop: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpIconText: {
    color: '#fff',
    fontSize: 11,
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
  // Modal styles
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
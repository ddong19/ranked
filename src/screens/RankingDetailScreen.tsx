import { Ionicons, Octicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import SwipeableItem, { closeAllSwipeables } from '../components/SwipeableItem';
import { useRankings, type Ranking } from '../logic/useRankings';

export default function RankingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getRanking, rankings, refreshRankings, deleteItem } = useRankings();
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshRankings();
    }, [refreshRankings])
  );

  // Update ranking whenever rankings data changes
  useEffect(() => {
    if (!id || !rankings.length) return;

    const foundRanking = getRanking(parseInt(id));
    if (foundRanking) {
      setRanking(foundRanking);
    } else if (rankings.length > 0) {
      // Only show error if rankings have loaded but this one isn't found
      Alert.alert('Error', 'Ranking not found');
      router.back();
    }
  }, [rankings, id, getRanking, router]);

  const handleAddItem = () => {
    closeAllSwipeables();
    // TODO: Navigate to add item screen
    console.log('Add item pressed');
  };

  const handleEditItem = (itemId: number) => {
    // TODO: Navigate to edit item screen
    console.log('Edit item:', itemId);
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      // Close expanded item if we're deleting it
      if (expandedItemId === itemId) {
        setExpandedItemId(null);
      }
      await deleteItem(itemId);
    } catch (error) {
      console.error('Failed to delete item:', error);
      Alert.alert('Error', 'Failed to delete item. Please try again.');
    }
  };

  const handleItemPress = (itemId: number) => {
    // Close any open swipeables
    closeAllSwipeables();

    // Toggle expansion: if already expanded, collapse; otherwise expand
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  // Don't render until we have data
  if (!ranking) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />

      <View style={styles.content}>
        {/* Header with title and description */}
        <View style={styles.headerContainer}>
          <Text style={styles.sectionTitle}>{ranking.title}</Text>
        </View>

        {ranking.description && (
          <Text style={styles.sectionDescription}>
            {ranking.description}
          </Text>
        )}

        {/* Items List */}
        <FlatList
          data={ranking.items || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isExpanded = expandedItemId === item.id;

            return (
              <SwipeableItem
                onDelete={() => handleDeleteItem(item.id)}
              >
                <TouchableOpacity
                  onPress={() => handleItemPress(item.id)}
                  activeOpacity={1}
                  style={{ flex: 1 }}
                >
                  <View style={[styles.itemCard, isExpanded && styles.expandedItemCard]}>
                    <View style={styles.rankNumber}>
                      <Text style={styles.rankNumberText}>{item.rank}</Text>
                    </View>
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={styles.itemActions}>
                          {/* Show notes icon if item has notes and NOT expanded */}
                          {!isExpanded && item.notes && item.notes.trim() && (
                            <Octicons name="note" size={18} color="#666" style={styles.notesIcon} />
                          )}
                          {/* Show edit button if expanded */}
                          {isExpanded && (
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleEditItem(item.id);
                              }}
                              activeOpacity={0.7}
                              hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
                            >
                              <Octicons name="pencil" size={18} color="#666" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {/* Show notes section when expanded */}
                      {isExpanded && (
                        <View style={styles.notesSection}>
                          {item.notes && item.notes.trim() ? (
                            <Text style={styles.notesText}>{item.notes}</Text>
                          ) : (
                            <Text style={styles.noNotesText}>
                              No notes associated with this item
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </SwipeableItem>
            );
          }}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={closeAllSwipeables}
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateTitle}>No Items Yet!</Text>
              <Text style={styles.emptyStateText}>
                Ready to rank?{'\n'}
                Tap below to add your first item!
              </Text>
            </View>
          }
        />

        {/* Add Item Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddItem}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#666" />
            <Text style={styles.addButtonText}>ADD ITEM</Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerContainer: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  sectionDescription: {
    color: '#999',
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
    marginLeft: 5,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  expandedItemCard: {
    backgroundColor: '#2f2f2f',
  },
  rankNumber: {
    width: 24,
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumberText: {
    color: '#606060',
    fontSize: 16,
    fontWeight: '900',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 20,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
    justifyContent: 'flex-end',
  },
  notesIcon: {
    opacity: 0.7,
    width: 24,
    textAlign: 'center',
  },
  editButton: {
    opacity: 0.7,
    width: 24,
    alignItems: 'center',
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  notesText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  noNotesText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    backgroundColor: '#151718',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  addButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});
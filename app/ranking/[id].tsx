import { Ionicons, MaterialIcons, Octicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedRankNumber } from '@/components/AnimatedRankNumber';
import AppHeader from '@/components/AppHeader';
import SwipeableItem, { closeAllSwipeables } from '@/components/SwipeableItem';
import { useRankings } from '@/hooks/useRankings';
import { RankingWithItems } from '@/types/rankings';

export default function RankingDetailScreen() {
  const { id, rankingData } = useLocalSearchParams<{ id: string; rankingData?: string }>();
  const router = useRouter();
  const { getRanking, rankings, refreshRankings, deleteItem, updateItemRanks } = useRankings();
  const [ranking, setRanking] = useState<RankingWithItems | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Sync with database when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      refreshRankings();
    }, [refreshRankings])
  );

  // Keep local state in sync with database changes (e.g., after editing ranking, adding/deleting items)
  // Always update when rankings array changes since optimistic updates change the reference
  useEffect(() => {
    if (!id || !rankings.length || !initialized) return;
    
    const updatedRanking = getRanking(parseInt(id));
    if (!updatedRanking) return;
    
    // Always update since rankings reference changes when any data changes
    setRanking(updatedRanking);
  }, [rankings, id, getRanking, initialized]);

  // Initialize ranking data on component mount
  useEffect(() => {
    if (initialized) return;
    
    // Try to use ranking data passed via navigation params first
    if (rankingData) {
      try {
        const parsedRanking = JSON.parse(rankingData);
        setRanking(parsedRanking);
        setInitialized(true);
        return;
      } catch (error) {
        console.error('Failed to parse ranking data:', error);
      }
    }

    // Fallback to fetching from database if no params or parsing failed
    if (id) {
      const foundRanking = getRanking(parseInt(id));
      if (foundRanking) {
        setRanking(foundRanking);
      } else {
        Alert.alert('Error', 'Ranking not found');
        router.back();
      }
      setInitialized(true);
    }
  }, [id]);

  const handleAddItem = () => {
    closeAllSwipeables();
    router.push(`/ranking/${id}/add-item`);
  };

  const handleEditRanking = () => {
    closeAllSwipeables();
    router.push(`/ranking/${id}/edit`);
  };

  const handleEditItem = (itemId: number) => {
    // Navigate to edit item screen
    router.push(`/ranking/${id}/edit-item?itemId=${itemId}`);
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

  const handleDragStart = () => {
    // Close any expanded item when starting a drag
    setExpandedItemId(null);
    closeAllSwipeables();
  };

  const handleDragEnd = (reorderedData: any[]) => {
    if (!ranking) return;
    
    // Check if data actually changed - exit early if no changes
    if (ranking.item.length !== reorderedData.length) {
      return; // Different lengths = something was deleted/added
    }
    
    // If lengths match, check if order changed (exits on first difference)
    const hasOrderChanged = ranking.item.some((item, index) => 
      item.id !== reorderedData[index].id
    );
    
    if (!hasOrderChanged) {
      return; // No changes, skip update
    }
    
    closeAllSwipeables();
    
    // Use double requestAnimationFrame to wait for drag library cleanup
    // This prevents race conditions that cause visual glitches
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const updatedItems = reorderedData.map((item, index) => ({
          ...item,
          rank: index + 1
        }));
        
        // Update UI immediately for smooth experience
        setRanking({ ...ranking, item: updatedItems });
        
        // Sync to database in background
        updateItemRanks(ranking.id, reorderedData).catch(error => {
          console.error('Failed to update item ranks:', error);
          Alert.alert('Error', 'Failed to update item order. Please try again.');
          
          // Rollback UI state on database error
          const currentRanking = getRanking(parseInt(id || '0'));
          if (currentRanking) {
            setRanking(currentRanking);
          }
        });
      });
    });
  };

  // Don't render anything until we have ranking data
  if (!ranking) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />

        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <View style={styles.titleContainer}>
              <Text style={[styles.sectionTitle, !ranking.description && styles.sectionTitleNoDescription]}>
                {ranking.title}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.editRankingButton}
              onPress={handleEditRanking}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={25} color="#fff" />
            </TouchableOpacity>
          </View>
          {ranking.description && (
            <Text style={styles.sectionDescription}>
              {ranking.description}
            </Text>
          )}
        
        <View style={styles.listWrapper}>
          <View style={styles.absoluteDragContainer}>
            <DraggableFlatList
              data={ranking.item || []}
              onDragBegin={handleDragStart}
              onDragEnd={({ data }) => handleDragEnd(data)}
              keyExtractor={(item) => item.id.toString()}
              dragItemOverflow={false}
              activationDistance={10}
              autoscrollSpeed={200}
              autoscrollThreshold={50}
              containerStyle={{ backgroundColor: 'transparent' }}
              simultaneousHandlers={[]}
              renderItem={({ item, drag, isActive }) => {
              const getRankTextStyle = () => {
                const baseStyle = item.rank === 1 ? styles.goldText :
                                item.rank === 2 ? styles.silverText :
                                item.rank === 3 ? styles.bronzeText :
                                styles.rankNumberText;
                
                // Dynamic font size and weight based on digit count
                const digitCount = item.rank.toString().length;
                let fontSize = 16; // Default for single digits
                let fontWeight: any = 900; // Default weight for single digits
                if (digitCount === 2) {
                  fontSize = 13; // Smaller for double digits
                  fontWeight = 900; // Same weight for double digits
                }
                if (digitCount >= 3) {
                  fontSize = 10; // Smallest for triple+ digits
                  fontWeight = 800; // Thinner for triple+ digits
                }
                
                return { 
                  ...baseStyle, 
                  fontSize, 
                  fontWeight,
                  lineHeight: 20 // Fixed line height for all sizes
                };
              };


              // Ultra-simplified rendering during drag to eliminate ALL conflicts
              if (isActive) {
                return (
                  <View style={[styles.itemCard, styles.draggedItem]}>
                    <View style={styles.rankNumber}>
                      <Text style={getRankTextStyle()}>
                        {item.rank}
                      </Text>
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemName}>{item.name}</Text>
                    </View>
                  </View>
                );
              }

              // Normal rendering with animations when not being dragged
              const isExpanded = expandedItemId === item.id;
              
              return (
                <SwipeableItem 
                  onDelete={() => handleDeleteItem(item.id)}
                  onSwipeStart={() => setExpandedItemId(null)}
                >
                  <TouchableOpacity 
                    onPress={() => handleItemPress(item.id)}
                    onLongPress={drag} 
                    activeOpacity={1} 
                    style={{ flex: 1 }}
                  >
                    <View style={[styles.itemCard, isExpanded && styles.expandedItemCard]}>
                      <View style={styles.rankNumber}>
                        <AnimatedRankNumber 
                          rank={item.rank}
                          style={getRankTextStyle()}
                          digitCount={item.rank.toString().length}
                        />
                      </View>
                      <View style={styles.itemContent}>
                        <View style={styles.itemHeader}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <View style={styles.itemActions}>
                            {!isExpanded && item.notes && item.notes.trim() && (
                              <Octicons name="note" size={18} color="#666" style={styles.notesIcon} />
                            )}
                            {isExpanded && (
                              <TouchableOpacity 
                                style={styles.editButton}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleEditItem(item.id);
                                }}
                                activeOpacity={0.7}
                              >
                                <Octicons name="pencil" size={18} color="#666" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        {isExpanded && (
                          <View style={styles.notesSection}>
                            {item.notes && item.notes.trim() ? (
                              <Text style={styles.notesText}>{item.notes}</Text>
                            ) : (
                              <Text style={styles.noNotesText}>No notes associated with this item</Text>
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
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No items yet</Text>
                <Text style={styles.emptySubtext}>Tap "Add Item" to start ranking</Text>
              </View>
            }
          />
          </View>
        </View>

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
  sectionTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 5
  },
  sectionTitleNoDescription: {
    marginBottom: 16,
  },
  sectionDescription: {
    color: '#999',
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
    marginLeft: 5
  },
  listWrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#151718',
    zIndex: 1,
  },
  absoluteDragContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: '#151718',
  },
  listContainer: {
    paddingBottom: 20,
    minHeight: '100%',
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
  draggedItem: {
    transform: [{ scale: 0.95 }],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    opacity: 0.9,
    zIndex: 1000,
    backgroundColor: '#2a2a2a',
  },
  rankNumber: {
    width: 22.2,
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goldText: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '900',
  },
  silverText: {
    color: '#C0C0C0',
    fontSize: 16,
    fontWeight: '900',
  },
  bronzeText: {
    color: '#CD7F32',
    fontSize: 16,
    fontWeight: '900',
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
    minHeight: 20, // Ensures consistent height
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  editRankingButton: {
    padding: 6,
  },
});
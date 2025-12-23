import { Feather, Ionicons, MaterialIcons, Octicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedRankNumber } from '../components/AnimatedRankNumber';
import AppHeader from '../components/AppHeader';
import SwipeableItem, { closeAllSwipeables } from '../components/SwipeableItem';
import { useRankings, type Ranking, type RankingItem } from '../logic/useRankings';

// Memoized function to get rank text style - prevents recalculation
const getRankTextStyle = (rank: number) => {
  const baseStyle = rank === 1 ? styles.goldText :
                  rank === 2 ? styles.silverText :
                  rank === 3 ? styles.bronzeText :
                  styles.rankNumberText;

  // Dynamic font size based on digit count
  const digitCount = rank.toString().length;
  let fontSize = 16;
  let fontWeight: any = 900;

  if (digitCount === 2) {
    fontSize = 13;
  }
  if (digitCount >= 3) {
    fontSize = 10;
    fontWeight = 800;
  }

  return {
    ...baseStyle,
    fontSize,
    fontWeight,
    lineHeight: 20
  };
};

// Memoized item row component - only re-renders when its own props change
interface RankingItemRowProps {
  item: RankingItem;
  isExpanded: boolean;
  onPress: (itemId: number) => void;
  onEdit: (itemId: number) => void;
  onDelete: (itemId: number) => void;
}

const RankingItemRow = React.memo<RankingItemRowProps>(({ item, isExpanded, onPress, onEdit, onDelete }) => {
  const handlePress = useCallback(() => {
    onPress(item.id);
  }, [item.id, onPress]);

  const handleEdit = useCallback((e: any) => {
    e.stopPropagation();
    onEdit(item.id);
  }, [item.id, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  return (
    <SwipeableItem onDelete={handleDelete}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={{ flex: 1 }}
      >
        <View style={[styles.itemCard, isExpanded && styles.expandedItemCard]}>
          <View style={styles.rankNumber}>
            <AnimatedRankNumber
              rank={item.rank}
              style={getRankTextStyle(item.rank)}
              digitCount={item.rank.toString().length}
            />
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
                    onPress={handleEdit}
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
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props changed
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.item.notes === nextProps.item.notes &&
    prevProps.item.rank === nextProps.item.rank &&
    prevProps.isExpanded === nextProps.isExpanded
  );
});

export default function RankingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getRanking, refreshRankings, deleteItem, loading } = useRankings();
  const [expandedItemId, setExpandedItemId] = React.useState<number | null>(null);
  const [showCopyToast, setShowCopyToast] = React.useState(false);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshRankings();
    }, [refreshRankings])
  );

  // Memoize ranking lookup - only recomputes when id or getRanking changes
  const ranking = useMemo(() => {
    if (!id) return null;
    return getRanking(parseInt(id)) || null;
  }, [id, getRanking]);

  // Check if ranking exists - only after data has loaded
  useEffect(() => {
    if (!loading && id && ranking === null) {
      Alert.alert('Error', 'Ranking not found');
      router.back();
    }
  }, [id, ranking, loading, router]);

  const handleAddItem = () => {
    closeAllSwipeables();
    router.push(`/ranking/${id}/add-item`);
  };

  const handleEditRanking = () => {
    closeAllSwipeables();
    router.push(`/ranking/${id}/edit`);
  };

  const formatRankingForCopy = (ranking: Ranking): string => {
    let formattedText = `=== ${ranking.title} ===\n`;

    if (ranking.description && ranking.description.trim()) {
      formattedText += `${ranking.description}\n`;
    }

    ranking.items
      .sort((a, b) => a.rank - b.rank)
      .forEach((item) => {
        const notes = item.notes && item.notes.trim() ? ` (${item.notes})` : '';
        formattedText += `${item.rank}. ${item.name}${notes}\n`;
      });

    return formattedText.trim();
  };

  const handleCopyRanking = async () => {
    closeAllSwipeables();

    if (!ranking) return;

    try {
      const formattedText = formatRankingForCopy(ranking);
      await Clipboard.setStringAsync(formattedText);

      // Show toast notification
      setShowCopyToast(true);
      setTimeout(() => {
        setShowCopyToast(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to copy ranking:', error);
      Alert.alert('Error', 'Failed to copy ranking. Please try again.');
    }
  };

  const handleItemPress = useCallback((itemId: number) => {
    // Close any open swipeables
    closeAllSwipeables();

    // Toggle expansion: if already expanded, collapse; otherwise expand
    setExpandedItemId(prev => prev === itemId ? null : itemId);
  }, []);

  const handleEditItemCallback = useCallback((itemId: number) => {
    router.push(`/ranking/${id}/edit-item?itemId=${itemId}`);
  }, [id, router]);

  const handleDeleteItemCallback = useCallback(async (itemId: number) => {
    try {
      // Close expanded item if we're deleting it
      setExpandedItemId(prev => prev === itemId ? null : prev);
      await deleteItem(itemId);
    } catch (error) {
      console.error('Failed to delete item:', error);
      Alert.alert('Error', 'Failed to delete item. Please try again.');
    }
  }, [deleteItem]);

  // Memoized render function for FlatList
  // Note: expandedItemId is NOT in dependencies - it's read from closure
  // This prevents recreating renderItem on every expand/collapse
  // React.memo in RankingItemRow handles the actual re-render decision
  const renderItem = useCallback(({ item }: { item: RankingItem }) => {
    return (
      <RankingItemRow
        item={item}
        isExpanded={expandedItemId === item.id}
        onPress={handleItemPress}
        onEdit={handleEditItemCallback}
        onDelete={handleDeleteItemCallback}
      />
    );
  }, [handleItemPress, handleEditItemCallback, handleDeleteItemCallback]);

  // Don't render until we have data
  if (!ranking) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader />

      <View style={styles.content}>
        {/* Header with title, description, and action buttons */}
        <View style={styles.headerContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.sectionTitle}>{ranking.title}</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.copyRankingButton}
              onPress={handleCopyRanking}
              activeOpacity={0.7}
            >
              <Feather name="copy" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editRankingButton}
              onPress={handleEditRanking}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={20} color="#fff" />
            </TouchableOpacity>
            {showCopyToast && (
              <View style={styles.copyToast}>
                <Text style={styles.copyToastText}>Ranking Copied!</Text>
                <View style={styles.copyToastArrow} />
              </View>
            )}
          </View>
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
          renderItem={renderItem}
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  copyRankingButton: {
    padding: 6,
  },
  editRankingButton: {
    padding: 6,
  },
  copyToast: {
    position: 'absolute',
    top: -26,
    left: -32,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    zIndex: 1000,
  },
  copyToastText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  copyToastArrow: {
    position: 'absolute',
    bottom: -5,
    left: '50%',
    marginLeft: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2a2a2a',
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
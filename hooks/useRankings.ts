import { useState, useEffect, useCallback } from 'react';
import { RankingService } from '@/lib/rankingService';
import { initDatabase } from '@/lib/database';
import { 
  RankingWithItems, 
  Item, 
  CreateRankingRequest, 
  CreateItemRequest
} from '@/types/rankings';

export function useRankings() {
  const [rankings, setRankings] = useState<RankingWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAndLoad();
  }, []);

  const initializeAndLoad = async () => {
    try {
      setLoading(true);
      await initDatabase();
      await loadRankings();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize database');
    } finally {
      setLoading(false);
    }
  };

  const loadRankings = useCallback(async () => {
    try {
      setError(null);
      const rankingsWithItems = await RankingService.loadRankings();
      setRankings(rankingsWithItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load rankings');
      console.error('Error loading rankings:', err);
    }
  }, []);

  const createRanking = async (data: CreateRankingRequest): Promise<RankingWithItems> => {
    try {
      const newRanking = await RankingService.createRanking(data);
      setRankings(prev => [...prev, newRanking]);
      return newRanking;
    } catch (err: any) {
      setError(err.message || 'Failed to create ranking');
      throw err;
    }
  };

  const updateRanking = async (id: number, updates: Partial<RankingWithItems>) => {
    try {
      await RankingService.updateRanking(id, updates);
      setRankings(prev => prev.map(ranking =>
        ranking.id === id ? { ...ranking, ...updates } : ranking
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to update ranking');
      throw err;
    }
  };

  const deleteRanking = async (id: number) => {
    try {
      await RankingService.deleteRanking(id);
      setRankings(prev => prev.filter(ranking => ranking.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete ranking');
      throw err;
    }
  };

  const addItem = async (rankingId: number, data: CreateItemRequest): Promise<Item> => {
    const previousRankings = rankings;
    
    try {
      // Create temporary item with placeholder ID for immediate UI update
      const tempItem: Item = {
        id: Date.now(),
        name: data.name,
        notes: data.notes || null,
        rank: data.rank,
        ranking_id: rankingId
      };

      // Update UI immediately for smooth user experience
      const optimisticRankings = rankings.map(ranking => {
        if (ranking.id === rankingId) {
          return {
            ...ranking,
            item: [...ranking.item, tempItem].sort((a, b) => a.rank - b.rank)
          };
        }
        return ranking;
      });

      setRankings(optimisticRankings);

      // Persist to database and get the real item with actual ID
      const newItem = await RankingService.addItem(rankingId, data);

      // Replace temporary item with database item
      setRankings(prev => prev.map(ranking => {
        if (ranking.id === rankingId) {
          return {
            ...ranking,
            item: ranking.item.map(item => 
              item.id === tempItem.id ? newItem : item
            ).sort((a, b) => a.rank - b.rank)
          };
        }
        return ranking;
      }));

      return newItem;
    } catch (err: any) {
      // Restore original state if database operation fails
      setRankings(previousRankings);
      setError(err.message || 'Failed to add item');
      throw err;
    }
  };

  const deleteItem = async (itemId: number) => {
    const previousRankings = rankings;
    
    try {
      // Update UI immediately: remove item and adjust ranks
      const optimisticRankings = rankings.map(ranking => {
        const itemToDelete = ranking.item.find(item => item.id === itemId);
        if (!itemToDelete) return ranking;

        // Filter out deleted item and adjust remaining ranks
        const updatedItems = ranking.item
          .filter(item => item.id !== itemId)
          .map(item => ({
            ...item,
            rank: item.rank > itemToDelete.rank ? item.rank - 1 : item.rank
          }))
          .sort((a, b) => a.rank - b.rank);

        return { ...ranking, item: updatedItems };
      });

      setRankings(optimisticRankings);

      // Persist deletion to database
      await RankingService.deleteItem(itemId);
    } catch (err: any) {
      // Restore original state if database operation fails
      setRankings(previousRankings);
      setError(err.message || 'Failed to delete item');
      throw err;
    }
  };

  const updateItemRanks = async (rankingId: number, items: Item[]) => {
    try {
      // Build mapping of item IDs to their new rank positions
      const itemRanks: Record<string, number> = {};
      items.forEach((item, index) => {
        itemRanks[item.id.toString()] = index + 1;
      });

      // Persist rank changes to database
      await RankingService.updateItemRanks(rankingId, itemRanks);

      // Update local state to reflect new order
      const updatedItems = items.map((item, index) => ({
        ...item,
        rank: index + 1
      }));

      setRankings(prev => prev.map(ranking => {
        if (ranking.id === rankingId) {
          return { ...ranking, item: updatedItems };
        }
        return ranking;
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to update item ranks');
      throw err;
    }
  };

  const addOrUpdateRanking = async (data: CreateRankingRequest, editId?: number): Promise<RankingWithItems> => {
    if (editId) {
      await updateRanking(editId, data);
      const updatedRanking = rankings.find(r => r.id === editId);
      if (!updatedRanking) {
        throw new Error('Ranking not found after update');
      }
      return updatedRanking;
    } else {
      return await createRanking(data);
    }
  };

  const getRanking = useCallback((id: number): RankingWithItems | undefined => {
    return rankings.find(ranking => ranking.id === id);
  }, [rankings]);

  return {
    rankings,
    loading,
    error,
    createRanking,
    updateRanking,
    deleteRanking,
    addItem,
    deleteItem,
    updateItemRanks,
    addOrUpdateRanking,
    getRanking,
    refreshRankings: loadRankings,
  };
}
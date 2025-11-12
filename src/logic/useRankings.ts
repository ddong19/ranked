import { useState, useEffect, useCallback } from 'react';
import { RankingService, type Ranking, type RankingFormData } from '../db/rankingService';
import { initDatabase } from '../db/database';

export type { ParsedItem, RankingFormData, RankingItem, Ranking } from '../db/rankingService';

export function useRankings() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize database on mount
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
      console.error('Database initialization error:', err);
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

  const createRanking = async (data: RankingFormData): Promise<Ranking> => {
    try {
      const newRanking = await RankingService.createRanking(data);
      
      // Update local state
      setRankings((prev) => [newRanking, ...prev]); // Add to front
      
      return newRanking;
    } catch (err: any) {
      setError(err.message || 'Failed to create ranking');
      console.error('Error creating ranking:', err);
      throw err;
    }
  };

  const deleteRanking = async (id: number) => {
    try {
      await RankingService.deleteRanking(id);
      setRankings((prev) => prev.filter((ranking) => ranking.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete ranking');
      console.error('Error deleting ranking:', err);
      throw err;
    }
  };

  const refreshRankings = useCallback(async () => {
    await loadRankings();
  }, [loadRankings]);

  const getRanking = useCallback((id: number): Ranking | undefined => {
    return rankings.find(ranking => ranking.id === id);
  }, [rankings]);

  const deleteItem = async (itemId: number) => {
    const previousRankings = rankings;

    try {
      // Optimistic update: immediately update UI
      const optimisticRankings = rankings.map(ranking => {
        const itemToDelete = ranking.items.find(item => item.id === itemId);
        if (!itemToDelete) return ranking;

        // Filter out deleted item and adjust remaining ranks
        const updatedItems = ranking.items
          .filter(item => item.id !== itemId)
          .map(item => ({
            ...item,
            rank: item.rank > itemToDelete.rank ? item.rank - 1 : item.rank
          }))
          .sort((a, b) => a.rank - b.rank);

        return { ...ranking, items: updatedItems };
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

  const addItem = async (rankingId: number, data: { name: string; notes?: string; rank: number }) => {
    const previousRankings = rankings;

    try {
      // Create temporary item with placeholder ID for immediate UI update
      const tempItem = {
        id: Date.now(),
        name: data.name,
        notes: data.notes || null,
        rank: data.rank,
      };

      // Update UI immediately for smooth user experience
      const optimisticRankings = rankings.map(ranking => {
        if (ranking.id === rankingId) {
          return {
            ...ranking,
            items: [...ranking.items, tempItem].sort((a, b) => a.rank - b.rank)
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
            items: ranking.items.map(item =>
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

  const updateItem = async (itemId: number, updates: { name?: string; notes?: string }) => {
    const previousRankings = rankings;

    try {
      // Update UI immediately for smooth user experience
      const optimisticRankings = rankings.map(ranking => {
        const updatedItems = ranking.items.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        );
        return { ...ranking, items: updatedItems };
      });

      setRankings(optimisticRankings);

      // Persist to database
      await RankingService.updateItem(itemId, updates);
    } catch (err: any) {
      // Restore original state if database operation fails
      setRankings(previousRankings);
      setError(err.message || 'Failed to update item');
      throw err;
    }
  };

  const updateItemRanks = async (rankingId: number, items: Array<{ id: number; name: string; notes: string | null; rank: number }>) => {
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
          return { ...ranking, items: updatedItems };
        }
        return ranking;
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to update item ranks');
      throw err;
    }
  };

  return {
    rankings,
    loading,
    error,
    createRanking,
    deleteRanking,
    refreshRankings,
    getRanking,
    deleteItem,
    addItem,
    updateItem,
    updateItemRanks,
  };
}
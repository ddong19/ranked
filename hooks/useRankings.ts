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

  // Initialize database and load rankings on mount
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
      
      // Load rankings from SQLite
      const rankingsWithItems = await RankingService.loadRankings();
      setRankings(rankingsWithItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load rankings');
      console.error('Error loading rankings:', err);
    }
  }, []);

  const createRanking = async (data: CreateRankingRequest): Promise<RankingWithItems> => {
    try {
      // Create ranking in SQLite
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
      // Update ranking in SQLite
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
      // Delete ranking from SQLite
      await RankingService.deleteRanking(id);
      
      setRankings(prev => prev.filter(ranking => ranking.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete ranking');
      throw err;
    }
  };

  const addItem = async (rankingId: number, data: CreateItemRequest): Promise<Item> => {
    try {
      // Add item to SQLite
      const newItem = await RankingService.addItem(rankingId, data);

      // Update local state
      setRankings(prev => prev.map(ranking => {
        if (ranking.id === rankingId) {
          return {
            ...ranking,
            item: [...ranking.item, newItem].sort((a, b) => a.rank - b.rank)
          };
        }
        return ranking;
      }));

      return newItem;
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
      throw err;
    }
  };

  const deleteItem = async (itemId: number) => {
    try {
      // Delete item from SQLite
      await RankingService.deleteItem(itemId);

      // Refresh rankings to get updated data (with re-ordered ranks from trigger)
      await loadRankings();
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
      throw err;
    }
  };

  const updateItemRanks = async (rankingId: number, items: Item[]) => {
    try {
      // Create item-rank mapping
      const itemRanks: Record<string, number> = {};
      items.forEach((item, index) => {
        itemRanks[item.id.toString()] = index + 1;
      });

      // Update ranks in SQLite
      await RankingService.updateItemRanks(rankingId, itemRanks);

      // Update local state with new ranks
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
    getRanking,
    refreshRankings: loadRankings,
  };
}
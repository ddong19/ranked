import { useState, useEffect, useCallback } from 'react';
import { RankingService, type Ranking, type RankingFormData } from '../db/rankingService';
import { initDatabase } from '../db/database';
import { useAuth } from '../contexts/AuthContext';

export type { ParsedItem, RankingFormData, RankingItem, Ranking } from '../db/rankingService';

export function useRankings() {
  const { userId, dataMigrated } = useAuth();
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [rankingsMap, setRankingsMap] = useState<Map<number, Ranking>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize database and load when userId is ready
  useEffect(() => {
    if (userId === null) {
      // Auth is still loading, wait
      console.log('[useRankings] Waiting for auth to load...');
      return;
    }

    console.log(`[useRankings] Auth ready, userId: ${userId}`);
    initializeAndLoad();
  }, [userId]); // Re-run when userId changes from null → actual value

  // Also refresh when data is migrated
  useEffect(() => {
    if (dataMigrated) {
      console.log('[useRankings] Data migrated, refreshing rankings...');
      loadRankings();
    }
  }, [dataMigrated, loadRankings]);

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
      const rankingsWithItems = await RankingService.loadRankings(userId);
      setRankings(rankingsWithItems);

      // Build map for O(1) lookups
      const map = new Map<number, Ranking>();
      rankingsWithItems.forEach(ranking => map.set(ranking.id, ranking));
      setRankingsMap(map);
    } catch (err: any) {
      setError(err.message || 'Failed to load rankings');
      console.error('Error loading rankings:', err);
    }
  }, [userId]);

  const createRanking = async (data: RankingFormData): Promise<Ranking> => {
    try {
      const newRanking = await RankingService.createRanking(data, userId);

      // Update local state
      setRankings((prev) => [newRanking, ...prev]); // Add to front
      setRankingsMap((prev) => new Map(prev).set(newRanking.id, newRanking));

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
      setRankingsMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
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
    return rankingsMap.get(id);
  }, [rankingsMap]);

  const deleteItem = async (itemId: number) => {
    try {
      // Delete from database (database handles rank shifting)
      await RankingService.deleteItem(itemId);

      // Reload from database to get fresh state
      await loadRankings();
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
      throw err;
    }
  };

  const addItem = async (rankingId: number, data: { name: string; notes?: string; rank: number }) => {
    try {
      // Add item to database
      const newItem = await RankingService.addItem(rankingId, data, userId);

      // Reload from database to get fresh state
      await loadRankings();

      return newItem;
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
      throw err;
    }
  };

  const updateItem = async (itemId: number, updates: { name?: string; notes?: string }) => {
    try {
      // Update in database
      await RankingService.updateItem(itemId, updates, userId);

      // Reload from database to get fresh state
      await loadRankings();
    } catch (err: any) {
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

      // Update ranks in database
      await RankingService.updateItemRanks(rankingId, itemRanks, userId);

      // Reload from database to get fresh state
      await loadRankings();
    } catch (err: any) {
      setError(err.message || 'Failed to update item ranks');
      throw err;
    }
  };

  const updateRanking = async (id: number, updates: { title?: string; description?: string }) => {
    try {
      // Update in database
      await RankingService.updateRanking(id, updates, userId);

      // Reload from database to get fresh state
      await loadRankings();
    } catch (err: any) {
      setError(err.message || 'Failed to update ranking');
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
    updateRanking,
  };
}
import { useState, useEffect, useCallback } from 'react';
import { RankingService, type Ranking, type RankingFormData } from '../db/rankingService';
import { initDatabase } from '../db/database';

export type { ParsedItem, RankingFormData, RankingItem, Ranking } from '../db/rankingService';

export function useRankings() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [rankingsMap, setRankingsMap] = useState<Map<number, Ranking>>(new Map());
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

      // Build map for O(1) lookups
      const map = new Map<number, Ranking>();
      rankingsWithItems.forEach(ranking => map.set(ranking.id, ranking));
      setRankingsMap(map);
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
    const previousRankings = rankings;
    const previousMap = rankingsMap;

    try {
      // Find which ranking contains this item - O(1) if we know ranking, O(n) worst case
      let rankingId: number | null = null;
      let targetRanking: Ranking | null = null;
      let itemToDelete: { id: number; rank: number } | null = null;

      // Optimization: If there's only one ranking, we know which one it is
      if (rankings.length === 1) {
        targetRanking = rankings[0];
        rankingId = targetRanking.id;
        const item = targetRanking.items.find(i => i.id === itemId);
        if (item) {
          itemToDelete = item;
        }
      } else {
        // Search through rankings to find the item
        for (const ranking of rankings) {
          const item = ranking.items.find(i => i.id === itemId);
          if (item) {
            rankingId = ranking.id;
            targetRanking = ranking;
            itemToDelete = item;
            break;
          }
        }
      }

      if (!rankingId || !targetRanking || !itemToDelete) {
        throw new Error('Item not found');
      }

      // Filter out deleted item and adjust remaining ranks - only for THIS ranking
      const updatedItems = targetRanking.items
        .filter(item => item.id !== itemId)
        .map(item => ({
          ...item,
          rank: item.rank > itemToDelete!.rank ? item.rank - 1 : item.rank
        }))
        .sort((a, b) => a.rank - b.rank);

      const updatedRanking = { ...targetRanking, items: updatedItems };

      // Update ONLY the affected ranking in the array (not all rankings)
      const optimisticRankings = rankings.map(ranking =>
        ranking.id === rankingId ? updatedRanking : ranking
      );

      setRankings(optimisticRankings);

      // Update ONLY the affected ranking in the map
      setRankingsMap(prev => {
        const newMap = new Map(prev);
        newMap.set(rankingId!, updatedRanking);
        return newMap;
      });

      // Persist deletion to database
      await RankingService.deleteItem(itemId);

      // Persist the rank shifts to database
      // All items that were ranked after the deleted item need their ranks updated
      if (updatedItems.length > 0) {
        const itemRanks: Record<string, number> = {};
        updatedItems.forEach(item => {
          itemRanks[item.id.toString()] = item.rank;
        });
        await RankingService.updateItemRanks(rankingId, itemRanks);
      }
    } catch (err: any) {
      // Restore original state if database operation fails
      setRankings(previousRankings);
      setRankingsMap(previousMap);
      setError(err.message || 'Failed to delete item');
      throw err;
    }
  };

  const addItem = async (rankingId: number, data: { name: string; notes?: string; rank: number }) => {
    const previousRankings = rankings;
    const previousMap = rankingsMap;

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

      // Update map
      const newMap = new Map(rankingsMap);
      optimisticRankings.forEach(ranking => newMap.set(ranking.id, ranking));
      setRankingsMap(newMap);

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

      // Update map with final data
      setRankingsMap(prev => {
        const updatedMap = new Map(prev);
        const updatedRanking = prev.get(rankingId);
        if (updatedRanking) {
          updatedMap.set(rankingId, {
            ...updatedRanking,
            items: updatedRanking.items.map(item =>
              item.id === tempItem.id ? newItem : item
            ).sort((a, b) => a.rank - b.rank)
          });
        }
        return updatedMap;
      });

      return newItem;
    } catch (err: any) {
      // Restore original state if database operation fails
      setRankings(previousRankings);
      setRankingsMap(previousMap);
      setError(err.message || 'Failed to add item');
      throw err;
    }
  };

  const updateItem = async (itemId: number, updates: { name?: string; notes?: string }) => {
    const previousRankings = rankings;
    const previousMap = rankingsMap;

    try {
      // Update UI immediately for smooth user experience
      const optimisticRankings = rankings.map(ranking => {
        const updatedItems = ranking.items.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        );
        return { ...ranking, items: updatedItems };
      });

      setRankings(optimisticRankings);
      const newMap = new Map(rankingsMap);
      optimisticRankings.forEach(ranking => newMap.set(ranking.id, ranking));
      setRankingsMap(newMap);

      // Persist to database
      await RankingService.updateItem(itemId, updates);
    } catch (err: any) {
      // Restore original state if database operation fails
      setRankings(previousRankings);
      setRankingsMap(previousMap);
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

      setRankingsMap(prev => {
        const newMap = new Map(prev);
        const ranking = prev.get(rankingId);
        if (ranking) {
          newMap.set(rankingId, { ...ranking, items: updatedItems });
        }
        return newMap;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update item ranks');
      throw err;
    }
  };

  const updateRanking = async (id: number, updates: { title?: string; description?: string }) => {
    try {
      await RankingService.updateRanking(id, updates);
      setRankings(prev => prev.map(ranking =>
        ranking.id === id ? { ...ranking, ...updates } : ranking
      ));
      setRankingsMap(prev => {
        const newMap = new Map(prev);
        const ranking = prev.get(id);
        if (ranking) {
          newMap.set(id, { ...ranking, ...updates });
        }
        return newMap;
      });
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
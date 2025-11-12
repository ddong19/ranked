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

  return {
    rankings,
    loading,
    error,
    createRanking,
    deleteRanking,
    refreshRankings,
    getRanking,
  };
}
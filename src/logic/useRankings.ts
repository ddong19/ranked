import { useState } from 'react';

// Type definitions
export interface ParsedItem {
  name: string;
  notes?: string;
}

export interface RankingFormData {
  title: string;
  description: string;
  importedItems?: ParsedItem[];
}

export interface RankingItem {
  id: number;
  name: string;
  notes?: string | null;
  rank: number;
}

export interface Ranking {
  id: number;
  title: string;
  description?: string | null;
  items: RankingItem[];
}

export function useRankings() {
  const [rankings, setRankings] = useState<Ranking[]>([]);

  // CREATE RANKING FUNCTION (Step 5)
  const createRanking = async (data: RankingFormData): Promise<Ranking> => {
    try {
      // TODO: Replace with your actual database/API call
      
      // For now, create a mock ranking
      const newRanking: Ranking = {
        id: Date.now(), // Temporary ID
        title: data.title,
        description: data.description || null,
        items: [], // We'll add items next
      };

      // If imported items exist, convert them to RankingItems
      if (data.importedItems && data.importedItems.length > 0) {
        newRanking.items = data.importedItems.map((item, index) => ({
          id: Date.now() + index, // Temporary ID
          name: item.name,
          notes: item.notes || null,
          rank: index + 1, // Rank based on order
        }));
      }

      // TODO: Save to database here
      console.log('Creating ranking:', newRanking);

      // Update local state
      setRankings((prev) => [...prev, newRanking]);

      return newRanking;
    } catch (error: any) {
      console.error('Failed to create ranking:', error);
      throw new Error(error.message || 'Failed to create ranking');
    }
  };

  const deleteRanking = async (id: number) => {
    try {
      // TODO: Replace with your actual delete API call
      setRankings((prev) => prev.filter((ranking) => ranking.id !== id));
    } catch (error: any) {
      console.error('Failed to delete ranking:', error);
      throw error;
    }
  };

  const refreshRankings = async () => {
    try {
      // TODO: Replace with your actual fetch API call
      console.log('Refreshing rankings...');
    } catch (error: any) {
      console.error('Failed to refresh rankings:', error);
    }
  };

  return {
    rankings,
    createRanking,
    deleteRanking,
    refreshRankings,
  };
}
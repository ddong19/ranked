import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

import { RankingList, RankingItem, CreateRankingRequest, CreateItemRequest } from '@/types/rankings';

const STORAGE_KEY = 'rankings';

export function useRankings() {
  const [rankings, setRankings] = useState<RankingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load rankings from AsyncStorage on mount
  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedRankings = JSON.parse(stored);
        setRankings(parsedRankings);
      } else {
        // Initialize with default rankings to match your screenshots
        const defaultRankings = getDefaultRankings();
        setRankings(defaultRankings);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRankings));
      }
    } catch (err) {
      setError('Failed to load rankings');
      console.error('Error loading rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveRankings = async (newRankings: RankingList[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRankings));
      setRankings(newRankings);
    } catch (err) {
      setError('Failed to save rankings');
      console.error('Error saving rankings:', err);
    }
  };

  const createRanking = async (data: CreateRankingRequest): Promise<RankingList> => {
    try {
      const newRanking: RankingList = {
        id: Date.now(), // Temporary ID until we have Supabase
        title: data.title,
        description: data.description,
        items: [],
      };

      const updatedRankings = [...rankings, newRanking];
      await saveRankings(updatedRankings);
      
      return newRanking;
    } catch (err) {
      setError('Failed to create ranking');
      throw err;
    }
  };

  const updateRanking = async (id: number, updates: Partial<RankingList>) => {
    try {
      const updatedRankings = rankings.map(ranking =>
        ranking.id === id ? { ...ranking, ...updates } : ranking
      );
      await saveRankings(updatedRankings);
    } catch (err) {
      setError('Failed to update ranking');
      throw err;
    }
  };

  const deleteRanking = async (id: number) => {
    try {
      const updatedRankings = rankings.filter(ranking => ranking.id !== id);
      await saveRankings(updatedRankings);
    } catch (err) {
      setError('Failed to delete ranking');
      throw err;
    }
  };

  const addItem = async (rankingId: number, data: CreateItemRequest): Promise<RankingItem> => {
    try {
      const newItem: RankingItem = {
        id: Date.now(), // Temporary ID until we have Supabase
        name: data.name,
        notes: data.notes,
        rank: data.rank,
        ranking: rankingId,
      };

      const updatedRankings = rankings.map(ranking => {
        if (ranking.id === rankingId) {
          return {
            ...ranking,
            items: [...(ranking.items || []), newItem].sort((a, b) => a.rank - b.rank)
          };
        }
        return ranking;
      });

      await saveRankings(updatedRankings);
      return newItem;
    } catch (err) {
      setError('Failed to add item');
      throw err;
    }
  };

  const updateItemRanks = async (rankingId: number, items: RankingItem[]) => {
    try {
      const updatedRankings = rankings.map(ranking => {
        if (ranking.id === rankingId) {
          return { ...ranking, items };
        }
        return ranking;
      });
      
      await saveRankings(updatedRankings);
    } catch (err) {
      setError('Failed to update item ranks');
      throw err;
    }
  };

  const getRanking = (id: number): RankingList | undefined => {
    return rankings.find(ranking => ranking.id === id);
  };

  return {
    rankings,
    loading,
    error,
    createRanking,
    updateRanking,
    deleteRanking,
    addItem,
    updateItemRanks,
    getRanking,
    refreshRankings: loadRankings,
  };
}

// Default rankings to match your screenshots
function getDefaultRankings(): RankingList[] {
  return [
    {
      id: 1,
      title: 'Movies',
      description: 'List of my favorite movies',
      items: [],
    },
    {
      id: 2,
      title: 'Travel Locations',
      description: 'Favorite places I\'ve traveled to',
      items: [
        { id: 1, name: 'Lake Lucerne, Switzerland', rank: 1, ranking: 2 },
        { id: 2, name: 'Zion National Park, Utah', rank: 2, ranking: 2 },
        { id: 3, name: 'Bryce Canyon, Utah', rank: 3, ranking: 2 },
        { id: 4, name: 'Lake Louise, Banff', rank: 4, ranking: 2 },
        { id: 5, name: 'Johnson Canyon, Banff', rank: 5, ranking: 2 },
      ],
    },
    {
      id: 3,
      title: 'Restaurants',
      description: 'Best restaurants I\'ve been to',
      items: [],
    },
    {
      id: 4,
      title: 'NBA Players',
      description: 'My ranking of GOATs',
      items: [],
    },
  ];
}

// TODO: Replace with Supabase API calls
// Example of how this hook will be modified for Supabase:
/*
const createRanking = async (data: CreateRankingRequest): Promise<RankingList> => {
  const { data: newRanking, error } = await supabase
    .from('ranking_list')
    .insert([data])
    .select()
    .single();
  
  if (error) throw error;
  return newRanking;
};
*/
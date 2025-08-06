import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  RankingWithItems, 
  Item, 
  CreateRankingRequest, 
  CreateItemRequest,
  RankingsState 
} from '@/types/rankings';

export function useRankings() {
  const [rankings, setRankings] = useState<RankingWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load rankings from Supabase on mount
  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('ranking')
        .select(`
          *,
          item (*)
        `)
        .order('id');

      if (supabaseError) {
        throw supabaseError;
      }

      // Sort items by rank within each ranking
      const rankingsWithSortedItems = data?.map(ranking => ({
        ...ranking,
        item: ranking.item.sort((a, b) => a.rank - b.rank)
      })) || [];

      setRankings(rankingsWithSortedItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load rankings');
      console.error('Error loading rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRanking = async (data: CreateRankingRequest): Promise<RankingWithItems> => {
    try {
      const { data: newRanking, error: supabaseError } = await supabase
        .from('ranking')
        .insert([{
          title: data.title,
          description: data.description
        }])
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      const rankingWithItems = { ...newRanking, item: [] };
      setRankings(prev => [...prev, rankingWithItems]);
      
      return rankingWithItems;
    } catch (err: any) {
      setError(err.message || 'Failed to create ranking');
      throw err;
    }
  };

  const updateRanking = async (id: number, updates: Partial<RankingWithItems>) => {
    try {
      const { error: supabaseError } = await supabase
        .from('ranking')
        .update({
          title: updates.title,
          description: updates.description
        })
        .eq('id', id);

      if (supabaseError) {
        throw supabaseError;
      }

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
      const { error: supabaseError } = await supabase
        .from('ranking')
        .delete()
        .eq('id', id);

      if (supabaseError) {
        throw supabaseError;
      }

      setRankings(prev => prev.filter(ranking => ranking.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete ranking');
      throw err;
    }
  };

  const addItem = async (rankingId: number, data: CreateItemRequest): Promise<Item> => {
    try {
      const { data: newItem, error: supabaseError } = await supabase
        .from('item')
        .insert([{
          name: data.name,
          notes: data.notes,
          rank: data.rank,
          ranking_id: rankingId
        }])
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

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
      const { error: supabaseError } = await supabase
        .from('item')
        .delete()
        .eq('id', itemId);

      if (supabaseError) {
        throw supabaseError;
      }

      // Refresh rankings to get updated data (with re-ordered ranks from trigger)
      await loadRankings();
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
      throw err;
    }
  };

  const updateItemRanks = async (rankingId: number, items: Item[]) => {
    try {
      // Create item-rank mapping for RPC function
      const itemRanks: Record<string, number> = {};
      items.forEach((item, index) => {
        itemRanks[item.id.toString()] = index + 1;
      });

      // Call Supabase RPC function for atomic update
      const { error: rpcError } = await supabase.rpc('update_item_ranks', {
        p_ranking_id: rankingId,
        p_item_ranks: itemRanks
      });

      if (rpcError) {
        throw rpcError;
      }

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

  const getRanking = (id: number): RankingWithItems | undefined => {
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
    deleteItem,
    updateItemRanks,
    getRanking,
    refreshRankings: loadRankings,
  };
}
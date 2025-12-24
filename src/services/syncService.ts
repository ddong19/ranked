import { supabase } from '../lib/supabase';
import { getDatabase } from '../db/database';

export interface SupabaseRanking {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseItem {
  id: string;
  ranking_id: string;
  user_id: string;
  name: string;
  notes: string | null;
  rank: number;
  created_at: string;
  updated_at: string;
}

export class SyncService {
  /**
   * Sync a single ranking to Supabase
   * Returns the Supabase UUID for the ranking
   */
  static async syncRankingToSupabase(localRankingId: number, userId: string): Promise<string> {
    const db = await getDatabase();

    // Get the ranking from local DB
    const ranking = await db.getFirstAsync<{
      id: number;
      title: string;
      description: string | null;
      supabase_id: string | null;
    }>('SELECT * FROM ranking WHERE id = ?', [localRankingId]);

    if (!ranking) {
      throw new Error('Ranking not found');
    }

    // If already exists in Supabase, update it
    if (ranking.supabase_id) {
      const { error } = await supabase
        .from('rankings')
        .update({
          title: ranking.title,
          description: ranking.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ranking.supabase_id);

      if (error) throw error;

      return ranking.supabase_id;
    }

    // Otherwise, create new
    const { data, error } = await supabase
      .from('rankings')
      .insert({
        user_id: userId,
        title: ranking.title,
        description: ranking.description,
      })
      .select()
      .single();

    if (error) throw error;

    // Update local DB with supabase_id
    await db.runAsync(
      'UPDATE ranking SET supabase_id = ? WHERE id = ?',
      [data.id, localRankingId]
    );

    return data.id;
  }

  /**
   * Sync all items for a ranking to Supabase
   */
  static async syncItemsToSupabase(
    localRankingId: number,
    supabaseRankingId: string,
    userId: string
  ): Promise<void> {
    const db = await getDatabase();

    // Get all items for this ranking
    const items = await db.getAllAsync<{
      id: number;
      name: string;
      notes: string | null;
      rank: number;
      supabase_id: string | null;
    }>('SELECT * FROM item WHERE ranking_id = ?', [localRankingId]);

    for (const item of items) {
      // If already exists in Supabase, update it
      if (item.supabase_id) {
        const { error } = await supabase
          .from('items')
          .update({
            name: item.name,
            notes: item.notes,
            rank: item.rank,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.supabase_id);

        if (error) throw error;
      } else {
        // Create new item
        const { data, error } = await supabase
          .from('items')
          .insert({
            ranking_id: supabaseRankingId,
            user_id: userId,
            name: item.name,
            notes: item.notes,
            rank: item.rank,
          })
          .select()
          .single();

        if (error) throw error;

        // Update local DB with supabase_id
        await db.runAsync(
          'UPDATE item SET supabase_id = ? WHERE id = ?',
          [data.id, item.id]
        );
      }
    }
  }


  /**
   * Migrate anonymous data to authenticated user
   */
  static async migrateAnonymousData(newUserId: string): Promise<void> {
    const db = await getDatabase();

    // Get all anonymous rankings before migrating
    const anonymousRankings = await db.getAllAsync<{ id: number }>(
      'SELECT id FROM ranking WHERE user_id = ?',
      ['anonymous']
    );

    await db.withTransactionAsync(async () => {
      // Update all anonymous rankings to belong to the new user
      await db.runAsync(
        'UPDATE ranking SET user_id = ? WHERE user_id = ?',
        [newUserId, 'anonymous']
      );

      // Update all anonymous items to belong to the new user
      await db.runAsync(
        'UPDATE item SET user_id = ? WHERE user_id = ?',
        [newUserId, 'anonymous']
      );
    });

    // Queue all migrated rankings for sync
    const { SyncQueue } = await import('./syncQueue');
    for (const ranking of anonymousRankings) {
      await SyncQueue.enqueue(newUserId, 'create', 'ranking', ranking.id);
    }

    console.log(`Migrated ${anonymousRankings.length} anonymous rankings to user ${newUserId.substring(0, 8)}`);
  }

  /**
   * Download all data from Supabase and populate local DB
   * Used when logging in on a new device
   */
  static async downloadFromSupabase(userId: string): Promise<void> {
    const db = await getDatabase();

    // Fetch all rankings for this user from Supabase
    const { data: rankings, error: rankingsError } = await supabase
      .from('rankings')
      .select('*')
      .eq('user_id', userId);

    if (rankingsError) throw rankingsError;

    if (!rankings || rankings.length === 0) {
      console.log('No rankings found in Supabase for this user');
      return;
    }

    await db.withTransactionAsync(async () => {
      // For each ranking, insert into local DB
      for (const ranking of rankings) {
        // Insert ranking
        const rankingResult = await db.runAsync(
          'INSERT INTO ranking (user_id, title, description, supabase_id) VALUES (?, ?, ?, ?)',
          [userId, ranking.title, ranking.description, ranking.id]
        );

        const localRankingId = rankingResult.lastInsertRowId;

        // Fetch items for this ranking
        const { data: items, error: itemsError } = await supabase
          .from('items')
          .select('*')
          .eq('ranking_id', ranking.id)
          .order('rank');

        if (itemsError) throw itemsError;

        // Insert each item
        if (items) {
          for (const item of items) {
            await db.runAsync(
              'INSERT INTO item (ranking_id, user_id, name, notes, rank, supabase_id) VALUES (?, ?, ?, ?, ?, ?)',
              [localRankingId, userId, item.name, item.notes, item.rank, item.id]
            );
          }
        }
      }
    });

    console.log(`Downloaded ${rankings.length} rankings from Supabase`);
  }

  /**
   * Delete a ranking from Supabase
   */
  static async deleteRankingFromSupabase(supabaseId: string): Promise<void> {
    const { error } = await supabase.from('rankings').delete().eq('id', supabaseId);

    if (error) throw error;
  }

  /**
   * Delete an item from Supabase
   */
  static async deleteItemFromSupabase(supabaseId: string): Promise<void> {
    const { error } = await supabase.from('items').delete().eq('id', supabaseId);

    if (error) throw error;
  }

  /**
   * Check if user has any data in Supabase
   */
  static async hasSupabaseData(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('rankings')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) throw error;

    return (data?.length ?? 0) > 0;
  }
}

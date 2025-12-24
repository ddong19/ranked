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

    // If already synced, update it
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

    // Update local DB with supabase_id and mark as synced
    await db.runAsync(
      'UPDATE ranking SET supabase_id = ?, synced = 1 WHERE id = ?',
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
      // If already synced, update it
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

        // Update local DB with supabase_id and mark as synced
        await db.runAsync(
          'UPDATE item SET supabase_id = ?, synced = 1 WHERE id = ?',
          [data.id, item.id]
        );
      }
    }
  }

  /**
   * Sync all unsynced data for a user
   */
  static async syncAllToSupabase(userId: string): Promise<void> {
    const db = await getDatabase();

    console.log(`[SyncService] Starting sync for user ${userId.substring(0, 8)}...`);

    // Get all unsynced rankings for this user
    const unsyncedRankings = await db.getAllAsync<{
      id: number;
      title: string;
      description: string | null;
      supabase_id: string | null;
    }>('SELECT * FROM ranking WHERE user_id = ? AND synced = 0', [userId]);

    console.log(`[SyncService] Found ${unsyncedRankings.length} unsynced rankings`);

    for (const ranking of unsyncedRankings) {
      console.log(`[SyncService] Syncing ranking: ${ranking.title}`);
      // Sync the ranking
      const supabaseRankingId = await this.syncRankingToSupabase(ranking.id, userId);

      // Sync all items for this ranking
      await this.syncItemsToSupabase(ranking.id, supabaseRankingId, userId);
    }

    // Also check for unsynced items in already-synced rankings
    const unsyncedItems = await db.getAllAsync<{
      id: number;
      ranking_id: number;
      name: string;
    }>('SELECT * FROM item WHERE user_id = ? AND synced = 0', [userId]);

    console.log(`[SyncService] Found ${unsyncedItems.length} unsynced items`);

    if (unsyncedItems.length > 0) {
      // Group items by ranking_id
      const itemsByRanking = new Map<number, typeof unsyncedItems>();
      for (const item of unsyncedItems) {
        if (!itemsByRanking.has(item.ranking_id)) {
          itemsByRanking.set(item.ranking_id, []);
        }
        itemsByRanking.get(item.ranking_id)!.push(item);
      }

      // Sync items for each ranking
      for (const [rankingId, items] of itemsByRanking) {
        const ranking = await db.getFirstAsync<{ supabase_id: string | null }>(
          'SELECT supabase_id FROM ranking WHERE id = ?',
          [rankingId]
        );

        if (ranking?.supabase_id) {
          console.log(`[SyncService] Syncing ${items.length} items for ranking ${rankingId}`);
          await this.syncItemsToSupabase(rankingId, ranking.supabase_id, userId);
        }
      }
    }

    console.log(`[SyncService] Sync completed`);
  }

  /**
   * Migrate anonymous data to authenticated user
   */
  static async migrateAnonymousData(newUserId: string): Promise<void> {
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      // Update all anonymous rankings to belong to the new user
      await db.runAsync(
        'UPDATE ranking SET user_id = ?, synced = 0 WHERE user_id = ?',
        [newUserId, 'anonymous']
      );

      // Update all anonymous items to belong to the new user
      await db.runAsync(
        'UPDATE item SET user_id = ?, synced = 0 WHERE user_id = ?',
        [newUserId, 'anonymous']
      );
    });

    // Now sync everything to Supabase
    await this.syncAllToSupabase(newUserId);
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
          'INSERT INTO ranking (user_id, title, description, synced, supabase_id) VALUES (?, ?, ?, 1, ?)',
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
              'INSERT INTO item (ranking_id, user_id, name, notes, rank, synced, supabase_id) VALUES (?, ?, ?, ?, ?, 1, ?)',
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

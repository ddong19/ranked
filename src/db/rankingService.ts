import { getDatabase } from './database';
import { SyncQueue } from '../services/syncQueue';

// Types matching your useRankings
export interface ParsedItem {
  name: string;
  notes?: string;
}

export interface RankingFormData {
  title: string;
  description: string;
  importedItems?: ParsedItem[];
}

interface RankingRow {
  id: number;
  title: string;
  description: string | null;
}

interface ItemRow {
  id: number;
  name: string;
  notes: string | null;
  rank: number;
  ranking_id: number;
}

export interface RankingItem {
  id: number;
  name: string;
  notes: string | null;
  rank: number;
}

export interface Ranking {
  id: number;
  title: string;
  description: string | null;
  items: RankingItem[];
}

export class RankingService {
  /**
   * Load all rankings with their items from the database
   * Optionally filter by user_id
   */
  static async loadRankings(userId?: string): Promise<Ranking[]> {
    const db = await getDatabase();

    // Get all rankings (filter by user if provided)
    const rankings = userId
      ? await db.getAllAsync<RankingRow>(
          'SELECT * FROM ranking WHERE user_id = ? ORDER BY id DESC',
          [userId]
        )
      : await db.getAllAsync<RankingRow>(
          'SELECT * FROM ranking ORDER BY id DESC'
        );

    const rankingsWithItems: Ranking[] = [];

    // For each ranking, get its items
    for (const ranking of rankings) {
      const items = await db.getAllAsync<ItemRow>(
        'SELECT * FROM item WHERE ranking_id = ? ORDER BY rank',
        [ranking.id]
      );

      rankingsWithItems.push({
        id: ranking.id,
        title: ranking.title,
        description: ranking.description,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          notes: item.notes,
          rank: item.rank,
        })),
      });
    }

    return rankingsWithItems;
  }

  /**
   * Create a new ranking with optional imported items
   */
  static async createRanking(data: RankingFormData, userId: string = 'anonymous'): Promise<Ranking> {
    const db = await getDatabase();

    let rankingId: number = 0;
    const items: RankingItem[] = [];

    await db.withTransactionAsync(async () => {
      // 1. Create the ranking
      const result = await db.runAsync(
        'INSERT INTO ranking (title, description, user_id, synced) VALUES (?, ?, ?, 0)',
        [data.title, data.description || null, userId]
      );

      rankingId = result.lastInsertRowId;

      // 2. If imported items exist, create them
      if (data.importedItems && data.importedItems.length > 0) {
        for (let i = 0; i < data.importedItems.length; i++) {
          const parsedItem = data.importedItems[i];
          const rank = i + 1; // Rank starts at 1

          const itemResult = await db.runAsync(
            'INSERT INTO item (name, notes, rank, ranking_id, user_id, synced) VALUES (?, ?, ?, ?, ?, 0)',
            [parsedItem.name, parsedItem.notes || null, rank, rankingId, userId]
          );

          items.push({
            id: itemResult.lastInsertRowId,
            name: parsedItem.name,
            notes: parsedItem.notes || null,
            rank: rank,
          });
        }
      }
    });

    // 3. Queue for sync if user is authenticated
    if (userId !== 'anonymous') {
      await SyncQueue.enqueue(userId, 'create', 'ranking', rankingId);
    }

    // 4. Return the complete ranking after transaction completes
    return {
      id: rankingId,
      title: data.title,
      description: data.description || null,
      items: items,
    };
  }

  /**
   * Delete a ranking (items will cascade delete automatically)
   */
  static async deleteRanking(id: number): Promise<void> {
    const db = await getDatabase();

    // Get ranking info before deleting
    const ranking = await db.getFirstAsync<{ supabase_id: string | null; user_id: string }>(
      'SELECT supabase_id, user_id FROM ranking WHERE id = ?',
      [id]
    );

    // Delete from local DB first (this also deletes items due to CASCADE)
    await db.runAsync('DELETE FROM ranking WHERE id = ?', [id]);

    // Queue deletion for sync if it was synced to Supabase
    if (ranking?.supabase_id && ranking?.user_id !== 'anonymous') {
      await SyncQueue.enqueue(ranking.user_id, 'delete', 'ranking', undefined, ranking.supabase_id);
    }
  }

  /**
   * Update ranking title and description
   */
  static async updateRanking(id: number, updates: { title?: string; description?: string }, userId?: string): Promise<void> {
    const db = await getDatabase();

    // Get current ranking data
    const ranking = await db.getFirstAsync<{ user_id: string }>(
      'SELECT user_id FROM ranking WHERE id = ?',
      [id]
    );

    // Update locally
    await db.runAsync(
      'UPDATE ranking SET title = ?, description = ? WHERE id = ?',
      [updates.title || '', updates.description || null, id]
    );

    // Queue for sync if authenticated
    const effectiveUserId = userId || ranking?.user_id;
    if (effectiveUserId && effectiveUserId !== 'anonymous') {
      await SyncQueue.enqueue(effectiveUserId, 'update', 'ranking', id);
    }
  }

  /**
   * Delete an item by ID and shift ranks
   */
  static async deleteItem(itemId: number): Promise<void> {
    const db = await getDatabase();

    let supabaseId: string | null = null;
    let userId: string | null = null;

    await db.withTransactionAsync(async () => {
      // First, get the item's data before deleting
      const item = await db.getFirstAsync<{ rank: number; ranking_id: number; supabase_id: string | null; user_id: string }>(
        'SELECT rank, ranking_id, supabase_id, user_id FROM item WHERE id = ?',
        [itemId]
      );

      if (!item) {
        throw new Error('Item not found');
      }

      supabaseId = item.supabase_id;
      userId = item.user_id;

      // Delete the item
      await db.runAsync('DELETE FROM item WHERE id = ?', [itemId]);

      // Shift down all items that were ranked after this one
      await db.runAsync(
        'UPDATE item SET rank = rank - 1 WHERE ranking_id = ? AND rank > ?',
        [item.ranking_id, item.rank]
      );
    });

    // Queue deletion for sync if it was synced
    if (supabaseId && userId && userId !== 'anonymous') {
      await SyncQueue.enqueue(userId, 'delete', 'item', undefined, supabaseId);
    }
  }

  /**
   * Add a new item to a ranking
   */
  static async addItem(rankingId: number, data: { name: string; notes?: string; rank: number }, userId?: string): Promise<RankingItem> {
    const db = await getDatabase();

    // Get ranking info
    const ranking = await db.getFirstAsync<{ user_id: string }>(
      'SELECT user_id FROM ranking WHERE id = ?',
      [rankingId]
    );

    const effectiveUserId = userId || ranking?.user_id || 'anonymous';

    const result = await db.runAsync(
      'INSERT INTO item (name, notes, rank, ranking_id, user_id) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.notes || null, data.rank, rankingId, effectiveUserId]
    );

    const newItemId = result.lastInsertRowId;

    const newItem = {
      id: newItemId,
      name: data.name,
      notes: data.notes || null,
      rank: data.rank,
    };

    // Queue for sync if authenticated
    if (effectiveUserId !== 'anonymous') {
      await SyncQueue.enqueue(effectiveUserId, 'create', 'item', newItemId);
    }

    return newItem;
  }

  /**
   * Update item name and notes
   */
  static async updateItem(itemId: number, updates: { name?: string; notes?: string }, userId?: string): Promise<void> {
    const db = await getDatabase();

    // Get item info
    const item = await db.getFirstAsync<{ user_id: string }>(
      'SELECT user_id FROM item WHERE id = ?',
      [itemId]
    );

    // Update locally
    await db.runAsync(
      'UPDATE item SET name = ?, notes = ? WHERE id = ?',
      [updates.name || '', updates.notes || null, itemId]
    );

    // Queue for sync if authenticated
    const effectiveUserId = userId || item?.user_id;
    if (effectiveUserId && effectiveUserId !== 'anonymous') {
      await SyncQueue.enqueue(effectiveUserId, 'update', 'item', itemId);
    }
  }

  /**
   * Reorder items by updating all their ranks
   */
  static async updateItemRanks(rankingId: number, itemRanks: Record<string, number>, userId?: string): Promise<void> {
    const db = await getDatabase();

    // Get ranking info
    const ranking = await db.getFirstAsync<{ user_id: string }>(
      'SELECT user_id FROM ranking WHERE id = ?',
      [rankingId]
    );

    await db.withTransactionAsync(async () => {
      // Get list of item IDs we're updating
      const itemIds = Object.keys(itemRanks).map(id => parseInt(id));

      if (itemIds.length === 0) return;

      // Use high offset to prevent unique constraint violations during reordering
      const maxRankResult = await db.getFirstAsync<{ max_rank: number }>(
        'SELECT COALESCE(MAX(rank), 0) + 1000 as max_rank FROM item WHERE ranking_id = ?',
        [rankingId]
      );

      const offset = maxRankResult?.max_rank || 1000;

      // Step 1: Move ONLY the items we're reordering to temporary high ranks
      const placeholders = itemIds.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE item SET rank = rank + ? WHERE ranking_id = ? AND id IN (${placeholders})`,
        [offset, rankingId, ...itemIds]
      );

      // Step 2: Set final ranks for each item
      for (const [itemIdStr, newRank] of Object.entries(itemRanks)) {
        const itemId = parseInt(itemIdStr);
        await db.runAsync(
          'UPDATE item SET rank = ? WHERE id = ? AND ranking_id = ?',
          [newRank, itemId, rankingId]
        );
      }
    });

    // Queue one update for the whole ranking (will sync all items)
    const effectiveUserId = userId || ranking?.user_id;
    if (effectiveUserId && effectiveUserId !== 'anonymous') {
      await SyncQueue.enqueue(effectiveUserId, 'update', 'ranking', rankingId);
    }
  }
}
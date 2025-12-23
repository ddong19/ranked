import { getDatabase } from './database';

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
   */
  static async loadRankings(): Promise<Ranking[]> {
    const db = await getDatabase();
    
    // Get all rankings
    const rankings = await db.getAllAsync<RankingRow>(
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
  static async createRanking(data: RankingFormData): Promise<Ranking> {
    const db = await getDatabase();

    let rankingId: number = 0;
    const items: RankingItem[] = [];

    await db.withTransactionAsync(async () => {
      // 1. Create the ranking
      const result = await db.runAsync(
        'INSERT INTO ranking (title, description) VALUES (?, ?)',
        [data.title, data.description || null]
      );

      rankingId = result.lastInsertRowId;

      // 2. If imported items exist, create them
      if (data.importedItems && data.importedItems.length > 0) {
        for (let i = 0; i < data.importedItems.length; i++) {
          const parsedItem = data.importedItems[i];
          const rank = i + 1; // Rank starts at 1

          const itemResult = await db.runAsync(
            'INSERT INTO item (name, notes, rank, ranking_id) VALUES (?, ?, ?, ?)',
            [parsedItem.name, parsedItem.notes || null, rank, rankingId]
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

    // 3. Return the complete ranking after transaction completes
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
    await db.runAsync('DELETE FROM ranking WHERE id = ?', [id]);
  }

  /**
   * Update ranking title and description
   */
  static async updateRanking(id: number, updates: { title?: string; description?: string }): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      'UPDATE ranking SET title = ?, description = ? WHERE id = ?',
      [updates.title || '', updates.description || null, id]
    );
  }

  /**
   * Delete an item by ID and shift ranks
   */
  static async deleteItem(itemId: number): Promise<void> {
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      // First, get the item's rank and ranking_id before deleting
      const item = await db.getFirstAsync<{ rank: number; ranking_id: number }>(
        'SELECT rank, ranking_id FROM item WHERE id = ?',
        [itemId]
      );

      if (!item) {
        throw new Error('Item not found');
      }

      // Delete the item
      await db.runAsync('DELETE FROM item WHERE id = ?', [itemId]);

      // Shift down all items that were ranked after this one
      await db.runAsync(
        'UPDATE item SET rank = rank - 1 WHERE ranking_id = ? AND rank > ?',
        [item.ranking_id, item.rank]
      );
    });
  }

  /**
   * Add a new item to a ranking
   */
  static async addItem(rankingId: number, data: { name: string; notes?: string; rank: number }): Promise<RankingItem> {
    const db = await getDatabase();

    const result = await db.runAsync(
      'INSERT INTO item (name, notes, rank, ranking_id) VALUES (?, ?, ?, ?)',
      [data.name, data.notes || null, data.rank, rankingId]
    );

    return {
      id: result.lastInsertRowId,
      name: data.name,
      notes: data.notes || null,
      rank: data.rank,
    };
  }

  /**
   * Update item name and notes
   */
  static async updateItem(itemId: number, updates: { name?: string; notes?: string }): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      'UPDATE item SET name = ?, notes = ? WHERE id = ?',
      [updates.name || '', updates.notes || null, itemId]
    );
  }

  /**
   * Reorder items by updating all their ranks
   */
  static async updateItemRanks(rankingId: number, itemRanks: Record<string, number>): Promise<void> {
    const db = await getDatabase();

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
  }
}
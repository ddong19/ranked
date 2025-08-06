import { getDatabase } from './database';
import { Item, Ranking, RankingWithItems, CreateRankingRequest, CreateItemRequest } from '@/types/rankings';

export class RankingService {
  // Load all rankings with their items
  static async loadRankings(): Promise<RankingWithItems[]> {
    const db = await getDatabase();
    
    // Get all rankings
    const rankings = await db.getAllAsync<Ranking>('SELECT * FROM ranking ORDER BY id');
    
    // Get items for each ranking
    const rankingsWithItems: RankingWithItems[] = [];
    
    for (const ranking of rankings) {
      const items = await db.getAllAsync<Item>(
        'SELECT * FROM item WHERE ranking_id = ? ORDER BY rank',
        [ranking.id]
      );
      
      rankingsWithItems.push({
        ...ranking,
        item: items
      });
    }
    
    return rankingsWithItems;
  }

  // Create a new ranking
  static async createRanking(data: CreateRankingRequest): Promise<RankingWithItems> {
    const db = await getDatabase();
    
    const result = await db.runAsync(
      'INSERT INTO ranking (title, description) VALUES (?, ?)',
      [data.title, data.description || null]
    );
    
    const newRanking: RankingWithItems = {
      id: result.lastInsertRowId,
      title: data.title,
      description: data.description || null,
      item: []
    };
    
    return newRanking;
  }

  // Update an existing ranking
  static async updateRanking(id: number, updates: Partial<RankingWithItems>): Promise<void> {
    const db = await getDatabase();
    
    await db.runAsync(
      'UPDATE ranking SET title = ?, description = ? WHERE id = ?',
      [updates.title, updates.description || null, id]
    );
  }

  // Delete a ranking
  static async deleteRanking(id: number): Promise<void> {
    const db = await getDatabase();
    
    // This will cascade delete items due to foreign key constraint
    await db.runAsync('DELETE FROM ranking WHERE id = ?', [id]);
  }

  // Add an item to a ranking
  static async addItem(rankingId: number, data: CreateItemRequest): Promise<Item> {
    const db = await getDatabase();
    
    const result = await db.runAsync(
      'INSERT INTO item (name, notes, rank, ranking_id) VALUES (?, ?, ?, ?)',
      [data.name, data.notes || null, data.rank, rankingId]
    );
    
    const newItem: Item = {
      id: result.lastInsertRowId,
      name: data.name,
      notes: data.notes || null,
      rank: data.rank,
      ranking_id: rankingId
    };
    
    return newItem;
  }

  // Delete an item
  static async deleteItem(itemId: number): Promise<void> {
    const db = await getDatabase();
    
    // The trigger will automatically adjust ranks of remaining items
    await db.runAsync('DELETE FROM item WHERE id = ?', [itemId]);
  }

  // Update item ranks atomically (for drag and drop reordering)
  static async updateItemRanks(rankingId: number, itemRanks: Record<string, number>): Promise<void> {
    const db = await getDatabase();
    
    await db.withTransactionAsync(async () => {
      // Get max rank to use as temporary offset to avoid constraint violations
      const maxRankResult = await db.getFirstAsync<{ max_rank: number }>(
        'SELECT COALESCE(MAX(rank), 0) + 1000 as max_rank FROM item WHERE ranking_id = ?',
        [rankingId]
      );
      
      const offset = maxRankResult?.max_rank || 1000;
      
      // Step 1: Move all items to temporary high ranks
      await db.runAsync(
        'UPDATE item SET rank = rank + ? WHERE ranking_id = ?',
        [offset, rankingId]
      );
      
      // Step 2: Update each item to its final rank
      for (const [itemIdStr, newRank] of Object.entries(itemRanks)) {
        const itemId = parseInt(itemIdStr);
        await db.runAsync(
          'UPDATE item SET rank = ? WHERE id = ? AND ranking_id = ?',
          [newRank, itemId, rankingId]
        );
      }
    });
  }

  // Get a single ranking by ID
  static async getRanking(id: number): Promise<RankingWithItems | null> {
    const db = await getDatabase();
    
    const ranking = await db.getFirstAsync<Ranking>(
      'SELECT * FROM ranking WHERE id = ?',
      [id]
    );
    
    if (!ranking) {
      return null;
    }
    
    const items = await db.getAllAsync<Item>(
      'SELECT * FROM item WHERE ranking_id = ? ORDER BY rank',
      [id]
    );
    
    return {
      ...ranking,
      item: items
    };
  }
}
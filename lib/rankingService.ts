import { getDatabase } from './database';
import { Item, Ranking, RankingWithItems, CreateRankingRequest, CreateItemRequest } from '@/types/rankings';

export class RankingService {
  static async loadRankings(): Promise<RankingWithItems[]> {
    const db = await getDatabase();
    
    const rankings = await db.getAllAsync<Ranking>('SELECT * FROM ranking ORDER BY id');
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

  static async createRanking(data: CreateRankingRequest): Promise<RankingWithItems> {
    const db = await getDatabase();
    
    return await db.withTransactionAsync(async () => {
      // Create the ranking first
      const result = await db.runAsync(
        'INSERT INTO ranking (title, description) VALUES (?, ?)',
        [data.title, data.description || null]
      );
      
      const rankingId = result.lastInsertRowId;
      const items: Item[] = [];
      
      // If imported items exist, create them
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
            ranking_id: rankingId
          });
        }
      }
      
      const newRanking: RankingWithItems = {
        id: rankingId,
        title: data.title,
        description: data.description || null,
        item: items
      };
      
      return newRanking;
    });
  }

  static async updateRanking(id: number, updates: Partial<RankingWithItems>): Promise<void> {
    const db = await getDatabase();
    
    await db.runAsync(
      'UPDATE ranking SET title = ?, description = ? WHERE id = ?',
      [updates.title || '', updates.description || null, id]
    );
  }

  static async deleteRanking(id: number): Promise<void> {
    const db = await getDatabase();
    
    // Cascades to delete all associated items via foreign key constraint
    await db.runAsync('DELETE FROM ranking WHERE id = ?', [id]);
  }

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

  static async updateItem(itemId: number, updates: Partial<CreateItemRequest>): Promise<void> {
    const db = await getDatabase();
    
    await db.runAsync(
      'UPDATE item SET name = ?, notes = ? WHERE id = ?',
      [updates.name || '', updates.notes || null, itemId]
    );
  }

  static async deleteItem(itemId: number): Promise<void> {
    const db = await getDatabase();
    
    // Database trigger automatically adjusts ranks of remaining items
    await db.runAsync('DELETE FROM item WHERE id = ?', [itemId]);
  }

  static async updateItemRanks(rankingId: number, itemRanks: Record<string, number>): Promise<void> {
    const db = await getDatabase();
    
    await db.withTransactionAsync(async () => {
      // Use high offset to prevent unique constraint violations during reordering
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

  static async executeRawSQL(sql: string, params: any[] = []): Promise<any> {
    const db = await getDatabase();
    
    if (sql.trim().toLowerCase().startsWith('select')) {
      return await db.getAllAsync(sql, params);
    } else {
      return await db.runAsync(sql, params);
    }
  }

  static async getAllTables(): Promise<any[]> {
    const db = await getDatabase();
    return await db.getAllAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
  }

  static async getTableSchema(tableName: string): Promise<any[]> {
    const db = await getDatabase();
    return await db.getAllAsync(`PRAGMA table_info(${tableName})`);
  }
}
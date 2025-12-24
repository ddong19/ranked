import { getDatabase } from '../db/database';
import { SyncService } from './syncService';

/**
 * Queue of operations to sync when online
 * ALL create/update/delete operations go through this queue
 */

export interface QueuedOperation {
  id: number;
  user_id: string;
  operation: 'create' | 'update' | 'delete';
  entity_type: 'ranking' | 'item';
  entity_id: number | null;
  supabase_id: string | null;
  payload: string | null;
  created_at: string;
}

export class SyncQueue {
  /**
   * Add an operation to the queue
   */
  static async enqueue(
    userId: string,
    operation: 'create' | 'update' | 'delete',
    entityType: 'ranking' | 'item',
    entityId?: number,
    supabaseId?: string,
    payload?: any
  ): Promise<void> {
    if (userId === 'anonymous') return;

    const db = await getDatabase();

    console.log(`[SyncQueue] Enqueuing ${operation} ${entityType} ${entityId || supabaseId}`);

    await db.runAsync(
      'INSERT INTO sync_queue (user_id, operation, entity_type, entity_id, supabase_id, payload) VALUES (?, ?, ?, ?, ?, ?)',
      [
        userId,
        operation,
        entityType,
        entityId || null,
        supabaseId || null,
        payload ? JSON.stringify(payload) : null,
      ]
    );
  }

  /**
   * Process all queued operations
   */
  static async processQueue(userId: string): Promise<void> {
    const db = await getDatabase();

    // Get all queued operations for this user, ordered by creation time
    const operations = await db.getAllAsync<QueuedOperation>(
      'SELECT * FROM sync_queue WHERE user_id = ? ORDER BY id ASC',
      [userId]
    );

    if (operations.length === 0) {
      console.log('[SyncQueue] No operations in queue');
      return;
    }

    console.log(`[SyncQueue] Processing ${operations.length} operations`);

    for (const op of operations) {
      try {
        await this.processOperation(op);

        // Remove from queue after successful processing
        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [op.id]);
        console.log(`[SyncQueue] ✅ Completed ${op.operation} ${op.entity_type}`);
      } catch (error) {
        console.error(`[SyncQueue] ❌ Failed to process operation ${op.id}:`, error);
        // Don't delete from queue - will retry next time
        throw error; // Stop processing queue on first error
      }
    }

    console.log('[SyncQueue] Queue processing complete');
  }

  /**
   * Process a single operation
   */
  private static async processOperation(op: QueuedOperation): Promise<void> {
    const db = await getDatabase();

    if (op.entity_type === 'ranking') {
      if (op.operation === 'create' || op.operation === 'update') {
        if (!op.entity_id) throw new Error('Missing entity_id for ranking create/update');

        // Sync ranking to Supabase
        const supabaseRankingId = await SyncService.syncRankingToSupabase(op.entity_id, op.user_id);

        // Also sync all items for this ranking
        await SyncService.syncItemsToSupabase(op.entity_id, supabaseRankingId, op.user_id);
      } else if (op.operation === 'delete') {
        if (!op.supabase_id) return; // Nothing to delete in Supabase

        await SyncService.deleteRankingFromSupabase(op.supabase_id);
      }
    } else if (op.entity_type === 'item') {
      if (op.operation === 'create' || op.operation === 'update') {
        if (!op.entity_id) throw new Error('Missing entity_id for item create/update');

        // Get the ranking this item belongs to
        const item = await db.getFirstAsync<{ ranking_id: number }>(
          'SELECT ranking_id FROM item WHERE id = ?',
          [op.entity_id]
        );

        if (!item) return; // Item was deleted, skip

        const ranking = await db.getFirstAsync<{ supabase_id: string | null }>(
          'SELECT supabase_id FROM ranking WHERE id = ?',
          [item.ranking_id]
        );

        if (!ranking?.supabase_id) {
          throw new Error('Cannot sync item - ranking not in Supabase yet');
        }

        await SyncService.syncItemsToSupabase(item.ranking_id, ranking.supabase_id, op.user_id);
      } else if (op.operation === 'delete') {
        if (!op.supabase_id) return; // Nothing to delete in Supabase

        await SyncService.deleteItemFromSupabase(op.supabase_id);
      }
    }
  }

  /**
   * Get count of pending operations
   */
  static async getPendingCount(userId: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue WHERE user_id = ?',
      [userId]
    );
    return result?.count || 0;
  }
}

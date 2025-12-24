import NetInfo from '@react-native-community/netinfo';
import { SyncQueue } from './syncQueue';

/**
 * Manages automatic background synchronization
 * Strategy: Process sync queue every 30 seconds
 */
export class SyncManager {
  private static syncInterval: NodeJS.Timeout | null = null;
  private static currentUserId: string | null = null;
  private static isSyncing = false;

  /**
   * Start the sync manager for a user
   */
  static start(userId: string) {
    console.log(`[SyncManager] Starting for user ${userId.substring(0, 8)}...`);

    if (userId === 'anonymous') {
      console.log('[SyncManager] User is anonymous, stopping sync');
      this.stop();
      return;
    }

    this.currentUserId = userId;

    // Sync immediately on start
    console.log('[SyncManager] Triggering initial sync...');
    this.performSync();

    // Start periodic sync (every 30 seconds)
    this.startPeriodicSync();
    console.log('[SyncManager] Periodic sync started (every 30 seconds)');
  }

  /**
   * Stop the sync manager
   */
  static stop() {
    console.log('[SyncManager] Stopping...');
    this.currentUserId = null;
    this.stopPeriodicSync();
  }

  /**
   * Start periodic sync
   */
  private static startPeriodicSync() {
    this.stopPeriodicSync();

    // Sync every 30 seconds
    this.syncInterval = setInterval(() => {
      if (this.currentUserId) {
        console.log('[SyncManager] Periodic sync timer triggered');
        this.performSync();
      }
    }, 30 * 1000); // 30 seconds
  }

  /**
   * Stop periodic sync
   */
  private static stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform sync if not already syncing
   */
  private static async performSync() {
    if (this.isSyncing) {
      console.log('[SyncManager] Sync already in progress, skipping');
      return;
    }

    if (!this.currentUserId) {
      console.log('[SyncManager] No user ID, skipping sync');
      return;
    }

    this.isSyncing = true;

    try {
      // Check if we're online
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('[SyncManager] Offline - skipping sync');
        return;
      }

      console.log('[SyncManager] Processing sync queue...');
      await SyncQueue.processQueue(this.currentUserId);
      console.log('[SyncManager] Sync queue processed successfully');
    } catch (error) {
      console.error('[SyncManager] Background sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Manually trigger a sync
   */
  static async syncNow(userId: string): Promise<void> {
    if (userId === 'anonymous') return;

    this.currentUserId = userId;
    await this.performSync();
  }
}

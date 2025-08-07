import * as SQLite from 'expo-sqlite';
import { Item, Ranking, RankingWithItems } from '@/types/rankings';

const DB_NAME = 'rankings.db';

let db: SQLite.SQLiteDatabase | null = null;

// Initialize database connection
export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DB_NAME);
  
  // Enable foreign key constraints
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  // Only create tables if they don't exist
  await createTablesIfNeeded();
  return db;
};

// Create tables and triggers only if needed
const createTablesIfNeeded = async () => {
  if (!db) throw new Error('Database not initialized');

  // Check if tables already exist
  const tablesExist = await db.getFirstAsync(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='ranking'
  `);

  if (!tablesExist) {
    console.log('Creating database tables for first time...');
    
    // Create rankings table
    await db.execAsync(`
      CREATE TABLE ranking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT
      );
    `);

    // Create items table
    await db.execAsync(`
      CREATE TABLE item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        notes TEXT,
        rank INTEGER NOT NULL,
        ranking_id INTEGER NOT NULL,
        CONSTRAINT fk_item_ranking FOREIGN KEY (ranking_id) REFERENCES ranking (id) ON DELETE CASCADE,
        CONSTRAINT item_rank_ranking_unique UNIQUE (rank, ranking_id)
      );
    `);

    // Create index for faster queries
    await db.execAsync(`
      CREATE INDEX idx_item_ranking_id ON item (ranking_id);
    `);
  }

  // Ensure triggers exist (only creates/updates when needed)
  await ensureTriggersExist();
};

// Current trigger version for future migrations
const TRIGGER_VERSION = 1;

// Check and create/update triggers only when needed
const ensureTriggersExist = async () => {
  if (!db) throw new Error('Database not initialized');
  
  // Check if the trigger exists
  const triggerExists = await db.getFirstAsync(`
    SELECT name FROM sqlite_master 
    WHERE type='trigger' AND name='trigger_adjust_ranks_after_delete'
  `);

  // Check current trigger version from a metadata table
  const currentVersion = await getTriggerVersion();

  // Only create/update trigger if it doesn't exist or version is outdated
  if (!triggerExists || currentVersion < TRIGGER_VERSION) {
    console.log('Creating/updating database trigger...');
    
    // Drop old trigger if it exists
    await db.execAsync(`DROP TRIGGER IF EXISTS trigger_adjust_ranks_after_delete`);
    
    // Create the updated trigger with safe rank adjustments
    await db.execAsync(`
      CREATE TRIGGER trigger_adjust_ranks_after_delete
      AFTER DELETE ON item
      FOR EACH ROW
      BEGIN
        UPDATE item 
        SET rank = rank + 10000 
        WHERE ranking_id = OLD.ranking_id AND rank > OLD.rank;
        
        UPDATE item 
        SET rank = rank - 10001 
        WHERE ranking_id = OLD.ranking_id AND rank > 10000;
      END
    `);

    // Update trigger version
    await setTriggerVersion(TRIGGER_VERSION);
  }
};

// Helper functions for trigger version tracking
const getTriggerVersion = async (): Promise<number> => {
  if (!db) return 0;
  
  try {
    // Create metadata table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS _metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    const result = await db.getFirstAsync(`
      SELECT value FROM _metadata WHERE key = 'trigger_version'
    `) as { value?: string } | null;

    return result?.value ? parseInt(result.value) : 0;
  } catch (error) {
    console.log('Error getting trigger version:', error);
    return 0;
  }
};

const setTriggerVersion = async (version: number): Promise<void> => {
  if (!db) return;
  
  try {
    await db.runAsync(`
      INSERT OR REPLACE INTO _metadata (key, value) VALUES ('trigger_version', ?)
    `, [version.toString()]);
  } catch (error) {
    console.log('Error setting trigger version:', error);
  }
};

// Get database instance
export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    return await initDatabase();
  }
  return db;
};

// Close database connection
export const closeDatabase = async () => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};
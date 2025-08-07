import * as SQLite from 'expo-sqlite';
import { Item, Ranking, RankingWithItems } from '@/types/rankings';

const DB_NAME = 'rankings.db';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await createTablesIfNeeded();
  return db;
};

const createTablesIfNeeded = async () => {
  if (!db) throw new Error('Database not initialized');

  const tablesExist = await db.getFirstAsync(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='ranking'
  `);

  if (!tablesExist) {
    console.log('Creating database tables for first time...');
    
    await db.execAsync(`
      CREATE TABLE ranking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT
      );
    `);

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

    await db.execAsync(`
      CREATE INDEX idx_item_ranking_id ON item (ranking_id);
    `);
  }

  await ensureTriggersExist();
};

const TRIGGER_VERSION = 1;

const ensureTriggersExist = async () => {
  if (!db) throw new Error('Database not initialized');
  
  const triggerExists = await db.getFirstAsync(`
    SELECT name FROM sqlite_master 
    WHERE type='trigger' AND name='trigger_adjust_ranks_after_delete'
  `);

  const currentVersion = await getTriggerVersion();

  if (!triggerExists || currentVersion < TRIGGER_VERSION) {
    console.log('Creating/updating database trigger...');
    
    await db.execAsync(`DROP TRIGGER IF EXISTS trigger_adjust_ranks_after_delete`);
    
    // Two-step rank adjustment to prevent constraint violations
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

    await setTriggerVersion(TRIGGER_VERSION);
  }
};

const getTriggerVersion = async (): Promise<number> => {
  if (!db) return 0;
  
  try {
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

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    return await initDatabase();
  }
  return db;
};

export const closeDatabase = async () => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};
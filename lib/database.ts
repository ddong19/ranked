import * as SQLite from 'expo-sqlite';
import { Item, Ranking, RankingWithItems } from '@/types/rankings';

const DB_NAME = 'rankings.db';
const DB_VERSION = 1;

let db: SQLite.SQLiteDatabase | null = null;

// Initialize database connection
export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DB_NAME);
  
  // Enable foreign key constraints
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  await createTables();
  return db;
};

// Create local SQLite tables for offline-first functionality
const createTables = async () => {
  if (!db) throw new Error('Database not initialized');

  // Create rankings table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ranking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT
    );
  `);

  // Create items table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS item (
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
    CREATE INDEX IF NOT EXISTS idx_item_ranking_id ON item (ranking_id);
  `);

  // Trigger to automatically adjust ranks when items are deleted
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS trigger_adjust_ranks_after_delete
    AFTER DELETE ON item
    FOR EACH ROW
    BEGIN
      UPDATE item 
      SET rank = rank - 1 
      WHERE ranking_id = OLD.ranking_id AND rank > OLD.rank;
    END;
  `);
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
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDb() {
  if (db) {
    return db;
  }

  try {
    // Open database asynchronously
    db = await SQLite.openDatabaseAsync('ranked.db');
    
    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');
    
    // Create tables
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ranking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ranking_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        notes TEXT,
        rank INTEGER NOT NULL,
        FOREIGN KEY (ranking_id) REFERENCES ranking (id) ON DELETE CASCADE
      );
    `);

    // Create index for better performance
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_item_ranking_id ON item (ranking_id);
    `);

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export async function query(sql: string, params: any[] = []) {
  const database = getDb();
  try {
    const result = await database.getAllAsync(sql, params);
    return result ?? [];
  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  }
}

export async function closeDb() {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

export { db };
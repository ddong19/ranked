import * as SQLite from 'expo-sqlite';

const DB_NAME = 'ranked.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database and create tables if needed
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  try {
    // Open database
    db = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Enable foreign keys for cascade deletes
    await db.execAsync('PRAGMA foreign_keys = ON;');
    
    // Create tables if they don't exist
    await createTablesIfNeeded();
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Create database tables on first run
 */
async function createTablesIfNeeded() {
  if (!db) throw new Error('Database not initialized');

  // Check if tables already exist
  const tablesExist = await db.getFirstAsync(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='ranking'
  `);

  if (!tablesExist) {
    console.log('Creating database tables for first time...');
    
    // Create ranking table
    await db.execAsync(`
      CREATE TABLE ranking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create item table with foreign key
    await db.execAsync(`
      CREATE TABLE item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ranking_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        notes TEXT,
        rank INTEGER NOT NULL,
        FOREIGN KEY (ranking_id) REFERENCES ranking (id) ON DELETE CASCADE
      );
    `);

    // Create index for better query performance
    await db.execAsync(`
      CREATE INDEX idx_item_ranking_id ON item (ranking_id);
    `);
    
    console.log('Database tables created successfully');
  }
}

/**
 * Get the database instance (must call initDatabase first)
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    return await initDatabase();
  }
  return db;
}

/**
 * Close the database connection
 */
export async function closeDatabase() {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('Database closed');
  }
}

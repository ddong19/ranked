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
        user_id TEXT NOT NULL DEFAULT 'anonymous',
        title TEXT NOT NULL,
        description TEXT,
        supabase_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create item table with foreign key
    await db.execAsync(`
      CREATE TABLE item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ranking_id INTEGER NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'anonymous',
        name TEXT NOT NULL,
        notes TEXT,
        rank INTEGER NOT NULL,
        supabase_id TEXT,
        FOREIGN KEY (ranking_id) REFERENCES ranking (id) ON DELETE CASCADE
      );
    `);

    // Create sync_queue table to track all operations that need to sync
    await db.execAsync(`
      CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        supabase_id TEXT,
        payload TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better query performance
    await db.execAsync(`
      CREATE INDEX idx_item_ranking_id ON item (ranking_id);
      CREATE INDEX idx_ranking_user_id ON ranking (user_id);
      CREATE INDEX idx_item_user_id ON item (user_id);
    `);

    console.log('Database tables created successfully');
  } else {
    // Migration: Add new columns if they don't exist
    await migrateExistingTables();
  }
}

/**
 * Migrate existing tables to add new columns
 */
async function migrateExistingTables() {
  if (!db) throw new Error('Database not initialized');

  try {
    // Check if user_id column exists in ranking table
    const rankingColumns = await db.getAllAsync(`PRAGMA table_info(ranking)`);
    const hasUserId = rankingColumns.some((col: any) => col.name === 'user_id');

    if (!hasUserId) {
      console.log('Migrating existing database schema...');

      // Add new columns to ranking table
      await db.execAsync(`
        ALTER TABLE ranking ADD COLUMN user_id TEXT NOT NULL DEFAULT 'anonymous';
        ALTER TABLE ranking ADD COLUMN supabase_id TEXT;
      `);

      // Add new columns to item table
      await db.execAsync(`
        ALTER TABLE item ADD COLUMN user_id TEXT NOT NULL DEFAULT 'anonymous';
        ALTER TABLE item ADD COLUMN supabase_id TEXT;
      `);

      // Create new indexes
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_ranking_user_id ON ranking (user_id);
        CREATE INDEX IF NOT EXISTS idx_item_user_id ON item (user_id);
      `);

      console.log('Database migration completed successfully');
    }

    // Check if sync_queue table exists
    const syncQueueExists = await db.getFirstAsync(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='sync_queue'
    `);

    if (!syncQueueExists) {
      console.log('Creating sync_queue table...');

      await db.execAsync(`
        CREATE TABLE sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id INTEGER,
          supabase_id TEXT,
          payload TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('sync_queue table created successfully');
    }
  } catch (error) {
    console.error('Migration error:', error);
    // Continue anyway - tables might already be migrated
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

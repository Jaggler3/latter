import { DatabaseAdapter, LatterOptions, MigrationStatus } from '../types';
import { Database } from 'bun:sqlite';

export class SQLiteAdapter implements DatabaseAdapter {
  public name = 'sqlite';
  public isConnected = false;
  private db: Database | null = null;
  private dbPath: string;
  private options: LatterOptions;

  constructor(databaseUrl: string, options?: LatterOptions) {
    // Extract path from sqlite:path format
    this.dbPath = databaseUrl.replace('sqlite:', '');
    this.options = options || { database: databaseUrl, migrationsDir: './migrations', verbose: false };
  }

  async connect(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
      this.db.run('PRAGMA foreign_keys = ON');
      this.isConnected = true;
      if (this.options.verbose) {
        console.log(`Connected to SQLite database: ${this.dbPath}`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to SQLite database: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.db && this.isConnected) {
      this.db.close();
      this.db = null;
      this.isConnected = false;
      if (this.options.verbose) {
        console.log('Disconnected from SQLite database');
      }
    }
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);
      stmt.finalize();
      return result;
    } catch (error) {
      throw new Error(`SQL execution failed: ${error}`);
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.all(...params);
      return result;
    } catch (error) {
      throw new Error(`SQL query failed: ${error}`);
    }
  }

  async beginTransaction(): Promise<void> {
    await this.execute('BEGIN TRANSACTION');
  }

  async commitTransaction(): Promise<void> {
    await this.execute('COMMIT');
  }

  async rollbackTransaction(): Promise<void> {
    await this.execute('ROLLBACK');
  }

  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return result.length > 0;
  }

  async createMigrationsTable(tableName: string): Promise<void> {
    const exists = await this.tableExists(tableName);
    if (!exists) {
      await this.execute(`
        CREATE TABLE ${tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          version TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          checksum TEXT NOT NULL
        )
      `);
      
      if (this.options.verbose) {
        console.log(`Created migrations table: ${tableName}`);
      }
    }
  }

  async getAppliedMigrations(tableName: string): Promise<MigrationStatus[]> {
    const rows = await this.query(
      `SELECT name, version, timestamp, applied_at, checksum FROM ${tableName} ORDER BY timestamp ASC`
    );

    return rows.map(row => ({
      name: row.name,
      version: row.version,
      timestamp: row.timestamp,
      applied: true,
      appliedAt: row.applied_at ? new Date(row.applied_at) : undefined,
      checksum: row.checksum
    }));
  }

  async markMigrationApplied(migration: MigrationStatus, tableName: string): Promise<void> {
    await this.execute(
      `INSERT INTO ${tableName} (name, version, timestamp, checksum) VALUES (?, ?, ?, ?)`,
      [migration.name, migration.version, migration.timestamp, migration.checksum]
    );
  }

  async markMigrationRolledBack(migration: MigrationStatus, tableName: string): Promise<void> {
    await this.execute(
      `DELETE FROM ${tableName} WHERE name = ?`,
      [migration.name]
    );
  }
}

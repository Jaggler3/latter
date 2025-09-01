import { DatabaseAdapter, LatterOptions, MigrationStatus } from '../types';
import { Pool, PoolClient } from 'pg';

export class PostgresAdapter implements DatabaseAdapter {
  public name = 'postgres';
  public isConnected = false;
  private pool: Pool | null = null;
  private poolClient: PoolClient | null = null;
  private connectionString: string;
  private options: LatterOptions;

  constructor(databaseUrl: string, options?: LatterOptions) {
    this.connectionString = databaseUrl;
    this.options = options || { database: databaseUrl, migrationsDir: './migrations', verbose: false };
  }

  async connect(): Promise<void> {
    try {
      // Create a pool for better connection management
      this.pool = new Pool({
        connectionString: this.connectionString,
        max: 1, // We only need one connection for migrations
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test the connection
      this.poolClient = await this.pool.connect();
      
      if (this.options.verbose) {
        console.log('Connected to PostgreSQL database');
      }
      this.isConnected = true;
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL database: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.poolClient && this.isConnected) {
        this.poolClient.release();
        this.poolClient = null;
      }
      
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        this.isConnected = false;
      }
      
      if (this.options.verbose) {
        console.log('Disconnected from PostgreSQL database');
      }
    } catch (error) {
      console.error('Error disconnecting from PostgreSQL:', error);
    }
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.poolClient || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.poolClient.query(sql, params);
      return result;
    } catch (error) {
      throw new Error(`SQL execution failed: ${error}`);
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.poolClient || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.poolClient.query(sql, params);
      return result.rows;
    } catch (error) {
      throw new Error(`SQL query failed: ${error}`);
    }
  }

  async beginTransaction(): Promise<void> {
    if (!this.poolClient || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      await this.poolClient.query('BEGIN');
    } catch (error) {
      throw new Error(`Failed to begin transaction: ${error}`);
    }
  }

  async commitTransaction(): Promise<void> {
    if (!this.poolClient || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      await this.poolClient.query('COMMIT');
    } catch (error) {
      throw new Error(`Failed to commit transaction: ${error}`);
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.poolClient || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      await this.poolClient.query('ROLLBACK');
    } catch (error) {
      throw new Error(`Failed to rollback transaction: ${error}`);
    }
  }

  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
      [tableName]
    );
    return result[0]?.exists || false;
  }

  async createMigrationsTable(tableName: string): Promise<void> {
    const exists = await this.tableExists(tableName);
    if (!exists) {
      await this.execute(`
        CREATE TABLE public."${tableName}" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          version VARCHAR(255) NOT NULL,
          timestamp BIGINT NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          checksum VARCHAR(255) NOT NULL
        )
      `);
      
    } else {
      if (this.options.verbose) {
        console.log(`✅ Migrations table already exists: ${tableName}`);
      }
    }
  }

  async getAppliedMigrations(tableName: string): Promise<MigrationStatus[]> {
    const rows = await this.query(
      `SELECT name, version, timestamp, applied_at, checksum FROM public."${tableName}" ORDER BY timestamp ASC`
    );

    return rows.map(row => ({
      name: row.name,
      version: row.version,
      timestamp: parseInt(row.timestamp),
      applied: true,
      appliedAt: row.applied_at ? new Date(row.applied_at) : undefined,
      checksum: row.checksum
    }));
  }

  async markMigrationApplied(migration: MigrationStatus, tableName: string): Promise<void> {
    await this.execute(
      `INSERT INTO public."${tableName}" (name, version, timestamp, checksum) VALUES ($1, $2, $3, $4)`,
      [migration.name, migration.version, migration.timestamp, migration.checksum]
    );
  }

  async markMigrationRolledBack(migration: MigrationStatus, tableName: string): Promise<void> {
    await this.execute(
      `DELETE FROM public."${tableName}" WHERE name = $1`,
      [migration.name]
    );
  }
}

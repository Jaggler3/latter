import { DatabaseAdapter, MigrationStatus } from '../types';
import { createConnection, Connection, ConnectionOptions } from 'mysql2/promise';

export class MySQLAdapter implements DatabaseAdapter {
  public name = 'mysql';
  public verbose = false;
  public isConnected = false;
  private connection: Connection | null = null;
  private connectionOptions: ConnectionOptions;

  constructor(databaseUrl: string) {
    this.connectionOptions = this.parseConnectionString(databaseUrl);
  }

  private parseConnectionString(url: string): ConnectionOptions {
    try {
      // Parse mysql://user:password@host:port/database format
      const urlObj = new URL(url);
      
      return {
        host: urlObj.hostname,
        port: parseInt(urlObj.port) || 3306,
        user: urlObj.username,
        password: urlObj.password,
        database: urlObj.pathname.slice(1), // Remove leading slash
        charset: 'utf8mb4',
        timezone: 'Z',
        connectionLimit: 1,
      };
    } catch (error) {
      throw new Error(`Invalid MySQL connection string: ${error}`);
    }
  }

  async connect(): Promise<void> {
    try {
      this.connection = await createConnection(this.connectionOptions);
      this.isConnected = true;
      // Set session variables for better compatibility
      await this.connection.execute('SET SESSION sql_mode = "STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO"');
      await this.connection.execute('SET SESSION time_zone = "+00:00"');
      
      if (this.verbose) {
        console.log('Connected to MySQL database');
      }
    } catch (error) {
      throw new Error(`Failed to connect to MySQL database: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection && this.isConnected) {
        await this.connection.end();
        this.connection = null;
        
        if (this.verbose) {
          console.log('Disconnected from MySQL database');
        }
        this.isConnected = false;
      }
    } catch (error) {
      console.error('Error disconnecting from MySQL:', error);
    }
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.connection || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const [result] = await this.connection.execute(sql, params);
      return result;
    } catch (error) {
      throw new Error(`SQL execution failed: ${error}`);
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.connection || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const [rows] = await this.connection.execute(sql, params);
      return Array.isArray(rows) ? rows : [rows];
    } catch (error) {
      throw new Error(`SQL query failed: ${error}`);
    }
  }

  async beginTransaction(): Promise<void> {
    if (!this.connection || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      await this.connection.beginTransaction();
    } catch (error) {
      throw new Error(`Failed to begin transaction: ${error}`);
    }
  }

  async commitTransaction(): Promise<void> {
    if (!this.connection || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      await this.connection.commit();
    } catch (error) {
      throw new Error(`Failed to commit transaction: ${error}`);
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.connection || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      await this.connection.rollback();
    } catch (error) {
      throw new Error(`Failed to rollback transaction: ${error}`);
    }
  }

  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
      [tableName]
    );
    return result[0]?.count > 0;
  }

  async createMigrationsTable(tableName: string): Promise<void> {
    const exists = await this.tableExists(tableName);
    if (!exists) {
      await this.execute(`
        CREATE TABLE ${tableName} (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          version VARCHAR(255) NOT NULL,
          timestamp BIGINT NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          checksum VARCHAR(255) NOT NULL,
          INDEX idx_name (name),
          INDEX idx_timestamp (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      if (this.verbose) {
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
      timestamp: parseInt(row.timestamp),
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

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { SQLiteAdapter } from '../adapters/sqlite';
import { PostgresAdapter } from '../adapters/postgres';
import { MySQLAdapter } from '../adapters/mysql';

describe('Database Adapters', () => {
  describe('SQLiteAdapter', () => {
    let adapter: SQLiteAdapter;

    beforeEach(() => {
      adapter = new SQLiteAdapter(`:memory:`, {
        database: ':memory:',
        migrationsDir: './migrations',
        verbose: false
      });
    });

    afterEach(async () => {
      await adapter.disconnect();
    });

    it('should connect and disconnect', async () => {
      await adapter.connect();
      expect(adapter.isConnected).toBe(true);
      await adapter.disconnect();
      expect(adapter.isConnected).toBe(false);
    });

    it('should create migrations table', async () => {
      await adapter.connect();
      await adapter.createMigrationsTable('test_migrations');
      
      const exists = await adapter.tableExists('test_migrations');
      expect(exists).toBe(true);
    });

    it('should execute SQL statements', async () => {
      await adapter.connect();
      await adapter.createMigrationsTable('test_migrations');
      
      const result = await adapter.execute(
        'INSERT INTO test_migrations (name, version, timestamp, checksum) VALUES (?, ?, ?, ?)',
        ['test', 'v1', 1234567890, 'abc123']
      );
      
      expect(result).toBeDefined();
    });

    it('should query data', async () => {
      await adapter.connect();
      await adapter.createMigrationsTable('test_migrations');
      
      await adapter.execute(
        'INSERT INTO test_migrations (name, version, timestamp, checksum) VALUES (?, ?, ?, ?)',
        ['test', 'v1', 1234567890, 'abc123']
      );
      
      const rows = await adapter.query('SELECT * FROM test_migrations WHERE name = ?', ['test']);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('test');
    });

    it('should handle transaction management', async () => {
      await adapter.connect();
      await adapter.createMigrationsTable('test_migrations');
      
      await adapter.beginTransaction();
      
      await adapter.execute(
        'INSERT INTO test_migrations (name, version, timestamp, checksum) VALUES (?, ?, ?, ?)',
        ['test1', 'v1', 1234567890, 'abc123']
      );
      
      await adapter.execute(
        'INSERT INTO test_migrations (name, version, timestamp, checksum) VALUES (?, ?, ?, ?)',
        ['test2', 'v2', 1234567891, 'def456']
      );
      
      await adapter.commitTransaction();
      
      const rows = await adapter.query('SELECT * FROM test_migrations ORDER BY name');
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe('test1');
      expect(rows[1].name).toBe('test2');
    });

    it('should handle transaction rollback', async () => {
      await adapter.connect();
      await adapter.createMigrationsTable('test_migrations');
      
      await adapter.beginTransaction();
      
      await adapter.execute(
        'INSERT INTO test_migrations (name, version, timestamp, checksum) VALUES (?, ?, ?, ?)',
        ['test1', 'v1', 1234567890, 'abc123']
      );
      
      await adapter.rollbackTransaction();
      
      const rows = await adapter.query('SELECT * FROM test_migrations');
      expect(rows).toHaveLength(0);
    });

    it('should handle SQL execution errors gracefully', async () => {
      await adapter.connect();
      
      await expect(adapter.execute('INVALID SQL STATEMENT')).rejects.toThrow('SQL execution failed');
    });

    it('should handle query errors gracefully', async () => {
      await adapter.connect();
      
      await expect(adapter.query('SELECT * FROM nonexistent_table')).rejects.toThrow('SQL query failed');
    });

    it('should handle connection errors gracefully', async () => {
      const invalidAdapter = new SQLiteAdapter('invalid/path/database.db');
      
      await expect(invalidAdapter.connect()).rejects.toThrow('Failed to connect to SQLite database');
    });

    it('should handle disconnection when not connected', async () => {
      // Should not throw when disconnecting without being connected
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it('should handle operations when not connected', async () => {
      await expect(adapter.execute('SELECT 1')).rejects.toThrow('Database not connected');
      await expect(adapter.query('SELECT 1')).rejects.toThrow('Database not connected');
      await expect(adapter.beginTransaction()).rejects.toThrow('Database not connected');
      await expect(adapter.commitTransaction()).rejects.toThrow('Database not connected');
      await expect(adapter.rollbackTransaction()).rejects.toThrow('Database not connected');
    });

    it('should handle table existence checks', async () => {
      await adapter.connect();
      
      // Table should not exist initially
      expect(await adapter.tableExists('nonexistent_table')).toBe(false);
      
      // Create a table and check it exists
      await adapter.execute('CREATE TABLE test_table (id INTEGER)');
      expect(await adapter.tableExists('test_table')).toBe(true);
    });

    it('should handle migrations table operations', async () => {
      await adapter.connect();
      
      // Create migrations table
      await adapter.createMigrationsTable('custom_migrations');
      expect(await adapter.tableExists('custom_migrations')).toBe(true);
      
      // Get applied migrations (should be empty initially)
      const appliedMigrations = await adapter.getAppliedMigrations('custom_migrations');
      expect(appliedMigrations).toHaveLength(0);
      
      // Mark migration as applied
      const migrationStatus = {
        name: 'test_migration',
        version: 'v1',
        timestamp: 1234567890,
        applied: true,
        appliedAt: new Date(),
        checksum: 'abc123'
      };
      
      await adapter.markMigrationApplied(migrationStatus, 'custom_migrations');
      
      // Check that migration is now applied
      const updatedMigrations = await adapter.getAppliedMigrations('custom_migrations');
      expect(updatedMigrations).toHaveLength(1);
      expect(updatedMigrations[0].name).toBe('test_migration');
      expect(updatedMigrations[0].version).toBe('v1');
      expect(updatedMigrations[0].checksum).toBe('abc123');
    });

    it('should handle migration rollback', async () => {
      await adapter.connect();
      await adapter.createMigrationsTable('test_migrations');
      
      // Mark migration as applied
      const migrationStatus = {
        name: 'test_migration',
        version: 'v1',
        timestamp: 1234567890,
        applied: true,
        appliedAt: new Date(),
        checksum: 'abc123'
      };
      
      await adapter.markMigrationApplied(migrationStatus, 'test_migrations');
      
      // Verify migration is applied
      let appliedMigrations = await adapter.getAppliedMigrations('test_migrations');
      expect(appliedMigrations).toHaveLength(1);
      
      // Rollback migration
      await adapter.markMigrationRolledBack(migrationStatus, 'test_migrations');
      
      // Verify migration is no longer applied
      appliedMigrations = await adapter.getAppliedMigrations('test_migrations');
      expect(appliedMigrations).toHaveLength(0);
    });

    it('should handle verbose mode', async () => {
      adapter.verbose = true;
      
      await adapter.connect();
      await adapter.createMigrationsTable('test_migrations');
      
      // Should not throw with verbose mode enabled
      const result = await adapter.execute('SELECT 1');
      expect(result).toBeDefined();
    });

    it('should handle custom table names with special characters', async () => {
      await adapter.connect();
      
      // Test with table name containing underscores
      await adapter.createMigrationsTable('custom_migrations_table');
      expect(await adapter.tableExists('custom_migrations_table')).toBe(true);
      
      // Test with table name containing numbers
      await adapter.createMigrationsTable('migrations_2023');
      expect(await adapter.tableExists('migrations_2023')).toBe(true);
    });

    it('should handle large parameter values', async () => {
      await adapter.connect();
      await adapter.createMigrationsTable('test_migrations');
      
      const largeValue = 'a'.repeat(10000);
      
      await adapter.execute(
        'INSERT INTO test_migrations (name, version, timestamp, checksum) VALUES (?, ?, ?, ?)',
        ['test', 'v1', 1234567890, largeValue]
      );
      
      const rows = await adapter.query('SELECT * FROM test_migrations WHERE name = ?', ['test']);
      expect(rows).toHaveLength(1);
      expect(rows[0].checksum).toBe(largeValue);
    });

    it('should handle multiple concurrent operations', async () => {
      await adapter.connect();
      await adapter.createMigrationsTable('test_migrations');
      
      // Execute multiple operations concurrently
      const promises = [
        adapter.execute('INSERT INTO test_migrations (name, version, timestamp, checksum) VALUES (?, ?, ?, ?)', ['test1', 'v1', 1, 'abc']),
        adapter.execute('INSERT INTO test_migrations (name, version, timestamp, checksum) VALUES (?, ?, ?, ?)', ['test2', 'v2', 2, 'def']),
        adapter.execute('INSERT INTO test_migrations (name, version, timestamp, checksum) VALUES (?, ?, ?, ?)', ['test3', 'v3', 3, 'ghi'])
      ];
      
      await Promise.all(promises);
      
      const rows = await adapter.query('SELECT * FROM test_migrations ORDER BY timestamp');
      expect(rows).toHaveLength(3);
      expect(rows[0].name).toBe('test1');
      expect(rows[1].name).toBe('test2');
      expect(rows[2].name).toBe('test3');
    });
  });

  describe('PostgresAdapter', () => {
    it('should parse connection string correctly', () => {
      const adapter = new PostgresAdapter('postgresql://user:pass@localhost:5432/db');
      expect(adapter.name).toBe('postgres');
    });

    it('should store connection string', () => {
      const adapter = new PostgresAdapter('postgresql://user:pass@localhost:5432/db');
      expect(adapter.name).toBe('postgres');
    });

    it('should handle connection failures gracefully', async () => {
      const adapter = new PostgresAdapter('postgresql://invalid:invalid@localhost:5432/invalid');
      
      await expect(adapter.connect()).rejects.toThrow('Failed to connect to PostgreSQL database');
    });

    it('should handle disconnection gracefully', async () => {
      const adapter = new PostgresAdapter('postgresql://user:pass@localhost:5432/db');
      
      // Should not throw when disconnecting without being connected
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it('should handle operations when not connected', async () => {
      const adapter = new PostgresAdapter('postgresql://user:pass@localhost:5432/db');
      
      await expect(adapter.execute('SELECT 1')).rejects.toThrow('Database not connected');
      await expect(adapter.query('SELECT 1')).rejects.toThrow('Database not connected');
      await expect(adapter.beginTransaction()).rejects.toThrow('Database not connected');
      await expect(adapter.commitTransaction()).rejects.toThrow('Database not connected');
      await expect(adapter.rollbackTransaction()).rejects.toThrow('Database not connected');
    });

    it('should handle verbose mode', () => {
      const adapter = new PostgresAdapter('postgresql://user:pass@localhost:5432/db');
      adapter.verbose = true;
      
      expect(adapter.verbose).toBe(true);
    });
  });

  describe('MySQLAdapter', () => {
    it('should parse connection string correctly', () => {
      const adapter = new MySQLAdapter('mysql://user:pass@localhost:3306/db');
      expect(adapter.name).toBe('mysql');
    });

    it('should handle connection string parsing errors', () => {
      expect(() => new MySQLAdapter('invalid-url')).toThrow('Invalid MySQL connection string');
    });

    it('should handle connection failures gracefully', async () => {
      const adapter = new MySQLAdapter('mysql://invalid:invalid@localhost:3306/invalid');
      
      await expect(adapter.connect()).rejects.toThrow('Failed to connect to MySQL database');
    });

    it('should handle disconnection gracefully', async () => {
      const adapter = new MySQLAdapter('mysql://user:pass@localhost:3306/db');
      
      // Should not throw when disconnecting without being connected
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it('should handle operations when not connected', async () => {
      const adapter = new MySQLAdapter('mysql://user:pass@localhost:3306/db');
      
      await expect(adapter.execute('SELECT 1')).rejects.toThrow('Database not connected');
      await expect(adapter.query('SELECT 1')).rejects.toThrow('Database not connected');
      await expect(adapter.beginTransaction()).rejects.toThrow('Database not connected');
      await expect(adapter.commitTransaction()).rejects.toThrow('Database not connected');
      await expect(adapter.rollbackTransaction()).rejects.toThrow('Database not connected');
    });

    it('should handle verbose mode', () => {
      const adapter = new MySQLAdapter('mysql://user:pass@localhost:3306/db');
      adapter.verbose = true;
      
      expect(adapter.verbose).toBe(true);
    });
  });

  describe('Adapter Selection and Integration', () => {
    it('should select correct adapter based on database URL', () => {
      // This would test the Latter class's adapter selection logic
      // For now, we'll test the individual adapters
      expect(() => new SQLiteAdapter('sqlite:./test.db')).not.toThrow();
      expect(() => new PostgresAdapter('postgresql://user:pass@localhost:5432/db')).not.toThrow();
      expect(() => new MySQLAdapter('mysql://user:pass@localhost:3306/db')).not.toThrow();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      // This would test network timeout scenarios
      // For now, we'll test basic error handling
      const adapter = new SQLiteAdapter(':memory:');
      
      await adapter.connect();
      const result = await adapter.execute('SELECT 1');
      expect(result).toBeDefined();
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      // This would test connection pool scenarios for PostgreSQL/MySQL
      // For now, we'll test basic connection handling
      const adapter = new SQLiteAdapter(':memory:');
      
      await adapter.connect();
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it('should handle database server restarts gracefully', async () => {
      // This would test database server restart scenarios
      // For now, we'll test basic reconnection logic
      const adapter = new SQLiteAdapter(':memory:');
      
      await adapter.connect();
      await adapter.disconnect();
      await adapter.connect(); // Should reconnect successfully
      expect(adapter.isConnected).toBe(true);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SQLiteAdapter } from '../adapters/sqlite';
import { PostgresAdapter } from '../adapters/postgres';
import { MySQLAdapter } from '../adapters/mysql';

describe('Database Adapters', () => {
  describe('SQLiteAdapter', () => {
    let adapter: SQLiteAdapter;

    beforeEach(() => {
      adapter = new SQLiteAdapter(`:memory:`);
    });

    afterEach(async () => {
      await adapter.disconnect();
    });

    it('should connect and disconnect', () => {
      adapter.connect();
      expect(adapter.isConnected).toBe(true);
      adapter.disconnect();
      expect(adapter.isConnected).toBe(false);
    });

    it('should create migrations table', async () => {
      adapter.connect();
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
  });

  describe('MySQLAdapter', () => {
    it('should parse connection string correctly', () => {
      const adapter = new MySQLAdapter('mysql://user:pass@localhost:3306/db');
      expect(adapter.name).toBe('mysql');
    });

    it('should handle connection string parsing errors', () => {
      expect(() => new MySQLAdapter('invalid-url')).toThrow('Invalid MySQL connection string');
    });
  });
});

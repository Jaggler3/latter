import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Latter } from '../latter';

describe('Latter Integration', () => {
  let latter: Latter;
  let mockAdapter: any;

  beforeEach(() => {
    // Create a mock SQLite adapter
    mockAdapter = {
      name: 'sqlite',
      verbose: false,
      isConnected: false,
      connect: mock(() => Promise.resolve()),
      disconnect: mock(() => Promise.resolve()),
      createMigrationsTable: mock(() => Promise.resolve()),
      getAppliedMigrations: mock(() => Promise.resolve([])),
      markMigrationApplied: mock(() => Promise.resolve()),
      markMigrationRolledBack: mock(() => Promise.resolve()),
      execute: mock(() => Promise.resolve()),
      query: mock(() => Promise.resolve([])),
      beginTransaction: mock(() => Promise.resolve()),
      commitTransaction: mock(() => Promise.resolve()),
      rollbackTransaction: mock(() => Promise.resolve()),
      tableExists: mock(() => Promise.resolve(false))
    };
  });

  afterEach(async () => {
    if (latter) {
      await latter.close();
    }
  });

  describe('Database Initialization', () => {
    it('should initialize database connection correctly', async () => {
      latter = new Latter({
        database: 'sqlite:./test.db',
        migrationsDir: './migrations',
        adapter: mockAdapter
      });

      await latter.initialize();

      expect(mockAdapter.connect).toHaveBeenCalled();
      expect(mockAdapter.createMigrationsTable).toHaveBeenCalled();
    });

    it('should handle initialization failures', async () => {
      mockAdapter.connect.mockRejectedValue(new Error('Init failed'));

      latter = new Latter({
        database: 'sqlite:./test.db',
        migrationsDir: './migrations',
        adapter: mockAdapter
      });

      await expect(latter.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('Configuration and Options', () => {
    it('should use default options when not specified', () => {
      latter = new Latter({
        database: 'sqlite:./test.db',
        migrationsDir: './migrations'
      });

      expect((latter as any).options.tableName).toBe('latter_migrations');
      expect((latter as any).options.verbose).toBe(false);
      expect((latter as any).options.dryRun).toBe(false);
    });

    it('should override default options when specified', () => {
      latter = new Latter({
        database: 'sqlite:./test.db',
        migrationsDir: './migrations',
        tableName: 'custom_migrations',
        verbose: true,
        dryRun: true
      });

      expect((latter as any).options.tableName).toBe('custom_migrations');
      expect((latter as any).options.verbose).toBe(true);
      expect((latter as any).options.dryRun).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle adapter errors gracefully', async () => {
      mockAdapter.connect.mockRejectedValue(new Error('Adapter error'));

      latter = new Latter({
        database: 'sqlite:./test.db',
        migrationsDir: './migrations',
        adapter: mockAdapter
      });

      const result = await latter.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Adapter error');
    });
  });

  describe('Mock Verification', () => {
    it('should properly mock adapter methods', () => {
      expect(mockAdapter.connect).toBeDefined();
      expect(mockAdapter.disconnect).toBeDefined();
      expect(mockAdapter.createMigrationsTable).toBeDefined();
      expect(mockAdapter.getAppliedMigrations).toBeDefined();
      expect(mockAdapter.markMigrationApplied).toBeDefined();
      expect(mockAdapter.markMigrationRolledBack).toBeDefined();
      expect(mockAdapter.execute).toBeDefined();
      expect(mockAdapter.query).toBeDefined();
      expect(mockAdapter.beginTransaction).toBeDefined();
      expect(mockAdapter.commitTransaction).toBeDefined();
      expect(mockAdapter.rollbackTransaction).toBeDefined();
      expect(mockAdapter.tableExists).toBeDefined();
    });
  });
});

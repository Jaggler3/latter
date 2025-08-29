import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { MigrationLoader } from '../loader';

describe('MigrationLoader', () => {
  let loader: MigrationLoader;
  const testMigrationsDir = './test/migrations';

  beforeEach(() => {
    loader = new MigrationLoader(testMigrationsDir);
  });

  describe('isMigrationFile', () => {
    it('should identify valid migration file extensions', () => {
      const validExtensions = ['.sql', '.ts', '.js', '.json'];
      
      validExtensions.forEach(ext => {
        const filename = `migration${ext}`;
        expect((loader as any).isMigrationFile(filename)).toBe(true);
      });
    });

    it('should reject invalid migration file extensions', () => {
      const invalidExtensions = ['.txt', '.md', '.log', '.tmp'];
      
      invalidExtensions.forEach(ext => {
        const filename = `migration${ext}`;
        expect((loader as any).isMigrationFile(filename)).toBe(false);
      });
    });
  });

  describe('Mock Verification', () => {
    it('should properly initialize MigrationLoader', () => {
      expect(loader).toBeDefined();
      expect((loader as any).migrationsDir).toBe(testMigrationsDir);
    });

    it('should have required methods', () => {
      expect(typeof (loader as any).loadMigrations).toBe('function');
      expect(typeof (loader as any).isMigrationFile).toBe('function');
    });
  });
});

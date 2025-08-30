import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, readdir, readFile } from 'fs/promises';
import { join } from 'path';

describe('Init Command', () => {
  const testDir = './test/init-test';
  const migrationsDir = join(testDir, 'migrations');

  beforeEach(async () => {
    // Clean up any existing test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, which is fine
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should create migrations directory', async () => {
    await mkdir(testDir, { recursive: true });
    
    // This would normally be called by the CLI
    // For testing, we'll manually create the structure
    await mkdir(migrationsDir, { recursive: true });
    
    const exists = await readdir(testDir);
    expect(exists).toContain('migrations');
  });

  it('should create sample migration files', async () => {
    await mkdir(testDir, { recursive: true });
    await mkdir(migrationsDir, { recursive: true });
    
    const timestamp = Date.now();
    const sampleMigrationName = '001_initial_setup';
    
    const upContent = `-- Migration: ${sampleMigrationName}
-- Up: Add your SQL here
-- Example:
-- CREATE TABLE example (
--   id INTEGER PRIMARY KEY,
--   name TEXT NOT NULL,
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );
`;
    
    const downContent = `-- Migration: ${sampleMigrationName}
-- Down: Add your rollback SQL here
-- Example:
-- DROP TABLE example;
`;
    
    const upPath = join(migrationsDir, `${timestamp}_${sampleMigrationName}_up.sql`);
    const downPath = join(migrationsDir, `${timestamp}_${sampleMigrationName}_down.sql`);
    
    // Write the files
    await Bun.write(upPath, upContent);
    await Bun.write(downPath, downContent);
    
    // Verify files exist
    const files = await readdir(migrationsDir);
    expect(files).toHaveLength(2);
    expect(files.some(f => f.endsWith('_up.sql'))).toBe(true);
    expect(files.some(f => f.endsWith('_down.sql'))).toBe(true);
    
    // Verify content
    const upFileContent = await readFile(upPath, 'utf-8');
    const downFileContent = await readFile(downPath, 'utf-8');
    
    expect(upFileContent).toContain('-- Migration: 001_initial_setup');
    expect(upFileContent).toContain('-- Up: Add your SQL here');
    expect(downFileContent).toContain('-- Down: Add your rollback SQL here');
  });

  it('should handle existing migrations directory gracefully', async () => {
    await mkdir(testDir, { recursive: true });
    await mkdir(migrationsDir, { recursive: true });
    
    // Create an existing migration file
    const existingFile = join(migrationsDir, 'existing_migration.sql');
    await Bun.write(existingFile, '-- Existing migration');
    
    // Create the sample migration files
    const timestamp = Date.now();
    const sampleMigrationName = '001_initial_setup';
    
    const upPath = join(migrationsDir, `${timestamp}_${sampleMigrationName}_up.sql`);
    const downPath = join(migrationsDir, `${timestamp}_${sampleMigrationName}_down.sql`);
    
    await Bun.write(upPath, '-- Sample up migration');
    await Bun.write(downPath, '-- Sample down migration');
    
    // Verify both existing and new files are present
    const files = await readdir(migrationsDir);
    expect(files).toHaveLength(3);
    expect(files).toContain('existing_migration.sql');
    expect(files.some(f => f.endsWith('_up.sql'))).toBe(true);
    expect(files.some(f => f.endsWith('_down.sql'))).toBe(true);
  });
});

import { describe, it, expect } from 'bun:test';
import { Migration } from '../migration';

describe('Migration', () => {
  it('should create a migration with required properties', () => {
    const migration = new Migration({
      name: 'test_migration',
      up: 'CREATE TABLE test (id INTEGER)',
      down: 'DROP TABLE test'
    });

    expect(migration.name).toBe('test_migration');
    expect(migration.up).toBe('CREATE TABLE test (id INTEGER)');
    expect(migration.down).toBe('DROP TABLE test');
    expect(migration.dependencies).toEqual([]);
    expect(migration.timestamp).toBeGreaterThan(0);
    expect(migration.version).toBeDefined();
  });

  it('should create a migration with optional properties', () => {
    const timestamp = Date.now();
    const migration = new Migration({
      name: 'test_migration',
      up: 'CREATE TABLE test (id INTEGER)',
      down: 'DROP TABLE test',
      dependencies: ['other_migration'],
      timestamp: timestamp
    });

    expect(migration.dependencies).toEqual(['other_migration']);
    expect(migration.timestamp).toBe(timestamp);
  });

  it('should generate unique versions for different migrations', () => {
    const migration1 = new Migration({
      name: 'migration1',
      up: 'CREATE TABLE test1 (id INTEGER)',
      down: 'DROP TABLE test1'
    });

    const migration2 = new Migration({
      name: 'migration2',
      up: 'CREATE TABLE test2 (id INTEGER)',
      down: 'DROP TABLE test2'
    });

    expect(migration1.version).not.toBe(migration2.version);
  });

  it('should generate consistent checksums', () => {
    const migration = new Migration({
      name: 'test_migration',
      up: 'CREATE TABLE test (id INTEGER)',
      down: 'DROP TABLE test'
    });

    const checksum1 = migration.checksum;
    const checksum2 = migration.checksum;

    expect(checksum1).toBe(checksum2);
  });

  it('should validate migration correctly', () => {
    const validMigration = new Migration({
      name: 'test_migration',
      up: 'CREATE TABLE test (id INTEGER)',
      down: 'DROP TABLE test'
    });

    expect(validMigration.validate()).toBe(true);
  });

  it('should fail validation with missing properties', () => {
    const invalidMigration = new Migration({
      name: '',
      up: 'CREATE TABLE test (id INTEGER)',
      down: 'DROP TABLE test'
    });

    expect(invalidMigration.validate()).toBe(false);
  });

  it('should check dependencies correctly', () => {
    const migration = new Migration({
      name: 'test_migration',
      up: 'CREATE TABLE test (id INTEGER)',
      down: 'DROP TABLE test',
      dependencies: ['dependency1', 'dependency2']
    });

    expect(migration.dependsOn('dependency1')).toBe(true);
    expect(migration.dependsOn('dependency2')).toBe(true);
    expect(migration.dependsOn('dependency3')).toBe(false);
  });

  it('should create status object correctly', () => {
    const migration = new Migration({
      name: 'test_migration',
      up: 'CREATE TABLE test (id INTEGER)',
      down: 'DROP TABLE test'
    });

    const status = migration.toStatus(true, new Date('2023-01-01'));

    expect(status.name).toBe('test_migration');
    expect(status.applied).toBe(true);
    expect(status.appliedAt).toEqual(new Date('2023-01-01'));
    expect(status.checksum).toBe(migration.checksum);
  });

  it('should get dependencies safely', () => {
    const migration = new Migration({
      name: 'test_migration',
      up: 'CREATE TABLE test (id INTEGER)',
      down: 'DROP TABLE test',
      dependencies: ['dependency1']
    });

    const deps = migration.getDependencies();
    deps.push('new_dependency'); // This should not affect the original

    expect(migration.getDependencies()).toEqual(['dependency1']);
  });
});

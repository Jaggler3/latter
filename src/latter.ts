import { LatterOptions, MigrationResult, RollbackResult, MigrationStatus, DatabaseAdapter } from './types';
import { Migration } from './migration';
import { MigrationRunner } from './runner';
import { MigrationLoader } from './loader';
import { SQLiteAdapter } from './adapters/sqlite';
import { PostgresAdapter } from './adapters/postgres';
import { MySQLAdapter } from './adapters/mysql';

export class Latter {
  private options: LatterOptions;
  public adapter: DatabaseAdapter;
  public runner: MigrationRunner;
  public loader: MigrationLoader;
  public migrationsTable: string;

  constructor(options: LatterOptions) {
    this.options = {
      tableName: 'latter_migrations',
      dryRun: false,
      verbose: false,
      ...options
    };
    
    this.migrationsTable = this.options.tableName!;
    this.adapter = this.options.adapter || this.createDefaultAdapter();
    this.runner = new MigrationRunner(this.adapter, this.migrationsTable);
    this.loader = new MigrationLoader(this.options.migrationsDir);
  }

  /**
   * Create a default adapter based on the database URL if none is provided
   */
  private createDefaultAdapter(): DatabaseAdapter {
    const dbUrl = this.options.database;
    
    if (dbUrl.startsWith('sqlite:')) {
      return new SQLiteAdapter(dbUrl);
    } else if (dbUrl.startsWith('postgresql:') || dbUrl.startsWith('postgres:')) {
      return new PostgresAdapter(dbUrl);
    } else if (dbUrl.startsWith('mysql:')) {
      return new MySQLAdapter(dbUrl);
    }
    
    throw new Error(`No adapter available for database: ${dbUrl}. Please provide a custom adapter or use a supported database URL format.`);
  }

  /**
   * Initialize the migration system
   */
  async initialize(): Promise<void> {
    await this.adapter.connect();
    await this.adapter.createMigrationsTable(this.migrationsTable);
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<MigrationResult> {
    try {
      await this.initialize();
      
      const migrations = await this.loader.loadMigrations();
      const appliedMigrations = await this.adapter.getAppliedMigrations(this.migrationsTable);
      
      // Handle out-of-sync migrations before proceeding
      await this.handleOutOfSyncMigrations(migrations, appliedMigrations);
      
      const pendingMigrations = this.getPendingMigrations(migrations, appliedMigrations);
      
      if (pendingMigrations.length === 0) {
        if (this.options.verbose) {
          console.log('No pending migrations to run');
        }
        return { success: true, migrationsApplied: [] };
      }

      const result = await this.runner.runMigrations(pendingMigrations, this.options.dryRun);
      
      if (this.options.verbose) {
        console.log(`Applied ${result.migrationsApplied.length} migrations`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        migrationsApplied: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Rollback the last N migrations
   */
  async rollback(steps: number = 1): Promise<RollbackResult> {
    try {
      await this.initialize();
      
      const appliedMigrations = await this.adapter.getAppliedMigrations(this.migrationsTable);
      const migrationsToRollback = appliedMigrations
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, steps);

      if (migrationsToRollback.length === 0) {
        if (this.options.verbose) {
          console.log('No migrations to rollback');
        }
        return { success: true, migrationsRolledBack: [] };
      }

      // Load the full Migration objects for rollback (we need the up/down SQL)
      const allMigrations = await this.loader.loadMigrations();
      const fullMigrationsToRollback = migrationsToRollback.map(appliedMigration => {
        const fullMigration = allMigrations.find(m => m.name === appliedMigration.name);
        if (!fullMigration) {
          throw new Error(`Migration file not found for: ${appliedMigration.name}`);
        }
        return fullMigration;
      });

      const result = await this.runner.rollbackMigrations(fullMigrationsToRollback, this.options.dryRun);
      
      if (this.options.verbose) {
        console.log(`Rolled back ${result.migrationsRolledBack.length} migrations`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        migrationsRolledBack: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the status of all migrations
   */
  async status(): Promise<MigrationStatus[]> {
    try {
      await this.initialize();
      
      const migrations = await this.loader.loadMigrations();
      const appliedMigrations = await this.adapter.getAppliedMigrations(this.migrationsTable);
      
      // Check for out-of-sync migrations but don't fail
      try {
        await this.handleOutOfSyncMigrations(migrations, appliedMigrations);
      } catch (error) {
        if (this.options.verbose) {
          console.log(`⚠️  Out-of-sync migrations detected: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      return migrations.map(migration => {
        const applied = appliedMigrations.find(am => am.name === migration.name);
        return migration.toStatus(!!applied, applied?.appliedAt);
      });
    } catch (error) {
      if (this.options.verbose) {
        console.error('Error getting migration status:', error);
      }
      throw error; // Re-throw the error instead of returning empty array
    }
  }

  /**
   * Get pending migrations that haven't been applied yet
   */
  private getPendingMigrations(migrations: Migration[], appliedMigrations: MigrationStatus[]): Migration[] {
    const appliedNames = new Set(appliedMigrations.map(am => am.name));
    
    return migrations
      .filter(migration => !appliedNames.has(migration.name))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Check for out-of-sync migrations and handle them based on options
   */
  public async handleOutOfSyncMigrations(migrations: Migration[], appliedMigrations: MigrationStatus[]): Promise<void> {
    const appliedNames = new Set(appliedMigrations.map(am => am.name));
    const fileNames = new Set(migrations.map(m => m.name));
    
    // Find migrations that exist in database but not in files
    const orphanedMigrations = appliedMigrations.filter(am => !fileNames.has(am.name));
    
    if (orphanedMigrations.length > 0) {
      if (this.options.verbose) {
        console.log(`⚠️  Found ${orphanedMigrations.length} migration(s) in database but not in files:`);
        orphanedMigrations.forEach(m => console.log(`    - ${m.name}`));
      }
      
      if (this.options.forceSync) {
        // Remove orphaned migrations from database
        if (this.options.verbose) {
          console.log('🗑️  Removing orphaned migrations from database...');
        }
        for (const orphaned of orphanedMigrations) {
          await this.adapter.markMigrationRolledBack(orphaned, this.migrationsTable);
        }
        if (this.options.verbose) {
          console.log('✅ Orphaned migrations removed from database');
        }
      } else if (this.options.skipOutOfSync) {
        if (this.options.verbose) {
          console.log('⏭️  Skipping orphaned migrations (skip-out-of-sync enabled)');
        }
      } else {
        throw new Error(
          `Found ${orphanedMigrations.length} migration(s) in database but not in files. ` +
          `Use --force-sync to remove them or --skip-out-of-sync to ignore them. ` +
          `Orphaned migrations: ${orphanedMigrations.map(m => m.name).join(', ')}`
        );
      }
    }
  }

  /**
   * Mark a migration as applied without running it (useful for manual migrations)
   */
  async markAsApplied(migrationName: string): Promise<void> {
    try {
      await this.initialize();
      
      const migrations = await this.loader.loadMigrations();
      const migration = migrations.find(m => m.name === migrationName);
      
      if (!migration) {
        throw new Error(`Migration not found: ${migrationName}`);
      }
      
      const status = migration.toStatus(true, new Date());
      await this.adapter.markMigrationApplied(status, this.migrationsTable);
      
      if (this.options.verbose) {
        console.log(`✅ Marked migration as applied: ${migrationName}`);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.adapter.disconnect();
  }
}

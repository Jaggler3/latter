import { DatabaseAdapter, MigrationResult, RollbackResult } from './types';
import { Migration } from './migration';

export class MigrationRunner {
  constructor(
    private adapter: DatabaseAdapter,
    private migrationsTable: string
  ) {}

  /**
   * Run a list of migrations
   */
  async runMigrations(migrations: Migration[], dryRun: boolean = false): Promise<MigrationResult> {
    const migrationsApplied: string[] = [];
    
    try {
      if (!dryRun) {
        await this.adapter.beginTransaction();
      }

      for (const migration of migrations) {
        if (!migration.validate()) {
          throw new Error(`Invalid migration: ${migration.name}`);
        }

        if (dryRun) {
          if ('verbose' in this.adapter && this.adapter.verbose) {
            console.log(`[DRY RUN] Would run migration: ${migration.name}`);
          }
          migrationsApplied.push(migration.name);
          continue;
        }

        // Execute the migration
        await this.adapter.execute(migration.up);

        // Mark it as applied
        const status = migration.toStatus(true, new Date());
        await this.adapter.markMigrationApplied(status, this.migrationsTable);
        
        migrationsApplied.push(migration.name);
        
        if ('verbose' in this.adapter && this.adapter.verbose) {
          console.log(`Applied migration: ${migration.name}`);
        }
      }

      if (!dryRun) {
        await this.adapter.commitTransaction();
      }

      return {
        success: true,
        migrationsApplied
      };
    } catch (error) {
      if (!dryRun) {
        try {
          await this.adapter.rollbackTransaction();
        } catch (rollbackError) {
          console.error('Error rolling back transaction:', rollbackError);
        }
      }

      return {
        success: false,
        migrationsApplied,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Rollback a list of migrations
   */
  async rollbackMigrations(migrations: Migration[], dryRun: boolean = false): Promise<RollbackResult> {
    const migrationsRolledBack: string[] = [];
    
    try {
      if (!dryRun) {
        await this.adapter.beginTransaction();
      }

      // Rollback in reverse order (most recent first)
      for (const migration of migrations) {
        if (dryRun) {
          if ('verbose' in this.adapter && this.adapter.verbose) {
            console.log(`[DRY RUN] Would rollback migration: ${migration.name}`);
          }
          migrationsRolledBack.push(migration.name);
          continue;
        }

        // Execute the rollback
        await this.adapter.execute(migration.down);
        
        // Mark it as rolled back
        const status = migration.toStatus(false);
        await this.adapter.markMigrationRolledBack(status, this.migrationsTable);
        
        migrationsRolledBack.push(migration.name);
        
        if ('verbose' in this.adapter && this.adapter.verbose) {
          console.log(`Rolled back migration: ${migration.name}`);
        }
      }

      if (!dryRun) {
        await this.adapter.commitTransaction();
      }

      return {
        success: true,
        migrationsRolledBack
      };
    } catch (error) {
      if (!dryRun) {
        try {
          await this.adapter.rollbackTransaction();
        } catch (rollbackError) {
          console.error('Error rolling back transaction:', rollbackError);
        }
      }

      return {
        success: false,
        migrationsRolledBack,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

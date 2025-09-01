#!/usr/bin/env bun

import { Latter } from './latter';
import { parseArgs } from 'node:util';

interface CLIOptions {
  database: string;
  migrationsDir: string;
  tableName?: string;
  verbose?: boolean;
  dryRun?: boolean;
  forceSync?: boolean;
  skipOutOfSync?: boolean;
}

interface CLICommand {
  name: string;
  description: string;
  action: (options: CLIOptions, args: string[]) => Promise<void>;
}

const commands: CLICommand[] = [
  {
    name: 'init',
    description: 'Initialize migrations folder and database table',
    action: async (options: CLIOptions) => {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      try {
        // Create migrations directory if it doesn't exist
        const migrationsDir = path.resolve(options.migrationsDir);

        // check if the migrations directory exists
        if (await fs.stat(migrationsDir).then(stat => stat.isDirectory())) {
          console.log(`✅ Migrations directory already exists: ${migrationsDir}`);
        } else {
          await fs.mkdir(migrationsDir, { recursive: true });
          console.log(`✅ Created migrations directory: ${migrationsDir}`);
          // Create a sample migration file
          const timestamp = Date.now();
          const sampleMigrationName = '001_initial_setup';
          
          const upContent = `-- Migration: ${sampleMigrationName}
-- Up: Add your SQL here
-- Example:
-- CREATE TABLE example (
--   id INTEGER PRIMARY KEY,
--   name TEXT NOT NULL,
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );`;
          
          const downContent = `-- Migration: ${sampleMigrationName}
-- Down: Add your rollback SQL here
-- Example:
-- DROP TABLE example;`;
          
          const upPath = path.join(migrationsDir, `${timestamp}_${sampleMigrationName}_up.sql`);
          const downPath = path.join(migrationsDir, `${timestamp}_${sampleMigrationName}_down.sql`);
          
          await fs.writeFile(upPath, upContent);
          await fs.writeFile(downPath, downContent);
          
          console.log(`✅ Created sample migration files:`);
          console.log(`  - ${upPath}`);
          console.log(`  - ${downPath}`);
      }
        
        // Initialize the database and create migrations table
        if (options.database) {
          console.log('\nInitializing database...');
          const latter = new Latter(options);
          
          try {
            await latter.initialize();
            console.log('✅ Database initialized successfully');
            console.log(`✅ Created migrations table: ${options.tableName || 'latter_migrations'}`);
          } finally {
            await latter.close();
          }
        } else {
          console.log('\n⚠️  No database specified. Run with --database to initialize the database.');
        }
        
        console.log('\n🎉 Migration system initialized successfully!');
        console.log('\nNext steps:');
        console.log('1. Edit the sample migration files with your SQL');
        console.log('2. Run migrations: latter migrate --database <url> --migrations-dir <path>');
        console.log('3. Check status: latter status --database <url> --migrations-dir <path>');
        
      } catch (error) {
        console.error(`❌ Initialization failed: ${error}`);
        process.exit(1);
      }
    }
  },
  {
    name: 'migrate',
    description: 'Run pending migrations',
    action: async (options: CLIOptions) => {
      const latter = new Latter(options);
      
      try {
        console.log('Running migrations...');
        const result = await latter.migrate();
        
        if (result.success) {
          if (result.migrationsApplied.length === 0) {
            console.log('✅ No pending migrations to run');
          } else {
            console.log(`✅ Successfully applied ${result.migrationsApplied.length} migrations:`);
            result.migrationsApplied.forEach(name => console.log(`  - ${name}`));
          }
        } else {
          console.error(`❌ Migration failed: ${result.error}`);
          process.exit(1);
        }
      } finally {
        await latter.close();
      }
    }
  },
  {
    name: 'rollback',
    description: 'Rollback the last N migrations',
    action: async (options: CLIOptions, args: string[]) => {
      const steps = parseInt(args[0] || '1');
      const latter = new Latter(options);
      
      try {
        console.log(`Rolling back ${steps} migration(s)...`);
        const result = await latter.rollback(steps);
        
        if (result.success) {
          if (result.migrationsRolledBack.length === 0) {
            console.log('✅ No migrations to rollback');
          } else {
            console.log(`✅ Successfully rolled back ${result.migrationsRolledBack.length} migrations:`);
            result.migrationsRolledBack.forEach(name => console.log(`  - ${name}`));
          }
        } else {
          console.error(`❌ Rollback failed: ${result.error}`);
          process.exit(1);
        }
      } finally {
        await latter.close();
      }
    }
  },
  {
    name: 'status',
    description: 'Show migration status',
    action: async (options: CLIOptions) => {
      const latter = new Latter(options);
      
      try {
        const status = await latter.status();
        
        if (status.length === 0) {
          console.log('No migrations found');
          return;
        }
        
        console.log('Migration Status:');
        console.log('─'.repeat(100));
        console.log(`${'Name'.padEnd(50)} ${'Version'.padEnd(10)} ${'Applied'.padEnd(8)} ${'Applied At'.padEnd(20)}`);
        console.log('─'.repeat(100));
        
        status.forEach(migration => {
          const applied = migration.applied ? '✅' : '⏳';
          const appliedAt = migration.appliedAt ? migration.appliedAt.toISOString().split('T')[0] : '-';
          console.log(
            `${migration.name.padEnd(50)} ${migration.version.padEnd(10)} ${applied.padEnd(8)} ${appliedAt.padEnd(20)}`
          );
        });
      } finally {
        await latter.close();
      }
    }
  },
  {
    name: 'create',
    description: 'Create a new migration file',
    action: async (options: CLIOptions, args: string[]) => {
      const name = args[0];
      if (!name) {
        console.error('❌ Migration name is required');
        console.log('Usage: latter create <migration_name>');
        process.exit(1);
      }
      
      const timestamp = Date.now();
      const fs = await import('fs/promises');
      const path = await import('path');
      
      try {
        const migrationsDir = options.migrationsDir;
        
        // Create up migration
        const upContent = `-- Migration: ${name}\n-- Up: Add your SQL here\n`;
        const upPath = path.join(migrationsDir, `${timestamp}_${name}_up.sql`);
        await fs.writeFile(upPath, upContent);
        
        // Create down migration
        const downContent = `-- Migration: ${name}\n-- Down: Add your rollback SQL here\n`;
        const downPath = path.join(migrationsDir, `${timestamp}_${name}_down.sql`);
        await fs.writeFile(downPath, downContent);
        
        console.log(`✅ Created migration files:`);
        console.log(`  - ${upPath}`);
        console.log(`  - ${downPath}`);
      } catch (error) {
        console.error(`❌ Failed to create migration: ${error}`);
        process.exit(1);
      }
    }
  },
  {
    name: 'sync',
    description: 'Synchronize migrations table with migration files',
    action: async (options: CLIOptions) => {
      const latter = new Latter(options);
      
      try {
        console.log('Synchronizing migrations table...');
        
        // Force sync to clean up orphaned migrations
        const syncOptions = { ...options, forceSync: true };
        const syncLatter = new Latter(syncOptions);
        
        await syncLatter.initialize();
        const migrations = await syncLatter.loader.loadMigrations();
        const appliedMigrations = await syncLatter.adapter.getAppliedMigrations(syncLatter.migrationsTable);
        
        // This will handle the sync
        await syncLatter.handleOutOfSyncMigrations(migrations, appliedMigrations);
        
        console.log('✅ Migrations table synchronized successfully');
        
        // Show current status
        const status = await latter.status();
        if (status.length > 0) {
          console.log('\nCurrent migration status:');
          console.log('─'.repeat(100));
          console.log(`${'Name'.padEnd(50)} ${'Version'.padEnd(10)} ${'Applied'.padEnd(8)} ${'Applied At'.padEnd(20)}`);
          console.log('─'.repeat(100));
          
          status.forEach(migration => {
            const applied = migration.applied ? '✅' : '⏳';
            const appliedAt = migration.appliedAt ? migration.appliedAt.toISOString().split('T')[0] : '-';
            console.log(
              `${migration.name.padEnd(50)} ${migration.version.padEnd(10)} ${applied.padEnd(8)} ${appliedAt.padEnd(20)}`
            );
          });
        }
      } finally {
        await latter.close();
      }
    }
  },
  {
    name: 'mark-applied',
    description: 'Mark a migration as applied without running it',
    action: async (options: CLIOptions, args: string[]) => {
      const migrationName = args[0];
      if (!migrationName) {
        console.error('❌ Migration name is required');
        console.log('Usage: latter mark-applied <migration_name>');
        process.exit(1);
      }

      const latter = new Latter(options);
      
      try {
        console.log(`Marking migration as applied: ${migrationName}`);
        await latter.markAsApplied(migrationName);
        console.log('✅ Migration marked as applied successfully');
      } catch (error) {
        console.error(`❌ Failed to mark migration as applied: ${error}`);
        process.exit(1);
      } finally {
        await latter.close();
      }
    }
  }
];

function showHelp() {
  console.log('Latter - Database Migration Library for Bun\n');
  console.log('Usage: latter <command> [options]\n');
  console.log('Commands:');
  
  commands.forEach(cmd => {
    console.log(`  ${cmd.name.padEnd(15)} ${cmd.description}`);
  });
  
  console.log('\nOptions:');
  console.log('  --database <url>     Database connection string (can also use LATTER_DATABASE_URL env var)');
  console.log('  --migrations-dir <path>  Path to migrations directory (default: ./migrations)');
  console.log('  --table-name <name>  Custom migrations table name (default: latter_migrations)');
  console.log('  --verbose            Enable verbose output');
  console.log('  --dry-run            Show what would be done without executing');
  console.log('  --force-sync         Force sync migrations table (remove orphaned entries)');
  console.log('  --skip-out-of-sync  Skip out-of-sync migration checks');
  console.log('  --help               Show this help message\n');
  
  console.log('Examples:');
  console.log('  # Initialize a new migration project');
  console.log('  latter init');
  console.log('  latter init --database sqlite:./app.db');
  console.log('  latter init --migrations-dir ./custom-migrations');
  console.log('  # Or set environment variable: export LATTER_DATABASE_URL="sqlite:./app.db"');
  console.log('');
  console.log('  # Run migrations');
  console.log('  latter migrate --database sqlite:./app.db');
  console.log('  latter status --database sqlite:./app.db');
  console.log('  latter rollback 2 --database sqlite:./app.db');
  console.log('  latter create add_users_table');
  console.log('');
  console.log('  # Using environment variable');
  console.log('  export LATTER_DATABASE_URL="sqlite:./app.db"');
  console.log('  latter migrate');
  console.log('');
  console.log('  # Handle out-of-sync migrations');
  console.log('  latter sync --database sqlite:./app.db');
  console.log('  latter migrate --force-sync --database sqlite:./app.db');
  console.log('  latter migrate --skip-out-of-sync --database sqlite:./app.db');
  console.log('  latter mark-applied 001_initial_setup --database sqlite:./app.db');
}

async function main() {
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      database: { type: 'string' },
      'migrations-dir': { type: 'string' },
      'table-name': { type: 'string' },
      verbose: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      'force-sync': { type: 'boolean' },
      'skip-out-of-sync': { type: 'boolean' },
      help: { type: 'boolean' }
    },
    allowPositionals: true
  });

  if (args.values.help) {
    showHelp();
    return;
  }

  const command = (args.positionals as string[])[0];
  if (!command) {
    console.error('❌ Command is required');
    showHelp();
    process.exit(1);
  }

  // Only require database for commands that need them
  const requiresDatabase = ['migrate', 'rollback', 'status', 'sync', 'mark-applied'].includes(command);
  
  // Check for database URL from args or environment variable
  const databaseUrl = args.values.database || process.env.LATTER_DATABASE_URL;
  if (requiresDatabase && !databaseUrl) {
    console.error('❌ --database is required or set LATTER_DATABASE_URL environment variable');
    showHelp();
    process.exit(1);
  }

  const options: CLIOptions = {
    database: databaseUrl || '',
    migrationsDir: args.values['migrations-dir'] || './migrations',
    tableName: args.values['table-name'] || 'latter_migrations',
    verbose: args.values.verbose,
    dryRun: args.values['dry-run'],
    forceSync: args.values['force-sync'],
    skipOutOfSync: args.values['skip-out-of-sync']
  };

  const cmd = commands.find(c => c.name === command);
  if (!cmd) {
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }

  try {
    await cmd.action(options, args.positionals.slice(1));
  } catch (error) {
    console.error(`❌ Command failed: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

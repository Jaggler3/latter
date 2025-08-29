#!/usr/bin/env bun

import { Latter } from './latter';
import { parseArgs } from 'node:util';

interface CLIOptions {
  database: string;
  migrationsDir: string;
  tableName?: string;
  verbose?: boolean;
  dryRun?: boolean;
}

interface CLICommand {
  name: string;
  description: string;
  action: (options: CLIOptions, args: string[]) => Promise<void>;
}

const commands: CLICommand[] = [
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
        console.log('─'.repeat(80));
        console.log(`${'Name'.padEnd(30)} ${'Version'.padEnd(10)} ${'Applied'.padEnd(8)} ${'Applied At'.padEnd(20)}`);
        console.log('─'.repeat(80));
        
        status.forEach(migration => {
          const applied = migration.applied ? '✅' : '⏳';
          const appliedAt = migration.appliedAt ? migration.appliedAt.toISOString().split('T')[0] : '-';
          console.log(
            `${migration.name.padEnd(30)} ${migration.version.padEnd(10)} ${applied.padEnd(8)} ${appliedAt.padEnd(20)}`
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
  console.log('  --database <url>     Database connection string (required)');
  console.log('  --migrations-dir <path>  Path to migrations directory (required)');
  console.log('  --table-name <name>  Custom migrations table name (default: latter_migrations)');
  console.log('  --verbose            Enable verbose output');
  console.log('  --dry-run            Show what would be done without executing');
  console.log('  --help               Show this help message\n');
  
  console.log('Examples:');
  console.log('  latter migrate --database sqlite:./app.db --migrations-dir ./migrations');
  console.log('  latter status --database sqlite:./app.db --migrations-dir ./migrations');
  console.log('  latter rollback 2 --database sqlite:./app.db --migrations-dir ./migrations');
  console.log('  latter create add_users_table --migrations-dir ./migrations');
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
      help: { type: 'boolean' }
    }
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

  if (!args.values.database || !args.values['migrations-dir']) {
    console.error('❌ --database and --migrations-dir are required');
    showHelp();
    process.exit(1);
  }

  const options: CLIOptions = {
    database: args.values.database,
    migrationsDir: args.values['migrations-dir'],
    tableName: args.values['table-name'],
    verbose: args.values.verbose,
    dryRun: args.values['dry-run']
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

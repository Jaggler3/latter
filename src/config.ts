import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * The shape of a latter configuration file.
 * Supported formats:
 *   - latter.config.ts  (default export of this interface)
 *   - latter.config.js  (default export of this interface)
 *   - latter.json       (JSON object matching this interface)
 */
export interface LatterConfig {
  /** Database connection string (e.g. "sqlite:./app.db", "postgres://...") */
  database?: string;
  /** Path to migrations directory (default: "./migrations") */
  migrationsDir?: string;
  /** Custom migrations table name (default: "latter_migrations") */
  tableName?: string;
  /** Enable verbose output */
  verbose?: boolean;
  /** Show what would be done without executing */
  dryRun?: boolean;
  /** Force sync migrations table (remove orphaned entries) */
  forceSync?: boolean;
  /** Skip out-of-sync migration checks */
  skipOutOfSync?: boolean;
}

/** Names to probe in each directory while walking up */
const CONFIG_FILES = [
  'latter.config.ts',
  'latter.config.js',
  'latter.json',
] as const;

/**
 * Walk up the directory tree starting from `startDir`, looking for a
 * config file. Returns the resolved config object, or `null` if none
 * is found.
 */
export async function findConfig(startDir: string = process.cwd()): Promise<{ config: LatterConfig; filePath: string } | null> {
  let dir = path.resolve(startDir);

  while (true) {
    for (const filename of CONFIG_FILES) {
      const candidate = path.join(dir, filename);

      try {
        await fs.access(candidate);
      } catch {
        // File does not exist in this directory — keep looking
        continue;
      }

      try {
        if (filename.endsWith('.json')) {
          const raw = await fs.readFile(candidate, 'utf-8');
          const parsed = JSON.parse(raw) as LatterConfig;
          return { config: parsed, filePath: candidate };
        } else {
          // .ts / .js — use dynamic import (Bun handles TS natively)
          const imported = await import(candidate);
          const config: LatterConfig = imported.default ?? imported;
          return { config, filePath: candidate };
        }
      } catch (err) {
        throw new Error(`Failed to load config from ${candidate}: ${err}`);
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      // Reached filesystem root with no config found
      return null;
    }
    dir = parent;
  }
}

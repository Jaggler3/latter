export interface MigrationOptions {
  name: string;
  up: string;
  down: string;
  dependencies?: string[];
  version?: string;
  timestamp?: number;
}

export interface MigrationStatus {
  name: string;
  version: string;
  timestamp: number;
  applied: boolean;
  appliedAt?: Date;
  checksum: string;
}

export interface MigrationResult {
  success: boolean;
  migrationsApplied: string[];
  error?: string;
}

export interface RollbackResult {
  success: boolean;
  migrationsRolledBack: string[];
  error?: string;
}

export interface LatterOptions {
  database: string;
  migrationsDir: string;
  tableName?: string;
  adapter?: DatabaseAdapter;
  dryRun?: boolean;
  verbose?: boolean;
  forceSync?: boolean;
  skipOutOfSync?: boolean;
}

export interface DatabaseAdapter {
  name: string;
  isConnected: boolean;
  // Constructor should accept (databaseUrl: string, options?: LatterOptions)
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<any>;
  query(sql: string, params?: any[]): Promise<any[]>;
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  tableExists(tableName: string): Promise<boolean>;
  createMigrationsTable(tableName: string): Promise<void>;
  getAppliedMigrations(tableName: string): Promise<MigrationStatus[]>;
  markMigrationApplied(migration: MigrationStatus, tableName: string): Promise<void>;
  markMigrationRolledBack(migration: MigrationStatus, tableName: string): Promise<void>;
}

export interface MigrationFile {
  path: string;
  name: string;
  content: string;
  timestamp: number;
}

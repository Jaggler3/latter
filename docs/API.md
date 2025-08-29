# Latter API Reference

## Core Classes

### Latter

The main class for managing database migrations.

#### Constructor

```typescript
new Latter(options: LatterOptions)
```

#### Options

- `database`: Database connection string (required)
- `migrationsDir`: Path to migrations directory (required)
- `tableName`: Custom migrations table name (default: `latter_migrations`)
- `adapter`: Custom database adapter (optional)
- `dryRun`: Enable dry-run mode (default: `false`)
- `verbose`: Enable verbose output (default: `false`)

#### Methods

##### `migrate(): Promise<MigrationResult>`

Runs all pending migrations.

Returns:
- `success`: Boolean indicating if migrations succeeded
- `migrationsApplied`: Array of migration names that were applied
- `error`: Error message if migration failed

##### `rollback(steps: number = 1): Promise<RollbackResult>`

Rolls back the last N migrations.

Returns:
- `success`: Boolean indicating if rollback succeeded
- `migrationsRolledBack`: Array of migration names that were rolled back
- `error`: Error message if rollback failed

##### `status(): Promise<MigrationStatus[]>`

Returns the status of all migrations.

Returns an array of `MigrationStatus` objects.

##### `close(): Promise<void>`

Closes the database connection.

### Migration

Represents a single database migration.

#### Constructor

```typescript
new Migration(options: MigrationOptions)
```

#### Options

- `name`: Migration name (required)
- `up`: SQL for applying the migration (required)
- `down`: SQL for rolling back the migration (required)
- `dependencies`: Array of migration names this depends on (optional)
- `version`: Custom version string (optional)
- `timestamp`: Custom timestamp (optional)

#### Properties

- `name`: Migration name
- `up`: Up migration SQL
- `down`: Down migration SQL
- `dependencies`: Array of dependencies
- `version`: Unique version hash
- `timestamp`: Migration timestamp
- `checksum`: MD5 checksum of migration content

#### Methods

##### `validate(): boolean`

Validates that the migration has all required properties.

##### `dependsOn(migrationName: string): boolean`

Checks if this migration depends on another migration.

##### `getDependencies(): string[]`

Returns a copy of the dependencies array.

##### `toStatus(applied: boolean, appliedAt?: Date): MigrationStatus`

Creates a `MigrationStatus` object for this migration.

## Database Adapters

### SQLiteAdapter

SQLite database adapter (fully implemented).

```typescript
import { SQLiteAdapter } from 'latter';

const adapter = new SQLiteAdapter('sqlite:./app.db');
```

### PostgresAdapter

PostgreSQL database adapter (fully implemented).

```typescript
import { PostgresAdapter } from 'latter';

const adapter = new PostgresAdapter('postgresql://user:pass@localhost/db');
```

**Features:**
- Connection pooling for better performance
- Automatic transaction management
- PostgreSQL-specific data types support
- Connection string parsing

### MySQLAdapter

MySQL database adapter (fully implemented).

```typescript
import { MySQLAdapter } from 'latter';

const adapter = new MySQLAdapter('mysql://user:pass@localhost/db');
```

**Features:**
- Native MySQL connection handling
- Session configuration for compatibility
- UTF8MB4 charset support
- Connection string parsing

## Types

### MigrationStatus

```typescript
interface MigrationStatus {
  name: string;
  version: string;
  timestamp: number;
  applied: boolean;
  appliedAt?: Date;
  checksum: string;
}
```

### MigrationResult

```typescript
interface MigrationResult {
  success: boolean;
  migrationsApplied: string[];
  error?: string;
}
```

### RollbackResult

```typescript
interface RollbackResult {
  success: boolean;
  migrationsRolledBack: string[];
  error?: string;
}
```

### DatabaseAdapter

```typescript
interface DatabaseAdapter {
  name: string;
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
```

## Migration File Formats

### SQL Files

Create pairs of files with `_up.sql` and `_down.sql` suffixes:

```
001_create_users_table_up.sql
001_create_users_table_down.sql
```

### JSON Files

Single file with migration definition:

```json
{
  "name": "create_users_table",
  "up": "CREATE TABLE users (id INTEGER PRIMARY KEY)",
  "down": "DROP TABLE users"
}
```

### TypeScript/JavaScript Files

Export a migration object:

```typescript
export default {
  name: 'create_users_table',
  up: 'CREATE TABLE users (id INTEGER PRIMARY KEY)',
  down: 'DROP TABLE users'
};
```

## CLI Usage

### Commands

#### `migrate`

Run pending migrations:

```bash
latter migrate --database sqlite:./app.db --migrations-dir ./migrations
```

#### `rollback`

Rollback migrations:

```bash
latter rollback 2 --database sqlite:./app.db --migrations-dir ./migrations
```

#### `status`

Show migration status:

```bash
latter status --database sqlite:./app.db --migrations-dir ./migrations
```

#### `create`

Create new migration files:

```bash
latter create add_users_table --migrations-dir ./migrations
```

### Options

- `--database`: Database connection string (required)
- `--migrations-dir`: Path to migrations directory (required)
- `--table-name`: Custom migrations table name
- `--verbose`: Enable verbose output
- `--dry-run`: Show what would be done without executing
- `--help`: Show help message

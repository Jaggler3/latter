# Database Support in Latter

Latter now supports multiple database engines with automatic adapter detection and consistent APIs.

## Supported Databases

### 1. SQLite (Fully Implemented)
- **Connection String**: `sqlite:./path/to/database.db`
- **Features**: 
  - Built-in support via Bun's native SQLite
  - File-based database
  - No external dependencies
  - Perfect for development and small applications

### 2. PostgreSQL (Fully Implemented)
- **Connection String**: `postgresql://username:password@host:port/database`
- **Features**:
  - Connection pooling for better performance
  - Automatic transaction management
  - PostgreSQL-specific data types support
  - Production-ready with proper error handling

### 3. MySQL (Fully Implemented)
- **Connection String**: `mysql://username:password@host:port/database`
- **Features**:
  - Native MySQL connection handling
  - Session configuration for compatibility
  - UTF8MB4 charset support
  - Optimized for MySQL best practices

## Automatic Adapter Detection

Latter automatically detects the appropriate database adapter based on the connection string:

```typescript
import { Latter } from 'latter';

// SQLite - automatically uses SQLiteAdapter
const sqliteLatter = new Latter({
  database: 'sqlite:./app.db',
  migrationsDir: './migrations'
});

// PostgreSQL - automatically uses PostgresAdapter
const postgresLatter = new Latter({
  database: 'postgresql://user:pass@localhost:5432/mydb',
  migrationsDir: './migrations'
});

// MySQL - automatically uses MySQLAdapter
const mysqlLatter = new Latter({
  database: 'mysql://user:pass@localhost:3306/mydb',
  migrationsDir: './migrations'
});
```

## Custom Adapters

You can also provide custom database adapters:

```typescript
import { Latter } from 'latter';
import { CustomAdapter } from './custom-adapter';

const latter = new Latter({
  database: 'custom://connection-string',
  migrationsDir: './migrations',
  adapter: new CustomAdapter('custom://connection-string')
});
```

## Migration Table Schema

Each database adapter creates a migrations table with the appropriate schema:

### SQLite
```sql
CREATE TABLE latter_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  checksum TEXT NOT NULL
);
```

### PostgreSQL
```sql
CREATE TABLE latter_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  version VARCHAR(255) NOT NULL,
  timestamp BIGINT NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(255) NOT NULL
);
```

### MySQL
```sql
CREATE TABLE latter_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  version VARCHAR(255) NOT NULL,
  timestamp BIGINT NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(255) NOT NULL,
  INDEX idx_name (name),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Dependencies

The following packages are required for the new database adapters:

```json
{
  "dependencies": {
    "pg": "^8.11.3",        // PostgreSQL
    "mysql2": "^3.6.5"      // MySQL
  }
}
```

## Example Usage

### PostgreSQL Example
```typescript
import { Latter } from 'latter';

const latter = new Latter({
  database: 'postgresql://postgres:password@localhost:5432/myapp',
  migrationsDir: './migrations',
  verbose: true
});

try {
  await latter.migrate();
  const status = await latter.status();
  console.log('Migration status:', status);
} finally {
  await latter.close();
}
```

### MySQL Example
```typescript
import { Latter } from 'latter';

const latter = new Latter({
  database: 'mysql://root:password@localhost:3306/myapp',
  migrationsDir: './migrations',
  verbose: true
});

try {
  await latter.migrate();
  const status = await latter.status();
  console.log('Migration status:', status);
} finally {
  await latter.close();
}
```

## CLI Support

All database adapters work seamlessly with the CLI:

```bash
# PostgreSQL
latter migrate --database postgresql://user:pass@localhost:5432/db --migrations-dir ./migrations

# MySQL
latter migrate --database mysql://user:pass@localhost:3306/db --migrations-dir ./migrations

# SQLite
latter migrate --database sqlite:./app.db --migrations-dir ./migrations
```

## Testing

The library includes comprehensive tests for all database adapters:

```bash
# Run all tests
bun test

# Run specific adapter tests
bun test test/adapters.test.ts
```

## Best Practices

1. **Connection Management**: Always call `latter.close()` to properly close database connections
2. **Error Handling**: Wrap migration operations in try-catch blocks
3. **Environment Variables**: Use environment variables for database credentials in production
4. **Connection Pooling**: PostgreSQL adapter automatically handles connection pooling
5. **Transactions**: All migrations run within transactions for data consistency

## Future Enhancements

- Connection pooling for MySQL
- Support for additional database engines (MongoDB, Redis, etc.)
- Migration dependency resolution
- Parallel migration execution
- Migration validation and linting

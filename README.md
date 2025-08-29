# Latter

A modern, fast database migration library built for Bun.

[![Tests](https://github.com/yourusername/latter/workflows/Tests/badge.svg)](https://github.com/yourusername/latter/actions)
[![Quick Tests](https://github.com/yourusername/latter/workflows/Quick%20Tests/badge.svg)](https://github.com/yourusername/latter/actions)
[![Cross-Platform](https://github.com/yourusername/latter/workflows/Cross-Platform%20Tests/badge.svg)](https://github.com/yourusername/latter/actions)

## Features

- 🚀 **Fast**: Built with Bun for maximum performance
- 🔒 **Type-safe**: Full TypeScript support with strict type checking
- 🗄️ **Database agnostic**: Support for multiple database engines
- 📝 **Migration tracking**: Automatic migration state management
- 🔄 **Rollback support**: Easy rollback to previous versions
- 🧪 **Testing friendly**: Built-in testing utilities

## Installation

```bash
bun add latter
```

## Quick Start

```typescript
import { Latter, Migration } from 'latter';

// Create a migration
const migration = new Migration({
  name: 'create_users_table',
  up: `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,
  down: 'DROP TABLE users;'
});

// Initialize and run migrations
const latter = new Latter({
  database: 'sqlite:./app.db', // or 'postgresql://user:pass@localhost/db' or 'mysql://user:pass@localhost/db'
  migrationsDir: './migrations'
});

await latter.migrate();
```

## Supported Databases

Latter supports multiple database engines out of the box:

### SQLite
```typescript
const latter = new Latter({
  database: 'sqlite:./app.db',
  migrationsDir: './migrations'
});
```

### PostgreSQL
```typescript
const latter = new Latter({
  database: 'postgresql://username:password@localhost:5432/database',
  migrationsDir: './migrations'
});
```

### MySQL
```typescript
const latter = new Latter({
  database: 'mysql://username:password@localhost:3306/database',
  migrationsDir: './migrations'
});
```

## API Reference

### Migration Class

```typescript
class Migration {
  constructor(options: {
    name: string;
    up: string;
    down: string;
    dependencies?: string[];
  });
}
```

### Latter Class

```typescript
class Latter {
  constructor(options: {
    database: string;
    migrationsDir: string;
    tableName?: string;
  });

  async migrate(): Promise<void>;
  async rollback(steps?: number): Promise<void>;
  async status(): Promise<MigrationStatus[]>;
}
```

## CLI Usage

Latter comes with a powerful command-line interface for managing migrations:

```bash
# Show help
latter --help

# Run pending migrations
latter migrate --database sqlite:./app.db --migrations-dir ./migrations

# Show migration status
latter status --database sqlite:./app.db --migrations-dir ./migrations

# Rollback the last N migrations
latter rollback 2 --database sqlite:./app.db --migrations-dir ./migrations

# Create a new migration
latter create add_users_table --migrations-dir ./migrations

# Use custom table name
latter migrate --database sqlite:./app.db --migrations-dir ./migrations --table-name custom_migrations

# Enable verbose output
latter migrate --database sqlite:./app.db --migrations-dir ./migrations --verbose

# Dry run (show what would be done)
latter migrate --database sqlite:./app.db --migrations-dir ./migrations --dry-run
```

## Development

### Running Tests

```bash
# Run all tests
bun test

# Run specific test files
bun test src/test/adapters.test.ts
bun test src/test/cli.test.ts
```

### Building

```bash
# Build the project
bun run build

# Build and watch for changes
bun run build:watch
```

## CI/CD

This project uses GitHub Actions for continuous integration:

- **Tests**: Runs on every push and pull request across multiple Node.js and Bun versions
- **Cross-platform**: Tests on Ubuntu, Windows, and macOS
- **Quick feedback**: Fast test runs for immediate feedback
- **Comprehensive coverage**: Matrix testing for thorough validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

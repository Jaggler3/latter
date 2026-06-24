# Latter

A modern, fast database migration library built for Bun.

[![Tests](https://github.com/Jaggler3/latter/workflows/Tests/badge.svg)](https://github.com/Jaggler3/latter/actions)
[![Quick Tests](https://github.com/Jaggler3/latter/workflows/Quick%20Tests/badge.svg)](https://github.com/Jaggler3/latter/actions)
[![Cross-Platform](https://github.com/Jaggler3/latter/workflows/Cross-Platform%20Tests/badge.svg)](https://github.com/Jaggler3/latter/actions)

## Features

- 🚀 **Fast**: Built with Bun for maximum performance
- 🔒 **Type-safe**: Full TypeScript support with strict type checking
- 🗄️ **Database agnostic**: Support for multiple database engines
- 📝 **Migration tracking**: Automatic migration state management
- 🔄 **Rollback support**: Easy rollback to previous versions
- ⚙️ **Config file**: Zero-flag workflow via `latter.config.ts` / `latter.json`
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

Latter comes with a powerful command-line interface for managing migrations.

### Configuration

Instead of passing flags on every command, create a **`latter.config.ts`** (or `latter.config.js` / `latter.json`) in your project root:

```typescript
// latter.config.ts
import type { LatterConfig } from 'latter';

const config: LatterConfig = {
  database: 'sqlite:./app.db', // connection string
  migrationsDir: './migrations',
  // tableName: 'latter_migrations', // optional
};

export default config;
```

Configuration is resolved in this priority order:
1. **CLI flags** — `--database`, `--migrations-dir`, …
2. **Environment variable** — `LATTER_DATABASE_URL`
3. **Config file** — `latter.config.ts` (searched from cwd upward)

### Commands

```bash
# Initialize a new project — generates latter.config.ts + sample migration
latter init
latter init --database sqlite:./app.db

# With a config file in place, no flags needed:
latter migrate
latter status
latter rollback 2
latter create add_users_table

# Override config values on the fly:
latter migrate --database postgres://localhost/prod
latter migrate --migrations-dir ./other-migrations

# Dry run (show what would happen without executing)
latter migrate --dry-run

# Verbose output
latter migrate --verbose

# Advanced sync commands
latter sync
latter migrate --force-sync
latter migrate --skip-out-of-sync
latter mark-applied 001_initial_setup

# Show help
latter --help
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
- **Cross-platform**: Tests on Ubuntu, Windows, and macOS with proper shell handling
- **Quick feedback**: Fast test runs for immediate feedback
- **Comprehensive coverage**: Matrix testing for thorough validation
- **Platform-specific commands**: Uses appropriate shells (bash for Unix, PowerShell for Windows)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

# Using the Init Command

The `latter init` command is perfect for setting up a new migration project. It creates the necessary folder structure and optionally initializes the database.

## Basic Initialization

Initialize just the folder structure:

```bash
latter init --migrations-dir ./migrations
```

This will:
- Create the `./migrations` directory
- Create a sample migration file with helpful comments
- Show next steps for getting started

## Full Initialization

Initialize both the folder structure and the database:

```bash
# SQLite
latter init --database sqlite:./app.db --migrations-dir ./migrations

# PostgreSQL
latter init --database postgresql://user:pass@localhost:5432/mydb --migrations-dir ./migrations

# MySQL
latter init --database mysql://user:pass@localhost:3306/mydb --migrations-dir ./migrations
```

This will:
- Create the `./migrations` directory
- Create a sample migration file
- Connect to the database
- Create the migrations tracking table
- Show next steps for getting started

## What Gets Created

### Directory Structure
```
./migrations/
├── 1703123456789_001_initial_setup_up.sql
└── 1703123456789_001_initial_setup_down.sql
```

### Sample Migration Files

**Up Migration** (`001_initial_setup_up.sql`):
```sql
-- Migration: 001_initial_setup
-- Up: Add your SQL here
-- Example:
-- CREATE TABLE example (
--   id INTEGER PRIMARY KEY,
--   name TEXT NOT NULL,
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );
```

**Down Migration** (`001_initial_setup_down.sql`):
```sql
-- Migration: 001_initial_setup
-- Down: Add your rollback SQL here
-- Example:
-- DROP TABLE example;
```

## Next Steps After Init

1. **Edit the sample migration** with your actual SQL
2. **Run your first migration**:
   ```bash
   latter migrate --database sqlite:./app.db --migrations-dir ./migrations
   ```
3. **Check the status**:
   ```bash
   latter status --database sqlite:./app.db --migrations-dir ./migrations
   ```

## Custom Table Name

You can specify a custom migrations table name:

```bash
latter init --database sqlite:./app.db --migrations-dir ./migrations --table-name my_migrations
```

## Verbose Output

Enable verbose output to see more details:

```bash
latter init --database sqlite:./app.db --migrations-dir ./migrations --verbose
```

## Project Setup Workflow

Here's a typical workflow for setting up a new project:

```bash
# 1. Initialize the project
latter init --database sqlite:./app.db --migrations-dir ./migrations

# 2. Edit the sample migration with your SQL
# (edit the generated files)

# 3. Run the migration
latter migrate --database sqlite:./app.db --migrations-dir ./migrations

# 4. Create additional migrations as needed
latter create add_users_table --migrations-dir ./migrations

# 5. Check status
latter status --database sqlite:./app.db --migrations-dir ./migrations
```

## Error Handling

The init command will:
- Create directories recursively
- Handle database connection errors gracefully
- Show clear error messages if something goes wrong
- Provide helpful next steps for success

## Integration with Existing Projects

If you already have a migrations directory, the init command will:
- Use the existing directory
- Create the sample migration files
- Initialize the database if specified
- Not overwrite existing migration files

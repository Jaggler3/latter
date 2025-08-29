import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { MigrationOptions, MigrationFile } from './types';
import { Migration } from './migration';

export class MigrationLoader {
  constructor(private migrationsDir: string) {}

  /**
   * Load all migrations from the migrations directory
   */
  async loadMigrations(): Promise<Migration[]> {
    try {
      const files = await this.getMigrationFiles();
      const migrations: Migration[] = [];

      for (const file of files) {
        try {
          const migration = await this.parseMigrationFile(file);
          if (migration) {
            migrations.push(migration);
          }
        } catch (error) {
          console.warn(`Failed to parse migration file ${file.path}:`, error);
        }
      }

      // Sort migrations by timestamp
      return migrations.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      throw new Error(`Failed to load migrations: ${error}`);
    }
  }

  /**
   * Get all migration files from the migrations directory
   */
  private async getMigrationFiles(): Promise<MigrationFile[]> {
    try {
      const entries = await readdir(this.migrationsDir, { withFileTypes: true });
      const files: MigrationFile[] = [];

      for (const entry of entries) {
        if (entry.isFile() && this.isMigrationFile(entry.name)) {
          const filePath = join(this.migrationsDir, entry.name);
          const stats = await stat(filePath);
          
          files.push({
            path: filePath,
            name: entry.name,
            content: await readFile(filePath, 'utf-8'),
            timestamp: stats.mtime.getTime()
          });
        }
      }

      return files;
    } catch (error) {
      throw new Error(`Failed to read migrations directory: ${error}`);
    }
  }

  /**
   * Check if a file is a migration file
   */
  private isMigrationFile(filename: string): boolean {
    const validExtensions = ['.sql', '.ts', '.js', '.json'];
    return validExtensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Parse a migration file into a Migration object
   */
  private async parseMigrationFile(file: MigrationFile): Promise<Migration | null> {
    const ext = extname(file.name);
    
    switch (ext) {
      case '.sql':
        return this.parseSqlMigration(file);
      case '.ts':
      case '.js':
        return this.parseJsMigration(file);
      case '.json':
        return this.parseJsonMigration(file);
      default:
        return null;
    }
  }

  /**
   * Parse a SQL migration file
   * Expected format: filename_up.sql and filename_down.sql
   */
  private async parseSqlMigration(file: MigrationFile): Promise<Migration | null> {
    const baseName = file.name.replace(/_(up|down)\.sql$/, '');
    const isUp = file.name.includes('_up.sql');
    const isDown = file.name.includes('_down.sql');

    if (!isUp && !isDown) {
      return null;
    }

    // For SQL files, we need to find both up and down files
    const upFile = join(this.migrationsDir, `${baseName}_up.sql`);
    const downFile = join(this.migrationsDir, `${baseName}_down.sql`);

    try {
      const upContent = await readFile(upFile, 'utf-8');
      const downContent = await readFile(downFile, 'utf-8');

      return new Migration({
        name: baseName,
        up: upContent.trim(),
        down: downContent.trim(),
        timestamp: file.timestamp
      });
    } catch (error) {
      console.warn(`Failed to read SQL migration files for ${baseName}:`, error);
      return null;
    }
  }

  /**
   * Parse a JavaScript/TypeScript migration file
   * Expected format: export default { name, up, down }
   */
  private async parseJsMigration(file: MigrationFile): Promise<Migration | null> {
    try {
      // For now, we'll just extract the name from the filename
      // In a real implementation, you might want to execute the file
      const baseName = file.name.replace(/\.(ts|js)$/, '');
      
      // This is a simplified parser - in practice you'd want to execute the file
      // and extract the migration object
      return new Migration({
        name: baseName,
        up: `-- Migration ${baseName} up`,
        down: `-- Migration ${baseName} down`,
        timestamp: file.timestamp
      });
    } catch (error) {
      console.warn(`Failed to parse JS migration file ${file.name}:`, error);
      return null;
    }
  }

  /**
   * Parse a JSON migration file
   */
  private async parseJsonMigration(file: MigrationFile): Promise<Migration | null> {
    try {
      const data = JSON.parse(file.content) as MigrationOptions;
      
      if (!data.name || !data.up || !data.down) {
        console.warn(`Invalid JSON migration file ${file.name}: missing required fields`);
        return null;
      }

      return new Migration({
        ...data,
        timestamp: data.timestamp || file.timestamp
      });
    } catch (error) {
      console.warn(`Failed to parse JSON migration file ${file.name}:`, error);
      return null;
    }
  }
}

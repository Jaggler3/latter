import { MigrationOptions, MigrationStatus } from './types';
import { createHash } from 'crypto';

export class Migration {
  public readonly name: string;
  public readonly up: string;
  public readonly down: string;
  public readonly dependencies: string[];
  public readonly version: string;
  public readonly timestamp: number;

  constructor(options: MigrationOptions) {
    this.name = options.name;
    this.up = options.up;
    this.down = options.down;
    this.dependencies = options.dependencies || [];
    this.version = options.version || this.generateVersion();
    this.timestamp = options.timestamp || Date.now();
  }

  /**
   * Generate a unique version hash for this migration
   */
  private generateVersion(): string {
    const content = `${this.name}${this.up}${this.down}`;
    return createHash('sha256').update(content).digest('hex').substring(0, 8);
  }

  /**
   * Get the checksum of this migration
   */
  get checksum(): string {
    return createHash('md5').update(this.up + this.down).digest('hex');
  }

  /**
   * Create a MigrationStatus object for this migration
   */
  toStatus(applied: boolean = false, appliedAt?: Date): MigrationStatus {
    return {
      name: this.name,
      version: this.version,
      timestamp: this.timestamp,
      applied,
      appliedAt,
      checksum: this.checksum
    };
  }

  /**
   * Validate that this migration has all required properties
   */
  validate(): boolean {
    return !!(this.name && this.up && this.down);
  }

  /**
   * Check if this migration depends on another migration
   */
  dependsOn(migrationName: string): boolean {
    return this.dependencies.includes(migrationName);
  }

  /**
   * Get all dependencies for this migration
   */
  getDependencies(): string[] {
    return [...this.dependencies];
  }
}

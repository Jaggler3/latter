import { Latter } from '../src/latter';

async function main() {
  // Create a new Latter instance for MySQL
  const latter = new Latter({
    database: 'mysql://username:password@localhost:3306/mydatabase',
    migrationsDir: './examples/migrations',
    verbose: true
  });

  try {
    // Check migration status
    console.log('Checking migration status...');
    const status = await latter.status();
    console.log('Current status:', status);

    // Run migrations
    console.log('\nRunning migrations...');
    const result = await latter.migrate();
    
    if (result.success) {
      console.log(`✅ Successfully applied ${result.migrationsApplied.length} migrations`);
      result.migrationsApplied.forEach(name => console.log(`  - ${name}`));
    } else {
      console.error(`❌ Migration failed: ${result.error}`);
    }

    // Check status again
    console.log('\nChecking status after migration...');
    const newStatus = await latter.status();
    console.log('New status:', newStatus);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Always close the connection
    await latter.close();
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

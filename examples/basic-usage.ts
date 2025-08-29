import { Latter } from '../src/latter';

async function main() {
  // Create a new Latter instance
  const latter = new Latter({
    database: 'sqlite:./example.db',
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

    // Example of rollback (uncomment to test)
    // console.log('\nRolling back last migration...');
    // const rollbackResult = await latter.rollback(1);
    // if (rollbackResult.success) {
    //   console.log(`✅ Successfully rolled back ${rollbackResult.migrationsRolledBack.length} migrations`);
    // } else {
    //   console.error(`❌ Rollback failed: ${rollbackResult.error}`);
    // }

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

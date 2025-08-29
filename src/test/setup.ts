// Test setup for the latter library
import { beforeAll, afterAll } from 'bun:test';

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  
  // Create test database directory if it doesn't exist
  const fs = require('fs');
  const path = require('path');
  const testDbDir = path.join(process.cwd(), 'test', 'db');
  
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
});

afterAll(() => {
  // Cleanup test files
  const fs = require('fs');
  const path = require('path');
  const testDbDir = path.join(process.cwd(), 'test', 'db');
  
  if (fs.existsSync(testDbDir)) {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  }
});

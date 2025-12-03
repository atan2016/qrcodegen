const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

// Create PostgreSQL connection pool for sessions
function createSessionStore() {
  // Check if we have database connection string (for Supabase)
  // Supabase provides this in Settings → Database → Connection string
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  
  if (databaseUrl) {
    try {
      // Use PostgreSQL session store (production)
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
          rejectUnauthorized: false // Required for Supabase
        },
        // Connection pool settings for serverless
        max: 1, // Limit connections for serverless
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });

      // Create the store with the pool
      // The store will handle connection errors gracefully
      const store = new pgSession({
        pool: pool,
        tableName: 'session', // Table name in PostgreSQL
        createTableIfMissing: true, // Automatically create session table
        // Handle connection errors gracefully
        errorLog: (err) => {
          console.error('⚠️  Session store error:', err.message);
          // Don't throw - let it fall back to memory store behavior
        }
      });

      // Test the connection asynchronously (don't block)
      // If it fails, the store will handle it gracefully
      pool.query('SELECT 1')
        .then(() => {
          console.log('✅ PostgreSQL connection successful');
        })
        .catch((err) => {
          console.error('⚠️  PostgreSQL connection test failed:', err.message);
          console.warn('⚠️  Session store may not work - will fall back to memory store behavior');
          // Don't end the pool - let the store handle errors
        });

      console.log('✅ Using PostgreSQL session store');
      return store;
    } catch (error) {
      console.error('⚠️  Error creating PostgreSQL session store:', error.message);
      console.warn('⚠️  Falling back to memory store');
      return undefined;
    }
  } else {
    // Fallback to memory store (development only)
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  DATABASE_URL not found in production. Using memory store (not recommended).');
      console.warn('⚠️  Sessions will not persist across serverless invocations.');
    }
    return undefined; // Will use default MemoryStore
  }
}

module.exports = { createSessionStore };


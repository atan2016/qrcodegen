const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

// Create PostgreSQL connection pool for sessions
function createSessionStore() {
  // Check if we have database connection string (for Supabase)
  // Supabase provides this in Settings → Database → Connection string
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  
  if (!databaseUrl) {
    // Fallback to memory store (development only)
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      console.error('❌ CRITICAL: DATABASE_URL not found in production/Vercel environment!');
      console.error('❌ Sessions will NOT persist - users will be logged out immediately!');
      console.error('❌ Set DATABASE_URL in Vercel environment variables to fix this.');
    } else {
      console.warn('⚠️  DATABASE_URL not found. Using memory store (development only).');
    }
    return undefined; // Will use default MemoryStore
  }

  try {
    // Validate DATABASE_URL format
    if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
      console.error('❌ Invalid DATABASE_URL format. Must start with postgresql:// or postgres://');
      return undefined;
    }

    // Use PostgreSQL session store (production)
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false // Required for Supabase
      },
      // Connection pool settings for serverless
      max: 1, // Limit connections for serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased timeout
      // Don't close idle connections immediately on serverless
      allowExitOnIdle: false
    });

    // Create the store with the pool
    const store = new pgSession({
      pool: pool,
      tableName: 'session', // Table name in PostgreSQL
      createTableIfMissing: true, // Automatically create session table
      pruneSessionInterval: 60, // Prune expired sessions every 60 seconds
      // Handle connection errors gracefully
      errorLog: (err) => {
        console.error('⚠️  Session store error:', err.message);
        console.error('⚠️  Session store error stack:', err.stack);
        // Don't throw - let it fall back to memory store behavior
      }
    });

    // Test the connection synchronously to catch immediate errors
    // But don't block if it fails - let it work asynchronously
    pool.query('SELECT 1')
      .then(() => {
        console.log('✅ PostgreSQL connection successful');
        // Verify session table exists
        return pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'session'
          );
        `);
      })
      .then((result) => {
        if (result.rows[0].exists) {
          console.log('✅ Session table exists');
        } else {
          console.warn('⚠️  Session table does not exist - will be created on first use');
        }
      })
      .catch((err) => {
        console.error('⚠️  PostgreSQL connection test failed:', err.message);
        console.error('⚠️  Error details:', err);
        console.warn('⚠️  Session store may not work - will fall back to memory store behavior');
        // Don't end the pool - let the store handle errors
      });

    console.log('✅ Using PostgreSQL session store');
    return store;
  } catch (error) {
    console.error('❌ Error creating PostgreSQL session store:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.warn('⚠️  Falling back to memory store');
    return undefined;
  }
}

module.exports = { createSessionStore };


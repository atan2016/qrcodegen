// Only load dotenv in local development (Vercel injects env vars automatically)
if (process.env.VERCEL !== '1') {
  require('dotenv').config();
}
const express = require('express');
const session = require('express-session');
const passport = require('./config/passport');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const { requireAuth } = require('./middleware/auth');
const {
  createQRCode,
  getQRCodeById,
  getQRCodesByUserId,
  updateQRCode
} = require('./lib/storage');
const { createSessionStore } = require('./lib/sessionStore');

const app = express();
const PORT = process.env.PORT || 3000;

// Session configuration
// Use PostgreSQL session store if DATABASE_URL is available, otherwise fallback to memory store
let sessionStore;
try {
  sessionStore = createSessionStore();
  if (sessionStore) {
    console.log('✅ Session store initialized successfully');
  } else {
    console.warn('⚠️  No session store created - will use memory store (sessions will not persist on Vercel)');
  }
} catch (error) {
  console.error('⚠️  Failed to create session store, using memory store:', error.message);
  sessionStore = undefined;
}

// Determine if we should use secure cookies
const isSecure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'qr-code-generator-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
  name: 'connect.sid', // Default session cookie name
  cookie: {
    secure: isSecure, // HTTPS only on Vercel or production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // Help with cross-site requests
    path: '/', // Ensure cookie is available for all paths
    // Don't set domain - let browser use default
  }
};

// Use PostgreSQL store if available, otherwise use default (memory store)
if (sessionStore) {
  sessionConfig.store = sessionStore;
  console.log('✅ Using PostgreSQL session store for persistence');
} else {
  console.warn('⚠️  Using memory store - sessions may not persist across serverless invocations');
  if (process.env.VERCEL === '1') {
    console.error('❌ CRITICAL: DATABASE_URL may not be set or session store creation failed. Sessions will not persist!');
  }
}

app.use(session(sessionConfig));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Authentication Routes (must be before static middleware)

// Google OAuth
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login.html?error=auth_failed',
    session: true
  }),
  function(req, res) {
    try {
      // Passport already logged the user in and added to session
      // Verify user is in session
      if (!req.user) {
        console.error('❌ User not found in session after authentication');
        return res.redirect('/login.html?error=auth_failed');
      }

      console.log('✅ User authenticated:', req.user.email);
      console.log('✅ Session ID:', req.sessionID);
      console.log('✅ Is authenticated:', req.isAuthenticated());
      
      // Explicitly save the session before redirecting (critical for serverless)
      req.session.save((err) => {
        if (err) {
          console.error('❌ Error saving session:', err);
          console.error('❌ Session error details:', JSON.stringify(err, null, 2));
          return res.redirect('/login.html?error=auth_failed');
        }
        
        console.log('✅ Session saved successfully');
        // Successful authentication, redirect to home
        res.redirect('/');
      });
    } catch (error) {
      console.error('❌ Error in OAuth callback handler:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).send('Internal Server Error - Check logs for details');
    }
  }
);

// Logout
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  // Debug logging
  console.log('Auth check - Session ID:', req.sessionID);
  console.log('Auth check - Is authenticated:', req.isAuthenticated());
  console.log('Auth check - User exists:', !!req.user);
  console.log('Auth check - Session store:', sessionStore ? 'PostgreSQL' : 'Memory');
  
  if (req.isAuthenticated() && req.user) {
    // Don't send sensitive info
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar
      }
    });
  } else {
    res.json({ user: null });
  }
});

// Diagnostic endpoint to check session configuration
app.get('/api/auth/debug', (req, res) => {
  res.json({
    hasSessionStore: !!sessionStore,
    sessionStoreType: sessionStore ? 'PostgreSQL' : 'Memory',
    hasDatabaseUrl: !!(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL),
    hasSessionSecret: !!process.env.SESSION_SECRET,
    isSecureCookie: sessionConfig.cookie.secure,
    sessionId: req.sessionID,
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    vercelEnv: process.env.VERCEL === '1',
    nodeEnv: process.env.NODE_ENV
  });
});

// Serve static files explicitly (needed for Vercel serverless)
app.get('/styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'styles.css'), {
    headers: {
      'Content-Type': 'text/css'
    }
  });
});

app.get('/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.js'), {
    headers: {
      'Content-Type': 'application/javascript'
    }
  });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), {
    headers: {
      'Content-Type': 'text/html'
    }
  });
});

// Serve login.html
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'), {
    headers: {
      'Content-Type': 'text/html'
    }
  });
});

// Static file serving (after routes) - fallback for other static files
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to check if QR code is expired
function isExpired(qrcode) {
  if (qrcode.is_manually_expired || qrcode.isManuallyExpired) {
    return true;
  }
  const expiresAt = qrcode.expires_at || qrcode.expiresAt;
  if (expiresAt) {
    return new Date() > new Date(expiresAt);
  }
  return false;
}

// Cleanup expired QR codes (runs periodically)
// Note: On Vercel serverless, this might not run reliably. Consider using Vercel Cron Jobs
async function cleanupExpiredQRCodes() {
  try {
    const qrcodes = await getQRCodesByUserId(null); // Get all if needed, or implement a cleanup query
    // For now, cleanup happens on read - expired QR codes are filtered out
    console.log('Cleanup check completed');
  } catch (error) {
    console.error('Error cleaning up expired QR codes:', error);
  }
}

// Run cleanup every hour (if server stays running)
// On Vercel serverless, use Vercel Cron Jobs instead
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  setInterval(cleanupExpiredQRCodes, 60 * 60 * 1000);
}

// API Routes (Protected)

// Generate new QR code
app.post('/api/qrcode/generate', requireAuth, async (req, res) => {
  try {
    const { url, description, expirationHours } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
    });

    // Calculate expiration time
    let expiresAt = null;
    if (expirationHours && expirationHours > 0) {
      expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString();
    }

    // Create QR code object (using snake_case for Supabase compatibility)
    const qrcode = {
      id: uuidv4(),
      user_id: req.user.id, // Supabase uses snake_case
      userId: req.user.id, // Keep camelCase for compatibility
      url: url,
      description: description && description.trim() ? description.trim() : null,
      qr_code_data_url: qrCodeDataUrl, // Supabase column name
      qrCodeDataUrl: qrCodeDataUrl, // Keep for compatibility
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      expires_at: expiresAt,
      expiresAt: expiresAt,
      is_manually_expired: false,
      isManuallyExpired: false,
    };

    // Save to storage
    const createdQRCode = await createQRCode(qrcode);

    res.json({
      id: createdQRCode.id,
      qrCodeDataUrl: createdQRCode.qr_code_data_url || createdQRCode.qrCodeDataUrl,
      description: createdQRCode.description,
      expiresAt: createdQRCode.expires_at || createdQRCode.expiresAt,
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Get QR code by ID (only if it belongs to user)
app.get('/api/qrcode/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const qrcode = await getQRCodeById(id);

    if (!qrcode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Check if QR code belongs to user
    const userId = qrcode.user_id || qrcode.userId;
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const expired = isExpired(qrcode);

    res.json({
      id: qrcode.id,
      url: qrcode.url,
      description: qrcode.description,
      qrCodeDataUrl: qrcode.qr_code_data_url || qrcode.qrCodeDataUrl,
      expiresAt: qrcode.expires_at || qrcode.expiresAt,
      createdAt: qrcode.created_at || qrcode.createdAt,
      isExpired: expired,
      isManuallyExpired: qrcode.is_manually_expired || qrcode.isManuallyExpired,
    });
  } catch (error) {
    console.error('Error fetching QR code:', error);
    res.status(500).json({ error: 'Failed to fetch QR code' });
  }
});

// List all QR codes (only user's QR codes)
app.get('/api/qrcode', requireAuth, async (req, res) => {
  try {
    const qrcodes = await getQRCodesByUserId(req.user.id);
    const qrcodesWithStatus = qrcodes.map(qr => ({
      ...qr,
      // Normalize field names for frontend
      userId: qr.user_id || qr.userId,
      qrCodeDataUrl: qr.qr_code_data_url || qr.qrCodeDataUrl,
      createdAt: qr.created_at || qr.createdAt,
      expiresAt: qr.expires_at || qr.expiresAt,
      isManuallyExpired: qr.is_manually_expired || qr.isManuallyExpired,
      isExpired: isExpired(qr),
    }));

    res.json(qrcodesWithStatus);
  } catch (error) {
    console.error('Error fetching QR codes:', error);
    res.status(500).json({ error: 'Failed to fetch QR codes' });
  }
});

// Manually expire/delete QR code (only if it belongs to user)
app.delete('/api/qrcode/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const qrcode = await getQRCodeById(id);

    if (!qrcode) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Check if QR code belongs to user
    const userId = qrcode.user_id || qrcode.userId;
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark as manually expired
    await updateQRCode(id, {
      is_manually_expired: true,
      isManuallyExpired: true
    });

    res.json({ message: 'QR code expired successfully', id: id });
  } catch (error) {
    console.error('Error expiring QR code:', error);
    res.status(500).json({ error: 'Failed to expire QR code' });
  }
});

// Start server (only if not on Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`QR Code Generator server running on http://localhost:${PORT}`);
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn('WARNING: Google OAuth credentials not found in environment variables');
    }
  });
}

// Export for Vercel
module.exports = app;

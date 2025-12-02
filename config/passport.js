const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { v4: uuidv4 } = require('uuid');
const {
  findUserByProvider,
  findUserById,
  createUser,
  updateUser
} = require('../lib/storage');

// Find or create user
async function findOrCreateUser(profile) {
  // Try to find existing user by provider and providerId
  let user = await findUserByProvider(profile.provider, profile.id);
  
  if (user) {
    // Update user info in case it changed
    const updates = {
      email: profile.emails[0].value,
      name: profile.displayName,
      avatar: profile.photos[0]?.value || null,
    };
    // Handle both camelCase and snake_case
    if (user.provider_id) {
      // Supabase format
      await updateUser(user.id, {
        email: updates.email,
        name: updates.name,
        avatar: updates.avatar
      });
    } else {
      // File storage format
      await updateUser(user.id, updates);
    }
    // Re-fetch to get updated user
    user = await findUserById(user.id);
    return user;
  }
  
  // Create new user (storage layer will convert to snake_case)
  const newUser = {
    id: uuidv4(),
    email: profile.emails[0].value,
    name: profile.displayName,
    provider: profile.provider,
    provider_id: profile.id, // Will be converted to provider_id for Supabase
    avatar: profile.photos[0]?.value || null,
    created_at: new Date().toISOString(),
  };
  
  const createdUser = await createUser(newUser);
  return createdUser;
}

// Google OAuth Strategy
// Construct callback URL - use environment variable or default to localhost
const getCallbackURL = () => {
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }
  // Default to localhost for development
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}/auth/google/callback`;
};

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: getCallbackURL()
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await findOrCreateUser({
      ...profile,
      provider: 'google'
    });
    return done(null, user);
  } catch (error) {
    console.error('Error in Google OAuth strategy:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await findUserById(id);
    done(null, user || null);
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error, null);
  }
});

module.exports = passport;

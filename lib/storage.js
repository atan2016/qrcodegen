const { supabase } = require('./supabase');
const fs = require('fs').promises;
const path = require('path');

// Fallback to file storage if Supabase is not configured
const USE_SUPABASE = !!supabase;

// File storage paths (fallback)
const STORAGE_DIR = path.join(__dirname, '..', 'storage');
const QRCODES_FILE = path.join(STORAGE_DIR, 'qrcodes.json');
const USERS_FILE = path.join(STORAGE_DIR, 'users.json');

// ========== QR Codes Storage ==========

async function readQRCodes() {
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('qrcodes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error reading QR codes from Supabase:', error);
      return [];
    }
  } else {
    // Fallback to file storage
    try {
      const data = await fs.readFile(QRCODES_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}

async function writeQRCodes(qrcodes) {
  if (USE_SUPABASE) {
    // For Supabase, we'll upsert (insert or update)
    // This is more efficient than deleting all and reinserting
    try {
      // Get all existing QR codes
      const { data: existing } = await supabase
        .from('qrcodes')
        .select('id');
      
      const existingIds = new Set((existing || []).map(qr => qr.id));
      const newIds = new Set(qrcodes.map(qr => qr.id));
      
      // Delete QR codes that no longer exist
      const toDelete = Array.from(existingIds).filter(id => !newIds.has(id));
      if (toDelete.length > 0) {
        await supabase
          .from('qrcodes')
          .delete()
          .in('id', toDelete);
      }
      
      // Upsert all QR codes
      if (qrcodes.length > 0) {
        const { error } = await supabase
          .from('qrcodes')
          .upsert(qrcodes, { onConflict: 'id' });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error writing QR codes to Supabase:', error);
      throw error;
    }
  } else {
    // Fallback to file storage
    await fs.writeFile(QRCODES_FILE, JSON.stringify(qrcodes, null, 2), 'utf8');
  }
}

async function createQRCode(qrcode) {
  if (USE_SUPABASE) {
    try {
      // Convert to snake_case for Supabase
      const supabaseQRCode = {
        id: qrcode.id,
        user_id: qrcode.user_id || qrcode.userId,
        url: qrcode.url,
        description: qrcode.description,
        qr_code_data_url: qrcode.qr_code_data_url || qrcode.qrCodeDataUrl,
        created_at: qrcode.created_at || qrcode.createdAt || new Date().toISOString(),
        expires_at: qrcode.expires_at || qrcode.expiresAt || null,
        is_manually_expired: qrcode.is_manually_expired !== undefined ? qrcode.is_manually_expired : (qrcode.isManuallyExpired !== undefined ? qrcode.isManuallyExpired : false)
      };
      
      const { data, error } = await supabase
        .from('qrcodes')
        .insert([supabaseQRCode])
        .select()
        .single();
      
      if (error) throw error;
      
      // Map back to camelCase for compatibility
      return {
        ...data,
        userId: data.user_id,
        qrCodeDataUrl: data.qr_code_data_url,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        isManuallyExpired: data.is_manually_expired
      };
    } catch (error) {
      console.error('Error creating QR code in Supabase:', error);
      throw error;
    }
  } else {
    // Fallback: add to array and write
    const qrcodes = await readQRCodes();
    qrcodes.push(qrcode);
    await writeQRCodes(qrcodes);
    return qrcode;
  }
}

async function updateQRCode(id, updates) {
  if (USE_SUPABASE) {
    try {
      // Convert camelCase to snake_case for Supabase
      const supabaseUpdates = {};
      if (updates.user_id !== undefined) supabaseUpdates.user_id = updates.user_id;
      if (updates.userId !== undefined) supabaseUpdates.user_id = updates.userId;
      if (updates.url !== undefined) supabaseUpdates.url = updates.url;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.qr_code_data_url !== undefined) supabaseUpdates.qr_code_data_url = updates.qr_code_data_url;
      if (updates.qrCodeDataUrl !== undefined) supabaseUpdates.qr_code_data_url = updates.qrCodeDataUrl;
      if (updates.created_at !== undefined) supabaseUpdates.created_at = updates.created_at;
      if (updates.createdAt !== undefined) supabaseUpdates.created_at = updates.createdAt;
      if (updates.expires_at !== undefined) supabaseUpdates.expires_at = updates.expires_at;
      if (updates.expiresAt !== undefined) supabaseUpdates.expires_at = updates.expiresAt;
      if (updates.is_manually_expired !== undefined) supabaseUpdates.is_manually_expired = updates.is_manually_expired;
      if (updates.isManuallyExpired !== undefined) supabaseUpdates.is_manually_expired = updates.isManuallyExpired;
      
      const { data, error } = await supabase
        .from('qrcodes')
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Map back to camelCase for compatibility
      if (data) {
        return {
          ...data,
          userId: data.user_id,
          qrCodeDataUrl: data.qr_code_data_url,
          createdAt: data.created_at,
          expiresAt: data.expires_at,
          isManuallyExpired: data.is_manually_expired
        };
      }
      return data;
    } catch (error) {
      console.error('Error updating QR code in Supabase:', error);
      throw error;
    }
  } else {
    // Fallback: update in array
    const qrcodes = await readQRCodes();
    const index = qrcodes.findIndex(qr => qr.id === id);
    if (index !== -1) {
      qrcodes[index] = { ...qrcodes[index], ...updates };
      await writeQRCodes(qrcodes);
      return qrcodes[index];
    }
    return null;
  }
}

async function getQRCodeById(id) {
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('qrcodes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      // Map snake_case to camelCase for compatibility
      if (data) {
        return {
          ...data,
          userId: data.user_id,
          qrCodeDataUrl: data.qr_code_data_url,
          createdAt: data.created_at,
          expiresAt: data.expires_at,
          isManuallyExpired: data.is_manually_expired
        };
      }
      return data;
    } catch (error) {
      console.error('Error getting QR code from Supabase:', error);
      return null;
    }
  } else {
    // Fallback
    const qrcodes = await readQRCodes();
    return qrcodes.find(qr => qr.id === id) || null;
  }
}

async function getQRCodesByUserId(userId) {
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('qrcodes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map snake_case to camelCase for compatibility
      return (data || []).map(qr => ({
        ...qr,
        userId: qr.user_id,
        qrCodeDataUrl: qr.qr_code_data_url,
        createdAt: qr.created_at,
        expiresAt: qr.expires_at,
        isManuallyExpired: qr.is_manually_expired
      }));
    } catch (error) {
      console.error('Error getting QR codes by user from Supabase:', error);
      return [];
    }
  } else {
    // Fallback
    const qrcodes = await readQRCodes();
    return qrcodes.filter(qr => qr.userId === userId);
  }
}

// ========== Users Storage ==========

async function readUsers() {
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error reading users from Supabase:', error);
      return [];
    }
  } else {
    // Fallback to file storage
    try {
      const data = await fs.readFile(USERS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}

async function writeUsers(users) {
  if (USE_SUPABASE) {
    try {
      // Upsert all users
      if (users.length > 0) {
        const { error } = await supabase
          .from('users')
          .upsert(users, { onConflict: 'id' });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error writing users to Supabase:', error);
      throw error;
    }
  } else {
    // Fallback to file storage
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  }
}

async function findUserByProvider(provider, providerId) {
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('provider', provider)
        .eq('provider_id', providerId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      // Map snake_case to camelCase for compatibility
      if (data) {
        return {
          ...data,
          providerId: data.provider_id || data.providerId,
          createdAt: data.created_at || data.createdAt
        };
      }
      return data;
    } catch (error) {
      console.error('Error finding user in Supabase:', error);
      return null;
    }
  } else {
    // Fallback
    const users = await readUsers();
    return users.find(u => u.provider === provider && (u.providerId === providerId || u.provider_id === providerId)) || null;
  }
}

async function findUserById(id) {
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      // Map snake_case to camelCase for compatibility
      if (data) {
        return {
          ...data,
          providerId: data.provider_id || data.providerId,
          createdAt: data.created_at || data.createdAt
        };
      }
      return data;
    } catch (error) {
      console.error('Error finding user by ID in Supabase:', error);
      return null;
    }
  } else {
    // Fallback
    const users = await readUsers();
    return users.find(u => u.id === id) || null;
  }
}

async function createUser(user) {
  if (USE_SUPABASE) {
    try {
      // Convert to snake_case for Supabase
      const supabaseUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        provider_id: user.provider_id || user.providerId,
        avatar: user.avatar,
        created_at: user.created_at || user.createdAt || new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('users')
        .insert([supabaseUser])
        .select()
        .single();
      
      if (error) throw error;
      
      // Map back to camelCase for compatibility
      return {
        ...data,
        providerId: data.provider_id,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error creating user in Supabase:', error);
      throw error;
    }
  } else {
    // Fallback
    const users = await readUsers();
    users.push(user);
    await writeUsers(users);
    return user;
  }
}

async function updateUser(id, updates) {
  if (USE_SUPABASE) {
    try {
      // Convert camelCase to snake_case for Supabase
      const supabaseUpdates = {};
      if (updates.email !== undefined) supabaseUpdates.email = updates.email;
      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.avatar !== undefined) supabaseUpdates.avatar = updates.avatar;
      if (updates.provider_id !== undefined) supabaseUpdates.provider_id = updates.provider_id;
      if (updates.providerId !== undefined) supabaseUpdates.provider_id = updates.providerId;
      if (updates.created_at !== undefined) supabaseUpdates.created_at = updates.created_at;
      if (updates.createdAt !== undefined) supabaseUpdates.created_at = updates.createdAt;
      
      const { data, error } = await supabase
        .from('users')
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Map back to camelCase for compatibility
      if (data) {
        return {
          ...data,
          providerId: data.provider_id,
          createdAt: data.created_at
        };
      }
      return data;
    } catch (error) {
      console.error('Error updating user in Supabase:', error);
      throw error;
    }
  } else {
    // Fallback
    const users = await readUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      await writeUsers(users);
      return users[index];
    }
    return null;
  }
}

module.exports = {
  // QR Codes
  readQRCodes,
  writeQRCodes,
  createQRCode,
  updateQRCode,
  getQRCodeById,
  getQRCodesByUserId,
  
  // Users
  readUsers,
  writeUsers,
  findUserByProvider,
  findUserById,
  createUser,
  updateUser,
  
  // Utility
  USE_SUPABASE
};


const API_BASE = '/api/qrcode';

// DOM elements
const qrForm = document.getElementById('qrForm');
const urlInput = document.getElementById('urlInput');
const descriptionInput = document.getElementById('descriptionInput');
const expirationInput = document.getElementById('expirationInput');
const generateBtn = document.getElementById('generateBtn');
const qrDisplay = document.getElementById('qrDisplay');
const qrImage = document.getElementById('qrImage');
const qrDescription = document.getElementById('qrDescription');
const qrDescriptionText = document.getElementById('qrDescriptionText');
const qrUrl = document.getElementById('qrUrl');
const qrId = document.getElementById('qrId');
const qrExpiresAt = document.getElementById('qrExpiresAt');
const qrExpiration = document.getElementById('qrExpiration');
const refreshBtn = document.getElementById('refreshBtn');
const qrList = document.getElementById('qrList');
const userMenu = document.getElementById('userMenu');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');

// Current user
let currentUser = null;

// Check authentication and load user info
async function checkAuth() {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.user) {
      currentUser = data.user;
      displayUserInfo(data.user);
      return true;
    } else {
      // Not authenticated, redirect to login
      window.location.href = '/login.html';
      return false;
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    window.location.href = '/login.html';
    return false;
  }
}

// Display user info in header
function displayUserInfo(user) {
  userName.textContent = user.name || user.email;
  if (user.avatar) {
    userAvatar.src = user.avatar;
    userAvatar.style.display = 'block';
  } else {
    userAvatar.style.display = 'none';
  }
  userMenu.classList.remove('hidden');
}

// Logout
async function logout() {
  try {
    const response = await fetch('/auth/logout', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      window.location.href = '/login.html';
    } else {
      throw new Error('Logout failed');
    }
  } catch (error) {
    console.error('Error logging out:', error);
    showError('Failed to logout. Please try again.');
  }
}

// Format date/time
function formatDate(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Calculate time remaining
function getTimeRemaining(expiresAt) {
  if (!expiresAt) return null;
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires - now;
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  }
}

// Get status class based on expiration
function getStatusClass(qrcode) {
  if (qrcode.isExpired) {
    return 'status-expired';
  }
  if (qrcode.expiresAt) {
    const now = new Date();
    const expires = new Date(qrcode.expiresAt);
    const diff = expires - now;
    const hoursRemaining = diff / (1000 * 60 * 60);
    if (hoursRemaining <= 1) {
      return 'status-expiring-soon';
    }
  }
  return 'status-active';
}

// Generate QR code
async function generateQRCode() {
  const url = urlInput.value.trim();
  const description = descriptionInput.value.trim();
  const expirationHours = parseFloat(expirationInput.value);

  if (!url) {
    showError('Please enter a URL');
    return;
  }

  try {
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        url: url,
        description: description || undefined,
        expirationHours: expirationHours > 0 ? expirationHours : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate QR code');
    }

    const data = await response.json();
    
    // Display the generated QR code
    qrImage.src = data.qrCodeDataUrl;
    qrUrl.textContent = url;
    qrId.textContent = data.id;
    
    // Display description if provided
    if (data.description) {
      qrDescriptionText.textContent = data.description;
      qrDescription.classList.remove('hidden');
    } else {
      qrDescription.classList.add('hidden');
    }
    
    if (data.expiresAt) {
      qrExpiresAt.textContent = formatDate(data.expiresAt);
      qrExpiration.style.display = 'block';
    } else {
      qrExpiresAt.textContent = 'Never';
      qrExpiration.style.display = 'block';
    }
    
    qrDisplay.classList.remove('hidden');
    
    // Reset form
    urlInput.value = '';
    descriptionInput.value = '';
    expirationInput.value = '';
    
    // Refresh the list
    loadQRCodes();
    
    showSuccess('QR code generated successfully!');
  } catch (error) {
    showError(error.message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate QR Code';
  }
}

// Load all QR codes
async function loadQRCodes() {
  try {
    qrList.innerHTML = '<p class="loading">Loading QR codes...</p>';
    
    const response = await fetch(API_BASE, {
      credentials: 'include'
    });
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      throw new Error('Failed to load QR codes');
    }
    
    const qrcodes = await response.json();
    
    if (qrcodes.length === 0) {
      qrList.innerHTML = '<p class="empty">No QR codes generated yet. Create one above!</p>';
      return;
    }
    
    // Sort by creation date (newest first)
    qrcodes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    qrList.innerHTML = qrcodes.map(qrcode => {
      const timeRemaining = getTimeRemaining(qrcode.expiresAt);
      const statusClass = getStatusClass(qrcode);
      const statusText = qrcode.isExpired 
        ? 'Expired' 
        : (qrcode.expiresAt ? timeRemaining : 'Active (No expiration)');
      
      return `
        <div class="qr-card ${qrcode.isExpired ? 'expired' : ''}">
          <div class="qr-card-header">
            <img src="${qrcode.qrCodeDataUrl}" alt="QR Code" class="qr-card-thumbnail">
            <div class="qr-card-info">
              <h3>URL:</h3>
              <p>${qrcode.url}</p>
              ${qrcode.description ? `<h3>Description:</h3><p>${qrcode.description}</p>` : ''}
              <h3>Created:</h3>
              <p>${formatDate(qrcode.createdAt)}</p>
              ${qrcode.expiresAt ? `<h3>Expires:</h3><p>${formatDate(qrcode.expiresAt)}</p>` : ''}
              <span class="qr-card-status ${statusClass}">${statusText}</span>
            </div>
          </div>
          <button class="delete-btn" onclick="deleteQRCode('${qrcode.id}')" ${qrcode.isExpired ? 'disabled' : ''}>
            ${qrcode.isExpired ? 'Already Expired' : 'Expire Now'}
          </button>
        </div>
      `;
    }).join('');
  } catch (error) {
    qrList.innerHTML = `<div class="error">Error loading QR codes: ${error.message}</div>`;
  }
}

// Delete/expire QR code
async function deleteQRCode(id) {
  if (!confirm('Are you sure you want to expire this QR code?')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to expire QR code');
    }
    
    showSuccess('QR code expired successfully!');
    loadQRCodes();
  } catch (error) {
    showError(error.message);
  }
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error';
  errorDiv.textContent = message;
  
  // Remove existing error/success messages
  const existing = document.querySelector('.error, .success');
  if (existing) {
    existing.remove();
  }
  
  qrForm.insertAdjacentElement('afterend', errorDiv);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// Show success message
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success';
  successDiv.textContent = message;
  
  // Remove existing error/success messages
  const existing = document.querySelector('.error, .success');
  if (existing) {
    existing.remove();
  }
  
  qrForm.insertAdjacentElement('afterend', successDiv);
  
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

// Event listeners
qrForm.addEventListener('submit', (e) => {
  e.preventDefault();
  generateQRCode();
});

refreshBtn.addEventListener('click', loadQRCodes);
logoutBtn.addEventListener('click', logout);

// Initialize app
async function init() {
  const isAuthenticated = await checkAuth();
  if (isAuthenticated) {
    loadQRCodes();
    // Auto-refresh QR codes list every 30 seconds to update expiration status
    setInterval(loadQRCodes, 30000);
  }
}

// Start app when page loads
init();


# QR Code Generator

A web application that generates QR codes from URLs with support for both time-based and manual expiration. Features Google OAuth authentication for secure, user-isolated QR code management.

## Features

- **URL to QR Code Conversion**: Generate QR codes from any valid URL
- **Google OAuth Authentication**: Secure login with Google account
- **User Isolation**: Each user only sees and manages their own QR codes
- **Time-based Expiration**: Set expiration time in hours (optional)
- **Manual Expiration**: Manually expire/delete QR codes at any time
- **QR Code Descriptions**: Add optional descriptions to identify QR codes
- **QR Code Management**: View and manage all generated QR codes
- **Real-time Status**: See expiration status and time remaining for each QR code
- **Automatic Cleanup**: Expired QR codes are automatically cleaned up

## Prerequisites

- Node.js (v14 or higher)
- Google OAuth 2.0 credentials (Client ID and Client Secret)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Edit `.env` and add your credentials:
```env
SESSION_SECRET=your-random-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NODE_ENV=development
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/auth/google/callback`
   - Production: `https://yourdomain.com/auth/google/callback`
7. Copy the Client ID and Client Secret to your `.env` file

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. You'll be redirected to the login page. Click "Sign in with Google"

4. After authentication, you can:
   - Enter a URL and optionally add a description
   - Set an expiration time (in hours)
   - Click "Generate QR Code" to create a new QR code
   - View all your generated QR codes in the management section
   - Manually expire QR codes by clicking the "Expire Now" button

## API Endpoints

### Authentication

- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/logout` - Logout current user
- `GET /api/auth/me` - Get current user information

### QR Code Management (Requires Authentication)

### POST /api/qrcode/generate
Generate a new QR code (requires authentication).

**Request Body:**
```json
{
  "url": "https://example.com",
  "description": "My QR code description",
  "expirationHours": 24
}
```

**Response:**
```json
{
  "id": "uuid",
  "qrCodeDataUrl": "data:image/png;base64,...",
  "description": "My QR code description",
  "expiresAt": "2024-01-01T12:00:00.000Z"
}
```

### GET /api/qrcode
Get all QR codes for the authenticated user.

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "user-uuid",
    "url": "https://example.com",
    "description": "My QR code description",
    "qrCodeDataUrl": "data:image/png;base64,...",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "expiresAt": "2024-01-01T12:00:00.000Z",
    "isManuallyExpired": false,
    "isExpired": false
  }
]
```

### GET /api/qrcode/:id
Get a specific QR code by ID (only if it belongs to the authenticated user).

**Response:**
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "url": "https://example.com",
  "description": "My QR code description",
  "qrCodeDataUrl": "data:image/png;base64,...",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "expiresAt": "2024-01-01T12:00:00.000Z",
  "isManuallyExpired": false,
  "isExpired": false
}
```

### DELETE /api/qrcode/:id
Manually expire a QR code (only if it belongs to the authenticated user).

**Response:**
```json
{
  "message": "QR code expired successfully",
  "id": "uuid"
}
```

## Technology Stack

- **Backend**: Node.js with Express
- **Authentication**: Passport.js with Google OAuth 2.0
- **Session Management**: express-session
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **QR Code Generation**: `qrcode` npm package
- **Storage**: JSON file-based storage

## File Structure

```
QR_Code_Generator/
├── .env                    # Environment variables (not in git)
├── .env.example            # Example environment file
├── package.json
├── server.js                # Express server with OAuth
├── config/
│   └── passport.js          # Passport OAuth configuration
├── middleware/
│   └── auth.js              # Authentication middleware
├── storage/
│   ├── users.json          # User accounts (auto-created)
│   └── qrcodes.json        # QR codes (auto-created)
├── public/
│   ├── index.html          # Main application page
│   ├── login.html          # Login page
│   ├── styles.css          # Styling
│   └── app.js              # Frontend JavaScript
└── README.md
```

## Security Features

- **OAuth 2.0 Authentication**: Industry-standard authentication via Google
- **Session-based Security**: Secure httpOnly cookies for session management
- **User Isolation**: Each user can only access their own QR codes
- **HTTPS Support**: Secure cookies enabled in production mode
- **Password-free**: No password storage required

## Expiration Logic

- **Time-based Expiration**: QR codes expire automatically when the current time exceeds the `expiresAt` timestamp
- **Manual Expiration**: QR codes can be manually expired by setting `isManuallyExpired: true`
- **Combined**: A QR code is considered expired if either condition is true
- **Automatic Cleanup**: The server runs a cleanup job every hour to remove expired QR codes from storage

## Production Deployment

When deploying to production:

1. Set `NODE_ENV=production` in your `.env` file
2. Update `SESSION_SECRET` to a strong, random string
3. Update Google OAuth callback URL to your production domain
4. Ensure HTTPS is enabled (required for secure cookies)
5. Consider migrating to a database for better scalability

## License

ISC

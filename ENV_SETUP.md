# Environment Variables Setup

This app uses environment variables to configure the API base URL dynamically.

## Setup Instructions

### 1. Create `.env` file

Create a `.env` file in the `app` directory (if it doesn't exist) with the following content:

```env
# API Base URL - Change this to your backend server URL
EXPO_PUBLIC_API_BASE_URL=http://192.168.29.105:5000
```

**Note:** The `.env` file is already in `.gitignore` and will not be committed to version control.

### 2. Update API Base URL

To change the API base URL, simply update the `EXPO_PUBLIC_API_BASE_URL` value in your `.env` file:

```env
# For development on your local network
EXPO_PUBLIC_API_BASE_URL=http://192.168.29.105:5000

# For production
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

### 3. Restart the Expo server

After updating the `.env` file, restart your Expo development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
```

## How It Works

The API base URL is loaded in the following priority order:

1. **`EXPO_PUBLIC_API_BASE_URL`** from `.env` file (recommended)
2. **`API_BASE_URL`** from `.env` file (alternative)
3. **`apiBaseUrl`** from `app.config.js` extra field
4. **Fallback** to default development URL

## Environment Variable Naming

- Use `EXPO_PUBLIC_` prefix for variables that need to be accessible in your app code
- Variables without the prefix are only available in `app.config.js`

## Files Modified

- `app.config.js` - Reads environment variables and exposes them via `extra.apiBaseUrl`
- `src/utils/api.ts` - Uses the API base URL from environment variables
- `.env` - Your local environment configuration (not committed to git)
- `.env.example` - Example template (committed to git)

## Troubleshooting

If the API URL is not updating:

1. Make sure the `.env` file is in the `app` directory (same level as `app.config.js`)
2. Restart the Expo server after changing `.env`
3. Check the console logs - you should see: `📡 API_BASE_URL: <your-url>`
4. Verify the variable name is exactly `EXPO_PUBLIC_API_BASE_URL` (case-sensitive)


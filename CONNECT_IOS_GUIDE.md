# iOS Device Connection Guide

## Quick Fixes (Try these first)

### 1. Use Tunnel Mode (Recommended for iOS)
```bash
cd app
npm start -- --tunnel
```

This uses Expo's tunnel service which works even if devices are on different networks.

### 2. Use LAN Mode (If same WiFi)
```bash
cd app
npm start -- --lan
```

### 3. Check Windows Firewall
1. Open Windows Defender Firewall
2. Allow Node.js through firewall
3. Or temporarily disable firewall to test

## Step-by-Step Connection

### Option A: Using Expo Go App (Easiest)

1. **Install Expo Go on iOS:**
   - Download "Expo Go" from App Store

2. **Start Expo Server:**
   ```bash
   cd app
   npm start
   ```

3. **Connect Device:**
   - Scan QR code with Camera app (iOS 11+)
   - Or open Expo Go app and scan QR code
   - Or manually enter the URL shown in terminal

### Option B: Using Development Build (You have expo-dev-client)

Since you have `expo-dev-client` installed, you need a development build:

1. **Build Development Client:**
   ```bash
   cd app
   npx expo run:ios
   ```

   This builds and installs the app directly on your iOS device (requires Mac + Xcode)

2. **Or use EAS Build (Cloud):**
   ```bash
   npx eas build --profile development --platform ios
   ```

### Option C: Use Tunnel Mode (Works across networks)

```bash
cd app
npm start -- --tunnel
```

Then scan QR code with Expo Go app.

## Troubleshooting

### If "Unable to connect" error:

1. **Check your local IP:**
   - Your IP is: `192.168.1.22`
   - Make sure iOS device can ping this IP

2. **Try Tunnel Mode:**
   ```bash
   npm start -- --tunnel
   ```

3. **Check Firewall:**
   ```powershell
   # Allow Node.js through firewall
   New-NetFirewallRule -DisplayName "Node.js Expo" -Direction Inbound -Protocol TCP -LocalPort 8081,19000,19001,19002 -Action Allow
   ```

4. **Use Manual Connection:**
   - In Expo Go app, tap "Enter URL manually"
   - Enter: `exp://192.168.1.22:8081`

### If using Development Build:

1. **Make sure development build is installed:**
   ```bash
   npx expo run:ios
   ```

2. **Start Metro bundler:**
   ```bash
   npm start
   ```

3. **Shake device and select "Configure Bundler"**
   - Enter: `192.168.1.22:8081`

## Quick Commands

```bash
# Start with tunnel (works everywhere)
npm start -- --tunnel

# Start with LAN (same WiFi)
npm start -- --lan

# Start with localhost only
npm start -- --localhost

# Clear cache and start
npx expo start -c
```

## Still Not Working?

1. Check both devices are on same WiFi (not guest network)
2. Try tunnel mode: `npm start -- --tunnel`
3. Check Windows Firewall allows Node.js
4. Restart both devices
5. Clear Expo Go cache (shake device → Settings → Clear cache)

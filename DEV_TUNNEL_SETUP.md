# Dev Tunnel Setup for Anonymous Access

Your dev tunnel is currently requiring GitHub authentication. To allow anonymous access:

## Option 1: Using VS Code Dev Tunnels

1. Open Command Palette (Ctrl+Shift+P)
2. Type "Ports: Focus on Ports View"
3. Right-click on port 5000
4. Select "Port Visibility" → "Public"

## Option 2: Using devtunnel CLI

```bash
# Make the tunnel public (anonymous access)
devtunnel port update 5000 --access public

# Or recreate the tunnel with public access
devtunnel create --allow-anonymous
devtunnel port create -p 5000
devtunnel host
```

## Option 3: Use ngrok Instead

```bash
# Install ngrok from https://ngrok.com/download
ngrok http 5000
```

Then update your frontend/.env with the ngrok URL:
```
VITE_API_URL=https://your-ngrok-url.ngrok.io
VITE_WS_URL=wss://your-ngrok-url.ngrok.io
```

## Verify It's Working

After making the tunnel public, test with:
```bash
curl https://your-tunnel-url/health
```

You should see JSON response, not a GitHub login page.

## Current Issue

Your tunnel at `https://g7s0gwfg-5000.inc1.devtunnels.ms` is returning a GitHub authentication page instead of your API. This blocks all requests including CORS preflight checks.

Once you make the tunnel public and restart your backend server, the CORS configuration will work properly.

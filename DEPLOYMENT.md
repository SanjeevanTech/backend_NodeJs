# Deployment Guide - Node.js Backend

## ✅ Production Ready Checklist

Your backend-nodejs is ready for deployment with these files:
- ✅ `server.js` - Main Express server
- ✅ `package.json` - Dependencies
- ✅ `railway.json` - Railway configuration
- ✅ `.env.example` - Environment variables template

## Deploy to Railway

### Step 1: Push to GitHub
```bash
cd backend-nodejs
git add .
git commit -m "Ready for Railway deployment"
git push
```

### Step 2: Deploy on Railway
1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `backend-nodejs` repository
5. Railway will automatically detect Node.js and deploy

### Step 3: Environment Variables
Add these in Railway dashboard under "Variables":
- `MONGODB_URI` - Your MongoDB connection string
- `PYTHON_SERVER_URL` - Your Python backend URL: `https://backendpython-production-0ade.up.railway.app`
- `PORT` - Railway sets this automatically
- `PRICE_PER_KM` - Price per kilometer (default: 25)

### Step 4: Generate Domain
1. Go to "Settings" tab
2. Click "Generate Domain"
3. Get your URL: `https://backend-nodejs-production-xxxx.up.railway.app`

## Important Configuration

Your Node.js backend connects to the Python backend for real-time data. Make sure:
1. Python backend is deployed first: ✅ `https://backendpython-production-0ade.up.railway.app`
2. Set `PYTHON_SERVER_URL` environment variable in Railway
3. Both backends use the same MongoDB database

## Test Your Deployment

Once deployed, test these endpoints:

```bash
# Replace YOUR_URL with your Railway URL

# Check server status
curl https://YOUR_URL/api/passengers

# Check trips
curl https://YOUR_URL/api/trips?date=2025-11-11

# Check stats
curl https://YOUR_URL/api/stats

# Check unmatched passengers
curl https://YOUR_URL/api/unmatched
```

## API Endpoints

### Passenger Management
- `GET /api/passengers` - Get all passengers (with pagination)
- `GET /api/passengers/date-range` - Get passengers by date range
- `GET /api/stats` - Get statistics

### Trip Management
- `GET /api/trips` - Get scheduled trips
- `GET /api/trip/current` - Get current trip status (proxied to Python)
- `GET /api/scheduled-trips` - Get scheduled trips with status

### Unmatched Passengers
- `GET /api/unmatched` - Get unmatched passengers

### Configuration
- `GET /api/fare/*` - Fare management routes
- `GET /api/season-ticket/*` - Season ticket routes
- `GET /api/bus-routes/*` - Bus route management
- `GET /api/waypoint-groups/*` - Waypoint management

### Python Backend Proxy
- `GET /api/python/*` - Proxy to Python backend
- `GET /api/python-stats` - Real-time stats from Python

## Monitoring

Railway provides:
- Real-time logs
- Metrics (CPU, Memory, Network)
- Automatic restarts on failure

Access logs in Railway dashboard → Your Project → "Deployments" tab

## Architecture

```
ESP32 Devices → Python Backend (Face Recognition) → MongoDB
                       ↓
                Node.js Backend (API & Data Management) → Frontend
```

## Need Help?

If deployment fails:
1. Check Railway logs for error messages
2. Verify all environment variables are set
3. Make sure MongoDB connection string is correct
4. Verify Python backend URL is accessible

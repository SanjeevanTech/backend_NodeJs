# Quick Deploy to Render

## 🚀 One-Click Deployment Steps

### 1. Prepare Your Repository
```bash
cd backend-nodejs
git add .
git commit -m "Ready for Render deployment"
git push
```

### 2. Deploy on Render

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Sign in with GitHub

2. **Create New Web Service**
   - Click "New +" button
   - Select "Web Service"
   - Connect your GitHub account (if not already connected)
   - Select your repository: `backend-nodejs`

3. **Configure Service**
   Render will auto-detect settings from `render.yaml`, but verify:
   - **Name**: `bus-tracking-nodejs` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for better performance)

4. **Set Environment Variables**
   Click "Advanced" and add these environment variables:
   
   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | `mongodb+srv://sanjeeBusPassenger:Hz3czXqVoc4ThTiO@buspassenger.lskaqo5.mongodb.net/bus_passenger_db?retryWrites=true&w=majority&appName=BusPassenger` |
   | `PYTHON_SERVER_URL` | `https://backendpython-production-0ade.up.railway.app` |
   | `PRICE_PER_KM` | `25` |
   | `NODE_ENV` | `production` |

5. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - Your service will be live at: `https://bus-tracking-nodejs.onrender.com`

### 3. Test Your Deployment

Once deployed, test these endpoints:

```bash
# Replace YOUR_RENDER_URL with your actual Render URL

# Check passengers
curl https://YOUR_RENDER_URL/api/passengers

# Check trips
curl https://YOUR_RENDER_URL/api/trips?date=2025-11-11

# Check stats
curl https://YOUR_RENDER_URL/api/stats

# Check Python backend connection
curl https://YOUR_RENDER_URL/api/python-stats
```

### 4. Update Frontend Configuration

Once your Node.js backend is deployed, update your frontend to use the new URL:

```javascript
// In your frontend .env file
VITE_API_URL=https://YOUR_RENDER_URL
```

## 📊 Architecture

```
ESP32 Devices 
    ↓
Python Backend (Railway)
    ↓
MongoDB Atlas
    ↓
Node.js Backend (Render) ← Your Frontend
```

## 🔧 Troubleshooting

### Deployment Failed
- Check Render logs in the dashboard
- Verify all environment variables are set correctly
- Make sure MongoDB URI is accessible

### Can't Connect to Python Backend
- Verify `PYTHON_SERVER_URL` is correct
- Test Python backend: `curl https://backendpython-production-0ade.up.railway.app/status`

### MongoDB Connection Error
- Check if MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
- Verify MongoDB URI is correct

## 💡 Tips

1. **Free Tier Limitations**
   - Render free tier spins down after 15 minutes of inactivity
   - First request after spin-down takes ~30 seconds
   - Consider upgrading for production use

2. **Environment Variables**
   - Never commit `.env` file to GitHub
   - Always use Render's environment variable settings

3. **Monitoring**
   - Check Render dashboard for logs
   - Monitor MongoDB Atlas for connection issues
   - Use Render metrics for performance tracking

## 🎉 Success!

Your Node.js backend is now live on Render and connected to:
- ✅ Python backend on Railway
- ✅ MongoDB Atlas database
- ✅ Ready for frontend integration

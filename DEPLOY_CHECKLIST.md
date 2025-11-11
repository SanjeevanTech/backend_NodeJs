# ✅ Deployment Checklist - Node.js Backend to Render

## Pre-Deployment Checklist

- [x] `.env` file created with Python backend URL
- [x] `render.yaml` configuration file created
- [x] Environment variables documented
- [x] Python backend is live at Railway
- [x] MongoDB connection string ready
- [x] All dependencies in `package.json`

## Deployment Steps

### Step 1: Push to GitHub ⬜
```bash
cd backend-nodejs
git add .
git commit -m "Ready for Render deployment"
git push
```

### Step 2: Create Render Account ⬜
- Go to https://render.com
- Sign up/Sign in with GitHub
- Connect your GitHub account

### Step 3: Create New Web Service ⬜
1. Click "New +" → "Web Service"
2. Select your repository: `backend-nodejs`
3. Render will detect `render.yaml` automatically

### Step 4: Configure Environment Variables ⬜
Set these in Render dashboard:

```
MONGODB_URI=mongodb+srv://sanjeeBusPassenger:Hz3czXqVoc4ThTiO@buspassenger.lskaqo5.mongodb.net/bus_passenger_db?retryWrites=true&w=majority&appName=BusPassenger

PYTHON_SERVER_URL=https://backendpython-production-0ade.up.railway.app

NODE_ENV=production
```

**Note:** Price calculation is handled by Python backend, not Node.js.

### Step 5: Deploy ⬜
- Click "Create Web Service"
- Wait for build to complete (2-3 minutes)
- Note your Render URL: `https://__________.onrender.com`

### Step 6: Test Deployment ⬜

Test these endpoints (replace YOUR_URL):

```bash
# Test passengers endpoint
curl https://YOUR_URL/api/passengers

# Test trips endpoint
curl https://YOUR_URL/api/trips?date=2025-11-11

# Test stats
curl https://YOUR_URL/api/stats

# Test Python backend connection
curl https://YOUR_URL/api/python-stats
```

### Step 7: Update Frontend ⬜
Update your frontend `.env` file with the new backend URL:
```
VITE_API_URL=https://YOUR_RENDER_URL
```

## Post-Deployment Verification

### Check These Items:
- [ ] Node.js backend is accessible
- [ ] Can fetch passengers from `/api/passengers`
- [ ] Can fetch trips from `/api/trips`
- [ ] Python backend proxy works (`/api/python-stats`)
- [ ] MongoDB connection is working
- [ ] No CORS errors in browser console
- [ ] Frontend can connect to backend

## Troubleshooting

### If deployment fails:
1. Check Render logs in dashboard
2. Verify all environment variables are set
3. Check MongoDB Atlas network access (allow 0.0.0.0/0)
4. Verify Python backend is accessible

### If Python backend connection fails:
```bash
# Test Python backend directly
curl https://backendpython-production-0ade.up.railway.app/status
```

### If MongoDB connection fails:
- Check MongoDB Atlas → Network Access
- Ensure "Allow access from anywhere" is enabled
- Verify connection string is correct

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ Render shows "Live" status
- ✅ All test endpoints return data
- ✅ Python backend proxy works
- ✅ Frontend can fetch data
- ✅ No errors in Render logs

## 📞 Support

If you encounter issues:
1. Check `DEPLOYMENT.md` for detailed instructions
2. Review `RENDER_DEPLOY.md` for quick start guide
3. Check Render documentation: https://render.com/docs
4. Review logs in Render dashboard

## 🔗 Important URLs

- **Render Dashboard**: https://dashboard.render.com
- **Python Backend**: https://backendpython-production-0ade.up.railway.app
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Your Node.js Backend**: (will be assigned after deployment)

---

**Ready to deploy?** Start with Step 1! 🚀

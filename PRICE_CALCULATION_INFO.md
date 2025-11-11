# 💰 Price Calculation - How It Works

## ❓ Why No PRICE_PER_KM in Node.js Backend?

You noticed that `PRICE_PER_KM` was mentioned in the deployment docs. Good catch! **It's actually NOT needed** for the Node.js backend.

## 🔍 How Price Calculation Works

### Python Backend (Railway) - Does the Calculation ✅
The **Python backend** (`simplified_bus_server.py`) calculates the fare when a passenger completes their journey:

1. **Calculates distance** between entry and exit GPS coordinates
2. **Determines stage number** (3.5 km per stage)
3. **Looks up fare** from MongoDB `fareStages` collection
4. **Stores the price** in the `busPassengerList` collection

**Code location:** `backend-python/simplified_bus_server.py` - `calculate_fare()` function

### Node.js Backend (Render) - Just Reads the Data ✅
The **Node.js backend** (`server.js`) only:

1. **Reads** passenger data from MongoDB (price already calculated)
2. **Displays** the price to the frontend
3. **Calculates totals** for statistics (sum of existing prices)

**Code comment in server.js (line 111-113):**
```javascript
// Price is calculated by Python server and stored in database
// No need to recalculate here
```

## 📊 Data Flow

```
ESP32 → Python Backend → Calculate Fare → Save to MongoDB
                                              ↓
                                         (price stored)
                                              ↓
                          Node.js Backend → Read from MongoDB → Frontend
```

## 🗄️ Where Fare Stages Are Stored

Fare stages are stored in MongoDB collection: `fareStages`

Example:
```json
{
  "stage_number": 1,
  "distance_km": 3.5,
  "price": 25
}
```

## ✅ Conclusion

**You DON'T need `PRICE_PER_KM` in Node.js backend** because:
- ✅ Python backend handles all fare calculations
- ✅ Prices are stored in MongoDB
- ✅ Node.js backend just reads the stored prices

I've removed `PRICE_PER_KM` from all deployment files! 🎉

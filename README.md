# Bus Passenger Tracking System - Node.js Backend

Main API server for the Bus Passenger Tracking System.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and update:
```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
PYTHON_SERVER_URL=https://backendpython-production-0ade.up.railway.app
PRICE_PER_KM=25
```

## Running

```bash
# Development
npm run dev

# Production
npm start
```

## Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## API Endpoints

### Passenger Management
- `GET /api/passengers` - Get all passengers (with pagination)
- `GET /api/passengers/date-range` - Get passengers by date range
- `GET /api/stats` - Get statistics

### Trip Management
- `GET /api/trips` - Get scheduled trips
- `GET /api/trip/current` - Get current trip status
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

## License

ISC

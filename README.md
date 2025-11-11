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
```

## Running

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

- `GET /api/passengers` - Get all passengers
- `POST /api/passengers` - Add new passenger
- `GET /api/trips` - Get all trips
- `POST /api/trips` - Create new trip
- `GET /api/season-tickets` - Get season tickets

## License

ISC

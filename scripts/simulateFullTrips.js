const axios = require('axios');
const mongoose = require('mongoose');
const BusSchedule = require('../models/BusSchedule');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const PYTHON_SERVER_URL = 'http://127.0.0.1:8888';
const BUS_ID = 'BUS_JC_001';
const ROUTE_NAME = 'Jaffna-Colombo';

// Stops (from our previous update)
const STOPS = [
    { name: "Jaffna Bus Stand", lat: 9.6615, lon: 80.0255 },
    { name: "Chavakachcheri", lat: 9.6500, lon: 80.1500 },
    { name: "Kodikamam", lat: 9.6801, lon: 80.2223 },
    { name: "Kilinochchi", lat: 9.3961, lon: 80.3982 },
    { name: "Mankulam", lat: 9.1242, lon: 80.4408 },
    { name: "Puliyankulam", lat: 8.9738, lon: 80.5272 },
    { name: "Omanthai", lat: 8.8667, lon: 80.5000 },
    { name: "Vavuniya", lat: 8.7514, lon: 80.4971 },
    { name: "Medawachchiya", lat: 8.5520, lon: 80.4550 },
    { name: "Colombo", lat: 6.9271, lon: 79.8612 }
];

// Helper to generate a random embedding
// For matching to work, vectors must be similar (cosine similarity > 0.7)
function generateEmbedding(id, variation = 0.0) {
    // Determine a seed based on ID
    let seed = 0;
    for (let i = 0; i < id.length; i++) seed += id.charCodeAt(i);

    // Generate base vector
    const vector = [];
    for (let i = 0; i < 128; i++) {
        const val = Math.sin(seed * (i + 1));
        // Add slight noise if variation is requested
        const noise = variation ? (Math.random() - 0.5) * variation : 0;
        vector.push(val + noise);
    }
    return vector;
}

// Helper to create a log entry
function createLog(type, passengerId, stopIndex, timeOffsetMinutes) {
    const stop = STOPS[stopIndex];
    const timestamp = new Date();
    timestamp.setHours(8, 0, 0, 0); // Start at 08:00
    timestamp.setMinutes(timestamp.getMinutes() + timeOffsetMinutes);

    // For matched passengers, ensure embedding is similar but not identical
    // Unmatched/New faces get new IDs/Embeddings
    const embedding = generateEmbedding(passengerId, 0.05); // 5% variation

    return {
        device_id: type === 'ENTRY' ? 'ESP32_ENTRY_001' : 'ESP32_EXIT_001',
        bus_id: BUS_ID,
        logs: [{
            face_id: parseInt(passengerId.replace('P', '')),
            timestamp: timestamp.toISOString(),
            latitude: stop.lat,
            longitude: stop.lon,
            face_embedding: embedding,
            embedding_size: 128,
            image_quality: 0.95,
            location_type: type
        }]
    };
}

async function setupSchedules() {
    console.log('📅 Setting up schedules...');
    await mongoose.connect(process.env.MONGODB_URI);

    const today = new Date().toISOString().split('T')[0];

    const scheduleData = {
        bus_id: BUS_ID,
        route_name: ROUTE_NAME,
        trips: [
            {
                trip_name: "Morning Express",
                direction: "Jaffna-Colombo",
                route: ROUTE_NAME,
                boarding_start_time: "08:00",
                departure_time: "08:15",
                estimated_arrival_time: "16:00",
                active: true
            },
            {
                trip_name: "Evening Return",
                direction: "Colombo-Jaffna",
                route: ROUTE_NAME,
                boarding_start_time: "16:00",
                departure_time: "16:15",
                estimated_arrival_time: "23:00",
                active: true
            }
        ],
        updated_at: new Date()
    };

    await BusSchedule.updateOne(
        { bus_id: BUS_ID },
        { $set: scheduleData },
        { upsert: true }
    );
    console.log('✅ Schedules created for', BUS_ID);
}

async function sendLog(type, payload) {
    try {
        const endpoint = type === 'ENTRY' ? '/api/entry-logs' : '/api/exit-logs';
        const url = `${PYTHON_SERVER_URL}${endpoint}`;

        console.log(`📡 Sending ${type} log for Face ${payload.logs[0].face_id} at ${payload.logs[0].timestamp}...`);
        await axios.post(url, payload);
        console.log(`   ✅ Sent successfully`);

        // Small delay to prevent overwhelming
        await new Promise(r => setTimeout(r, 500));
    } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
    }
}

async function simulateTrip1() {
    console.log('\n🚌 --- SIMULATING TRIP 1 (Morning) ---');
    console.log('   Context: Jaffna -> Colombo (08:00 Start)');

    // 1. Force Trip Start Context (act like ESP32 asking for context)
    // The Python server auto-starts if we provide trip times in query params
    try {
        await axios.get(`${PYTHON_SERVER_URL}/api/trip-context`, {
            params: {
                bus_id: BUS_ID,
                trip_start: "08:00",
                trip_end: "16:00"
            }
        });
        console.log('✅ Trip Context initialized (Morning)');
    } catch (e) {
        console.log('⚠️ Could not set context:', e.message);
    }

    // Passengers:
    // P1: Matched (Jaffna -> Mankulam)
    // P2: Unmatched Entry (Jaffna -> No Exit)
    // P3: Matched (Chavakachcheri -> Colombo)
    // P4: Unmatched Exit (No Entry -> Colombo)

    // --- STOP 1: Jaffna (08:15) ---
    console.log('\n📍 Stop 1: Jaffna Bus Stand');
    await sendLog('ENTRY', createLog('ENTRY', 'P1', 0, 15)); // P1 Enter
    await sendLog('ENTRY', createLog('ENTRY', 'P2', 0, 20)); // P2 Enter

    // --- STOP 2: Chavakachcheri (08:45) ---
    console.log('\n📍 Stop 2: Chavakachcheri');
    await sendLog('ENTRY', createLog('ENTRY', 'P3', 1, 45)); // P3 Enter

    // --- STOP 5: Mankulam (11:00) ---
    console.log('\n📍 Stop 5: Mankulam');
    await sendLog('EXIT', createLog('EXIT', 'P1', 4, 180)); // P1 Exit (Matched!)

    // --- STOP 10: Colombo (16:00) ---
    console.log('\n📍 Stop 10: Colombo');
    await sendLog('EXIT', createLog('EXIT', 'P3', 9, 480)); // P3 Exit (Matched!)
    await sendLog('EXIT', createLog('EXIT', 'P4', 9, 485)); // P4 Exit (Unmatched - No Entry)
}

async function simulateTrip2() {
    console.log('\n🚌 --- SIMULATING TRIP 2 (Evening) ---');
    console.log('   Context: Colombo -> Jaffna (16:00 Start)');

    // 1. Force Trip Start Context
    try {
        await axios.get(`${PYTHON_SERVER_URL}/api/trip-context`, {
            params: {
                bus_id: BUS_ID,
                trip_start: "16:00",
                trip_end: "23:00"
            }
        });
        console.log('✅ Trip Context initialized (Evening)');
    } catch (e) {
        console.log('⚠️ Could not set context:', e.message);
    }

    // Passengers:
    // P5: Matched (Colombo -> Jaffna)
    // P6: Matched (Colombo -> Vavuniya)

    // --- STOP 10 (Start of Return): Colombo (16:15) ---
    console.log('\n📍 Stop: Colombo');
    await sendLog('ENTRY', createLog('ENTRY', 'P5', 9, 495)); // P5 Enter (using cumulative minutes from morning base 08:00, so 16:15 is +495)
    await sendLog('ENTRY', createLog('ENTRY', 'P6', 9, 500)); // P6 Enter

    // --- STOP 8: Vavuniya (19:00 -> +660 min) ---
    console.log('\n📍 Stop: Vavuniya');
    await sendLog('EXIT', createLog('EXIT', 'P6', 7, 660)); // P6 Exit

    // --- STOP 1: Jaffna (23:00 -> +900 min) ---
    console.log('\n📍 Stop: Jaffna');
    await sendLog('EXIT', createLog('EXIT', 'P5', 0, 900)); // P5 Exit
}

const run = async () => {
    try {
        await setupSchedules();

        // Wait a moment for DB to sync
        await new Promise(r => setTimeout(r, 2000));

        await simulateTrip1();

        // Wait between trips
        console.log('\n⏳ Waiting between trips...');
        await new Promise(r => setTimeout(r, 2000));

        await simulateTrip2();

        console.log('\n✨ Simulation Complete!');
        console.log('data available in: busPassengerList, unmatchedPassengers, active_trips');
        process.exit(0);
    } catch (error) {
        console.error('❌ Fatal Error:', error);
        process.exit(1);
    }
};

run();

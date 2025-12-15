/**
 * Find correct stage distance for 10 km = Rs. 66
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function findCorrectStageDistance() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const fareStages = await db.collection('fareStages').find({ is_active: true }).sort({ stage_number: 1 }).toArray();

    // Find which stage has Rs. 66
    const stage66 = fareStages.find(s => s.fare === 66);
    console.log('Stage with Rs. 66:', stage66 ? stage66.stage_number : 'Not found');

    // Calculate what stage distance would make 10 km = Stage 5
    console.log('\n--- CALCULATION ---');
    console.log('If 10 km should give Rs. 66 (Stage 5):');
    console.log('  Stage distance = 10 km / 5 = 2 km per stage');

    // Test with 2 km per stage
    const testDistances = [5, 10, 15, 17.5, 20];
    console.log('\n--- With 2 km per stage ---');
    for (const d of testDistances) {
        const stage = Math.ceil(d / 2);
        const fareSt = fareStages.find(s => s.stage_number === stage);
        console.log(`${d} km -> Stage ${stage} -> Rs. ${fareSt ? fareSt.fare : 'N/A'}`);
    }

    console.log('\n--- With 3.5 km per stage (current) ---');
    for (const d of testDistances) {
        const stage = Math.ceil(d / 3.5);
        const fareSt = fareStages.find(s => s.stage_number === stage);
        console.log(`${d} km -> Stage ${stage} -> Rs. ${fareSt ? fareSt.fare : 'N/A'}`);
    }

    await mongoose.disconnect();
}

findCorrectStageDistance();

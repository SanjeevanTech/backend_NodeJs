const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Adjust path if running from scripts dir

const clearDatabase = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://sanjeeBusPassenger:Hz3czXqVoc4ThTiO@buspassenger.lskaqo5.mongodb.net/bus_passenger_db?retryWrites=true&w=majority&appName=BusPassenger';

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        const collections = await mongoose.connection.db.collections();

        if (collections.length === 0) {
            console.log('No collections found to clear.');
        }

        for (const collection of collections) {
            const name = collection.collectionName;
            if (name.startsWith('system.')) continue;

            const count = await collection.countDocuments();
            if (count > 0) {
                await collection.deleteMany({});
                console.log(`🗑️  Cleared collection: ${name} (${count} documents removed)`);
            } else {
                console.log(`ℹ️  Collection ${name} is already empty.`);
            }
        }

        console.log('✨ All data cleared successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
};

clearDatabase();

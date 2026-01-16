const mongoose = require('mongoose');
const WaypointGroup = require('../models/WaypointGroup');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const seedWaypoints = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const groupName = "Jaffna to colombo";

        // Define the full list of waypoints
        const waypointsData = [
            { name: "Jaffna Bus Stand", latitude: 9.6615, longitude: 80.0255, order: 1 },
            { name: "Chavakachcheri", latitude: 9.6500, longitude: 80.1500, order: 2 },
            { name: "Kodikamam", latitude: 9.6801, longitude: 80.2223, order: 3 },
            { name: "Kilinochchi", latitude: 9.3961, longitude: 80.3982, order: 4 },
            { name: "Mankulam", latitude: 9.1242, longitude: 80.4408, order: 5 },
            { name: "Puliyankulam", latitude: 8.9738, longitude: 80.5272, order: 6 },
            { name: "Omanthai", latitude: 8.8667, longitude: 80.5000, order: 7 },
            { name: "Vavuniya", latitude: 8.7514, longitude: 80.4971, order: 8 },
            { name: "Medawachchiya", latitude: 8.5520, longitude: 80.4550, order: 9 },
            { name: "Colombo", latitude: 6.9271, longitude: 79.8612, order: 10 }
        ];

        // Check if group already exists
        let existingGroup = await WaypointGroup.findOne({ group_name: groupName });

        if (existingGroup) {
            console.log(`⚠️  Waypoint Group "${groupName}" already exists. Updating waypoints...`);
            existingGroup.waypoints = waypointsData;
            existingGroup.updated_at = new Date();
            await existingGroup.save();
            console.log(`✅ Waypoint Group "${groupName}" updated successfully with ${waypointsData.length} waypoints.`);
        } else {
            // Create new waypoint group
            // Generate ID
            const count = await WaypointGroup.countDocuments();
            const groupId = `WG_${(count + 1).toString().padStart(3, '0')}`;

            const newGroup = new WaypointGroup({
                group_id: groupId,
                group_name: groupName,
                region: "Northern",
                waypoints: waypointsData,
                is_active: true
            });

            await newGroup.save();
            console.log(`✅ Waypoint Group "${groupName}" created successfully with ID ${groupId} and ${waypointsData.length} waypoints.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding waypoint group:', error.message);
        process.exit(1);
    }
};

seedWaypoints();

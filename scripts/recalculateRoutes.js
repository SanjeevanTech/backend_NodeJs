const mongoose = require('mongoose');
const BusRoute = require('../models/BusRoute');
const WaypointGroup = require('../models/WaypointGroup');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Helper to calculate distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

const recalculateRoutes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const routes = await BusRoute.find({});
        console.log(`Found ${routes.length} routes to check.`);

        for (const route of routes) {
            if (route.waypoint_groups && route.waypoint_groups.length > 0) {
                console.log(`🔄 Recalculating route: ${route.route_name}`);

                // Re-fetch groups to ensure we have latest coordinates
                let finalStops = [];
                let stopOrder = 1;
                let cumulativeDistance = 0;
                let previousStop = null;

                const sortedGroups = route.waypoint_groups.sort((a, b) => a.order - b.order);

                let groupsFound = true;

                for (const groupRef of sortedGroups) {
                    const group = await WaypointGroup.findOne({ group_id: groupRef.group_id });

                    if (group) {
                        for (const waypoint of group.waypoints) {
                            if (previousStop) {
                                const dist = getDistanceFromLatLonInKm(
                                    previousStop.latitude, previousStop.longitude,
                                    waypoint.latitude, waypoint.longitude
                                );
                                cumulativeDistance += dist;
                            }

                            finalStops.push({
                                stop_name: waypoint.name,
                                latitude: waypoint.latitude,
                                longitude: waypoint.longitude,
                                stop_order: stopOrder++,
                                distance_from_start_km: parseFloat(cumulativeDistance.toFixed(2))
                            });

                            previousStop = waypoint;
                        }
                    } else {
                        console.log(`⚠️ Group ${groupRef.group_id} not found for route ${route.route_name}`);
                        groupsFound = false;
                    }
                }

                if (groupsFound) {
                    route.stops = finalStops;
                    route.total_distance_km = parseFloat(cumulativeDistance.toFixed(2));
                    await route.save();
                    console.log(`__✅ Updated ${route.route_name}: Distance ${cumulativeDistance.toFixed(2)} km`);
                }
            } else {
                console.log(`Skipping manual route: ${route.route_name}`);
            }
        }

        console.log('✨ Done recalculating routes.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

recalculateRoutes();

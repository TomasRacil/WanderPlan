import { get, set, del, keys } from 'idb-keyval';
import { generateId } from '../utils/idGenerator';
import { migrateLegacyState } from '../store/migration';

const CURRENT_TRIP_KEY = 'wanderplan_current_trip';
const TRIP_PREFIX = 'trip_';
const TRIPS_META_KEY = 'wanderplan_trips_meta';

// Helper to get trip key
const getTripKey = (id) => `${TRIP_PREFIX}${id}`;

export const storage = {
    // Load the list of available trips (metadata only)
    async getTripsList() {
        // 1. Load explicit metadata index
        let meta = await get(TRIPS_META_KEY) || [];

        // 2. MIGRATION CHECK: Check if "legacy" current trip exists and hasn't been migrated
        try {
            const legacyTrip = await get(CURRENT_TRIP_KEY);
            if (legacyTrip) {
                // Correctly migrate using the migration utility
                console.log("Migrating legacy trip found...", legacyTrip);
                const migrated = migrateLegacyState(legacyTrip);

                if (migrated && migrated.trip && migrated.trip.tripDetails) {
                    const tripId = migrated.trip.tripDetails.id || generateId('trip');
                    migrated.trip.tripDetails.id = tripId; // Ensure ID matches

                    // Save as a new proper trip
                    await set(getTripKey(tripId), migrated);

                    // Add to meta list temporarily (will be processed by refresher below)
                    meta.unshift({ id: tripId, updatedAt: new Date().toISOString() });

                    // DELETE legacy key to prevent loop
                    await del(CURRENT_TRIP_KEY);
                }
            }
        } catch (e) {
            console.error("Migration failed", e);
        }

        // 3. METADATA REFRESH & REPAIR
        // Iterate ALL trips in meta to ensure metadata matches actual data.
        // This fixes "Untitled Trip" issues if the data exists but meta is stale/wrong.
        const uniqueIds = new Set();
        const refinedMeta = [];

        // Sort by recency first to keep the latest of duplicates if any
        meta.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

        for (const m of meta) {
            if (uniqueIds.has(m.id)) continue; // Skip duplicates
            uniqueIds.add(m.id);

            try {
                // Load the actual trip source of truth
                let tripData = await get(getTripKey(m.id));

                if (!tripData) {
                    // Trip file missing? Skip it (effectively deletes from dashboard)
                    console.warn(`Trip file ${m.id} missing, removing from index.`);
                    continue;
                }

                // Check for Broken/Legacy structure (Mixed Flat + Nested)
                // Recovery: If tripDetails is at root but not in trip.tripDetails, or trip.tripDetails is empty
                if (tripData.tripDetails && (!tripData.trip?.tripDetails?.destination)) {
                    console.log(`Detected incomplete migration for ${m.id}, repairing...`);
                    const { trip, ...cleanLegacy } = tripData;
                    const migrated = migrateLegacyState(cleanLegacy);
                    if (migrated) {
                        tripData = migrated;
                        tripData.trip.tripDetails.id = m.id; // Preserve ID
                        await set(getTripKey(m.id), tripData); // Save repaired
                    }
                }

                // Construct fresh metadata
                const details = tripData.trip?.tripDetails || {};

                refinedMeta.push({
                    id: m.id,
                    destination: details.destination || 'Untitled Trip',
                    startDate: details.startDate,
                    endDate: details.endDate,
                    coverImage: details.coverImage,
                    cost: details.budget, // Cache primitive data for list view
                    currency: details.homeCurrency || details.tripCurrency || 'USD',
                    updatedAt: m.updatedAt || new Date().toISOString() // Keep existing timestamp or rough it
                });

            } catch (err) {
                console.error(`Error processing trip ${m.id}`, err);
                // Keep existing meta if load failed, as a fallback? 
                // Or skip? Better to keep it to avoid data loss visibility.
                refinedMeta.push(m);
            }
        }

        // Save cleaned meta
        await set(TRIPS_META_KEY, refinedMeta);

        return refinedMeta.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    },

    // Save a full trip state
    async saveTrip(tripState) {
        if (!tripState || !tripState.trip || !tripState.trip.tripDetails) return;

        // Ensure ID
        let tripId = tripState.trip.tripDetails.id;
        if (!tripId) {
            tripId = generateId('trip');
            tripState.trip.tripDetails.id = tripId;
        }

        // 1. Save full data
        await set(getTripKey(tripId), tripState);

        // 2. Update metadata index
        const meta = await get(TRIPS_META_KEY) || [];
        const index = meta.findIndex(t => t.id === tripId);

        const metaItem = {
            id: tripId,
            destination: tripState.trip.tripDetails.destination || 'New Trip',
            startDate: tripState.trip.tripDetails.startDate,
            endDate: tripState.trip.tripDetails.endDate,
            coverImage: tripState.trip.tripDetails.coverImage,
            cost: tripState.trip.tripDetails.budget, // Cache primitive data for list view
            currency: tripState.trip.tripDetails.homeCurrency || tripState.trip.tripDetails.tripCurrency || 'USD',
            updatedAt: new Date().toISOString()
        };

        if (index > -1) {
            meta[index] = metaItem;
        } else {
            meta.unshift(metaItem);
        }

        await set(TRIPS_META_KEY, meta);
        return tripId;
    },

    // Load a specific trip
    async loadTrip(id) {
        if (!id) return null;
        return await get(getTripKey(id));
    },

    // Delete a trip
    async deleteTrip(id) {
        if (!id) return;
        await del(getTripKey(id));

        const meta = await get(TRIPS_META_KEY) || [];
        const newMeta = meta.filter(t => t.id !== id);
        await set(TRIPS_META_KEY, newMeta);
    }
};

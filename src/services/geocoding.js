/**
 * Geocoding Service
 * Uses Nominatim API (OpenStreetMap) for location matching.
 */

/**
 * Performs a search against the Nominatim API.
 * @param {string} query - The search query
 * @param {object} options - Optional constraints (lon/lat for bias - mapping to viewbox in Nominatim)
 * @returns {Promise<object|null>} - Geocoding result with display_name, lat, lon
 */
export const formatAddress = (addr, defaultDisplayName) => {
    if (!addr) return defaultDisplayName;
    const parts = [];
    // Check all common house number keys
    const hNo = addr.house_number || addr.housenumber || addr.houseNumber;
    // Check all common street/road keys
    const road = addr.road || addr.street || addr.pedestrian || addr.path || addr.name || addr.suburb;

    if (hNo) parts.push(hNo);
    if (road) parts.push(road);
    if (addr.suburb || addr.neighbourhood) {
        const sub = addr.suburb || addr.neighbourhood;
        if (sub !== road) parts.push(sub);
    }
    if (addr.city || addr.town || addr.village || addr.municipality) {
        const city = addr.city || addr.town || addr.village || addr.municipality;
        if (city !== road) parts.push(city);
    }
    if (addr.country) parts.push(addr.country);

    return parts.length >= 2 ? parts.join(', ') : defaultDisplayName;
};

/**
 * Fetches timezone for given coordinates.
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<string|null>}
 */
export const fetchTimezone = async (lat, lng) => {
    try {
        const url = `https://www.timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lng}`;
        const res = await fetch(url);

        if (res.ok) {
            const data = await res.json();
            return data.timeZone;
        }
        return null;
    } catch (e) {
        console.warn("Timezone fetch failed", e);
        return null;
    }
};

export const searchMapLocation = async (query, options = {}) => {
    try {
        // Nominatim usage policy requires a delay between requests
        // Skip in tests to avoid timeouts
        if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
            await new Promise(r => setTimeout(r, 1000));
        }

        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;

        // No direct lon/lat bias in search-only, but we can provide a bounded box or just rely on query specificity
        // For simple transition, we'll keep it basic but robust

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'WanderPlan/1.0' // Required by Nominatim policy
            }
        });
        const data = await res.json();

        // Handle both Array (Nominatim format=json) and FeatureCollection (GeoJSON/Photon)
        let item = null;
        if (Array.isArray(data) && data.length > 0) {
            item = data[0];
        } else if (data && data.features && data.features.length > 0) {
            const f = data.features[0];
            item = {
                lat: f.geometry.coordinates[1],
                lon: f.geometry.coordinates[0],
                display_name: f.properties.display_name || f.properties.name,
                address: f.properties
            };
        }

        if (item) {
            return {
                display_name: formatAddress(item.address, item.display_name),
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                raw: item
            };
        }
        return null;
    } catch (e) {
        console.warn("Geocoding fetch failed for", query, e);
        return null;
    }
};

/**
 * Enhances AI-generated JSON content with precise coordinates and formatted addresses.
 * @param {object} json - The generated content (adds/updates)
 * @param {object} tripDetails - Global trip configuration (destination, travelers, etc)
 * @param {array} existingItinerary - Current itinerary for local context biasing
 */
export const enhanceWithGeocoding = async (json, tripDetails, existingItinerary = []) => {
    const itemsToGeocode = [];

    if (json.adds) itemsToGeocode.push(...json.adds);
    if (json.updates) {
        json.updates.forEach(u => {
            if (u.fields && (u.fields.location || u.fields.endLocation)) itemsToGeocode.push(u.fields);
        });
    }

    // Limit concurrent calls to respect Nominatim policy
    const queue = itemsToGeocode.filter(i => (i.location && !i.coordinates) || (i.endLocation && !i.endCoordinates)).slice(0, 5);

    const destination = tripDetails?.destination;

    const processItem = async (item) => {
        const locationsToProcess = [];
        if (item.location && !item.coordinates) locationsToProcess.push({ field: 'location', coordField: 'coordinates' });
        if (item.endLocation && !item.endCoordinates) locationsToProcess.push({ field: 'endLocation', coordField: 'endCoordinates' });

        for (const loc of locationsToProcess) {
            const originalLoc = item[loc.field];
            let result = null;

            // Strategy 1: Fully Qualified (Location + Destination)
            if (destination && !originalLoc.toLowerCase().includes(destination.toLowerCase())) {
                const query = `${originalLoc}, ${destination}`;
                result = await searchMapLocation(query);
            }

            // Strategy 2: Precise Address Only
            if (!result) {
                result = await searchMapLocation(originalLoc);
            }

            // Strategy 3: Local Context (Look at nearby itinerary items for city/area)
            if (!result && existingItinerary.length > 0) {
                const targetTime = new Date(item.startDate).getTime();
                const nearby = existingItinerary
                    .filter(i => i.location && i.startDate)
                    .map(i => ({ loc: i.location, diff: Math.abs(new Date(i.startDate).getTime() - targetTime) }))
                    .sort((a, b) => a.diff - b.diff)[0];

                if (nearby) {
                    const cityContext = nearby.loc.split(',').slice(-2).join(',').trim();
                    if (cityContext && cityContext !== destination) {
                        result = await searchMapLocation(`${originalLoc}, ${cityContext}`);
                    }
                }
            }

            if (result) {
                // If the original location had a house number that's missing from the result, try to preserve it
                // Pattern matches number at start (107 Main St) or end (Main St 107)
                const startMatch = originalLoc.match(/^(\d+[a-zA-Z]?)\s+/);
                const endMatch = originalLoc.match(/\s+(\d+[a-zA-Z]?)$/);
                const houseNumber = startMatch ? startMatch[1] : (endMatch ? endMatch[1] : null);

                const hasNumberInResult = result.display_name.match(/\d+/);

                let finalDisplayName = result.display_name;

                if (houseNumber && !hasNumberInResult) {
                    // Prepend/Inject to street if we find it, otherwise just prepend to start
                    const addr = result.raw?.address || result.raw;
                    const streetName = addr?.road || addr?.street || addr?.pedestrian || addr?.path;

                    if (streetName && finalDisplayName.includes(streetName)) {
                        finalDisplayName = finalDisplayName.replace(streetName, `${houseNumber} ${streetName}`);
                    } else {
                        finalDisplayName = `${houseNumber} ${finalDisplayName}`;
                    }
                }

                item[loc.field] = finalDisplayName;
                item[loc.coordField] = { lat: result.lat, lng: result.lon };

                // Background Timezone Resolution for this item
                const tz = await fetchTimezone(result.lat, result.lon);
                if (tz) {
                    if (loc.field === 'location') item.timeZone = tz;
                    if (loc.field === 'endLocation') item.destinationTimeZone = tz;
                }
            }
        }
    };

    // Sequential to strictly avoid rate limits
    for (const item of queue) {
        await processItem(item);
    }
};

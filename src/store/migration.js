import { generateId } from '../utils/idGenerator';

const estimateBase64Size = (base64) => {
    if (!base64 || typeof base64 !== 'string') return 0;
    // Base64 string looks like "data:image/png;base64,iVBOR..."
    const part = base64.split(',')[1] || base64;
    return Math.floor(part.length * 0.75);
};

const ensureIds = (items, prefix) => {
    if (!items) return [];
    return items.map(item => ({
        ...item,
        id: item.id || generateId(prefix),
        attachmentIds: item.attachmentIds || [],
        // Legacy fix: unify cost
        cost: item.cost ?? item.estimatedCost ?? 0,
        estimatedCost: undefined,
        // Legacy fix
        attachments: undefined
    }));
};

const ensurePackingIds = (list) => {
    if (!list) return [];
    return list.map(cat => ({
        ...cat,
        id: cat.id || generateId('pcat'),
        items: (cat.items || []).map(item => {
            let newItem = { ...item };

            // Fix legacy object-in-text structure
            if (newItem.text && typeof newItem.text === 'object') {
                const legacy = newItem.text;
                newItem.text = legacy.item || legacy.text || "Unknown Item";
                newItem.quantity = newItem.quantity || legacy.quantity || 1;
                // No longer supporting recommendedBagType
            }

            // Migration: Strip recommendedBagType
            const { recommendedBagType, ...rest } = newItem;

            return {
                ...rest,
                id: rest.id || generateId('pack')
            };
        })
    }));
};

const expandBags = (bags) => {
    if (!bags) return { expanded: [], idMap: {} };
    const expanded = [];
    const idMap = {}; // oldId -> newId

    bags.forEach(bag => {
        const oldId = String(bag.id);
        const qty = parseInt(bag.quantity) || 1;

        if (qty > 1) {
            for (let i = 1; i <= qty; i++) {
                const newId = generateId('bag');
                if (i === 1) idMap[oldId] = newId; // Map old ID to the first instance

                expanded.push({
                    ...bag,
                    id: newId,
                    name: `${bag.name} ${i}`,
                    quantity: undefined
                });
            }
        } else {
            const newId = bag.id || generateId('bag');
            idMap[oldId] = String(newId);
            expanded.push({
                ...bag,
                id: newId,
                quantity: undefined
            });
        }
    });
    return { expanded, idMap };
};

export const migrateLegacyState = (legacyState) => {
    if (!legacyState) return null;

    // Check if checks are needed.
    // If it has 'tripDetails' at root, it's likely the legacy object.

    // We assume the input is the object directly from IDB 'wanderplan_current_trip'.

    // CRITICAL: Check if already migrated
    if (legacyState.trip && legacyState.itinerary && legacyState.resources && legacyState.packing && legacyState.ui) {
        // Ensure traveler profiles exist
        if (!legacyState.trip.tripDetails.travelerProfiles || legacyState.trip.tripDetails.travelerProfiles.length === 0) {
            const count = legacyState.trip.tripDetails.travelers || 1;
            const profiles = [];
            for (let i = 1; i <= count; i++) {
                profiles.push({
                    id: generateId('trv'),
                    nickname: i === 1 ? 'Me' : `Traveler ${i}`,
                    age: '',
                    sex: 'other'
                });
            }
            legacyState.trip.tripDetails.travelerProfiles = profiles;
        }

        // Migration patch: Check if bags still have quantity (unexpanded)
        const currentBags = legacyState.packing.bags || [];
        const hasUnexpanded = currentBags.some(b => parseInt(b.quantity) > 1);

        if (hasUnexpanded) {
            const { expanded, idMap } = expandBags(currentBags);
            legacyState.packing.bags = expanded;

            // Map item bagIds
            legacyState.packing.list.forEach(cat => {
                cat.items.forEach(item => {
                    if (item.bagId && idMap[String(item.bagId)]) {
                        item.bagId = idMap[String(item.bagId)];
                    }
                });
            });
        }

        // Integrity Cleanup: Remove orphan bagIds
        const validBagIds = new Set((legacyState.packing?.bags || []).map(b => String(b.id)));
        if (legacyState.packing?.list) {
            legacyState.packing.list.forEach(cat => {
                cat.items.forEach(item => {
                    if (item.bagId && !validBagIds.has(String(item.bagId))) {
                        console.log(`[Migration] Clearing orphan bagId ${item.bagId} from item ${item.text}`);
                        item.bagId = null;
                    }
                });
            });
        }

        // Ensure documents have 'size'
        const docs = legacyState.resources.documents || {};
        Object.values(docs).forEach(doc => {
            if (doc.size === undefined && doc.data) {
                doc.size = estimateBase64Size(doc.data);
            }
        });
        return legacyState;
    }

    // 1. UI
    const ui = {
        activeTab: legacyState.activeTab || 'overview',
        language: legacyState.language || 'en',
        showSettings: legacyState.showSettings || false,
        isInitialized: true
    };

    // 1.5 Traveler Profiles
    const travelerCount = legacyState.tripDetails?.travelers || 1;
    const travelerProfiles = legacyState.tripDetails?.travelerProfiles || [];
    if (travelerProfiles.length === 0) {
        for (let i = 1; i <= travelerCount; i++) {
            travelerProfiles.push({
                id: generateId('trv'),
                nickname: i === 1 ? 'Me' : `Traveler ${i}`,
                age: '',
                sex: 'other'
            });
        }
    }

    // 2. Resources (Documents & Tasks)
    const documents = legacyState.documents || {};
    // Migrate legacy attachments array in items to central documents?
    // The previous tripSlice logic did this. We should replicate it or assume previous logic ran.
    // Better to be safe: The previous logic 'migrateToCentralStore' ran ON LOAD. 
    // So raw IDB data might still have decentralized attachments.

    // We will do a robust gathering pass.
    const allDocs = { ...documents };
    const gatherDocs = (item) => {
        if (item && item.attachments && Array.isArray(item.attachments)) {
            item.attachments.forEach(att => {
                const id = String(att.id || generateId('doc'));
                if (!allDocs[id]) {
                    allDocs[id] = {
                        ...att,
                        id,
                        size: att.size || estimateBase64Size(att.data),
                        summary: att.summary || att.aisummary || '',
                        createdAt: att.createdAt || new Date().toISOString()
                    };
                }
                if (!item.attachmentIds) item.attachmentIds = [];
                if (!item.attachmentIds.includes(id)) item.attachmentIds.push(id);
            });
        }
    };

    // Fix: Check multiple possible locations for tasks
    const rawTasks = legacyState.preTripTasks || legacyState.tasks || [];
    const tasks = ensureIds(rawTasks, 'task');
    tasks.forEach(gatherDocs);

    const itineraryItems = ensureIds(legacyState.itinerary || [], 'event');
    itineraryItems.forEach(gatherDocs);

    // Packing
    // Fix: check proper key for packing list
    const packing = ensurePackingIds(legacyState.packingList || legacyState.packing?.list || []);
    packing.forEach(cat => {
        cat.items.forEach(gatherDocs);
    });

    // Bags
    const rawBags = legacyState.bags || [];
    const { expanded: bags, idMap: bagIdMap } = expandBags(rawBags);

    // Update item references in packing list
    packing.forEach(cat => {
        cat.items.forEach(item => {
            if (item.bagId && bagIdMap[String(item.bagId)]) {
                item.bagId = bagIdMap[String(item.bagId)];
            }
        });
    });

    // Integrity Cleanup: Remove orphan bagIds
    const finalBagIds = new Set(bags.map(b => String(b.id)));
    packing.forEach(cat => {
        cat.items.forEach(item => {
            if (item.bagId && !finalBagIds.has(String(item.bagId))) {
                item.bagId = null;
            }
        });
    });
    const trip = {
        tripDetails: {
            ...legacyState.tripDetails,
            travelerProfiles
        },
        expenses: legacyState.expenses || [],
        exchangeRates: legacyState.exchangeRates || {},
        apiKey: legacyState.apiKey || '',
        selectedModel: legacyState.selectedModel || 'gemini-3-flash-preview',
        customPrompt: legacyState.customPrompt || '',
        proposedChanges: legacyState.proposedChanges || null
    };

    return {
        ui,
        trip,
        resources: {
            documents: allDocs,
            tasks,
            distilledContext: legacyState.distilledContext || {},
            phrasebook: legacyState.phrasebook || []
        },
        itinerary: {
            items: itineraryItems
        },
        packing: {
            list: packing,
            bags
        }
    };
};

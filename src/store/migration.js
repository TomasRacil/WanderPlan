import { generateId } from '../utils/idGenerator';

const ensureIds = (items, prefix) => {
    if (!items) return [];
    return items.map(item => ({
        ...item,
        id: item.id || generateId(prefix),
        attachmentIds: item.attachmentIds || [],
        // Legacy fix
        attachments: undefined
    }));
};

const ensurePackingIds = (list) => {
    if (!list) return [];
    return list.map(cat => ({
        ...cat,
        id: cat.id || generateId('pcat'),
        items: (cat.items || []).map(item => ({
            ...item,
            id: item.id || generateId('pack')
        }))
    }));
};

export const migrateLegacyState = (legacyState) => {
    if (!legacyState) return null;

    // Check if checks are needed. If it has 'tripDetails' at root, it's likely the legacy object.
    // If it has 'itinerary' as an object with 'items', it might be partially migrated or new.
    // We assume the input is the object directly from IDB 'wanderplan_current_trip'.

    // CRITICAL: Check if already migrated
    if (legacyState.trip && legacyState.itinerary && legacyState.resources && legacyState.packing && legacyState.ui) {
        return legacyState;
    }

    // 1. UI
    const ui = {
        activeTab: legacyState.activeTab || 'overview',
        language: legacyState.language || 'en',
        showSettings: legacyState.showSettings || false,
        isInitialized: true
    };

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
                        summary: att.summary || att.aisummary || '',
                        createdAt: att.createdAt || new Date().toISOString()
                    };
                }
                if (!item.attachmentIds) item.attachmentIds = [];
                if (!item.attachmentIds.includes(id)) item.attachmentIds.push(id);
            });
        }
    };

    const tasks = ensureIds(legacyState.preTripTasks || [], 'task');
    tasks.forEach(gatherDocs);

    const itineraryItems = ensureIds(legacyState.itinerary || [], 'event');
    itineraryItems.forEach(gatherDocs);

    // Packing
    const packing = ensurePackingIds(legacyState.packingList || []);
    packing.forEach(cat => {
        cat.items.forEach(gatherDocs);
    });

    // 3. Trip Core
    const trip = {
        tripDetails: legacyState.tripDetails || {},
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
            list: packing
        }
    };
};

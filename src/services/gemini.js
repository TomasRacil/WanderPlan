export const AVAILABLE_MODELS = {
    'gemini-3-flash-preview': { type: 'cloud', multimodal: true },
    'gemini-2.5-flash': { type: 'cloud', multimodal: true },
    'gemini-2.5-flash-lite': { type: 'cloud', multimodal: true },
    'gemma-3-27b-it': { type: 'cloud', multimodal: false },
    'gemma-3-12b-it': { type: 'cloud', multimodal: false },
    'local-nano': { type: 'local', multimodal: false }
};

export const logAvailableModels = async (apiKey) => {
    if (!apiKey) return;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        const genModels = data.models?.filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));
        console.log("🚀 WanderPlan: Available Gemini Models:", genModels);
    } catch (e) {
        console.error("Failed to list models:", e);
    }
};

import { getItinerarySchema } from '../schemas/itinerary';
import { getTasksSchema } from '../schemas/tasks';
import { getPackingSchema } from '../schemas/packing';
import { getPhrasebookSchema } from '../schemas/phrasebook';

const getSchemaForArea = (targetArea, aiMode) => {
    switch (targetArea) {
        case 'itinerary': return getItinerarySchema(aiMode);
        case 'tasks': return getTasksSchema(aiMode);
        case 'packing': return getPackingSchema(aiMode);
        case 'phrasebook': return getPhrasebookSchema();
        default: return {};
    }
};

export const generateTripContent = async (apiKey, tripDetails, customPrompt, itinerary, preTripTasks, packingList, language = 'en', targetArea = 'all', aiMode = 'add', selectedModel = 'gemini-3-flash-preview', distilledContext = {}, promptAttachments = []) => {
    const existingItinerary = JSON.stringify((itinerary || []).map(i => ({
        id: i.id,
        title: i.title,
        date: i.startDate,
        time: i.startTime,
        duration: i.duration || 60,
        type: i.type,
        category: i.category,
        cost: i.cost || 0,
        currency: i.currency,
        location: i.location
    })));

    const existingTasks = JSON.stringify((preTripTasks || []).map(t => ({
        id: t.id,
        text: t.text,
        status: t.done ? 'Done' : 'Pending',
        cost: t.cost || 0,
        currency: t.currency,
        category: t.category
    })));

    const existingPacking = JSON.stringify((packingList || []).map(cat => ({
        id: cat.id,
        category: cat.category,
        items: (cat.items || []).map(i => ({ id: i.id, text: i.text }))
    })));

    // Prepare Distilled Context String
    let distilledInfoString = "";
    if (Object.keys(distilledContext).length > 0) {
        console.log("ℹ️ Using Distilled Context for:", Object.keys(distilledContext));
        distilledInfoString = "DISTILLED ATTACHMENT DATA (Do NOT request these files again):\n" +
            Object.entries(distilledContext).map(([id, info]) => `Attachment ${id}: ${info.extractedInfo}`).join('\n');
    }

    const systemPrompt = `
    You are an expert travel assistant for the app "WanderPlan".
    Your goal is to modify the users trip based on their request.
    
    CRITICAL INSTRUCTIONS:
    1.  **Attachments**: If the user provides documents (PDFs/Images), you MUST use them to extract relevant details (flight times, hotel names, costs).
        -   If you create or update items based on these documents, you MUST include their IDs in the \`attachmentIds\` array for that item.
        -   The attachment IDs will be provided in the text context as "[Attachment ID: <id>]".
    2.  **Reasoning**: You MUST provide a \`changeSummary\` string explaining your changes and logic.
    3.  **Strict JSON**: valid JSON only, no markdown blocks.
    4.  **Dates**: The current date is ${new Date().toISOString().split('T')[0]}.
    5.  **Context**: 
        -   Distilled Context from previous attachments: ${JSON.stringify(distilledContext)}
        -   Current Trip Details: ${JSON.stringify(tripDetails)}
    `;

    const context = `
        SYSTEM PROMPT: ${systemPrompt}
        Current Trip: ${tripDetails.destination} (${tripDetails.startDate} to ${tripDetails.endDate})
        Origin: ${tripDetails.origin || 'Unknown'}
        Travel Style: ${tripDetails.travelStyle}
        Travelers: ${tripDetails.travelers || 1}
        Preferred Language for Response: ${language}
        
        CRITICAL: All existing items have unique IDs. Use these IDs to refer to items for updates or deletions.
        Existing Itinerary (JSON): ${existingItinerary}
        Existing Tasks (JSON): ${existingTasks}
        Existing Packing (JSON): ${existingPacking}

        ${distilledInfoString}
    `;

    const instructions = {
        add: "Focus ONLY on suggesting NEW items that are not in the list.",
        update: "Focus on UPDATING existing items using the provided context and any ATTACHMENTS. Use their 'id' to specify which item you are changing. Return ONLY the fields that changed.",
        fill: "Look for gaps and return NEW items or UPDATES to existing placeholders to fill those gaps. Use provided ATTACHMENTS to extract missing details.",
        dedupe: "Identify exact or semantic duplicates. Return ONLY a list of IDs to remove."
    };

    // Identify Fresh Attachments (Lazy Distillation)
    const allAttachments = [];
    const seenAttachmentIds = new Set();

    const collectAttachments = (items) => {
        if (!items) return;
        items.forEach(item => {
            if (item.attachments && item.attachments.length > 0) {
                item.attachments.forEach(att => {
                    // Check if already distilled or already added to this request
                    if (att.id && (distilledContext[att.id] || seenAttachmentIds.has(att.id))) return;

                    const base64Data = att.data?.split(',')[1];
                    if (base64Data) {
                        seenAttachmentIds.add(att.id);
                        allAttachments.push({ text: `[Attachment ID: ${att.id}]` });
                        allAttachments.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: att.type
                            },
                        });
                    }
                });
            }
        });
    };

    collectAttachments(itinerary);
    collectAttachments(preTripTasks);

    // Also collect from current prompt
    if (promptAttachments && promptAttachments.length > 0) {
        promptAttachments.forEach(att => {
            if (seenAttachmentIds.has(att.id)) return;

            const base64Data = att.data?.split(',')[1];
            if (base64Data) {
                seenAttachmentIds.add(att.id);
                allAttachments.push({ text: `[Attachment ID: ${att.id}]` });
                allAttachments.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: att.type
                    },
                });
            }
        });
    }

    let systemInstruction = "";
    if (allAttachments.length > 0) {
        systemInstruction = `You are in Hybrid-Extraction mode. For any provided raw files, perform the requested task AND extract a dense, comprehensive summary of ALL information relevant to planning and executing a trip. 
Let your intelligence decide what is important, but prioritize details that impact:
- ITINERARY: Dates, times, addresses, and sequence of events.
- BUDGET: Total costs, currencies, payment status, and pending balances.
- PACKING: Included equipment, clothing requirements, or provided amenities.
- PREPARATION: Confirmation numbers, check-in/out rules, required documents, and specific technical or legal constraints.
Reflect this extraction in the 'newDistilledData' array.
`;
    }

    // --- Schema Construction ---
    const baseSchemaProperties = getSchemaForArea(targetArea, aiMode);

    // Add changeSummary globally
    baseSchemaProperties.changeSummary = {
        type: "STRING",
        description: "A brief explanation of the changes made, including why specific items were added, updated, or deleted, especially if based on provided attachments."
    };

    // Add 'newDistilledData' if needed
    if (allAttachments.length > 0) {
        baseSchemaProperties.newDistilledData = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    attachmentId: { type: "STRING" },
                    summary: { type: "STRING" }
                },
                required: ["attachmentId", "summary"]
            }
        };
    }

    const finalSchema = {
        type: "OBJECT",
        properties: baseSchemaProperties,
        // Make 'newDistilledData' required if we have attachments to force the model to fill it
        required: allAttachments.length > 0 ? ["newDistilledData"] : []
    };

    const prompt = `
        SYSTEM INSTRUCTION: ${systemInstruction}
    
        CONTEXT:
        ${context}

        USER REQUEST: ${customPrompt || "No special requests."}

        GOAL: ${aiMode.toUpperCase()} mode. ${instructions[aiMode] || instructions.add}
        Target Area: ${targetArea}. 

        Provide your response matching the defined JSON schema.
    `;

    // Local Nano Implementation (Parsing Fallback)
    if (selectedModel === 'local-nano') {
        if (!window.ai || !window.ai.languageModel) {
            throw new Error("Local Gemini Nano is not available in this browser.");
        }
        const session = await window.ai.languageModel.create({
            systemPrompt: systemInstruction
        });
        if (allAttachments.length > 0) console.warn("Local Nano may not support image attachments yet.");
        const result = await session.prompt(prompt + " Return valid JSON.");
        // Nano needs manual parsing
        let text = result;
        text = text.replace(/```json|```/gi, '');
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            text = text.substring(firstOpen, lastClose + 1);
        }
        return JSON.parse(text);
    }

    // Cloud Implementation
    const promptParts = [{ text: prompt }];
    if (allAttachments.length > 0) {
        promptParts.push(...allAttachments);
    }

    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;

    const response = await fetch(`${baseUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: "user", parts: promptParts }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: finalSchema,
                maxOutputTokens: 16384
            }
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        if (response.status === 429) {
            const err = new Error("Quota Exceeded");
            err.status = 429;
            throw err;
        }
        console.error("API Request Failed:", response.status, response.statusText, errorBody);
        throw new Error(`API Request Failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    let text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("No content generated");

    try {
        const json = JSON.parse(text);

        // Adapter: Convert newDistilledData Array -> Object Map if present
        if (json.newDistilledData && Array.isArray(json.newDistilledData)) {
            const distilledMap = {};
            json.newDistilledData.forEach(item => {
                if (item.attachmentId && item.summary) {
                    distilledMap[item.attachmentId] = { extractedInfo: item.summary };
                }
            });
            json.newDistilledData = distilledMap;
        }

        // Post-Processing: Geocoding
        await enhanceWithGeocoding(json, tripDetails, itinerary);

        return json;
    } catch (e) {
        console.error("JSON Parse Error:", e, "Failed Text:", text);
        throw e;
    }
};

// Helper for nominatim
const enhanceWithGeocoding = async (json, tripDetails, existingItinerary = []) => {
    const itemsToGeocode = [];

    if (json.adds) itemsToGeocode.push(...json.adds);
    if (json.updates) {
        json.updates.forEach(u => {
            if (u.fields && u.fields.location) itemsToGeocode.push(u.fields);
        });
    }

    // Limit to avoiding rate limits or excessive calls
    const queue = itemsToGeocode.filter(i => i.location && !i.coordinates).slice(0, 5);

    // Helper to perform fetch
    const searchNominatim = async (query) => {
        try {
            // Simple delay to be nice to OSM
            await new Promise(r => setTimeout(r, 250));
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await res && res.json ? await res.json() : null;
            return data && data[0] ? data[0] : null;
        } catch (e) {
            console.warn("Geocoding fetch failed for", query, e);
            return null;
        }
    };

    // Helper to find context location from nearby events
    const findContextLocation = (targetDate) => {
        if (!existingItinerary || existingItinerary.length === 0 || !targetDate) return null;
        // Find closest event
        const target = new Date(targetDate).getTime();
        const closestOptions = existingItinerary
            .filter(i => i.location)
            .map(i => ({ loc: i.location, diff: Math.abs(new Date(i.startDate).getTime() - target) }))
            .sort((a, b) => a.diff - b.diff);

        // Return the best context (top match)
        return closestOptions.length > 0 ? closestOptions[0].loc : null;
    };

    await Promise.all(queue.map(async (item) => {
        let result = null;
        const originalLoc = item.location;
        const localContext = findContextLocation(item.startDate);
        const destination = tripDetails?.destination;

        // Strategy 1: Trip Destination Constraint (Highest Priority)
        // Solves "Beach" -> "Beach, New Zealand" vs "Beach, UK"
        if (!result && destination) {
            if (!originalLoc.toLowerCase().includes(destination.toLowerCase())) {
                const query = `${originalLoc}, ${destination}`;
                console.log("Geocoding Strategy 1 (Global Dest):", query);
                result = await searchNominatim(query);
            }
        }

        // Strategy 2: Local Context Constraint (Previous/Next Event)
        // Appends the CITY/Region of the closest event if possible. 
        // Heuristic: Take the last part of the context string (often country or city)
        if (!result && localContext) {
            // Very naive extraction: take the last 2 parts of the address
            const parts = localContext.split(',').map(s => s.trim());
            const shortContext = parts.slice(-2).join(', '); // e.g. "Matamata, New Zealand"
            if (shortContext && shortContext !== destination) {
                const query = `${originalLoc}, ${shortContext}`;
                console.log("Geocoding Strategy 2 (Local Context):", query);
                result = await searchNominatim(query);
            }
        }

        // Strategy 3: Exact Match (Original)
        if (!result) {
            console.log("Geocoding Strategy 3 (Original):", originalLoc);
            result = await searchNominatim(originalLoc);
        }

        // Strategy 4: Simplify (First Part + Destination)
        if (!result && originalLoc.includes(',') && destination) {
            const firstPart = originalLoc.split(',')[0].trim();
            const querySimple = `${firstPart}, ${destination}`;
            console.log("Geocoding Strategy 4 (Simplify + Dest):", querySimple);
            result = await searchNominatim(querySimple);
        }

        if (result) {
            item.location = result.display_name;
            // Optionally store coordinates if we update the schema later
            // item.coordinates = { lat: result.lat, lng: result.lon }; 
        } else {
            console.warn("Geocoding given up for:", originalLoc);
        }
    }));
};

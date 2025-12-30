const BASE_INSTRUCTIONS = (date, destination, startDate, endDate, origin, language, travelers) => `
You are an expert travel assistant for the app "WanderPlan".
Preferred language: ${language}.
Current Trip: ${destination} (${startDate} to ${endDate}).
Travelers: ${travelers || 'Unknown'}.
Current date: ${date}.

URGENT SAFETY WARNING:
Users rely HEAVILY on the information you provide. Any missing or incorrect data (especially regarding dates, times, locations, or baggage rules) can lead to significant trip disruptions, financial loss, or even HEALTH AND SAFETY HAZARDS. Accuracy is your absolute highest priority.
`;

const TASK_SPECIFIC_INSTRUCTIONS = (tripDetails, aiMode, targetArea) => {
    const sections = {
        packing: {
            critical: `
CRITICAL PACKING INSTRUCTIONS:
- **Smart Baggage**: Meticulously use the 'bags' definitions provided in the context.
    - Assign every packing item to the most appropriate bag. 
    - STRICTLY respect the size and nature of the bag (e.g., liquids/electronics in Carry-on, heavy clothes in Checked).
- Use specific bag names provided in context (e.g., "Main Suitcase", "Backpack") when referring to types.
`,
            add: "Suggest NEW packing items based on your own intelligence, the trip destination, weather, and ANY relevant details found in context and attachments. Do not duplicate existing items. CRITICAL: Check 'travelerId' on bags! Distribute items logically to their owners' bags by assinging bag 'id' to 'bagId' for each item. Do NOT put everything in one bag. Balance the load.",
            update: "UPDATE existing packing items using 'itemUpdates' (e.g. assign bags, change quantity). To ADD new items to specific categories, use 'categoryUpdates'. CRITICAL: 1. Check 'travelerId' on bags! Distribute items logically to their owners' bags. Balance the load. 2. NEVER include an 'itemId' in 'removeItems' if you are updating it in 'itemUpdates'. Only use 'removeItems' for items that should be PERMANENTLY DELETED from the trip. 3. IF YOU NEED TO SPLIT AN ITEM (e.g. 5 T-shirts -> 3 in Bag A, 2 in Bag B): Update the original item's quantity to 3 and assign to Bag A (via itemUpdates). Add a NEW item 'T-shirts' with quantity 2 assigned to Bag B (via categoryUpdates).",
            fill: "Identify gaps in the packing list. Suggest missing items using 'categoryUpdates'. ALSO refine existing items using 'itemUpdates' (assign bags, fix quantities). CRITICAL: 1. Check 'travelerId' on bags! Distribute items logically. 2. NEVER include an 'itemId' in 'removeItems' if you are updating it. 3. IF YOU NEED TO SPLIT AN ITEM: Update quantity of original (itemUpdates) + Add new split portion (categoryUpdates).",
            dedupe: "Identify redundant packing items based on item name and function. Ignore bag assignments for deduplication purposes."
        },
        itinerary: {
            critical: `
CRITICAL ITINERARY INSTRUCTIONS:
- Ensure logical logistics flow (e.g., arrival before checking in).
`,
            add: "Create NEW events. Focus on filling the timeline with high-precision data from attachments/context and logical travel flow. Use intelligent suggestions to populate empty days. If an item is created from a document, you MUST include its ID in 'attachmentIds'",
            update: "UPDATE existing events. Meticulously scan attachments and context to correct times, locations, or notes. Link relevant documents to existing events if they match, you MUST include its ID in 'attachmentIds'",
            fill: "Find empty slots in the schedule and suggest activities or necessary travel logistics (transfers, meals). Also scan existing events to refine details if better information is available from context or attachments, don't forget to link relevant documents events, and in that case you MUST include its ID in 'attachmentIds'",
            dedupe: "Find duplicate events (same time/place/activity) and suggest which to remove."
        },
        tasks: {
            critical: ``,
            add: "Generate NEW pre-trip tasks. Meticulously identify deadlines and requirements from documents and your knowledge base. Prioritize visa requirements, booking deadlines, or health items. Do not duplicate existing tasks. If an item is created from a document, you MUST include its ID in 'attachmentIds'.",
            update: "UPDATE existing tasks. Focus on adding specific deadlines, clarifying instructions, or linking relevant attachment IDs to the tasks. If an item is updated based on a document, you MUST include its ID in 'attachmentIds'.",
            fill: "Hybrid Mode: Identify missing essential preparations (visas, vaccinations, insurance) based on destination. Also refine existing tasks with better data if available. If an item is created/updated from a document, you MUST include its ID in 'attachmentIds'.",
            dedupe: "Find similar tasks and keep only the most comprehensive version."
        }
    };

    const area = sections[targetArea];
    if (!area) return "";

    const modeDesc = area[aiMode] || area.add;

    // Optimization: Dedupe does not need critical extraction/suggestion logic
    if (aiMode === 'dedupe') {
        return `
MODE: ${aiMode.toUpperCase()}
INSTRUCTIONS: ${modeDesc}
`;
    }

    return `
${area.critical}

MODE: ${aiMode.toUpperCase()}
INSTRUCTIONS: ${modeDesc}
`;
};

const ATTACHMENT_INSTRUCTIONS = `
RAW FILE EXTRACTION (HYBRID MODE):
You have been provided with raw files (PDFs/Images). 
1.  **Extract Data**: Meticulously find ALL information that is or could be relevant to the trip. This includes but is not limited to:
    - Exact dates and times (HH:mm).
    - Locations (addresses, building names).
    - Costs, taxes, currencies, and payment status (paid/pending).
    - Confirmation numbers, booking IDs, and other identifiers.
    - Rules (check-in/out times, cancellation policies, baggage limits).
    - Amenities or specific services included.
    - Technical details (e.g., rented car specifications, etc).
2.  **COMPREHENSIVE Distillation**: For every raw file provided, you MUST provide a DENSE and EXHAUSTIVE summary of ALL extracted facts in 'newDistilledData'. 
3.  **Language**: The distillation summary MUST be in English.
4.  **Prioritize Precision**: Use exact values found in the documents. Do not generalize.
`;

export const getSystemInstructions = (date, tripDetails, hasAttachments, language, targetArea = 'all', aiMode = 'add') => {
    const travelerContext = tripDetails.travelerProfiles?.length > 0
        ? tripDetails.travelerProfiles.map(p => `${p.nickname} (Age: ${p.age || 'N/A'}, Sex: ${p.sex})`).join(', ')
        : `${tripDetails.travelers || 1} traveler(s)`;

    let prompt = BASE_INSTRUCTIONS(
        date,
        tripDetails.destination,
        tripDetails.startDate,
        tripDetails.endDate,
        tripDetails.origin,
        language,
        travelerContext
    );

    // Universal JSON/Logic rules (shorter)
    prompt += `
GENERAL RULES:
- Output valid JSON only. NO filler text.
- Provide a brief \`changeSummary\` in ${language}.
- Dates MUST be YYYY-MM-DD.
`;

    if (targetArea === 'all') {
        const areas = ['packing', 'itinerary', 'tasks'];
        areas.forEach(area => {
            const areaPrompt = TASK_SPECIFIC_INSTRUCTIONS(tripDetails, aiMode, area);
            prompt += areaPrompt;
        });
    } else {
        prompt += TASK_SPECIFIC_INSTRUCTIONS(tripDetails, aiMode, targetArea);
    }

    if (hasAttachments) {
        prompt += ATTACHMENT_INSTRUCTIONS;
    }

    return prompt;
};

export const constructUserPrompt = (fullContext, customPrompt, aiMode, targetArea) => {
    let contextToUse = fullContext;

    // If dedupe mode, parse context and only use the target area
    if (aiMode === 'dedupe') {
        try {
            const parsedContext = JSON.parse(fullContext);
            // Only keep the target area if it exists in context, otherwise keep full to be safe
            if (parsedContext[targetArea]) {
                contextToUse = JSON.stringify({ [targetArea]: parsedContext[targetArea] });
            }
        } catch (e) {
            // If parsing fails (e.g. context is not JSON), fallback to full context
            console.warn("Could not parse context for dedupe optimization");
        }
    }

    return `
        ${contextToUse}

        USER REQUEST: ${customPrompt || "No special requests."}

        Output valid JSON matching the schema for ${targetArea.toUpperCase()} in ${aiMode.toUpperCase()} mode.
    `;
};
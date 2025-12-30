import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTripContent, enhanceWithGeocoding } from './gemini';

// Mock window.ai for local nano tests
global.window = {
    ai: {
        languageModel: {
            create: vi.fn(),
        }
    }
};

global.fetch = vi.fn();

describe('gemini.js Service', () => {
    const mockApiKey = 'test-api-key';
    const mockTripDetails = { destination: 'Paris', startDate: '2025-01-01', endDate: '2025-01-05' };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should generate content with correct schema for "itinerary"', async () => {
        const mockResponse = {
            candidates: [{
                content: {
                    parts: [{ text: JSON.stringify({ adds: [], updates: [], deletes: [] }) }]
                }
            }]
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        await generateTripContent(mockApiKey, mockTripDetails, '', [], [], [], 'en', 'itinerary');

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);

        // Verify Schema was passed
        expect(requestBody.generationConfig.responseSchema).toBeDefined();
        // Itinerary schema check (indirectly checking getBaseSchema)
        expect(requestBody.generationConfig.responseSchema.properties.adds.items.properties).toHaveProperty('startDate');
        expect(requestBody.generationConfig.responseSchema.properties.adds.items.properties).toHaveProperty('startTime');
    });

    it('should handle Lazy Distillation adapter logic correctly', async () => {
        // Mock response with Array-based newDistilledData (as returned by Structured Output)
        const mockResponse = {
            candidates: [{
                content: {
                    parts: [{
                        text: JSON.stringify({
                            adds: [],
                            newDistilledData: [
                                { attachmentId: "123", summary: "Ticket confirmed" },
                                { attachmentId: "456", summary: "Hotel booked" }
                            ]
                        })
                    }]
                }
            }]
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        // Pass dummy attachment to trigger logic (otherwise it won't expect distilled data)
        const mockItinerary = [{ id: '1', attachments: [{ id: '123', data: 'base64...', type: 'image/png' }] }];

        const result = await generateTripContent(mockApiKey, mockTripDetails, '', mockItinerary, [], [], 'en', 'itinerary', 'add', 'gemini-3-flash-preview');

        // Verify the adapter converted Array -> Map
        expect(result.newDistilledData).toBeDefined();
        expect(Array.isArray(result.newDistilledData)).toBe(false);
        expect(result.newDistilledData['123']).toEqual({ extractedInfo: "Ticket confirmed" });
        expect(result.newDistilledData['456']).toEqual({ extractedInfo: "Hotel booked" });
    });

    it('should throw Quota Exceeded error on 429', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            text: async () => "Quota Exceeded"
        });

        try {
            await generateTripContent(mockApiKey, mockTripDetails, '', [], [], []);
            // Should fail if we reach here
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toBe("Quota Exceeded");
            expect(e.status).toBe(429);
        }
    });

    it('should fall back to Local Nano when selected', async () => {
        const mockSession = { prompt: vi.fn().mockResolvedValue('{"adds": []}') };
        global.window.ai.languageModel.create.mockResolvedValue(mockSession);

        const result = await generateTripContent(null, mockTripDetails, '', [], [], [], 'en', 'all', 'add', 'local-nano');

        expect(global.window.ai.languageModel.create).toHaveBeenCalled();
        expect(mockSession.prompt).toHaveBeenCalled();
        expect(result).toEqual({ adds: [] });
    });


    it('should throw Error when AI response fails Zod validation', async () => {
        // Response with valid JSON but invalid schema (missing required fields if any, or wrong types)
        // Schema expects 'adds' to be array. Let's make it a string.
        const mockResponse = {
            candidates: [{
                content: {
                    parts: [{ text: JSON.stringify({ adds: "Not an array" }) }]
                }
            }]
        };

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        try {
            await generateTripContent(mockApiKey, mockTripDetails, '', [], [], []);
            expect(true).toBe(false); // Fail if no error
        } catch (e) {
            expect(e.message).toContain("AI Response failed validation");
        }
    });

    it('should throw Error when AI response is invalid JSON', async () => {
        const mockResponse = {
            candidates: [{
                content: {
                    parts: [{ text: "{ invalid json: " }]
                }
            }]
        };

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        try {
            await generateTripContent(mockApiKey, mockTripDetails, '', [], [], []);
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toContain("Unexpected token"); // JSON.parse error message varies by engine but typically has this
            // Or we can check if it bubbled up. The code re-throws 'e'.
        }
    });

    it('should throw Error when AI returns empty content', async () => {
        const mockResponse = {
            candidates: [{ content: null }] // Empty content
        };

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        try {
            await generateTripContent(mockApiKey, mockTripDetails, '', [], [], []);
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toBe("No content generated");
        }
    });
}); // Close empty content test

describe('enhanceWithGeocoding', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should use Strategy 1 (Destination Constraint) when destination matches', async () => {
        const tripDetails = { destination: 'New Zealand' };
        const json = { adds: [{ location: 'Beach', startDate: '2025-01-01' }] };

        // Mock fetch to capture the query
        global.fetch.mockImplementation(async (url) => {
            if (decodeURIComponent(url).includes('Beach, New Zealand')) {
                return {
                    json: async () => [{ display_name: 'The Beach, New Zealand', lat: 1, lon: 2 }]
                };
            }
            return { json: async () => [] };
        });

        await enhanceWithGeocoding(json, tripDetails, []);

        expect(global.fetch).toHaveBeenCalled();
        // Verify content was updated
        expect(json.adds[0].location).toBe('The Beach, New Zealand');
    });

    it('should use Strategy 2 (Local Context) when nearby event suggests region', async () => {
        const tripDetails = { destination: 'New Zealand' };
        const existingItinerary = [{
            startDate: '2025-01-01T10:00:00',
            location: 'Hobbiton, Matamata, New Zealand'
        }];
        const json = { adds: [{ location: 'The Green Dragon', startDate: '2025-01-01T12:00:00' }] };

        global.fetch.mockImplementation(async (url) => {
            if (decodeURIComponent(url).includes('Matamata, New Zealand')) {
                return {
                    json: async () => [{ display_name: 'The Green Dragon Inn, Matamata', lat: 3, lon: 4 }]
                };
            }
            return { json: async () => [] };
        });

        await enhanceWithGeocoding(json, tripDetails, existingItinerary);
        expect(json.adds[0].location).toBe('The Green Dragon Inn, Matamata');
    });

    it('should fallback to Strategy 3 (Original) if constraints fail', async () => {
        const tripDetails = { destination: 'Nowhere' };
        const json = { adds: [{ location: 'Unique Place', startDate: '2025-01-01' }] };

        global.fetch.mockImplementation(async (url) => {
            if (url.includes('q=Unique%20Place&')) {
                return {
                    json: async () => [{ display_name: 'Unique Place, World', lat: 5, lon: 6 }]
                };
            }
            return { json: async () => [] };
        });

        await enhanceWithGeocoding(json, tripDetails, []);
        expect(json.adds[0].location).toBe('Unique Place, World');
    });
});


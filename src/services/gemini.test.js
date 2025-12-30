import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTripContent } from './gemini';
import { enhanceWithGeocoding } from './geocoding';

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
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ adds: [] }) }] } }] })
        });

        await generateTripContent('test-key', mockTripDetails, '', [], [], [], 'en', 'itinerary', 'add');

        const callArgs = global.fetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body.generationConfig.responseSchema.required).toContain('adds');
        expect(body.generationConfig.responseSchema.properties).toHaveProperty('adds');
    });

    it('should generate content with correct schema for "phrasebook"', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ phrasebook: { language: 'en', phrases: [] } }) }] } }] })
        });

        await generateTripContent('test-key', mockTripDetails, '', [], [], [], 'en', 'phrasebook', 'add');

        const callArgs = global.fetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);

        // Critically: should NOT contain 'adds', SHOULD contain 'phrasebook'
        expect(body.generationConfig.responseSchema.required).toContain('phrasebook');
        expect(body.generationConfig.responseSchema.required).not.toContain('adds');
        expect(body.generationConfig.responseSchema.properties).toHaveProperty('phrasebook');
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
});


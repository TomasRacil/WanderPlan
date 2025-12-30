import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enhanceWithGeocoding, searchMapLocation } from './geocoding';

global.fetch = vi.fn();

describe('Geocoding Service (Nominatim Reversion)', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('searchMapLocation', () => {
        it('should format Nominatim array results into a clean object with precise address parts', async () => {
            const mockResponse = [
                {
                    display_name: 'Ignored because address exists',
                    lat: '52.520',
                    lon: '13.405',
                    address: {
                        house_number: '1',
                        road: 'Am Lustgarten',
                        suburb: 'Mitte',
                        city: 'Berlin',
                        country: 'Germany'
                    }
                }
            ];

            global.fetch.mockResolvedValueOnce({
                json: async () => mockResponse
            });

            const result = await searchMapLocation('Berlin Cathedral');

            expect(result.display_name).toBe('1, Am Lustgarten, Mitte, Berlin, Germany');
            expect(result.lat).toBe(52.520);
            expect(result.lon).toBe(13.405);
        });

        it('should format GeoJSON/Photon FeatureCollection results', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    properties: {
                        housenumber: '107',
                        street: 'Montgomerie Road',
                        city: 'Auckland',
                        country: 'New Zealand'
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [174.77, -36.97]
                    }
                }]
            };

            global.fetch.mockResolvedValueOnce({
                json: async () => mockResponse
            });

            const result = await searchMapLocation('107 Montgomerie Road');

            expect(result.display_name).toBe('107, Montgomerie Road, Auckland, New Zealand');
            expect(result.lat).toBe(-36.97);
            expect(result.lon).toBe(174.77);
        });

        it('should return null if no results found', async () => {
            global.fetch.mockResolvedValueOnce({
                json: async () => []
            });

            const result = await searchMapLocation('NonExistentPlace12345');
            expect(result).toBeNull();
        });
    });

    describe('enhanceWithGeocoding', () => {
        it('should use Strategy 1 (Destination Constraint) when destination matches', async () => {
            const tripDetails = { destination: 'New Zealand' };
            const json = { adds: [{ location: 'Beach', startDate: '2025-01-01' }] };

            global.fetch.mockImplementation(async (url) => {
                const decodedUrl = decodeURIComponent(url);
                if (decodedUrl.includes('Beach, New Zealand')) {
                    return {
                        json: async () => [{ display_name: 'The Beach, New Zealand', lat: '-37', lon: '175' }]
                    };
                }
                return { json: async () => [] };
            });

            await enhanceWithGeocoding(json, tripDetails, []);

            expect(json.adds[0].location).toBe('The Beach, New Zealand');
            expect(json.adds[0].coordinates).toEqual({ lat: -37, lng: 175 });
        });

        it('should handle endLocation for transport items', async () => {
            const json = {
                adds: [{
                    type: 'transport',
                    location: 'London',
                    endLocation: 'Paris',
                    startDate: '2025-01-01'
                }]
            };

            global.fetch.mockImplementation(async (url) => {
                const decodedUrl = decodeURIComponent(url);
                if (decodedUrl.includes('q=London')) {
                    return { json: async () => [{ display_name: 'London, UK', lat: '51.5', lon: '0' }] };
                }
                if (decodedUrl.includes('q=Paris')) {
                    return { json: async () => [{ display_name: 'Paris, FR', lat: '48.8', lon: '2.3' }] };
                }
                return { json: async () => [] };
            });

            await enhanceWithGeocoding(json, {}, []);

            expect(json.adds[0].coordinates).toEqual({ lat: 51.5, lng: 0 });
            expect(json.adds[0].endCoordinates).toEqual({ lat: 48.8, lng: 2.3 });
        });

        it('should preserve house number from start of original input', async () => {
            const tripDetails = { destination: 'New Zealand' };
            const json = { adds: [{ location: '107 Montgomerie Road', startDate: '2025-01-01' }] };

            global.fetch.mockImplementation(async (url) => {
                return {
                    json: async () => [{
                        display_name: 'Montgomerie Road, Auckland, New Zealand',
                        lat: '-36.98',
                        lon: '174.78',
                        address: { road: 'Montgomerie Road', city: 'Auckland', country: 'New Zealand' }
                    }]
                };
            });

            await enhanceWithGeocoding(json, tripDetails, []);
            expect(json.adds[0].location).toBe('107 Montgomerie Road, Auckland, New Zealand');
        });

        it('should preserve house number from end of original input', async () => {
            const json = { adds: [{ location: 'Montgomerie Road 107', startDate: '2025-01-01' }] };

            global.fetch.mockImplementation(async (url) => {
                return {
                    json: async () => [{
                        display_name: 'Montgomerie Road, Auckland, New Zealand',
                        lat: '-36.98',
                        lon: '174.78',
                        address: { road: 'Montgomerie Road', city: 'Auckland', country: 'New Zealand' }
                    }]
                };
            });

            await enhanceWithGeocoding(json, {}, []);
            expect(json.adds[0].location).toBe('107 Montgomerie Road, Auckland, New Zealand');
        });

    });
});

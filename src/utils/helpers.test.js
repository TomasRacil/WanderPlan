import { describe, it, expect } from 'vitest';
import { parseCost, convertToHome, calculateBudgetTotals } from './helpers';

describe('Helper Functions', () => {
    describe('parseCost', () => {
        it('should parse simple numbers', () => {
            expect(parseCost("100")).toBe(100);
            expect(parseCost(100)).toBe(100);
        });

        it('should handle currency symbols', () => {
            expect(parseCost("$100")).toBe(100);
            expect(parseCost("€50.50")).toBe(50.50);
        });

        it('should return 0 for invalid inputs', () => {
            expect(parseCost("abc")).toBe(0);
            expect(parseCost("")).toBe(0);
        });
    });

    describe('convertToHome', () => {
        const tripDetails = {
            homeCurrency: 'USD',
            tripCurrency: 'EUR',
            exchangeRate: 0.9
        };

        it('should return raw amount if currency matches home', () => {
            expect(convertToHome(100, 'USD', tripDetails)).toBe(100);
        });

        it('should convert trip currency to home currency', () => {
            // 90 EUR / 0.9 = 100 USD
            expect(convertToHome(90, 'EUR', tripDetails)).toBeCloseTo(100);
        });
    });

    describe('calculateBudgetTotals', () => {
        const tripDetails = {
            homeCurrency: 'USD',
            tripCurrency: 'EUR',
            exchangeRate: 0.9,
            budget: '1000'
        };

        const expenses = [
            { amount: 100, currency: 'USD', category: 'Food' },
            { amount: 90, currency: 'EUR', category: 'Transport' } // = 100 USD
        ];

        const itinerary = [
            { cost: 100, currency: 'USD', isPaid: true, category: 'Accommodation' },
            { cost: 50, currency: 'USD', isPaid: false, category: 'Activity' } // Not paid, so projected
        ];

        const preTripTasks = [
            { cost: 10, currency: 'USD', isPaid: true, category: 'Documents' }
        ];

        it('should calculate total spent correctly', () => {
            const totals = calculateBudgetTotals(expenses, itinerary, preTripTasks, tripDetails);
            // 100 (exp) + 100 (exp formatted) + 100 (itinerary paid) + 10 (task paid) = 310
            expect(totals.totalSpent).toBeCloseTo(310);
        });

        it('should calculate remaining budget correctly', () => {
            const totals = calculateBudgetTotals(expenses, itinerary, preTripTasks, tripDetails);
            // 1000 - 310 = 690
            expect(totals.remaining).toBeCloseTo(690);
        });

        it('should calculate projected total', () => {
            const totals = calculateBudgetTotals(expenses, itinerary, preTripTasks, tripDetails);
            // 310 (spent) + 50 (unpaid itinerary) = 360
            expect(totals.projectedTotal).toBeCloseTo(360);
        });
    });
});

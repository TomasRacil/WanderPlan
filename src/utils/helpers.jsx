import React from 'react';
import { Plane, Train, Hotel, Utensils, Sparkles } from 'lucide-react';
import { BUDGET_CATEGORIES } from '../data/budgetConstants';
import { TYPE_TO_CATEGORY } from '../data/eventConstants';
import { ALL_CURRENCIES } from '../data/currencies';

export const parseCost = (val) => parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;

export const formatMoney = (amount, currencyCode) => {
    const symbol = ALL_CURRENCIES.find(c => c.code === currencyCode)?.symbol || currencyCode;
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getEventIcon = (type) => {
    switch (type) {
        case 'Flight': return <Plane size={20} className="text-white" />;
        case 'Train': return <Train size={20} className="text-white" />;
        case 'Hotel': return <Hotel size={20} className="text-white" />;
        case 'Food': return <Utensils size={20} className="text-white" />;
        default: return <Sparkles size={20} className="text-white" />;
    }
};

export const getEventColor = (type) => {
    switch (type) {
        case 'Flight': return 'bg-blue-500';
        case 'Train': return 'bg-orange-500';
        case 'Hotel': return 'bg-indigo-500';
        case 'Food': return 'bg-rose-500';
        default: return 'bg-emerald-500';
    }
};
export const getBudgetCategory = (type, currentCategory) => {
    if (currentCategory && BUDGET_CATEGORIES.includes(currentCategory)) return currentCategory;
    return TYPE_TO_CATEGORY[type] || 'Activities';
};

export const generateGoogleMapsLink = (items) => {
    if (!items || items.length === 0) return '#';

    const points = [];
    items.forEach(item => {
        if (item.startLocation || item.location) points.push(item.startLocation || item.location);
        if (item.endLocation) points.push(item.endLocation);
    });

    // Remove consecutive duplicates (sometimes end of one is start of next)
    const uniquePoints = points.filter((p, i) => i === 0 || p !== points[i - 1]);

    if (uniquePoints.length === 0) return '#';
    if (uniquePoints.length === 1) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(uniquePoints[0])}`;

    const origin = encodeURIComponent(uniquePoints[0]);
    const destination = encodeURIComponent(uniquePoints[uniquePoints.length - 1]);
    const waypoints = uniquePoints.slice(1, -1).map(l => encodeURIComponent(l)).join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`;
};

export const convertToHome = (amount, fromCurrency, tripDetails, exchangeRates) => {
    if (!amount) return 0;
    if (fromCurrency === tripDetails.homeCurrency) return amount;

    // Use unified exchange rates if available
    if (exchangeRates && exchangeRates[fromCurrency]) {
        // Assuming rates are based on homeCurrency: 1 Home = Rate * Foreign
        // So Value in Home = Foreign / Rate
        return amount / exchangeRates[fromCurrency];
    }

    // Fallback to simpler dual-currency logic
    if (fromCurrency === tripDetails.tripCurrency) return amount / (tripDetails.exchangeRate || 1);
    return amount;
};

export const calculateBudgetTotals = (expenses, itinerary, preTripTasks, tripDetails, exchangeRates) => {
    const breakdown = {};
    const addToBreakdown = (cat, amount, isPaid) => {
        const c = cat || "Other";
        if (!breakdown[c]) breakdown[c] = { paid: 0, estimated: 0, total: 0 };
        if (isPaid) {
            breakdown[c].paid += amount;
        } else {
            breakdown[c].estimated += amount;
        }
        breakdown[c].total += amount;
    };

    expenses.forEach(e => addToBreakdown(e.category, convertToHome(e.amount, e.currency, tripDetails, exchangeRates), true));

    itinerary.forEach(i => {
        const cost = parseCost(i.cost);
        if (cost > 0) {
            addToBreakdown(getBudgetCategory(i.type, i.category), convertToHome(cost, i.currency, tripDetails, exchangeRates), i.isPaid);
        }
    });

    preTripTasks.forEach(t => {
        const cost = parseCost(t.cost);
        if (cost > 0) {
            addToBreakdown(getBudgetCategory(null, t.category), convertToHome(cost, t.currency, tripDetails, exchangeRates), t.isPaid);
        }
    });

    const totals = Object.values(breakdown).reduce((acc, curr) => ({
        paid: acc.paid + curr.paid,
        estimated: acc.estimated + curr.estimated,
        total: acc.total + curr.total
    }), { paid: 0, estimated: 0, total: 0 });

    const totalBudget = parseCost(tripDetails.budget);

    return {
        totalSpent: totals.paid,
        remaining: totalBudget - totals.paid,
        projectedTotal: totals.total,
        breakdown
    };
};

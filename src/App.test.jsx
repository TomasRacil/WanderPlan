import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import tripReducer from './store/tripSlice';
import App from './App';
import { describe, it, expect, vi } from 'vitest';

// Mock idb-keyval to prevent "indexedDB is not defined" error
vi.mock('idb-keyval', () => ({
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve()),
    del: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    keys: vi.fn(() => Promise.resolve([])),
}));

// Mock store for testing
const createTestStore = () => configureStore({
    reducer: {
        trip: tripReducer
    }
});

describe('App Integration', () => {
    it('renders the header and overview by default', () => {
        render(
            <Provider store={createTestStore()}>
                <App />
            </Provider>
        );

        expect(screen.getByText(/WanderPlan/i)).toBeInTheDocument();
        expect(screen.getByText(/Trip Settings/i)).toBeInTheDocument();
    });
});

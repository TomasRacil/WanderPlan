import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import tripReducer from './store/tripSlice';
import App from './App';
import { describe, it, expect } from 'vitest';

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
        expect(screen.getByText(/Plan My Trip/i)).toBeInTheDocument();
    });
});

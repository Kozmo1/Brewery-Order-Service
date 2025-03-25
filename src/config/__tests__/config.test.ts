import { Config } from '../config';

// Mock dotenv-safe to control environment loading during tests
jest.mock('dotenv-safe', () => ({
    config: jest.fn((options) => {
        // Return empty parsed object to simulate no .env file unless testing specific loading
        if (!options.path || options.path.includes('nonexistent')) {
            return { parsed: {} };
        }
        return { parsed: process.env };
    }),
}));

describe('config', () => {
    // Reset module cache before each test to ensure fresh config loading
    beforeEach(() => {
        jest.resetModules();
    });

    // Test fallback values when environment variables are unset
    it('should use fallback values if environment variables are not set', () => {
        // Store original environment to restore later
        const originalEnv = { ...process.env };
        // Explicitly remove variables to trigger fallbacks
        delete process.env.NODE_ENV;
        delete process.env.BREWERY_API_URL;
        delete process.env.JWT_SECRET;

        // Load config with no env vars set
        const { config } = require('../../config/config');

        // Verify each fallback value
        expect(config.environment).toBe('development'); // NODE_ENV fallback
        expect(config.breweryApiUrl).toBe('http://localhost:5089'); // BREWERY_API_URL fallback
        expect(config.jwtSecret).toBeUndefined(); // Optional field, no fallback

        // Restore original environment
        process.env = originalEnv;
    });

    // Test that config uses environment variables when they are set
    it('should use environment variables when they are set', () => {
        // Store original environment
        const originalEnv = { ...process.env };
        // Set custom values
        process.env.NODE_ENV = 'production';
        process.env.BREWERY_API_URL = 'https://api.brewery.com';
        process.env.JWT_SECRET = 'custom-secret';

        // Load config with env vars set
        const { config } = require('../../config/config');

        // Verify each value matches the set environment variable
        expect(config.environment).toBe('production');
        expect(config.breweryApiUrl).toBe('https://api.brewery.com');
        expect(config.jwtSecret).toBe('custom-secret');

        // Restore original environment
        process.env = originalEnv;
    });

    // Test behavior when .env file is missing
    it('should handle missing .env file gracefully', () => {
        // Store original environment
        const originalEnv = { ...process.env };
        // Set NODE_ENV to a value that won’t match an existing .env file
        process.env.NODE_ENV = 'nonexistent';
        delete process.env.BREWERY_API_URL;
        delete process.env.JWT_SECRET;

        // Load config with no .env file
        const { config } = require('../../config/config');

        // Verify config uses NODE_ENV and fallbacks for others
        expect(config.environment).toBe('nonexistent');
        expect(config.breweryApiUrl).toBe('http://localhost:5089');
        expect(config.jwtSecret).toBeUndefined();

        // Restore original environment
        process.env = originalEnv;
    });
});

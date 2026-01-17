
module.exports = {
    ...require('./jest.config'),
    setupFiles: [], // Disable global mocks like drizzle-mock
    testMatch: ['**/tests/integration/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/tests/utils/setup.ts'], // Keep DB setup
};

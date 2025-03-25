/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    bail: true,
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    roots: ['src'],
    testMatch: ['**/__tests__/**'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    verbose: true,
};

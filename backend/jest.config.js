module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/migrations/**',
    '!src/seeds/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
};

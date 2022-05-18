module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  testEnvironment: 'node',
  rootDir: 'src',
  collectCoverage: false,
  collectCoverageFrom: ['**/*.{js,ts}', '!**/node_modules/**', '!**/test-payloads/**'],
  coverageDirectory: '../coverage',
};

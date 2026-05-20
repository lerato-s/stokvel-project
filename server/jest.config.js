module.exports = {
  testEnvironment: "node",

  testMatch: [
    "**/__tests__/**/*.js",
    "**/?(*.)+(spec|test).js"
  ],

  collectCoverageFrom: [
    "**/*.js",
    "!**/node_modules/**"
  ],

  // Generate coverage reports
  collectCoverage: true,

  // Folder where coverage files will be stored
  coverageDirectory: "coverage",

  // Generate HTML report + terminal text report
  coverageReporters: ["html", "text"],

  // Optional: open this file in browser after running tests
  // coverage/lcov-report/index.html
};
// Jest test setup file
// Configure testing environment for Clean DDD website

// Mock DOM environment for tests
import 'jest-environment-jsdom';

// Global test configuration
global.console = {
  ...global.console,
  // Override console methods for cleaner test output
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock external dependencies
global.Prism = {
  highlightAll: jest.fn(),
  highlightElement: jest.fn()
};

// Mock window objects for browser API tests
global.navigator = {
  ...global.navigator,
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
};

// Setup test utilities
global.createMockElement = (tagName, attributes = {}) => {
  const element = document.createElement(tagName);
  Object.keys(attributes).forEach(key => {
    element.setAttribute(key, attributes[key]);
  });
  return element;
};

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clean up DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});
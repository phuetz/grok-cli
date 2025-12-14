/**
 * Mock for Ink
 * Provides mock implementations of Ink components for testing
 */

const React = require('react');

// Mock components - need to return React elements for proper testing
const Text = ({ children }) => React.createElement(React.Fragment, null, children);
const Box = ({ children }) => React.createElement(React.Fragment, null, children);

// Mock hooks
const useInput = jest.fn((callback) => {
  // Store callback for testing
  global.__inkInputCallback = callback;
});

const useApp = jest.fn(() => ({
  exit: jest.fn(),
}));

const useFocus = jest.fn(() => ({
  isFocused: false,
}));

const useFocusManager = jest.fn(() => ({
  focus: jest.fn(),
  focusNext: jest.fn(),
  focusPrevious: jest.fn(),
}));

const useStdin = jest.fn(() => ({
  stdin: process.stdin,
  setRawMode: jest.fn(),
  isRawModeSupported: true,
}));

const useStdout = jest.fn(() => ({
  stdout: process.stdout,
  write: jest.fn(),
}));

const useStderr = jest.fn(() => ({
  stderr: process.stderr,
  write: jest.fn(),
}));

// Mock render function
const render = jest.fn((_element) => {
  return {
    rerender: jest.fn(),
    unmount: jest.fn(),
    waitUntilExit: jest.fn(() => Promise.resolve()),
    clear: jest.fn(),
  };
});

module.exports = {
  Text,
  Box,
  useInput,
  useApp,
  useFocus,
  useFocusManager,
  useStdin,
  useStdout,
  useStderr,
  render,
};

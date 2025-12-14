/**
 * Mock for ink-testing-library
 * Provides a simple render implementation for testing Ink components
 */

const React = require('react');

function extractText(element, depth = 0) {
  // Prevent infinite recursion
  if (depth > 50) return '';

  if (!element) return '';
  if (typeof element === 'string') return element;
  if (typeof element === 'number') return String(element);
  if (typeof element === 'boolean') return '';

  if (Array.isArray(element)) {
    return element.map(e => extractText(e, depth + 1)).join('');
  }

  // Handle React elements
  if (React.isValidElement(element)) {
    const { props, type } = element;

    // For function components, try to render them
    if (typeof type === 'function') {
      try {
        const rendered = type(props);
        return extractText(rendered, depth + 1);
      } catch (_error) {
        // If rendering fails, just extract from children
        if (props && props.children) {
          return extractText(props.children, depth + 1);
        }
        return '';
      }
    }

    // For built-in components or fragments, extract children
    if (props && props.children) {
      return extractText(props.children, depth + 1);
    }
  }

  // Try to extract from props.children as fallback
  if (element && typeof element === 'object' && 'props' in element && element.props.children) {
    return extractText(element.props.children, depth + 1);
  }

  return '';
}

function render(component) {
  let lastOutput = extractText(component);

  return {
    lastFrame: () => lastOutput,
    frames: [lastOutput],
    unmount: jest.fn(),
    rerender: jest.fn((newComponent) => {
      lastOutput = extractText(newComponent);
      return lastOutput;
    }),
    stdin: {
      write: jest.fn(),
    },
    stdout: lastOutput,
  };
}

module.exports = {
  render,
};

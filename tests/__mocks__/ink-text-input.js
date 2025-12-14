/**
 * Mock for ink-text-input
 */

function TextInput({ value, _onChange, placeholder }) {
  return placeholder && !value ? placeholder : value || '';
}

module.exports = TextInput;
module.exports.default = TextInput;

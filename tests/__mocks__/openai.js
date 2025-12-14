/**
 * Mock for openai module
 */

const mockCreate = jest.fn();

const mockClient = {
  chat: {
    completions: {
      create: mockCreate,
    },
  },
};

class OpenAI {
  constructor(config) {
    this.config = config;
    Object.assign(this, mockClient);
  }
}

OpenAI.mockCreate = mockCreate;

module.exports = OpenAI;
module.exports.default = OpenAI;

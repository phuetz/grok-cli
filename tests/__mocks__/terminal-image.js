// Mock terminal-image for Jest
const terminalImage = {
  buffer: async () => '[mock terminal image]',
  file: async () => '[mock terminal image]',
  url: async () => '[mock terminal image]',
};

module.exports = terminalImage;
module.exports.default = terminalImage;

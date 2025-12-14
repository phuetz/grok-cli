// Mock boxen for Jest
const boxen = (content, options = {}) => {
  const title = options.title ? `[${options.title}]\n` : '';
  return `${title}${content}`;
};

module.exports = boxen;
module.exports.default = boxen;

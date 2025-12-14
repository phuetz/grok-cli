// Mock gradient-string for Jest
const createGradient = () => (str) => str;

module.exports = {
  cristal: createGradient(),
  atlas: createGradient(),
  vice: createGradient(),
  rainbow: createGradient(),
  passion: createGradient(),
  fruit: createGradient(),
  pastel: createGradient(),
  instagram: createGradient(),
  retro: createGradient(),
  summer: createGradient(),
  teen: createGradient(),
  mind: createGradient(),
};
module.exports.default = module.exports;

// Mock asciichart for Jest
module.exports = {
  plot: (series, _config = {}) => {
    const values = Array.isArray(series[0]) ? series[0] : series;
    return `[Chart: ${values.length} points]`;
  },
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  cyan: 6,
  white: 7,
};
module.exports.default = module.exports;

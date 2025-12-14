// Mock @resvg/resvg-js for Jest
class Resvg {
  constructor(svg, options = {}) {
    this.svg = svg;
    this.options = options;
  }

  render() {
    return {
      asPng: () => Buffer.from('mock-png-data'),
      width: 400,
      height: 200,
    };
  }

  get width() {
    return 400;
  }

  get height() {
    return 200;
  }
}

module.exports = { Resvg };

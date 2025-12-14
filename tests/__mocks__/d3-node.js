// Mock d3-node for Jest
class D3Node {
  constructor() {
    this.d3 = {
      scaleLinear: () => ({
        domain: () => ({
          range: () => (val) => val,
        }),
      }),
      area: () => ({
        x: function() { return this; },
        y0: function() { return this; },
        y1: function() { return this; },
      }),
      line: () => ({
        x: function() { return this; },
        y: function() { return this; },
      }),
    };
  }

  createSVG() {
    return {
      append: function() { return this; },
      attr: function() { return this; },
      datum: function() { return this; },
      text: function() { return this; },
      style: function() { return this; },
    };
  }

  svgString() {
    return '<svg></svg>';
  }

  html() {
    return '<html></html>';
  }
}

module.exports = D3Node;
module.exports.default = D3Node;

declare module 'd3-node' {
  import * as d3 from 'd3';

  interface D3NodeOptions {
    selector?: string;
    container?: string;
    styles?: string;
    d3Module?: typeof d3;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type D3Selection = d3.Selection<any, any, any, any>;

  class D3Node {
    constructor(options?: D3NodeOptions);
    d3: typeof d3;
    document: Document;
    window: Window;
    html(): string;
    svgString(): string;
    chartHTML(): string;
    createSVG(width?: number, height?: number): D3Selection;
  }

  export = D3Node;
}

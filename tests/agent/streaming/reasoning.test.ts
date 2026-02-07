import { StreamingHandler, RawStreamingChunk } from '../../../src/agent/streaming/index.js';

describe('StreamingHandler - Reasoning Detection', () => {
  let handler: StreamingHandler;

  beforeEach(() => {
    handler = new StreamingHandler({ trackTokens: false });
  });

  afterEach(() => {
    handler.dispose();
  });

  function makeChunk(overrides: Partial<RawStreamingChunk['choices']> extends never ? never : {
    content?: string;
    reasoning_content?: string;
    reasoning?: string;
  }): RawStreamingChunk {
    return {
      id: 'test',
      choices: [{
        index: 0,
        delta: {
          content: overrides.content,
          reasoning_content: overrides.reasoning_content,
          reasoning: overrides.reasoning,
        },
        finish_reason: null,
      }],
    };
  }

  it('should detect reasoning_content field', () => {
    const result = handler.accumulateChunk(makeChunk({
      reasoning_content: 'Let me think...',
    }));

    expect(result.reasoningContent).toBe('Let me think...');
    expect(result.displayContent).toBe('');
  });

  it('should detect reasoning field (alternative provider)', () => {
    const result = handler.accumulateChunk(makeChunk({
      reasoning: 'Analyzing the problem...',
    }));

    expect(result.reasoningContent).toBe('Analyzing the problem...');
  });

  it('should not set reasoningContent when no reasoning present', () => {
    const result = handler.accumulateChunk(makeChunk({
      content: 'Hello world',
    }));

    expect(result.reasoningContent).toBeUndefined();
    expect(result.displayContent).toBe('Hello world');
  });

  it('should accumulate reasoning across multiple chunks', () => {
    handler.accumulateChunk(makeChunk({ reasoning_content: 'Step 1. ' }));
    handler.accumulateChunk(makeChunk({ reasoning_content: 'Step 2. ' }));
    const result = handler.accumulateChunk(makeChunk({ reasoning_content: 'Done.' }));

    expect(result.reasoningContent).toBe('Done.');
  });

  it('should handle mixed reasoning and content chunks', () => {
    const r1 = handler.accumulateChunk(makeChunk({ reasoning_content: 'Thinking...' }));
    expect(r1.reasoningContent).toBe('Thinking...');
    expect(r1.displayContent).toBe('');

    const r2 = handler.accumulateChunk(makeChunk({ content: 'Here is the answer.' }));
    expect(r2.reasoningContent).toBeUndefined();
    expect(r2.displayContent).toBe('Here is the answer.');
  });

  it('should reset reasoning on handler reset', () => {
    handler.accumulateChunk(makeChunk({ reasoning_content: 'Some reasoning' }));
    handler.reset();

    const result = handler.accumulateChunk(makeChunk({ content: 'Fresh start' }));
    expect(result.reasoningContent).toBeUndefined();
    expect(result.displayContent).toBe('Fresh start');
  });

  it('should prefer reasoning_content over reasoning when both present', () => {
    const result = handler.accumulateChunk(makeChunk({
      reasoning_content: 'Primary',
      reasoning: 'Fallback',
    }));

    expect(result.reasoningContent).toBe('Primary');
  });
});

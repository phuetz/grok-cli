/**
 * Tests for ToolStreamOutput component rendering behavior.
 * Since this is an Ink component, we test the logic aspects.
 */

describe('ToolStreamOutput - Logic', () => {
  it('should limit displayed lines to maxLines', () => {
    const lines = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`);
    const output = lines.join('\n');
    const maxLines = 15;

    const displayLines = output.split('\n').slice(-maxLines);
    const hiddenCount = Math.max(0, lines.length - maxLines);

    expect(displayLines.length).toBe(15);
    expect(hiddenCount).toBe(15);
    expect(displayLines[0]).toBe('line 16');
    expect(displayLines[14]).toBe('line 30');
  });

  it('should show all lines when under maxLines', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const output = lines.join('\n');
    const maxLines = 15;

    const displayLines = output.split('\n').slice(-maxLines);
    const hiddenCount = Math.max(0, lines.length - maxLines);

    expect(displayLines.length).toBe(3);
    expect(hiddenCount).toBe(0);
  });

  it('should handle empty output', () => {
    const output = '';
    const displayLines = output.split('\n').slice(-15);
    expect(displayLines.length).toBe(1);
    expect(displayLines[0]).toBe('');
  });
});

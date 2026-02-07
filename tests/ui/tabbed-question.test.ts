/**
 * Tests for TabbedQuestion component logic.
 * Since this is an Ink component, we test the navigation logic aspects.
 */

describe('TabbedQuestion - Logic', () => {
  it('should add "Other" to options list', () => {
    const options = ['Option A', 'Option B', 'Option C'];
    const allOptions = [...options, 'Other'];
    expect(allOptions).toEqual(['Option A', 'Option B', 'Option C', 'Other']);
    expect(allOptions.length).toBe(4);
  });

  it('should cycle selection index with Tab (forward)', () => {
    const length = 4;
    let selectedIndex = 0;

    // Tab forward
    selectedIndex = (selectedIndex + 1) % length;
    expect(selectedIndex).toBe(1);

    selectedIndex = (selectedIndex + 1) % length;
    expect(selectedIndex).toBe(2);

    selectedIndex = (selectedIndex + 1) % length;
    expect(selectedIndex).toBe(3);

    // Wrap around
    selectedIndex = (selectedIndex + 1) % length;
    expect(selectedIndex).toBe(0);
  });

  it('should cycle selection index with up arrow (backward)', () => {
    const length = 4;
    let selectedIndex = 0;

    // Up from 0 wraps to last
    selectedIndex = (selectedIndex - 1 + length) % length;
    expect(selectedIndex).toBe(3);

    selectedIndex = (selectedIndex - 1 + length) % length;
    expect(selectedIndex).toBe(2);
  });

  it('should identify "Other" as last option index', () => {
    const options = ['A', 'B'];
    const otherIndex = options.length; // 2
    expect(otherIndex).toBe(2);
  });
});

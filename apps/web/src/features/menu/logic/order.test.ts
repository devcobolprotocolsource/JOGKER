import { describe, expect, it } from 'vitest';
import { moveItem } from './order';

describe('moveItem', () => {
  it('moves an item in either direction without mutating the original list', () => {
    const items = ['coffee', 'tea', 'water'];

    expect(moveItem(items, 0, 1)).toEqual(['tea', 'coffee', 'water']);
    expect(moveItem(items, 2, -1)).toEqual(['coffee', 'water', 'tea']);
    expect(items).toEqual(['coffee', 'tea', 'water']);
  });

  it('keeps the list unchanged when the requested move is out of bounds', () => {
    const items = ['coffee', 'tea'];

    expect(moveItem(items, -1, 1)).toBe(items);
    expect(moveItem(items, 0, -1)).toBe(items);
    expect(moveItem(items, 2, -1)).toBe(items);
    expect(moveItem(items, 1, 1)).toBe(items);
  });
});

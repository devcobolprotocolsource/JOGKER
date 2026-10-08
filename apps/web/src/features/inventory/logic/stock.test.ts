import { describe, expect, it } from 'vitest';
import { stockStatus, stockValue } from './stock';

describe('inventory calculations', () => {
  it('classifies empty, low, and safe stock', () => {
    expect(stockStatus(0, 5)).toBe('out');
    expect(stockStatus(5, 5)).toBe('low');
    expect(stockStatus(8, 5)).toBe('safe');
  });

  it('rounds inventory valuation to integer rupiah', () => {
    expect(stockValue(1.5, 250)).toBe(375);
    expect(stockValue(2.555, 350)).toBe(894);
  });
});

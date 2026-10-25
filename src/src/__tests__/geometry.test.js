import { describe, expect, it } from 'vitest';
import { isPointInPolygon } from '../utils/geometry';

const polygon = [
  { x: 0, y: 0 },
  { x: 20, y: 0 },
  { x: 20, y: 20 },
  { x: 0, y: 20 }
];

describe('isPointInPolygon', () => {
  it('returns true for a point inside the OCR region', () => {
    expect(isPointInPolygon({ x: 10, y: 10 }, polygon)).toBe(true);
  });

  it('returns false for a point outside the OCR region', () => {
    expect(isPointInPolygon({ x: 25, y: 10 }, polygon)).toBe(false);
  });

  it('returns false for invalid polygon input', () => {
    expect(isPointInPolygon({ x: 1, y: 1 }, [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(false);
  });
});

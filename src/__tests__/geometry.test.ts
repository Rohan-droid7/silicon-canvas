import { describe, expect, it } from 'vitest';
import {
  calculatePolygonArea,
  getBBoxHandles,
  isAnnotationVisible,
  isPointInBBox,
  isPointInPolygon,
  normalizeBox,
  pointToSegmentDistance,
} from '../core/math/geometry';
import { BoundingBoxAnnotation, PolygonAnnotation } from '../types/annotation';
import { Point2D } from '../types/canvas';

describe('Geometry Utilities', () => {
  it('correctly tests point in convex and concave polygons', () => {
    // Convex square: (0.2, 0.2) to (0.6, 0.6)
    const square: Point2D[] = [
      { x: 0.2, y: 0.2 },
      { x: 0.6, y: 0.2 },
      { x: 0.6, y: 0.6 },
      { x: 0.2, y: 0.6 },
    ];

    expect(isPointInPolygon({ x: 0.4, y: 0.4 }, square)).toBe(true);
    expect(isPointInPolygon({ x: 0.1, y: 0.4 }, square)).toBe(false);
    expect(isPointInPolygon({ x: 0.7, y: 0.4 }, square)).toBe(false);

    // Concave 'L' / arrowhead shape:
    // (0,0), (1,0), (0.5, 0.5), (1,1), (0,1)
    const arrow: Point2D[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    // Inside the left wing
    expect(isPointInPolygon({ x: 0.2, y: 0.5 }, arrow)).toBe(true);
    // In the concave indentation (e.g. 0.8, 0.5)
    expect(isPointInPolygon({ x: 0.8, y: 0.5 }, arrow)).toBe(false);
  });

  it('tests isPointInBBox', () => {
    const box: BoundingBoxAnnotation = {
      id: 'b1',
      type: 'BBOX',
      classType: 'PARTICLE',
      confidence: 0.95,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      x: 0.2,
      y: 0.3,
      width: 0.4,
      height: 0.2,
    };

    expect(isPointInBBox({ x: 0.3, y: 0.35 }, box)).toBe(true);
    expect(isPointInBBox({ x: 0.2, y: 0.3 }, box)).toBe(true); // corner
    expect(isPointInBBox({ x: 0.6, y: 0.5 }, box)).toBe(true); // opposite corner
    expect(isPointInBBox({ x: 0.19, y: 0.35 }, box)).toBe(false);
    expect(isPointInBBox({ x: 0.3, y: 0.51 }, box)).toBe(false);
  });

  it('calculates point to segment distance correctly', () => {
    const a: Point2D = { x: 0, y: 0 };
    const b: Point2D = { x: 10, y: 0 };

    // Perpendicular drop to midpoint
    expect(pointToSegmentDistance({ x: 5, y: 5 }, a, b)).toBeCloseTo(5, 5);

    // Beyond endpoint a
    expect(pointToSegmentDistance({ x: -3, y: 4 }, a, b)).toBeCloseTo(5, 5);

    // Beyond endpoint b
    expect(pointToSegmentDistance({ x: 14, y: 3 }, a, b)).toBeCloseTo(5, 5);
  });

  it('returns all 8 bounding box handles in normalized space', () => {
    const box: BoundingBoxAnnotation = {
      id: 'b1',
      type: 'BBOX',
      classType: 'SCRATCH',
      confidence: 0.88,
      createdAt: 0,
      updatedAt: 0,
      x: 0.1,
      y: 0.2,
      width: 0.4,
      height: 0.6,
    };

    const handles = getBBoxHandles(box);
    expect(handles.length).toBe(8);

    const positions = handles.map((h) => h.position);
    expect(positions).toEqual(['NW', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W']);

    const nw = handles.find((h) => h.position === 'NW')!;
    expect(nw.point.x).toBeCloseTo(0.1);
    expect(nw.point.y).toBeCloseTo(0.2);

    const se = handles.find((h) => h.position === 'SE')!;
    expect(se.point.x).toBeCloseTo(0.5);
    expect(se.point.y).toBeCloseTo(0.8);
  });

  it('normalizes arbitrary drag corner coordinates correctly', () => {
    // User dragged from bottom-right (0.8, 0.9) to top-left (0.2, 0.3)
    const norm = normalizeBox({ x: 0.8, y: 0.9 }, { x: 0.2, y: 0.3 });
    expect(norm.x).toBeCloseTo(0.2);
    expect(norm.y).toBeCloseTo(0.3);
    expect(norm.width).toBeCloseTo(0.6);
    expect(norm.height).toBeCloseTo(0.6);
  });

  it('culls annotations outside the visible viewport frustum', () => {
    const boxInside: BoundingBoxAnnotation = {
      id: 'b1',
      type: 'BBOX',
      classType: 'PARTICLE',
      confidence: 1,
      createdAt: 0,
      updatedAt: 0,
      x: 0.4,
      y: 0.4,
      width: 0.1,
      height: 0.1,
    };

    const boxOutside: BoundingBoxAnnotation = {
      id: 'b2',
      type: 'BBOX',
      classType: 'PARTICLE',
      confidence: 1,
      createdAt: 0,
      updatedAt: 0,
      x: 0.9,
      y: 0.9,
      width: 0.05,
      height: 0.05,
    };

    // Visible viewport: [0.2, 0.2] to [0.6, 0.6]
    expect(isAnnotationVisible(boxInside, 0.2, 0.2, 0.6, 0.6)).toBe(true);
    expect(isAnnotationVisible(boxOutside, 0.2, 0.2, 0.6, 0.6)).toBe(false);

    const polyInside: PolygonAnnotation = {
      id: 'p1',
      type: 'POLYGON',
      classType: 'CORROSION',
      confidence: 1,
      createdAt: 0,
      updatedAt: 0,
      points: [
        { x: 0.3, y: 0.3 },
        { x: 0.5, y: 0.3 },
        { x: 0.4, y: 0.5 },
      ],
    };
    expect(isAnnotationVisible(polyInside, 0.2, 0.2, 0.6, 0.6)).toBe(true);
  });

  it('calculates polygon area using shoelace formula', () => {
    // 0.5 x 0.5 square -> area = 0.25
    const square: Point2D[] = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 0, y: 0.5 },
    ];
    expect(calculatePolygonArea(square)).toBeCloseTo(0.25, 5);
  });
});

import { Annotation, BoundingBoxAnnotation } from '../../types/annotation';
import { DragHandle, HandlePosition, Point2D } from '../../types/canvas';

/** Clamp a value between min and max */
export function clamp(val: number, min = 0, max = 1): number {
  return Math.min(Math.max(val, min), max);
}

/** Check if a normalized point [0, 1] is inside a polygon using ray casting */
export function isPointInPolygon(point: Point2D, vertices: Point2D[]): boolean {
  if (vertices.length < 3) return false;
  const { x, y } = point;
  let inside = false;

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/** Check if a normalized point is inside a normalized bounding box */
export function isPointInBBox(point: Point2D, box: BoundingBoxAnnotation): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

/** Distance from point P to line segment AB */
export function pointToSegmentDistance(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/** Get the 8 handle positions for a bounding box in normalized coordinates */
export function getBBoxHandles(box: BoundingBoxAnnotation): DragHandle[] {
  const { x, y, width: w, height: h } = box;
  return [
    { position: 'NW', point: { x, y } },
    { position: 'N', point: { x: x + w / 2, y } },
    { position: 'NE', point: { x: x + w, y } },
    { position: 'E', point: { x: x + w, y: y + h / 2 } },
    { position: 'SE', point: { x: x + w, y: y + h } },
    { position: 'S', point: { x: x + w / 2, y: y + h } },
    { position: 'SW', point: { x, y: y + h } },
    { position: 'W', point: { x, y: y + h / 2 } },
  ];
}

/** Converts two arbitrary corner points into a normalized axis-aligned bounding box */
export function normalizeBox(
  p1: Point2D,
  p2: Point2D
): { x: number; y: number; width: number; height: number } {
  const minX = clamp(Math.min(p1.x, p2.x));
  const maxX = clamp(Math.max(p1.x, p2.x));
  const minY = clamp(Math.min(p1.y, p2.y));
  const maxY = clamp(Math.max(p1.y, p2.y));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Viewport frustum culling — returns true if annotation intersects the visible area */
export function isAnnotationVisible(
  annotation: Annotation,
  viewMinX: number,
  viewMinY: number,
  viewMaxX: number,
  viewMaxY: number
): boolean {
  if (annotation.type === 'BBOX') {
    const { x, y, width, height } = annotation;
    return !(x + width < viewMinX || x > viewMaxX || y + height < viewMinY || y > viewMaxY);
  } else {
    if (annotation.points.length === 0) return false;
    let minX = annotation.points[0].x;
    let maxX = annotation.points[0].x;
    let minY = annotation.points[0].y;
    let maxY = annotation.points[0].y;

    for (let i = 1; i < annotation.points.length; i++) {
      const p = annotation.points[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    return !(maxX < viewMinX || minX > viewMaxX || maxY < viewMinY || minY > viewMaxY);
  }
}

/** Calculates polygon area using the Shoelace formula (normalized coordinates) */
export function calculatePolygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

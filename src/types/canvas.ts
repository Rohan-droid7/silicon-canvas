export interface Point2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}

export interface CanvasTransform {
  scale: number;      // Zoom multiplier (1.0 = 100%)
  translateX: number; // X translation in screen pixels
  translateY: number; // Y translation in screen pixels
}

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type ActiveTool = 'SELECT' | 'BOX' | 'POLYGON' | 'PAN';

export type HandlePosition = 'NW' | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W';

export interface DragHandle {
  position: HandlePosition;
  point: Point2D; // Normalized coordinates
}

/** State for an annotation currently being drawn (not yet committed) */
export interface DrawingState {
  tool: 'BOX' | 'POLYGON';
  /** For BOX: [startPoint, currentPoint]. For POLYGON: array of placed vertices. */
  points: Point2D[]; // Normalized coordinates
  /** For POLYGON: the current cursor position for the preview line */
  cursorPoint?: Point2D;
}

import { Point2D } from './canvas';

export type DefectClass =
  | 'PARTICLE'
  | 'SCRATCH'
  | 'PATTERN_BRIDGING'
  | 'VIA_VOID'
  | 'CORROSION'
  | 'UNKNOWN_ANOMALY';

export const DEFECT_CLASS_CONFIG: Record<DefectClass, { displayName: string; color: string; description: string }> = {
  PARTICLE: {
    displayName: 'Particle',
    color: '#ff5252',
    description: 'Foreign particle contamination',
  },
  SCRATCH: {
    displayName: 'Scratch',
    color: '#ff9100',
    description: 'CMP mechanical scratch',
  },
  PATTERN_BRIDGING: {
    displayName: 'Pattern Bridging',
    color: '#ffea00',
    description: 'Lithography photolithographic bridge',
  },
  VIA_VOID: {
    displayName: 'Via Void',
    color: '#69f0ae',
    description: 'Incomplete contact via fill',
  },
  CORROSION: {
    displayName: 'Corrosion',
    color: '#448aff',
    description: 'Metal line chemical corrosion',
  },
  UNKNOWN_ANOMALY: {
    displayName: 'Unknown Anomaly',
    color: '#b388ff',
    description: 'Unclassified defect awaiting review',
  },
};

export type AnnotationType = 'BBOX' | 'POLYGON';

export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  classType: DefectClass;
  confidence: number;
  createdAt: number;
  updatedAt: number;
  label?: string;
  isLocked?: boolean;
}

/** Coordinates are normalized to [0, 1] relative to image dimensions */
export interface BoundingBoxAnnotation extends BaseAnnotation {
  type: 'BBOX';
  x: number;      // Top-left normalized X [0, 1]
  y: number;      // Top-left normalized Y [0, 1]
  width: number;  // Normalized width [0, 1]
  height: number; // Normalized height [0, 1]
}

/** Coordinates are normalized to [0, 1] relative to image dimensions */
export interface PolygonAnnotation extends BaseAnnotation {
  type: 'POLYGON';
  points: Point2D[]; // Array of normalized points, minimum 3
}

export type Annotation = BoundingBoxAnnotation | PolygonAnnotation;

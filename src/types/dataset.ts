import { Annotation, DefectClass } from './annotation';
import { CanvasTransform } from './canvas';
import { FilterParams } from './worker';

/** COCO 1.0 JSON schema */
export interface COCODataset {
  images: COCOImage[];
  annotations: COCOAnnotation[];
  categories: COCOCategory[];
}

export interface COCOImage {
  id: number;
  file_name: string;
  width: number;
  height: number;
}

export interface COCOAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  bbox: [number, number, number, number]; // [x, y, width, height] in pixels
  segmentation: number[][];               // [[x1, y1, x2, y2, ...]] in pixels
  area: number;
  iscrowd: 0 | 1;
}

export interface COCOCategory {
  id: number;
  name: DefectClass | string;
  supercategory: string;
}

/** Complete Raw SiliconCanvas project export schema */
export interface SiliconCanvasProjectFile {
  version: string;
  timestamp: number;
  image: {
    fileName: string;
    width: number;
    height: number;
  };
  transform: CanvasTransform;
  filterParams: FilterParams;
  annotations: Annotation[];
}

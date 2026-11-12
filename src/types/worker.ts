export type FilterType =
  | 'NONE'
  | 'HISTOGRAM_EQUALIZE'
  | 'SOBEL_EDGE'
  | 'OTSU_THRESHOLD'
  | 'INVERT';

export interface FilterParams {
  brightness: number; // -100 to +100
  contrast: number;   // -100 to +100
  filterType: FilterType;
}

export interface FilterWorkerRequest {
  id: string;
  buffer: ArrayBuffer;
  width: number;
  height: number;
  params: FilterParams;
}

export interface FilterWorkerResponse {
  id: string;
  buffer: ArrayBuffer;
  width: number;
  height: number;
  executionTimeMs: number;
  error?: string;
}

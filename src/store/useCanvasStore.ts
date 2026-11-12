import { create } from 'zustand';
import { Annotation, DefectClass } from '../types/annotation';
import { ActiveTool, CanvasTransform, DrawingState } from '../types/canvas';
import { FilterParams } from '../types/worker';
import { TransformMatrix } from '../core/math/transformMatrix';

export interface CanvasState {
  // === Transform / Viewport ===
  transform: CanvasTransform;
  minScale: number;
  maxScale: number;
  viewportDimensions: { width: number; height: number };
  setTransform: (transform: Partial<CanvasTransform>) => void;
  resetTransform: (containerW?: number, containerH?: number, imgW?: number, imgH?: number) => void;
  setViewportDimensions: (dims: { width: number; height: number }) => void;

  // === Active Tool ===
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;

  // === Drawing In-Progress ===
  drawingState: DrawingState | null;
  setDrawingState: (state: DrawingState | null) => void;

  // === Annotations ===
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  hoveredAnnotationId: string | null;
  activeDefectClass: DefectClass;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updater: (a: Annotation) => Annotation) => void;
  deleteAnnotation: (id: string) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  setSelectedId: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setActiveDefectClass: (cls: DefectClass) => void;

  // === Image & Filter ===
  imageBitmap: ImageBitmap | null;
  imageFileName: string;
  imageDimensions: { width: number; height: number };
  originalImageData: ImageData | null;
  filterParams: FilterParams;
  isProcessingFilter: boolean;
  filterExecutionTimeMs: number;
  imageSmoothing: boolean;
  nmPerPixel: number; // e.g. 4.5 nm per pixel for SEM calibration

  setImageBitmap: (
    bitmap: ImageBitmap | null,
    dims: { width: number; height: number },
    fileName?: string
  ) => void;
  setOriginalImageData: (data: ImageData | null) => void;
  setFilterParams: (params: Partial<FilterParams>) => void;
  setIsProcessingFilter: (processing: boolean, timeMs?: number) => void;
  setImageSmoothing: (smoothing: boolean) => void;
  setNmPerPixel: (nm: number) => void;
}

const DEFAULT_TRANSFORM: CanvasTransform = {
  scale: 1,
  translateX: 0,
  translateY: 0,
};

const DEFAULT_FILTER_PARAMS: FilterParams = {
  brightness: 0,
  contrast: 0,
  filterType: 'NONE',
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Viewport
  transform: DEFAULT_TRANSFORM,
  minScale: 0.1,
  maxScale: 50.0,
  viewportDimensions: { width: 1100, height: 750 },
  setTransform: (newTransform) =>
    set((state) => ({
      transform: { ...state.transform, ...newTransform },
    })),

  setViewportDimensions: (dims) => set({ viewportDimensions: dims }),

  resetTransform: (containerW, containerH, imgW, imgH) => {
    const width = imgW ?? get().imageDimensions.width;
    const height = imgH ?? get().imageDimensions.height;
    const cW = containerW && containerW > 0 ? containerW : get().viewportDimensions.width;
    const cH = containerH && containerH > 0 ? containerH : get().viewportDimensions.height;
    if (width > 0 && height > 0 && cW > 0 && cH > 0) {
      const fit = TransformMatrix.fitToContainer(cW, cH, width, height, 40);
      set({ transform: fit });
    } else {
      set({ transform: DEFAULT_TRANSFORM });
    }
  },

  // Tools
  activeTool: 'SELECT',
  setActiveTool: (tool) => set({ activeTool: tool, drawingState: null }),

  // Drawing in progress
  drawingState: null,
  setDrawingState: (state) => set({ drawingState: state }),

  // Annotations
  annotations: [],
  selectedAnnotationId: null,
  hoveredAnnotationId: null,
  activeDefectClass: 'PARTICLE',

  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation],
      selectedAnnotationId: annotation.id,
    })),

  updateAnnotation: (id, updater) =>
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? updater(a) : a)),
    })),

  deleteAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId:
        state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })),

  setAnnotations: (annotations) => set({ annotations }),
  setSelectedId: (id) => set({ selectedAnnotationId: id }),
  setHoveredId: (id) => set({ hoveredAnnotationId: id }),
  setActiveDefectClass: (cls) => set({ activeDefectClass: cls }),

  // Image & Filter
  imageBitmap: null,
  imageFileName: 'sample_wafer.png',
  imageDimensions: { width: 0, height: 0 },
  originalImageData: null,
  filterParams: DEFAULT_FILTER_PARAMS,
  isProcessingFilter: false,
  filterExecutionTimeMs: 0,
  imageSmoothing: true,
  nmPerPixel: 4.5, // 4.5 nanometers per pixel

  setImageBitmap: (bitmap, dims, fileName) => {
    const prevBitmap = get().imageBitmap;
    if (prevBitmap && prevBitmap !== bitmap) {
      try {
        prevBitmap.close();
      } catch {
        // Ignored if already closed
      }
    }

    set((state) => ({
      imageBitmap: bitmap,
      imageDimensions: dims,
      imageFileName: fileName ?? state.imageFileName,
      filterParams: DEFAULT_FILTER_PARAMS,
    }));
  },

  setOriginalImageData: (data) => set({ originalImageData: data }),

  setFilterParams: (params) =>
    set((state) => ({
      filterParams: { ...state.filterParams, ...params },
    })),

  setIsProcessingFilter: (processing, timeMs) =>
    set({
      isProcessingFilter: processing,
      ...(timeMs !== undefined ? { filterExecutionTimeMs: timeMs } : {}),
    }),

  setImageSmoothing: (smoothing) => set({ imageSmoothing: smoothing }),
  setNmPerPixel: (nm) => set({ nmPerPixel: Math.max(0.1, nm) }),
}));

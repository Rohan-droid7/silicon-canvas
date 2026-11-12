import { Annotation } from '../../types/annotation';
import { CanvasTransform, DrawingState } from '../../types/canvas';
import { ImageLayerRenderer } from './ImageLayerRenderer';
import { VectorLayerRenderer } from './VectorLayerRenderer';

export class CanvasEngine {
  private gridCanvas: HTMLCanvasElement;
  private rasterCanvas: HTMLCanvasElement;
  private vectorCanvas: HTMLCanvasElement;

  private gridCtx: CanvasRenderingContext2D;
  private rasterCtx: CanvasRenderingContext2D;
  private vectorCtx: CanvasRenderingContext2D;

  private offscreenFilteredCanvas: HTMLCanvasElement | null = null;
  private offscreenFilteredCtx: CanvasRenderingContext2D | null = null;

  public gridDirty = true;
  public rasterDirty = true;
  public vectorDirty = true;

  private rafId: number | null = null;
  private isDestroyed = false;

  constructor(
    gridCanvas: HTMLCanvasElement,
    rasterCanvas: HTMLCanvasElement,
    vectorCanvas: HTMLCanvasElement
  ) {
    this.gridCanvas = gridCanvas;
    this.rasterCanvas = rasterCanvas;
    this.vectorCanvas = vectorCanvas;

    this.gridCtx = gridCanvas.getContext('2d')!;
    this.rasterCtx = rasterCanvas.getContext('2d', { alpha: true })!;
    this.vectorCtx = vectorCanvas.getContext('2d', { alpha: true })!;
  }

  public setFilteredImageData(imageData: ImageData | null): void {
    if (!imageData) {
      this.offscreenFilteredCanvas = null;
      this.offscreenFilteredCtx = null;
      this.rasterDirty = true;
      return;
    }

    if (!this.offscreenFilteredCanvas) {
      this.offscreenFilteredCanvas = document.createElement('canvas');
    }

    this.offscreenFilteredCanvas.width = imageData.width;
    this.offscreenFilteredCanvas.height = imageData.height;
    this.offscreenFilteredCtx = this.offscreenFilteredCanvas.getContext('2d');
    if (this.offscreenFilteredCtx) {
      this.offscreenFilteredCtx.putImageData(imageData, 0, 0);
    }
    this.rasterDirty = true;
  }

  public resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;

    [this.gridCanvas, this.rasterCanvas, this.vectorCanvas].forEach((canvas) => {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    });

    [this.gridCtx, this.rasterCtx, this.vectorCtx].forEach((ctx) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });

    this.gridDirty = true;
    this.rasterDirty = true;
    this.vectorDirty = true;
  }

  public render(
    width: number,
    height: number,
    transform: CanvasTransform,
    imageBitmap: ImageBitmap | null,
    imgWidth: number,
    imgHeight: number,
    imageSmoothing: boolean,
    annotations: Annotation[],
    selectedId: string | null,
    hoveredId: string | null,
    drawingState: DrawingState | null,
    activeClassColor: string
  ): void {
    if (this.isDestroyed) return;

    // 1. Layer 1: Background Grid
    if (this.gridDirty) {
      this.renderGrid(width, height, transform);
      this.gridDirty = false;
    }

    // 2. Layer 2: Raster Image
    if (this.rasterDirty) {
      ImageLayerRenderer.render(
        this.rasterCtx,
        width,
        height,
        imageBitmap,
        this.offscreenFilteredCanvas,
        transform,
        imageSmoothing
      );
      this.rasterDirty = false;
    }

    // 3. Layer 3: Vector Annotations
    if (this.vectorDirty) {
      VectorLayerRenderer.render(
        this.vectorCtx,
        width,
        height,
        annotations,
        selectedId,
        hoveredId,
        drawingState,
        transform,
        imgWidth,
        imgHeight,
        activeClassColor
      );
      this.vectorDirty = false;
    }
  }

  private renderGrid(width: number, height: number, transform: CanvasTransform): void {
    const ctx = this.gridCtx;
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Deep cleanroom background
    ctx.fillStyle = '#080a10';
    ctx.fillRect(0, 0, width, height);

    // Determine grid step size based on zoom
    let baseStep = 50;
    while (baseStep * transform.scale < 25) {
      baseStep *= 2;
    }
    while (baseStep * transform.scale > 120) {
      baseStep /= 2;
    }

    const step = baseStep * transform.scale;
    const startX = (transform.translateX % step) - step;
    const startY = (transform.translateY % step) - step;

    ctx.lineWidth = 1;

    // Minor grid lines
    ctx.strokeStyle = '#121824';
    ctx.beginPath();
    for (let x = startX; x < width + step; x += step) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, height);
    }
    for (let y = startY; y < height + step; y += step) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(width, Math.round(y) + 0.5);
    }
    ctx.stroke();

    // Major grid lines (every 4 steps)
    const majorStep = step * 4;
    const majorStartX = (transform.translateX % majorStep) - majorStep;
    const majorStartY = (transform.translateY % majorStep) - majorStep;

    ctx.strokeStyle = '#1d273a';
    ctx.beginPath();
    for (let x = majorStartX; x < width + majorStep; x += majorStep) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, height);
    }
    for (let y = majorStartY; y < height + majorStep; y += majorStep) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(width, Math.round(y) + 0.5);
    }
    ctx.stroke();

    ctx.restore();
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.offscreenFilteredCanvas = null;
    this.offscreenFilteredCtx = null;
  }
}

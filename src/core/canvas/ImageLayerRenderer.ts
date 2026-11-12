import { CanvasTransform } from '../../types/canvas';

export class ImageLayerRenderer {
  /**
   * Renders the raster wafer image onto Layer 2 canvas.
   * If filteredImageData is provided, renders that; otherwise renders the imageBitmap.
   */
  static render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    imageBitmap: ImageBitmap | null,
    filteredCanvas: HTMLCanvasElement | null,
    transform: CanvasTransform,
    imageSmoothing: boolean
  ): void {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if (!imageBitmap && !filteredCanvas) {
      ctx.restore();
      return;
    }

    ctx.imageSmoothingEnabled = imageSmoothing;
    ctx.imageSmoothingQuality = 'high';

    // Apply affine transform
    ctx.setTransform(
      transform.scale,
      0,
      0,
      transform.scale,
      transform.translateX,
      transform.translateY
    );

    if (filteredCanvas) {
      ctx.drawImage(filteredCanvas, 0, 0);
    } else if (imageBitmap) {
      ctx.drawImage(imageBitmap, 0, 0);
    }

    ctx.restore();
  }
}

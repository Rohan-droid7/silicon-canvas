import { CanvasTransform, Point2D } from '../../types/canvas';

export class TransformMatrix {
  static screenToImage(screen: Point2D, transform: CanvasTransform): Point2D {
    return {
      x: (screen.x - transform.translateX) / transform.scale,
      y: (screen.y - transform.translateY) / transform.scale,
    };
  }

  static imageToScreen(image: Point2D, transform: CanvasTransform): Point2D {
    return {
      x: image.x * transform.scale + transform.translateX,
      y: image.y * transform.scale + transform.translateY,
    };
  }

  static computeZoom(
    current: CanvasTransform,
    focalPoint: Point2D,
    multiplier: number,
    minScale = 0.1,
    maxScale = 50.0
  ): CanvasTransform {
    const nextScale = Math.min(Math.max(current.scale * multiplier, minScale), maxScale);
    const factor = nextScale / current.scale;

    return {
      scale: nextScale,
      translateX: focalPoint.x - factor * (focalPoint.x - current.translateX),
      translateY: focalPoint.y - factor * (focalPoint.y - current.translateY),
    };
  }

  static fitToContainer(
    containerWidth: number,
    containerHeight: number,
    imageWidth: number,
    imageHeight: number,
    padding = 40
  ): CanvasTransform {
    if (imageWidth <= 0 || imageHeight <= 0) {
      return { scale: 1, translateX: 0, translateY: 0 };
    }

    const availW = Math.max(containerWidth - padding * 2, 10);
    const availH = Math.max(containerHeight - padding * 2, 10);
    const scale = Math.min(availW / imageWidth, availH / imageHeight);

    return {
      scale,
      translateX: (containerWidth - imageWidth * scale) / 2,
      translateY: (containerHeight - imageHeight * scale) / 2,
    };
  }
}

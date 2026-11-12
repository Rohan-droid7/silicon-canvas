import { describe, expect, it } from 'vitest';
import { TransformMatrix } from '../core/math/transformMatrix';
import { CanvasTransform, Point2D } from '../types/canvas';

describe('TransformMatrix', () => {
  it('screenToImage and imageToScreen are exact inverses', () => {
    const transform: CanvasTransform = {
      scale: 2.5,
      translateX: 120,
      translateY: -80,
    };

    const originalImagePt: Point2D = { x: 345.6, y: 789.1 };
    const screenPt = TransformMatrix.imageToScreen(originalImagePt, transform);
    const roundTripImagePt = TransformMatrix.screenToImage(screenPt, transform);

    expect(roundTripImagePt.x).toBeCloseTo(originalImagePt.x, 5);
    expect(roundTripImagePt.y).toBeCloseTo(originalImagePt.y, 5);
  });

  it('zooming at focal point (xf, yf) leaves that image pixel invariant in screen space', () => {
    const current: CanvasTransform = {
      scale: 1.5,
      translateX: 200,
      translateY: 150,
    };

    const focalPoint: Point2D = { x: 400, y: 300 };

    // Find the image coordinate under the focal point before zoom
    const imagePtBefore = TransformMatrix.screenToImage(focalPoint, current);

    // Compute new transform after 2x zoom
    const nextTransform = TransformMatrix.computeZoom(current, focalPoint, 2.0);

    // Project that image coordinate to screen using new transform
    const screenPtAfter = TransformMatrix.imageToScreen(imagePtBefore, nextTransform);

    // It must still project to the exact focal point on screen
    expect(screenPtAfter.x).toBeCloseTo(focalPoint.x, 5);
    expect(screenPtAfter.y).toBeCloseTo(focalPoint.y, 5);
    expect(nextTransform.scale).toBeCloseTo(3.0, 5);
  });

  it('clamps zoom between minScale and maxScale', () => {
    const current: CanvasTransform = { scale: 1.0, translateX: 0, translateY: 0 };
    const focal: Point2D = { x: 100, y: 100 };

    const zoomedOutMax = TransformMatrix.computeZoom(current, focal, 0.001, 0.1, 50.0);
    expect(zoomedOutMax.scale).toBe(0.1);

    const zoomedInMax = TransformMatrix.computeZoom(current, focal, 1000.0, 0.1, 50.0);
    expect(zoomedInMax.scale).toBe(50.0);
  });

  it('fitToContainer centers landscape and portrait images with padding', () => {
    // Landscape image (1000 x 500) in 800 x 600 container with 40px padding
    // Available: 720 x 520 -> scale = min(720/1000, 520/500) = 0.72
    const landscapeFit = TransformMatrix.fitToContainer(800, 600, 1000, 500, 40);
    expect(landscapeFit.scale).toBeCloseTo(0.72, 4);
    expect(landscapeFit.translateX).toBeCloseTo((800 - 1000 * 0.72) / 2, 4);
    expect(landscapeFit.translateY).toBeCloseTo((600 - 500 * 0.72) / 2, 4);

    // Portrait image (500 x 1000) in 800 x 600 container with 40px padding
    // Available: 720 x 520 -> scale = min(720/500, 520/1000) = 0.52
    const portraitFit = TransformMatrix.fitToContainer(800, 600, 500, 1000, 40);
    expect(portraitFit.scale).toBeCloseTo(0.52, 4);
    expect(portraitFit.translateX).toBeCloseTo((800 - 500 * 0.52) / 2, 4);
    expect(portraitFit.translateY).toBeCloseTo((600 - 1000 * 0.52) / 2, 4);
  });
});

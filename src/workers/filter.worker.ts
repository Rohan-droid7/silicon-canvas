import { FilterWorkerRequest, FilterWorkerResponse } from '../types/worker';
import {
  applyBrightnessContrast,
  applyHistogramEqualization,
  applyInvert,
  applyOtsuThreshold,
  applySobel,
} from './filterAlgorithms';

self.onmessage = (e: MessageEvent<FilterWorkerRequest>) => {
  const { id, buffer, width, height, params } = e.data;
  const start = performance.now();

  try {
    let pixels = new Uint8ClampedArray(buffer);

    // Apply brightness / contrast first if modified
    if (params.brightness !== 0 || params.contrast !== 0) {
      pixels = applyBrightnessContrast(pixels, params.brightness, params.contrast);
    }

    // Apply specific filter
    switch (params.filterType) {
      case 'HISTOGRAM_EQUALIZE':
        pixels = applyHistogramEqualization(pixels);
        break;
      case 'SOBEL_EDGE':
        pixels = applySobel(pixels, width, height);
        break;
      case 'OTSU_THRESHOLD':
        pixels = applyOtsuThreshold(pixels, width, height);
        break;
      case 'INVERT':
        pixels = applyInvert(pixels);
        break;
      case 'NONE':
      default:
        break;
    }

    const outBuffer = pixels.buffer;
    const response: FilterWorkerResponse = {
      id,
      buffer: outBuffer,
      width,
      height,
      executionTimeMs: Math.round(performance.now() - start),
    };

    // Zero-copy transfer back
    (self as unknown as Worker).postMessage(response, [outBuffer]);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const response: FilterWorkerResponse = {
      id,
      buffer: new ArrayBuffer(0),
      width,
      height,
      executionTimeMs: Math.round(performance.now() - start),
      error: errorMsg,
    };
    (self as unknown as Worker).postMessage(response);
  }
};

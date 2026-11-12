import '@testing-library/jest-dom';
import 'vitest-canvas-mock';

// Global mock for createImageBitmap if not provided in jsdom
if (typeof globalThis.createImageBitmap === 'undefined') {
  globalThis.createImageBitmap = (async (image: any) => {
    return {
      width: image?.width || 1024,
      height: image?.height || 1024,
      close: () => {},
    } as unknown as ImageBitmap;
  }) as any;
}

// Global mock for Worker in jsdom test environment
if (typeof globalThis.Worker === 'undefined') {
  class MockWorker {
    onmessage: ((e: any) => void) | null = null;
    postMessage(_data: any, _transfer?: any[]) {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  }
  globalThis.Worker = MockWorker as any;
}

// Global mock for ResizeObserver in jsdom
if (typeof globalThis.ResizeObserver === 'undefined') {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = MockResizeObserver as any;
}

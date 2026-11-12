import { useEffect, useRef } from 'react';
import { CanvasEngine } from '../core/canvas/CanvasEngine';
import { useCanvasStore } from '../store/useCanvasStore';
import { FilterWorkerRequest, FilterWorkerResponse } from '../types/worker';

export function useWorkerFilter(engineRef: React.RefObject<CanvasEngine | null>) {
  const workerRef = useRef<Worker | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);

  const {
    originalImageData,
    filterParams,
    setIsProcessingFilter,
  } = useCanvasStore();

  // Initialize Web Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/filter.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent<FilterWorkerResponse>) => {
      const { id, buffer, width, height, executionTimeMs, error } = e.data;

      if (id !== activeRequestIdRef.current) return;

      if (error) {
        console.error('Filter worker error:', error);
        setIsProcessingFilter(false);
        return;
      }

      if (buffer.byteLength > 0 && engineRef.current) {
        const pixelData = new Uint8ClampedArray(buffer);
        const reconstructed = new ImageData(pixelData, width, height);
        engineRef.current.setFilteredImageData(reconstructed);
      }

      setIsProcessingFilter(false, executionTimeMs);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [engineRef, setIsProcessingFilter]);

  // Reactive trigger: Automatically dispatch to Web Worker whenever filterParams or image changes
  useEffect(() => {
    if (!originalImageData || !workerRef.current) return;

    // Check if filter is completely normal/identity
    if (
      filterParams.filterType === 'NONE' &&
      filterParams.brightness === 0 &&
      filterParams.contrast === 0
    ) {
      if (engineRef.current) {
        engineRef.current.setFilteredImageData(null);
      }
      setIsProcessingFilter(false, 0);
      return;
    }

    setIsProcessingFilter(true);

    const requestId = crypto.randomUUID();
    activeRequestIdRef.current = requestId;

    // Clone original buffer for zero-copy transfer
    const clonedBuffer = originalImageData.data.slice().buffer;

    const request: FilterWorkerRequest = {
      id: requestId,
      buffer: clonedBuffer,
      width: originalImageData.width,
      height: originalImageData.height,
      params: filterParams,
    };

    // Zero-copy transfer to worker
    workerRef.current.postMessage(request, [clonedBuffer]);
  }, [filterParams, originalImageData, engineRef, setIsProcessingFilter]);
}

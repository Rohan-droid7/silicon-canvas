import { useCallback, useRef } from 'react';
import { globalHistory } from '../core/history/historyInstance';
import { useCanvasStore } from '../store/useCanvasStore';
import { BoundingBoxAnnotation, PolygonAnnotation } from '../types/annotation';

export function useImageLoader(containerRef?: React.RefObject<HTMLDivElement | null>) {
  const prevObjectUrlRef = useRef<string | null>(null);
  const { setImageBitmap, setOriginalImageData, resetTransform, setAnnotations } =
    useCanvasStore();

  const cleanupPrevUrl = useCallback(() => {
    if (prevObjectUrlRef.current) {
      URL.revokeObjectURL(prevObjectUrlRef.current);
      prevObjectUrlRef.current = null;
    }
  }, []);

  const processLoadedBitmap = useCallback(
    (bitmap: ImageBitmap, fileName: string) => {
      const width = bitmap.width;
      const height = bitmap.height;

      setImageBitmap(bitmap, { width, height }, fileName);

      // Extract original ImageData for background worker filters
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        const originalData = ctx.getImageData(0, 0, width, height);
        setOriginalImageData(originalData);
      }

      // Fit to container viewport
      if (containerRef && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        resetTransform(clientWidth, clientHeight, width, height);
      } else {
        resetTransform(undefined, undefined, width, height);
      }
    },
    [containerRef, setImageBitmap, setOriginalImageData, resetTransform]
  );

  const loadImageFromFile = useCallback(
    async (file: File) => {
      cleanupPrevUrl();
      const objectUrl = URL.createObjectURL(file);
      prevObjectUrlRef.current = objectUrl;

      try {
        const response = await fetch(objectUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none' });
        processLoadedBitmap(bitmap, file.name);
      } catch (err) {
        console.error('Failed to load image from file:', err);
      }
    },
    [cleanupPrevUrl, processLoadedBitmap]
  );

  const loadImageFromUrl = useCallback(
    async (url: string, name?: string) => {
      cleanupPrevUrl();
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none' });
        const fileName = name || url.split('/').pop() || 'wafer_image.png';
        processLoadedBitmap(bitmap, fileName);
      } catch (err) {
        console.error('Failed to load image from URL:', err);
      }
    },
    [cleanupPrevUrl, processLoadedBitmap]
  );

  /**
   * Generates a photorealistic synthetic semiconductor wafer scan entirely in memory
   * Zero network requests, zero cost, instant test fixture!
   */
  const loadSyntheticWafer = useCallback(
    async (type: 'sem_particle' | 'cmp_scratch' | 'litho_bridge' = 'sem_particle') => {
      cleanupPrevUrl();
      const width = type === 'litho_bridge' ? 2048 : 1536;
      const height = type === 'litho_bridge' ? 2048 : 1536;

      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext('2d')!;

      // Substrate base gradient (electron microscopy slate gray)
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.1,
        width / 2,
        height / 2,
        width * 0.55
      );
      grad.addColorStop(0, '#5a626c');
      grad.addColorStop(0.7, '#434952');
      grad.addColorStop(1, '#2a2f38');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Microscopic circuit tracks (lithography bus lines)
      ctx.strokeStyle = '#6f7986';
      ctx.lineWidth = 14;
      const pitch = 36;

      for (let x = 40; x < width - 40; x += pitch) {
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, height - 40);
        ctx.stroke();
      }

      // Orthogonal metal interconnect lines with vias
      ctx.strokeStyle = '#353c46';
      ctx.lineWidth = 8;
      for (let y = 60; y < height - 60; y += pitch * 2) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();

        // Contact vias at intersections
        for (let x = 40; x < width - 40; x += pitch * 2) {
          ctx.fillStyle = '#1c2129';
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Add Defect Artifacts
      if (type === 'sem_particle') {
        // High-Z heavy particle contamination (bright electron backscatter)
        const particles = [
          { x: width * 0.38, y: height * 0.42, r: 24 },
          { x: width * 0.65, y: height * 0.28, r: 16 },
          { x: width * 0.52, y: height * 0.73, r: 32 },
          { x: width * 0.22, y: height * 0.68, r: 12 },
        ];
        for (const p of particles) {
          const pGrad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
          pGrad.addColorStop(0, '#ffffff');
          pGrad.addColorStop(0.5, '#d0d8e2');
          pGrad.addColorStop(0.85, '#3a4049');
          pGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (type === 'cmp_scratch') {
        // Deep chemical-mechanical polishing (CMP) abrasive micro-scratch
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(width * 0.15, height * 0.25);
        ctx.bezierCurveTo(
          width * 0.45,
          height * 0.4,
          width * 0.55,
          height * 0.65,
          width * 0.82,
          height * 0.8
        );
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (type === 'litho_bridge') {
        // Photolithographic pattern bridging (metal short)
        ctx.fillStyle = '#9aa4b2';
        ctx.beginPath();
        ctx.ellipse(width * 0.48, height * 0.51, 60, 20, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle SEM sensor noise pass
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 18;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);

      const bitmap = await createImageBitmap(offscreen, { premultiplyAlpha: 'none' });
      processLoadedBitmap(bitmap, `wafer_${type}.png`);

      // Set sample-specific realistic defect annotations
      globalHistory.clear();
      if (type === 'sem_particle') {
        const semAnnotations: (BoundingBoxAnnotation | PolygonAnnotation)[] = [
          {
            id: crypto.randomUUID(),
            type: 'BBOX',
            classType: 'PARTICLE',
            confidence: 0.98,
            createdAt: Date.now() - 3600000,
            updatedAt: Date.now() - 3600000,
            x: 0.36,
            y: 0.40,
            width: 0.05,
            height: 0.05,
          },
          {
            id: crypto.randomUUID(),
            type: 'BBOX',
            classType: 'VIA_VOID',
            confidence: 0.94,
            createdAt: Date.now() - 1800000,
            updatedAt: Date.now() - 1800000,
            x: 0.63,
            y: 0.26,
            width: 0.04,
            height: 0.04,
          },
          {
            id: crypto.randomUUID(),
            type: 'POLYGON',
            classType: 'PATTERN_BRIDGING',
            confidence: 0.91,
            createdAt: Date.now() - 900000,
            updatedAt: Date.now() - 900000,
            points: [
              { x: 0.49, y: 0.70 },
              { x: 0.56, y: 0.71 },
              { x: 0.55, y: 0.77 },
              { x: 0.48, y: 0.75 },
            ],
          },
          {
            id: crypto.randomUUID(),
            type: 'BBOX',
            classType: 'PARTICLE',
            confidence: 0.96,
            createdAt: Date.now() - 600000,
            updatedAt: Date.now() - 600000,
            x: 0.50,
            y: 0.71,
            width: 0.04,
            height: 0.04,
          },
        ];
        setAnnotations(semAnnotations);
      } else if (type === 'cmp_scratch') {
        const scratchAnnotations: (BoundingBoxAnnotation | PolygonAnnotation)[] = [
          {
            id: crypto.randomUUID(),
            type: 'POLYGON',
            classType: 'SCRATCH',
            confidence: 0.97,
            createdAt: Date.now() - 2400000,
            updatedAt: Date.now() - 2400000,
            points: [
              { x: 0.14, y: 0.24 },
              { x: 0.28, y: 0.30 },
              { x: 0.44, y: 0.39 },
              { x: 0.56, y: 0.64 },
              { x: 0.83, y: 0.79 },
              { x: 0.81, y: 0.82 },
              { x: 0.54, y: 0.66 },
              { x: 0.42, y: 0.42 },
              { x: 0.27, y: 0.32 },
              { x: 0.13, y: 0.26 },
            ],
          },
          {
            id: crypto.randomUUID(),
            type: 'BBOX',
            classType: 'SCRATCH',
            confidence: 0.94,
            createdAt: Date.now() - 1200000,
            updatedAt: Date.now() - 1200000,
            x: 0.40,
            y: 0.36,
            width: 0.14,
            height: 0.10,
          },
          {
            id: crypto.randomUUID(),
            type: 'BBOX',
            classType: 'UNKNOWN_ANOMALY',
            confidence: 0.88,
            createdAt: Date.now() - 600000,
            updatedAt: Date.now() - 600000,
            x: 0.62,
            y: 0.25,
            width: 0.05,
            height: 0.05,
          },
        ];
        setAnnotations(scratchAnnotations);
      } else if (type === 'litho_bridge') {
        const bridgeAnnotations: (BoundingBoxAnnotation | PolygonAnnotation)[] = [
          {
            id: crypto.randomUUID(),
            type: 'POLYGON',
            classType: 'PATTERN_BRIDGING',
            confidence: 0.99,
            createdAt: Date.now() - 3000000,
            updatedAt: Date.now() - 3000000,
            points: [
              { x: 0.44, y: 0.49 },
              { x: 0.52, y: 0.50 },
              { x: 0.53, y: 0.53 },
              { x: 0.45, y: 0.52 },
            ],
          },
          {
            id: crypto.randomUUID(),
            type: 'BBOX',
            classType: 'PATTERN_BRIDGING',
            confidence: 0.95,
            createdAt: Date.now() - 1800000,
            updatedAt: Date.now() - 1800000,
            x: 0.43,
            y: 0.48,
            width: 0.11,
            height: 0.06,
          },
          {
            id: crypto.randomUUID(),
            type: 'BBOX',
            classType: 'VIA_VOID',
            confidence: 0.92,
            createdAt: Date.now() - 900000,
            updatedAt: Date.now() - 900000,
            x: 0.30,
            y: 0.35,
            width: 0.04,
            height: 0.04,
          },
        ];
        setAnnotations(bridgeAnnotations);
      }
    },
    [cleanupPrevUrl, processLoadedBitmap, setAnnotations]
  );

  return {
    loadImageFromFile,
    loadImageFromUrl,
    loadSyntheticWafer,
    cleanupPrevUrl,
  };
}

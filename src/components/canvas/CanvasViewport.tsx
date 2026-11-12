import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { CanvasEngine } from '../../core/canvas/CanvasEngine';
import { useCanvasEvents } from '../../hooks/useCanvasEvents';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useWorkerFilter } from '../../hooks/useWorkerFilter';
import { useCanvasStore } from '../../store/useCanvasStore';
import { DEFECT_CLASS_CONFIG } from '../../types/annotation';
import { CanvasHUD } from './CanvasHUD';
import { Minimap } from './Minimap';

export const CanvasViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rasterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vectorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const engineRef = useRef<CanvasEngine | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  const {
    transform,
    imageBitmap,
    imageDimensions,
    imageSmoothing,
    annotations,
    selectedAnnotationId,
    hoveredAnnotationId,
    drawingState,
    activeDefectClass,
    isProcessingFilter,
    setViewportDimensions,
  } = useCanvasStore();

  const {
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    cursorStyle,
    isSpacePressedRef,
  } = useCanvasEvents(containerRef);

  useKeyboardShortcuts(containerRef, isSpacePressedRef);
  useWorkerFilter(engineRef);

  // Initialize CanvasEngine once DOM elements mount
  useEffect(() => {
    if (gridCanvasRef.current && rasterCanvasRef.current && vectorCanvasRef.current) {
      const engine = new CanvasEngine(
        gridCanvasRef.current,
        rasterCanvasRef.current,
        vectorCanvasRef.current
      );
      engineRef.current = engine;

      return () => {
        engine.destroy();
        engineRef.current = null;
      };
    }
  }, []);

  // ResizeObserver to track container viewport changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
          setViewportDimensions({ width, height });
          if (engineRef.current) {
            engineRef.current.resize(width, height);
          }
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Mark layers dirty when state changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.gridDirty = true;
      engineRef.current.rasterDirty = true;
      engineRef.current.vectorDirty = true;
    }
  }, [transform, imageBitmap, imageSmoothing]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.vectorDirty = true;
    }
  }, [annotations, selectedAnnotationId, hoveredAnnotationId, drawingState, activeDefectClass]);

  // Main 60 FPS RequestAnimationFrame Render Loop
  useEffect(() => {
    let rafId: number;

    const renderLoop = () => {
      if (engineRef.current) {
        const activeColor =
          DEFECT_CLASS_CONFIG[activeDefectClass]?.color || '#00e5ff';

        engineRef.current.render(
          dimensions.width,
          dimensions.height,
          transform,
          imageBitmap,
          imageDimensions.width,
          imageDimensions.height,
          imageSmoothing,
          annotations,
          selectedAnnotationId,
          hoveredAnnotationId,
          drawingState,
          activeColor
        );
      }
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    dimensions,
    transform,
    imageBitmap,
    imageDimensions,
    imageSmoothing,
    annotations,
    selectedAnnotationId,
    hoveredAnnotationId,
    drawingState,
    activeDefectClass,
  ]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        flex: 1,
        height: '100%',
        bgcolor: '#080a10',
        overflow: 'hidden',
        userSelect: 'none',
        cursor: cursorStyle,
      }}
      onWheel={handleWheel}
    >
      {/* Layer 1: Background Grid */}
      <canvas
        ref={gridCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Layer 2: Raster Image */}
      <canvas
        ref={rasterCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Layer 3: Vector Annotations & Interaction */}
      <canvas
        ref={vectorCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Layer 4: HUD & Measurement Overlay */}
      <CanvasHUD />

      {/* Synchronized Minimap */}
      <Minimap
        viewportWidth={dimensions.width}
        viewportHeight={dimensions.height}
      />

      {/* Worker Processing Indicator */}
      {isProcessingFilter && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: 'rgba(14, 18, 28, 0.9)',
            border: '1px solid #00e5ff',
            boxShadow: '0 0 15px rgba(0, 229, 255, 0.3)',
            borderRadius: 2,
            px: 2,
            py: 1,
            zIndex: 30,
          }}
        >
          <CircularProgress size={16} sx={{ color: '#00e5ff' }} />
          <Box sx={{ fontSize: 11, fontWeight: 700, color: '#00e5ff' }}>
            PROCESSING FILTER VIA WEB WORKER...
          </Box>
        </Box>
      )}
    </Box>
  );
};

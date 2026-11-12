import React, { useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useCanvasStore } from '../../store/useCanvasStore';

interface MinimapProps {
  viewportWidth: number;
  viewportHeight: number;
}

export const Minimap: React.FC<MinimapProps> = ({ viewportWidth, viewportHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);

  const { transform, setTransform, imageBitmap, imageDimensions } = useCanvasStore();

  const MINIMAP_SIZE = 160;
  const imgW = imageDimensions.width || 1;
  const imgH = imageDimensions.height || 1;

  const sm = Math.min(MINIMAP_SIZE / imgW, MINIMAP_SIZE / imgH);
  const miniW = imgW * sm;
  const miniH = imgH * sm;
  const offsetX = (MINIMAP_SIZE - miniW) / 2;
  const offsetY = (MINIMAP_SIZE - miniH) / 2;

  // Frustum math
  const fx = offsetX + (-transform.translateX / transform.scale) * sm;
  const fy = offsetY + (-transform.translateY / transform.scale) * sm;
  const fw = (viewportWidth / transform.scale) * sm;
  const fh = (viewportHeight / transform.scale) * sm;

  // Redraw minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Background
    ctx.fillStyle = '#080a10';
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Draw miniature image
    if (imageBitmap) {
      ctx.drawImage(imageBitmap, offsetX, offsetY, miniW, miniH);
    }

    // Border around wafer image
    ctx.strokeStyle = '#232d40';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, miniW, miniH);

    // Draw Viewport Frustum
    ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
    ctx.fillRect(fx, fy, fw, fh);

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fx, fy, fw, fh);
  }, [imageBitmap, fx, fy, fw, fh, miniW, miniH, offsetX, offsetY]);

  const updatePanFromMinimap = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const targetImgX = (mx - offsetX) / sm;
      const targetImgY = (my - offsetY) / sm;

      const nextTx = viewportWidth / 2 - targetImgX * transform.scale;
      const nextTy = viewportHeight / 2 - targetImgY * transform.scale;

      setTransform({ translateX: nextTx, translateY: nextTy });
    },
    [offsetX, offsetY, sm, viewportWidth, viewportHeight, transform.scale, setTransform]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    updatePanFromMinimap(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    updatePanFromMinimap(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: MINIMAP_SIZE,
        bgcolor: 'rgba(14, 18, 28, 0.9)',
        border: '1px solid #232d40',
        borderRadius: 1,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        zIndex: 10,
        userSelect: 'none',
      }}
    >
      <Box
        sx={{
          px: 1,
          py: 0.4,
          bgcolor: '#121722',
          borderBottom: '1px solid #20293a',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" sx={{ fontSize: 9, fontWeight: 700, color: '#8b949e' }}>
          OVERVIEW
        </Typography>
      </Box>
      <canvas
        ref={canvasRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        style={{
          display: 'block',
          cursor: 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </Box>
  );
};

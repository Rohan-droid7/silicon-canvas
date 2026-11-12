import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { useCanvasStore } from '../../store/useCanvasStore';

export const CanvasHUD: React.FC = () => {
  const { transform, activeTool, nmPerPixel, imageDimensions } = useCanvasStore();

  const zoomPercent = Math.round(transform.scale * 100);

  // Calculate physical scale bar width and label
  // Let's target a scale bar on screen that is ~100px wide
  const targetPx = 100;
  const imagePx = targetPx / transform.scale;
  const totalNm = imagePx * nmPerPixel;

  let scaleLabel = '';
  let barWidth = targetPx;

  if (totalNm >= 1000) {
    const um = totalNm / 1000;
    // Round to clean increment: 1, 2, 5, 10, 20, 50, etc.
    const roundedUm = Math.max(0.1, Number(um.toFixed(1)));
    scaleLabel = `${roundedUm} µm`;
  } else {
    const roundedNm = Math.round(totalNm);
    scaleLabel = `${roundedNm} nm`;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* Top Floating Badge */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'rgba(12, 16, 24, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #20293a',
          borderRadius: 1,
          px: 1.5,
          py: 0.6,
        }}
      >
        <Typography variant="caption" sx={{ color: '#00e5ff', fontWeight: 700 }}>
          ZOOM: {zoomPercent}%
        </Typography>
        <Typography variant="caption" sx={{ color: '#4d5b75' }}>
          |
        </Typography>
        <Typography variant="caption" sx={{ color: '#8b949e' }}>
          RES: {imageDimensions.width} × {imageDimensions.height} px
        </Typography>
        <Typography variant="caption" sx={{ color: '#4d5b75' }}>
          |
        </Typography>
        <Chip
          label={activeTool}
          size="small"
          sx={{
            height: 18,
            fontSize: 10,
            fontWeight: 700,
            bgcolor: 'rgba(0, 229, 255, 0.15)',
            color: '#00e5ff',
            border: '1px solid #00e5ff',
          }}
        />
      </Box>

      {/* Scale Bar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          bgcolor: 'rgba(12, 16, 24, 0.75)',
          backdropFilter: 'blur(6px)',
          border: '1px solid #20293a',
          borderRadius: 1,
          px: 1.2,
          py: 0.5,
          width: 'fit-content',
        }}
      >
        <Typography variant="caption" sx={{ fontSize: 9, color: '#e6edf3', mb: 0.2 }}>
          SCALE: {scaleLabel}
        </Typography>
        <Box
          sx={{
            width: barWidth,
            height: 4,
            bgcolor: '#00e5ff',
            borderLeft: '2px solid #ffffff',
            borderRight: '2px solid #ffffff',
          }}
        />
      </Box>
    </Box>
  );
};

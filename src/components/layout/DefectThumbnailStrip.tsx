import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { globalHistory } from '../../core/history/historyInstance';
import { useCanvasStore } from '../../store/useCanvasStore';
import { Annotation, DEFECT_CLASS_CONFIG } from '../../types/annotation';

const DefectMiniThumbnail: React.FC<{
  ann: Annotation;
  imageBitmap: ImageBitmap | null;
  imgW: number;
  imgH: number;
  color: string;
}> = ({ ann, imageBitmap, imgW, imgH, color }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 40, 40);

    if (imageBitmap && imgW > 0 && imgH > 0) {
      let cx = 0.5;
      let cy = 0.5;
      let w = 0.08;
      let h = 0.08;

      if (ann.type === 'BBOX') {
        cx = ann.x + ann.width / 2;
        cy = ann.y + ann.height / 2;
        w = Math.max(0.04, ann.width * 1.5);
        h = Math.max(0.04, ann.height * 1.5);
      } else if (ann.type === 'POLYGON') {
        const xs = ann.points.map((p) => p.x);
        const ys = ann.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        cx = (minX + maxX) / 2;
        cy = (minY + maxY) / 2;
        w = Math.max(0.04, (maxX - minX) * 1.5);
        h = Math.max(0.04, (maxY - minY) * 1.5);
      }

      const cropSize = Math.max(w, h);
      const srcX = Math.max(0, (cx - cropSize / 2) * imgW);
      const srcY = Math.max(0, (cy - cropSize / 2) * imgH);
      const srcW = Math.min(imgW - srcX, cropSize * imgW);
      const srcH = Math.min(imgH - srcY, cropSize * imgH);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(imageBitmap, srcX, srcY, srcW, srcH, 0, 0, 40, 40);

      // Defect highlight box
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(4, 4, 32, 32);
    } else {
      ctx.fillStyle = '#161d2d';
      ctx.fillRect(0, 0, 40, 40);
    }
  }, [ann, imageBitmap, imgW, imgH, color]);

  return (
    <canvas
      ref={canvasRef}
      width={40}
      height={40}
      style={{
        borderRadius: 4,
        border: `1px solid ${color}40`,
        backgroundColor: '#0a0d14',
        flexShrink: 0,
      }}
    />
  );
};

export const DefectThumbnailStrip: React.FC = () => {
  const {
    annotations,
    selectedAnnotationId,
    setSelectedId,
    deleteAnnotation,
    imageDimensions,
    imageBitmap,
    transform,
    setTransform,
    viewportDimensions,
    nmPerPixel,
  } = useCanvasStore();

  const animRafRef = useRef<number | null>(null);

  const handleFlyTo = (ann: Annotation) => {
    setSelectedId(ann.id);

    let centerX = 0.5;
    let centerY = 0.5;

    if (ann.type === 'BBOX') {
      centerX = ann.x + ann.width / 2;
      centerY = ann.y + ann.height / 2;
    } else if (ann.type === 'POLYGON') {
      const xs = ann.points.map((p) => p.x);
      const ys = ann.points.map((p) => p.y);
      centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
      centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    }

    const imgW = imageDimensions.width || 1024;
    const imgH = imageDimensions.height || 1024;
    const { width: viewportW, height: viewportH } = viewportDimensions;

    const targetScale = Math.max(3.0, transform.scale);
    const targetTx = viewportW / 2 - centerX * imgW * targetScale;
    const targetTy = viewportH / 2 - centerY * imgH * targetScale;

    const startScale = transform.scale;
    const startTx = transform.translateX;
    const startTy = transform.translateY;

    const startTime = performance.now();
    const duration = 300; // 300ms smooth fly-to

    if (animRafRef.current) {
      cancelAnimationFrame(animRafRef.current);
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      const currentScale = startScale + (targetScale - startScale) * ease;
      const currentTx = startTx + (targetTx - startTx) * ease;
      const currentTy = startTy + (targetTy - startTy) * ease;

      setTransform({
        scale: currentScale,
        translateX: currentTx,
        translateY: currentTy,
      });

      if (progress < 1) {
        animRafRef.current = requestAnimationFrame(animate);
      }
    };

    animRafRef.current = requestAnimationFrame(animate);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    globalHistory.push(annotations);
    deleteAnnotation(id);
  };

  if (annotations.length === 0) {
    return (
      <Box
        sx={{
          height: 48,
          bgcolor: '#0a0d14',
          borderTop: '1px solid #1a2233',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Typography variant="caption" sx={{ color: '#4d5b75', fontStyle: 'italic' }}>
          No defect annotations recorded yet. Select Box (B) or Polygon (P) to create defect bounding tags.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: 68,
        bgcolor: '#0a0d14',
        borderTop: '1px solid #1a2233',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        '&::-webkit-scrollbar': {
          height: 4,
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: '#20293a',
          borderRadius: 2,
        },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: '#8b949e',
          fontWeight: 700,
          textTransform: 'uppercase',
          fontSize: 10,
          letterSpacing: 0.5,
          flexShrink: 0,
        }}
      >
        LOT DEFECTS ({annotations.length}):
      </Typography>

      {annotations.map((ann, idx) => {
        const isSelected = ann.id === selectedAnnotationId;
        const cfg = DEFECT_CLASS_CONFIG[ann.classType] || {
          displayName: ann.classType,
          color: '#ff5252',
        };

        // Micron calculation
        let dimensionLabel = '';
        const imgW = imageDimensions.width || 1;
        const imgH = imageDimensions.height || 1;

        if (ann.type === 'BBOX') {
          const wUm = ((ann.width * imgW * nmPerPixel) / 1000).toFixed(1);
          const hUm = ((ann.height * imgH * nmPerPixel) / 1000).toFixed(1);
          dimensionLabel = `${wUm}×${hUm} µm`;
        } else {
          dimensionLabel = `${ann.points.length} vertices`;
        }

        return (
          <Box
            key={ann.id}
            data-testid="defect-card"
            data-ann-id={ann.id}
            onClick={() => handleFlyTo(ann)}
            sx={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              px: 1.5,
              py: 0.8,
              bgcolor: isSelected ? 'rgba(0, 229, 255, 0.12)' : '#121724',
              border: `1px solid ${isSelected ? '#00e5ff' : '#1e2638'}`,
              borderRadius: 1.5,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isSelected ? '0 0 10px rgba(0, 229, 255, 0.25)' : 'none',
              '&:hover': {
                borderColor: cfg.color,
                bgcolor: '#161d2d',
              },
            }}
          >
            <DefectMiniThumbnail
              ann={ann}
              imageBitmap={imageBitmap}
              imgW={imgW}
              imgH={imgH}
              color={cfg.color}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11, color: '#e6edf3' }}>
                  #{idx + 1} {cfg.displayName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#00e5ff', fontSize: 10 }}>
                  {Math.round(ann.confidence * 100)}%
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#8b949e', fontSize: 9 }}>
                {dimensionLabel} • {ann.type}
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={(e) => handleDelete(e, ann.id)}
              sx={{
                color: '#4d5b75',
                p: 0.4,
                '&:hover': { color: '#ff3d71' },
              }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        );
      })}
    </Box>
  );
};

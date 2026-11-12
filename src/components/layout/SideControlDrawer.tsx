import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import NearMeIcon from '@mui/icons-material/NearMe';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import PolylineIcon from '@mui/icons-material/Polyline';
import PanToolIcon from '@mui/icons-material/PanTool';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TuneIcon from '@mui/icons-material/Tune';
import StraightenIcon from '@mui/icons-material/Straighten';

import { useCanvasStore } from '../../store/useCanvasStore';
import { DEFECT_CLASS_CONFIG, DefectClass } from '../../types/annotation';
import { ActiveTool } from '../../types/canvas';
import { FilterType } from '../../types/worker';

export const SideControlDrawer: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    activeDefectClass,
    setActiveDefectClass,
    annotations,
    selectedAnnotationId,
    filterParams,
    setFilterParams,
    filterExecutionTimeMs,
    imageSmoothing,
    setImageSmoothing,
    nmPerPixel,
    setNmPerPixel,
    resetTransform,
    setTransform,
    imageDimensions,
    transform,
    viewportDimensions,
  } = useCanvasStore();

  const handleToolChange = (
    _e: React.MouseEvent<HTMLElement>,
    newTool: ActiveTool | null
  ) => {
    if (newTool) {
      setActiveTool(newTool);
    }
  };

  const handleFilterTypeChange = (
    _e: React.MouseEvent<HTMLElement>,
    newType: FilterType | null
  ) => {
    if (newType) {
      setFilterParams({ filterType: newType });
    }
  };

  const handleFitScreen = () => {
    // Fits image to container viewport
    resetTransform();
  };

  const handleOneToOne = () => {
    const w = imageDimensions.width;
    const h = imageDimensions.height;
    const { width: viewportW, height: viewportH } = viewportDimensions;
    setTransform({
      scale: 1.0,
      translateX: (viewportW - w) / 2,
      translateY: (viewportH - h) / 2,
    });
  };

  const handleZoomToSelection = () => {
    if (!selectedAnnotationId) return;
    const selected = annotations.find((a) => a.id === selectedAnnotationId);
    if (!selected) return;

    let minX = 0, minY = 0, maxX = 1, maxY = 1;
    if (selected.type === 'BBOX') {
      minX = selected.x;
      minY = selected.y;
      maxX = selected.x + selected.width;
      maxY = selected.y + selected.height;
    } else if (selected.type === 'POLYGON') {
      const xs = selected.points.map((p) => p.x);
      const ys = selected.points.map((p) => p.y);
      minX = Math.min(...xs);
      maxX = Math.max(...xs);
      minY = Math.min(...ys);
      maxY = Math.max(...ys);
    }

    const boxW = Math.max(0.01, maxX - minX);
    const boxH = Math.max(0.01, maxY - minY);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const imgW = imageDimensions.width || 1;
    const imgH = imageDimensions.height || 1;

    const { width: viewportW, height: viewportH } = viewportDimensions;

    // 20% padding
    const targetScale = Math.min(
      (viewportW * 0.8) / (boxW * imgW),
      (viewportH * 0.8) / (boxH * imgH),
      25.0
    );

    setTransform({
      scale: targetScale,
      translateX: viewportW / 2 - centerX * imgW * targetScale,
      translateY: viewportH / 2 - centerY * imgH * targetScale,
    });
  };

  const handleResetFilters = () => {
    setFilterParams({
      brightness: 0,
      contrast: 0,
      filterType: 'NONE',
    });
  };

  // Count annotations per class
  const classCounts: Record<DefectClass, number> = {
    PARTICLE: 0,
    SCRATCH: 0,
    PATTERN_BRIDGING: 0,
    VIA_VOID: 0,
    CORROSION: 0,
    UNKNOWN_ANOMALY: 0,
  };
  annotations.forEach((a) => {
    if (classCounts[a.classType] !== undefined) {
      classCounts[a.classType]++;
    }
  });

  return (
    <Paper
      elevation={0}
      sx={{
        width: 280,
        height: '100%',
        bgcolor: '#0f131d',
        borderRight: '1px solid #20293a',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        p: 1.8,
        gap: 1.8,
        '&::-webkit-scrollbar': {
          width: 5,
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: '#20293a',
          borderRadius: 3,
        },
      }}
    >
      {/* 1. Tool Selection */}
      <Box>
        <Typography variant="overline" sx={{ color: '#00e5ff', fontWeight: 700, letterSpacing: 1 }}>
          INSPECTION TOOLS
        </Typography>
        <ToggleButtonGroup
          value={activeTool}
          exclusive
          onChange={handleToolChange}
          fullWidth
          size="small"
          sx={{ mt: 1, bgcolor: '#141a27' }}
        >
          <ToggleButton value="SELECT">
            <Tooltip title="Select / Edit (V)">
              <NearMeIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="BOX">
            <Tooltip title="Bounding Box (B)">
              <CropSquareIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="POLYGON">
            <Tooltip title="Polygon Boundary (P)">
              <PolylineIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="PAN">
            <Tooltip title="Pan Viewport (Space)">
              <PanToolIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Divider sx={{ borderColor: '#20293a' }} />

      {/* 2. Defect Taxonomy Selector */}
      <Box>
        <Typography variant="overline" sx={{ color: '#00e5ff', fontWeight: 700, letterSpacing: 1 }}>
          DEFECT TAXONOMY ({annotations.length})
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mt: 1 }}>
          {(Object.keys(DEFECT_CLASS_CONFIG) as DefectClass[]).map((cls) => {
            const cfg = DEFECT_CLASS_CONFIG[cls];
            const isSelected = activeDefectClass === cls;
            return (
              <Box
                key={cls}
                onClick={() => setActiveDefectClass(cls)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: isSelected ? 'rgba(0, 229, 255, 0.08)' : '#131824',
                  border: `1px solid ${isSelected ? cfg.color : '#1e2638'}`,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: cfg.color,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: cfg.color,
                      boxShadow: isSelected ? `0 0 8px ${cfg.color}` : 'none',
                    }}
                  />
                  <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600 }}>
                    {cfg.displayName}
                  </Typography>
                </Box>
                <Chip
                  label={classCounts[cls]}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 10,
                    bgcolor: '#192234',
                    color: '#8b949e',
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#20293a' }} />

      {/* 3. Filter Suite (Web Worker) */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <TuneIcon sx={{ fontSize: 16, color: '#00e5ff' }} />
            <Typography variant="overline" sx={{ color: '#00e5ff', fontWeight: 700, letterSpacing: 1 }}>
              WORKER FILTERS
            </Typography>
          </Box>
          {filterExecutionTimeMs > 0 && (
            <Typography variant="caption" sx={{ color: '#00e676', fontSize: 10, fontWeight: 700 }}>
              {filterExecutionTimeMs} ms
            </Typography>
          )}
        </Box>

        <Typography variant="caption" sx={{ color: '#8b949e', display: 'block', mb: 1 }}>
          Offloaded 100% to background thread
        </Typography>

        {/* Filter Algorithm Selector */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.8, mb: 2 }}>
          {(
            [
              ['NONE', 'Normal'],
              ['HISTOGRAM_EQUALIZE', 'Hist Eq'],
              ['SOBEL_EDGE', 'Sobel'],
              ['OTSU_THRESHOLD', 'Otsu Bin'],
              ['INVERT', 'Invert SEM'],
            ] as [FilterType, string][]
          ).map(([type, label]) => (
            <Button
              key={type}
              variant={filterParams.filterType === type ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleFilterTypeChange(null, type)}
              sx={{
                fontSize: 10,
                py: 0.5,
                bgcolor: filterParams.filterType === type ? '#00e5ff' : 'transparent',
                color: filterParams.filterType === type ? '#000000' : '#8b949e',
                borderColor: '#232d40',
              }}
            >
              {label}
            </Button>
          ))}
        </Box>

        {/* Brightness Slider */}
        <Typography variant="caption" sx={{ color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}>
          <span>Brightness</span>
          <span style={{ color: '#e6edf3' }}>{filterParams.brightness}</span>
        </Typography>
        <Slider
          size="small"
          min={-100}
          max={100}
          value={filterParams.brightness}
          onChange={(_e, v) => setFilterParams({ brightness: v as number })}
          sx={{ color: '#00e5ff', mb: 1 }}
        />

        {/* Contrast Slider */}
        <Typography variant="caption" sx={{ color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}>
          <span>Contrast</span>
          <span style={{ color: '#e6edf3' }}>{filterParams.contrast}</span>
        </Typography>
        <Slider
          size="small"
          min={-100}
          max={100}
          value={filterParams.contrast}
          onChange={(_e, v) => setFilterParams({ contrast: v as number })}
          sx={{ color: '#ff9100', mb: 1.5 }}
        />

        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={handleResetFilters}
          sx={{ borderColor: '#232d40', color: '#8b949e', fontSize: 10 }}
        >
          Reset Image Filters
        </Button>
      </Box>

      <Divider sx={{ borderColor: '#20293a' }} />

      {/* 4. Calibration & Viewport Controls */}
      <Box>
        <Typography variant="overline" sx={{ color: '#00e5ff', fontWeight: 700, letterSpacing: 1 }}>
          VIEWPORT & CALIBRATION
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 1.5 }}>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<AspectRatioIcon />}
            onClick={handleFitScreen}
            sx={{ borderColor: '#232d40', color: '#e6edf3', fontSize: 10 }}
          >
            Fit (1)
          </Button>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={handleOneToOne}
            sx={{ borderColor: '#232d40', color: '#e6edf3', fontSize: 10 }}
          >
            1:1 (0)
          </Button>
        </Box>

        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<CenterFocusStrongIcon />}
          onClick={handleZoomToSelection}
          disabled={!selectedAnnotationId}
          sx={{ borderColor: '#232d40', color: '#00e5ff', fontSize: 10, mb: 2 }}
        >
          Focus Selected Defect
        </Button>

        {/* Physical Scale Calibration */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <StraightenIcon sx={{ fontSize: 16, color: '#8b949e' }} />
          <Typography variant="caption" sx={{ color: '#8b949e' }}>
            Scale Calibration:
          </Typography>
          <Typography variant="caption" sx={{ color: '#00e5ff', fontWeight: 700 }}>
            {nmPerPixel} nm/px
          </Typography>
        </Box>
        <Slider
          size="small"
          min={0.5}
          max={50}
          step={0.5}
          value={nmPerPixel}
          onChange={(_e, v) => setNmPerPixel(v as number)}
          sx={{ color: '#00e5ff', mb: 1 }}
        />

        {/* Smoothing Toggle */}
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={imageSmoothing}
              onChange={(e) => setImageSmoothing(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#00e5ff',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#00e5ff',
                },
              }}
            />
          }
          label={<Typography variant="caption" sx={{ color: '#8b949e' }}>Bilinear Smoothing</Typography>}
        />
      </Box>
    </Paper>
  );
};

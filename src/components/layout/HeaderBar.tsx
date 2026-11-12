import React, { useRef, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import MemoryIcon from '@mui/icons-material/Memory';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ScienceIcon from '@mui/icons-material/Science';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import KeyboardIcon from '@mui/icons-material/Keyboard';

import { globalHistory } from '../../core/history/historyInstance';
import { useImageLoader } from '../../hooks/useImageLoader';
import { useCanvasStore } from '../../store/useCanvasStore';
import { Annotation } from '../../types/annotation';
import { COCODataset, SiliconCanvasProjectFile } from '../../types/dataset';

interface HeaderBarProps {
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenExport, onOpenShortcuts }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonImportRef = useRef<HTMLInputElement | null>(null);
  const [demoMenuAnchor, setDemoMenuAnchor] = useState<null | HTMLElement>(null);

  const {
    imageFileName,
    annotations,
    setAnnotations,
    imageDimensions,
  } = useCanvasStore();

  const { loadImageFromFile, loadSyntheticWafer } = useImageLoader();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImageFromFile(file);
    }
    e.target.value = '';
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        globalHistory.push(annotations);

        // Check if Raw SiliconCanvas format
        if (parsed.version && Array.isArray(parsed.annotations)) {
          const project = parsed as SiliconCanvasProjectFile;
          setAnnotations(project.annotations);
          return;
        }

        // Check if COCO format
        if (parsed.annotations && Array.isArray(parsed.annotations)) {
          const coco = parsed as COCODataset;
          const imgW = imageDimensions.width || 1024;
          const imgH = imageDimensions.height || 1024;

          const imported: Annotation[] = coco.annotations.map((ann, idx) => {
            const catName = coco.categories?.find((c) => c.id === ann.category_id)?.name || 'PARTICLE';
            if (ann.segmentation && ann.segmentation[0] && ann.segmentation[0].length >= 6) {
              const pts: { x: number; y: number }[] = [];
              const raw = ann.segmentation[0];
              for (let i = 0; i < raw.length; i += 2) {
                pts.push({ x: raw[i] / imgW, y: raw[i + 1] / imgH });
              }
              return {
                id: crypto.randomUUID(),
                type: 'POLYGON',
                classType: catName as any,
                confidence: 0.95,
                createdAt: Date.now() + idx,
                updatedAt: Date.now() + idx,
                points: pts,
              };
            } else {
              return {
                id: crypto.randomUUID(),
                type: 'BBOX',
                classType: catName as any,
                confidence: 0.95,
                createdAt: Date.now() + idx,
                updatedAt: Date.now() + idx,
                x: ann.bbox[0] / imgW,
                y: ann.bbox[1] / imgH,
                width: ann.bbox[2] / imgW,
                height: ann.bbox[3] / imgH,
              };
            }
          });

          setAnnotations([...annotations, ...imported]);
        }
      } catch (err) {
        console.error('Failed to parse annotation file:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUndo = () => {
    const prev = globalHistory.undo(annotations);
    if (prev !== null) {
      setAnnotations(prev);
    }
  };

  const handleRedo = () => {
    const next = globalHistory.redo(annotations);
    if (next !== null) {
      setAnnotations(next);
    }
  };

  return (
    <AppBar
      position="static"
      sx={{
        bgcolor: '#0d111a',
        borderBottom: '1px solid #20293a',
        boxShadow: 'none',
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 48, px: 2, display: 'flex', gap: 2 }}>
        {/* Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MemoryIcon sx={{ color: '#00e5ff', fontSize: 22 }} />
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              letterSpacing: '0.05em',
              color: '#ffffff',
              fontSize: 14,
            }}
          >
            SILICON<span style={{ color: '#00e5ff' }}>CANVAS</span>
          </Typography>
          <Chip
            label="FAB INSPECTOR v2.0"
            size="small"
            sx={{
              height: 18,
              fontSize: 9,
              fontWeight: 700,
              bgcolor: 'rgba(0, 229, 255, 0.1)',
              color: '#00e5ff',
              border: '1px solid rgba(0, 229, 255, 0.3)',
            }}
          />
        </Box>

        {/* Current Image Pill */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
          <Typography variant="caption" sx={{ color: '#8b949e', fontSize: 11 }}>
            LOT FILE:
          </Typography>
          <Chip
            label={imageFileName}
            size="small"
            sx={{
              height: 20,
              fontSize: 11,
              bgcolor: '#161d2b',
              color: '#e6edf3',
              border: '1px solid #25334c',
            }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Action Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.bmp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ borderColor: '#2b3850', color: '#e6edf3', flexShrink: 0 }}
          >
            Load File
          </Button>

          <Button
            variant="contained"
            startIcon={<ScienceIcon />}
            onClick={(e) => setDemoMenuAnchor(e.currentTarget)}
            sx={{
              bgcolor: '#00e5ff',
              color: '#080a10',
              fontWeight: 700,
              fontSize: 12,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              px: 1.8,
              '&:hover': { bgcolor: '#33ebff' },
            }}
          >
            Demo Samples
          </Button>
          <Menu
            anchorEl={demoMenuAnchor}
            open={Boolean(demoMenuAnchor)}
            onClose={() => setDemoMenuAnchor(null)}
            slotProps={{
              paper: {
                sx: { bgcolor: '#121722', border: '1px solid #20293a', color: '#e6edf3' },
              },
            }}
          >
            <MenuItem
              onClick={() => {
                loadSyntheticWafer('sem_particle');
                setDemoMenuAnchor(null);
              }}
            >
              SEM Particle Contamination (1536×1536)
            </MenuItem>
            <MenuItem
              onClick={() => {
                loadSyntheticWafer('cmp_scratch');
                setDemoMenuAnchor(null);
              }}
            >
              CMP Mechanical Micro-Scratch (1536×1536)
            </MenuItem>
            <MenuItem
              onClick={() => {
                loadSyntheticWafer('litho_bridge');
                setDemoMenuAnchor(null);
              }}
            >
              Photolithography Pattern Bridge (2048×2048)
            </MenuItem>
          </Menu>

          <Divider orientation="vertical" flexItem sx={{ borderColor: '#20293a', my: 1, mx: 0.5 }} />

          {/* Undo / Redo */}
          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <IconButton
                size="small"
                onClick={handleUndo}
                disabled={!globalHistory.canUndo}
                sx={{
                  color: '#8b949e',
                  '&.Mui-disabled': { color: '#2b3648' },
                }}
              >
                <UndoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Redo (Ctrl+Y)">
            <span>
              <IconButton
                size="small"
                onClick={handleRedo}
                disabled={!globalHistory.canRedo}
                sx={{
                  color: '#8b949e',
                  '&.Mui-disabled': { color: '#2b3648' },
                }}
              >
                <RedoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: '#20293a', my: 1, mx: 0.5 }} />

          {/* Import / Export */}
          <input
            ref={jsonImportRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleJsonImport}
          />
          <Tooltip title="Import COCO JSON / SiliconCanvas Project">
            <IconButton
              size="small"
              onClick={() => jsonImportRef.current?.click()}
              sx={{ color: '#8b949e' }}
            >
              <FileUploadIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={onOpenExport}
            sx={{ borderColor: '#2b3850', color: '#00e5ff' }}
          >
            Export Annotations
          </Button>

          {/* Shortcuts */}
          <Tooltip title="Keyboard Shortcuts Cheat Sheet">
            <IconButton
              aria-label="shortcuts-button"
              size="small"
              onClick={onOpenShortcuts}
              sx={{ color: '#8b949e' }}
            >
              <KeyboardIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

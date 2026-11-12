import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';

import { useCanvasStore } from '../../store/useCanvasStore';
import { DEFECT_CLASS_CONFIG, DefectClass } from '../../types/annotation';
import { COCODataset, SiliconCanvasProjectFile } from '../../types/dataset';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const {
    annotations,
    imageDimensions,
    imageFileName,
    transform,
    filterParams,
  } = useCanvasStore();

  const classList = useMemo(
    () => Object.keys(DEFECT_CLASS_CONFIG) as DefectClass[],
    []
  );

  // 1. Generate COCO 1.0 JSON
  const cocoJsonString = useMemo(() => {
    const imgW = imageDimensions.width || 1024;
    const imgH = imageDimensions.height || 1024;

    const dataset: COCODataset = {
      images: [
        {
          id: 1,
          file_name: imageFileName,
          width: imgW,
          height: imgH,
        },
      ],
      annotations: annotations.map((ann, idx) => {
        const catId = classList.indexOf(ann.classType) + 1;

        if (ann.type === 'BBOX') {
          const bx = Math.round(ann.x * imgW);
          const by = Math.round(ann.y * imgH);
          const bw = Math.round(ann.width * imgW);
          const bh = Math.round(ann.height * imgH);
          return {
            id: idx + 1,
            image_id: 1,
            category_id: catId,
            bbox: [bx, by, bw, bh],
            segmentation: [[bx, by, bx + bw, by, bx + bw, by + bh, bx, by + bh]],
            area: bw * bh,
            iscrowd: 0,
          };
        } else {
          // Polygon
          const flatPoints: number[] = [];
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const p of ann.points) {
            const px = Math.round(p.x * imgW);
            const py = Math.round(p.y * imgH);
            flatPoints.push(px, py);
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
          const bw = Math.max(1, maxX - minX);
          const bh = Math.max(1, maxY - minY);
          return {
            id: idx + 1,
            image_id: 1,
            category_id: catId,
            bbox: [minX, minY, bw, bh],
            segmentation: [flatPoints],
            area: bw * bh,
            iscrowd: 0,
          };
        }
      }),
      categories: classList.map((cls, idx) => ({
        id: idx + 1,
        name: cls,
        supercategory: 'semiconductor_defect',
      })),
    };

    return JSON.stringify(dataset, null, 2);
  }, [annotations, imageDimensions, imageFileName, classList]);

  // 2. Generate YOLO TXT
  const yoloTxtString = useMemo(() => {
    const lines: string[] = [];
    annotations.forEach((ann) => {
      const classId = classList.indexOf(ann.classType);
      if (ann.type === 'BBOX') {
        const xCenter = (ann.x + ann.width / 2).toFixed(6);
        const yCenter = (ann.y + ann.height / 2).toFixed(6);
        const w = ann.width.toFixed(6);
        const h = ann.height.toFixed(6);
        lines.push(`${classId} ${xCenter} ${yCenter} ${w} ${h}`);
      } else {
        // Approximate polygon to bounding box for YOLO
        const xs = ann.points.map((p) => p.x);
        const ys = ann.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const w = (maxX - minX).toFixed(6);
        const h = (maxY - minY).toFixed(6);
        const xCenter = ((minX + maxX) / 2).toFixed(6);
        const yCenter = ((minY + maxY) / 2).toFixed(6);
        lines.push(`${classId} ${xCenter} ${yCenter} ${w} ${h}`);
      }
    });
    return lines.join('\n');
  }, [annotations, classList]);

  // 3. Raw SiliconCanvas Project JSON
  const rawProjectJsonString = useMemo(() => {
    const project: SiliconCanvasProjectFile = {
      version: '2.0.0',
      timestamp: Date.now(),
      image: {
        fileName: imageFileName,
        width: imageDimensions.width,
        height: imageDimensions.height,
      },
      transform,
      filterParams,
      annotations,
    };
    return JSON.stringify(project, null, 2);
  }, [annotations, imageFileName, imageDimensions, transform, filterParams]);

  const currentContent = tabIndex === 0 ? cocoJsonString : tabIndex === 1 ? yoloTxtString : rawProjectJsonString;
  const currentExtension = tabIndex === 0 ? 'json' : tabIndex === 1 ? 'txt' : 'json';
  const currentFileName = `silicon_canvas_export_${Date.now()}.${currentExtension}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], {
      type: tabIndex === 1 ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#101520',
            border: '1px solid #20293a',
            color: '#e6edf3',
          },
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #20293a', pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#00e5ff' }}>
            EXPORT GROUND-TRUTH ANNOTATIONS
          </Typography>
          <Typography variant="caption" sx={{ color: '#8b949e' }}>
            Total Annotations: {annotations.length}
          </Typography>
        </Box>
        <Tabs
          value={tabIndex}
          onChange={(_e, val) => setTabIndex(val)}
          sx={{
            mt: 1,
            '& .MuiTab-root': { color: '#8b949e', fontSize: 12, minHeight: 36 },
            '& .Mui-selected': { color: '#00e5ff' },
            '& .MuiTabs-indicator': { backgroundColor: '#00e5ff' },
          }}
        >
          <Tab label="COCO 1.0 JSON" />
          <Tab label="YOLO TXT" />
          <Tab label="SiliconCanvas Project" />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Box
          component="pre"
          sx={{
            bgcolor: '#090c12',
            p: 2,
            borderRadius: 1,
            border: '1px solid #1a2233',
            fontFamily: '"JetBrains Mono", "Consolas", monospace',
            fontSize: 11,
            color: '#7ee787',
            maxHeight: 380,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {currentContent || '(No annotations present)'}
        </Box>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #20293a', px: 3, py: 1.5 }}>
        <Button
          variant="outlined"
          startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
          onClick={handleCopy}
          sx={{ borderColor: '#232d40', color: copied ? '#00e676' : '#e6edf3' }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
        >
          Download File
        </Button>
        <Button onClick={onClose} sx={{ color: '#8b949e' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

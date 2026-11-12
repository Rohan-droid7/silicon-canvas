import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

interface HotkeyCheatSheetProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { section: 'Tools & Annotation', items: [
    { key: 'V', desc: 'Activate Pointer / Select Tool' },
    { key: 'B', desc: 'Activate Precision Bounding Box Tool' },
    { key: 'P', desc: 'Activate Polygon Segmentation Tool' },
    { key: 'Enter', desc: 'Close polygon when drawing (min 3 vertices)' },
    { key: 'Escape', desc: 'Cancel active drawing path or deselect' },
    { key: 'Del / Backspace', desc: 'Delete currently selected defect annotation' },
  ]},
  { section: 'Navigation & Viewport', items: [
    { key: 'Space + Drag', desc: 'Pan canvas viewport smoothly' },
    { key: 'Middle Drag', desc: 'Pan canvas viewport directly' },
    { key: 'Mouse Wheel', desc: 'Pinch / Zoom centered precisely on cursor' },
    { key: '1', desc: 'Fit image to container viewport' },
    { key: '0', desc: 'Reset viewport to 1:1 true sub-pixel scale' },
  ]},
  { section: 'History & Actions', items: [
    { key: 'Ctrl + Z', desc: 'Undo last annotation modification' },
    { key: 'Ctrl + Shift + Z / Ctrl + Y', desc: 'Redo previously undone action' },
  ]},
];

export const HotkeyCheatSheet: React.FC<HotkeyCheatSheetProps> = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
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
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#00e5ff' }}>
          CONTROL ROOM KEYBOARD SHORTCUTS
        </Typography>
        <Typography variant="caption" sx={{ color: '#8b949e' }}>
          Hardware ergonomic hotkeys for maximum cleanroom throughput
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ mt: 1.5 }}>
        {SHORTCUTS.map((sec) => (
          <Box key={sec.section} sx={{ mb: 2 }}>
            <Typography
              variant="overline"
              sx={{ color: '#ff9100', fontWeight: 700, letterSpacing: 1 }}
            >
              {sec.section}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mt: 0.5 }}>
              {sec.items.map((it) => (
                <Box
                  key={it.key}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 0.4,
                    borderBottom: '1px solid #161c28',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#8b949e', fontSize: 12 }}>
                    {it.desc}
                  </Typography>
                  <Box
                    component="kbd"
                    sx={{
                      bgcolor: '#192233',
                      border: '1px solid #2b3952',
                      borderRadius: 1,
                      px: 1,
                      py: 0.3,
                      fontSize: 11,
                      fontFamily: '"JetBrains Mono", "Consolas", monospace',
                      color: '#00e5ff',
                      fontWeight: 700,
                      boxShadow: '0 2px 0 #0d121c',
                    }}
                  >
                    {it.key}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #20293a', px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

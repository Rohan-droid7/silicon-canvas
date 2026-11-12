import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { ExportDialog } from './components/dialogs/ExportDialog';
import { HotkeyCheatSheet } from './components/dialogs/HotkeyCheatSheet';
import { DefectThumbnailStrip } from './components/layout/DefectThumbnailStrip';
import { HeaderBar } from './components/layout/HeaderBar';
import { SideControlDrawer } from './components/layout/SideControlDrawer';
import { useImageLoader } from './hooks/useImageLoader';
import { useCanvasStore } from './store/useCanvasStore';
import { industrialDarkTheme } from './theme/industrialDarkTheme';
import { BoundingBoxAnnotation, PolygonAnnotation } from './types/annotation';

export function App() {
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { loadSyntheticWafer } = useImageLoader(containerRef);
  const { setAnnotations } = useCanvasStore();

  // Load initial demo wafer & seed standard annotations on mount
  useEffect(() => {
    loadSyntheticWafer('sem_particle');
  }, [loadSyntheticWafer]);

  return (
    <ThemeProvider theme={industrialDarkTheme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100vw',
          height: '100vh',
          bgcolor: 'background.default',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <HeaderBar
          onOpenExport={() => setExportOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />

        {/* Center Main Workspace */}
        <Box
          ref={containerRef}
          sx={{
            display: 'flex',
            flex: 1,
            height: 'calc(100vh - 48px - 68px)',
            overflow: 'hidden',
          }}
        >
          <SideControlDrawer />
          <CanvasViewport />
        </Box>

        {/* Bottom Defect Strip */}
        <DefectThumbnailStrip />

        {/* Dialogs */}
        <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
        <HotkeyCheatSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </Box>
    </ThemeProvider>
  );
}

export default App;

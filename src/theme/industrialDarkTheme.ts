import { createTheme } from '@mui/material/styles';

export const industrialDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a0d14',
      paper: '#121722',
    },
    primary: {
      main: '#00e5ff', // Semiconductor neon cyan
      contrastText: '#000000',
    },
    secondary: {
      main: '#ff9100', // Amber warning / defect tag
    },
    error: {
      main: '#ff3d71', // Critical defect flag
    },
    warning: {
      main: '#ffea00',
    },
    info: {
      main: '#00e5ff',
    },
    success: {
      main: '#00e676',
    },
    text: {
      primary: '#e6edf3',
      secondary: '#8b949e',
    },
    divider: '#20293a',
  },
  typography: {
    fontFamily: '"JetBrains Mono", "Roboto Mono", "Consolas", monospace',
    fontSize: 12,
  },
  components: {
    MuiButton: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 3,
          fontWeight: 600,
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

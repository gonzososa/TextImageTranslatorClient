import { createTheme } from '@mui/material';

export const OCR_OUTLINE_COLOR = '#E11D48';

const theme = createTheme({
  palette: {
    primary: { main: '#4F46E5', light: '#6366F1', dark: '#4338CA', contrastText: '#FFFFFF' },
    secondary: { main: '#0D9488', dark: '#0F766E', contrastText: '#FFFFFF' },
    error: { main: '#DC2626' },
    background: { default: '#F5F7FB', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#475569' },
    divider: '#E2E8F0',
    action: { hover: 'rgba(79, 70, 229, 0.08)' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none', fontWeight: 600 },
        containedPrimary: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        colorPrimary: { backgroundColor: '#4F46E5', color: '#FFFFFF', borderRadius: 0 },
      },
    },
  },
});

export default theme;

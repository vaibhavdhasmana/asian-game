import { createTheme } from '@mui/material/styles';

const londonRed = '#E11D2E';
const londonBlue = '#1351A3';
const deepNavy = '#0B1022';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: londonRed },
    secondary: { main: londonBlue },
    background: { default: deepNavy, paper: 'rgba(255,255,255,0.06)' },
    success: { main: '#38A169' },
    warning: { main: '#FFB300' },
    error: { main: '#E53935' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontWeightBold: 800,
    button: { fontWeight: 800 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: deepNavy,
          backgroundImage:
            'radial-gradient(60rem 60rem at -20% -10%, rgba(225,29,46,0.10), transparent),\
             radial-gradient(40rem 40rem at 120% 110%, rgba(19,81,163,0.12), transparent),\
             linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.00) 100%)',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { fontWeight: 800, textTransform: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: { label: { fontWeight: 800 } },
    },
  },
});

export default theme;


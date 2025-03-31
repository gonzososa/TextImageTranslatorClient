import React, { useRef } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import './App.css';
import Header from './components/Header';
import ImageUploadSection from './components/ImageUploadSection';
import ImageProcessingSection from './components/ImageProcessingSection';
import Footer from './components/Footer';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196F3',
      light: '#21CBF3',
      dark: '#1976D2',
    },
    background: {
      default: '#f8f9fa',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
        },
      },
    },
  },
});

function App() {
  const imageProcessingSectionRef = useRef();

  const handleTranslateFromUrl = async (url) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType.startsWith('image/')) {
        throw new Error('URL does not point to a valid image');
      }
      
      const blob = await response.blob();
      
      const file = new File([blob], 'image-from-url', { type: contentType });
      
      if (imageProcessingSectionRef.current) {
        imageProcessingSectionRef.current.processImage(file);
      }
    } catch (error) {
      console.error('Error processing URL:', error);
      if (imageProcessingSectionRef.current) {
        imageProcessingSectionRef.current.showToast({
          show: true,
          message: `Error: ${error.message}`,
          type: 'danger'
        });
      }
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <main className="flex-grow-1">
          <ImageUploadSection onTranslateFromUrl={handleTranslateFromUrl} />
          <ImageProcessingSection ref={imageProcessingSectionRef} />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;

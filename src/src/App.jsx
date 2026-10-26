import React, { useRef } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import './App.css';
import theme from './theme';
import Header from './components/Header';
import ImageUploadSection from './components/ImageUploadSection';
import ImageProcessingSection from './components/ImageProcessingSection';
import Footer from './components/Footer';
import { ALLOWED_MIME_TYPES } from './utils/securityUtils';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function App() {
  const imageProcessingSectionRef = useRef();

  const handleTranslateFromUrl = async (url) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const contentType = response.headers.get('content-type')
        ?.split(';', 1)[0]
        .trim()
        .toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        throw new Error('URL does not point to a supported JPEG or PNG image');
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

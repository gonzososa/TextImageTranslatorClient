import React, { useRef } from 'react';
import './App.css';
import Header from './components/Header';
import ImageUploadSection from './components/ImageUploadSection';
import ImageProcessingSection from './components/ImageProcessingSection';
import Footer from './components/Footer';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function App() {
  const imageProcessingSectionRef = useRef();

  const handleTranslateFromUrl = async (url) => {
    try {
      const response = await fetch(url);
      
      // Check if the response is ok and is an image
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType.startsWith('image/')) {
        throw new Error('URL does not point to a valid image');
      }
      
      // Convert the response to a blob
      const blob = await response.blob();
      
      // Create a File object from the blob
      const file = new File([blob], 'image-from-url', { type: contentType });
      
      // Process the image using the ImageProcessingSection's functionality
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
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1">
        <ImageUploadSection onTranslateFromUrl={handleTranslateFromUrl} />
        <ImageProcessingSection ref={imageProcessingSectionRef} />
      </main>
      <Footer />
    </div>
  );
}

export default App;

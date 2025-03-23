import React from 'react';
import './App.css';
import Header from './components/Header';
import ImageUploadSection from './components/ImageUploadSection';
import ImageProcessingSection from './components/ImageProcessingSection';
import Footer from './components/Footer';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function App() {
  const handleTranslateFromUrl = async (url) => {
    // Here we would handle URL-based translation
    // This could be implemented in a future iteration
    console.log('Translating from URL:', url);
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-grow-1">
        <ImageUploadSection onTranslateFromUrl={handleTranslateFromUrl} />
        <ImageProcessingSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;

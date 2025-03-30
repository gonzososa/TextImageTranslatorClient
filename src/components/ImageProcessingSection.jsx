import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';

const ImageProcessingSection = () => {
  const canvasRef = useRef(null);
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [toast, setToast] = useState({ show: false, message: '', type: 'danger' });
  const canvasWidth = window.innerWidth * 0.75;
  const canvasHeight = 900;

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ ...toast, show: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const drawImageOnCanvas = (image) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = Math.min(
      canvasWidth / image.width,
      canvasHeight / image.height
    );
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    const x = (canvasWidth - scaledWidth) / 2;
    const y = (canvasHeight - scaledHeight) / 2;

    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
    return { scale, offsetX: x, offsetY: y };
  };

  const drawTextBoxes = (recognizedText, imageMetadata) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set rectangle style
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;

    recognizedText.forEach(({ polygon }) => {
      // Begin a new path for each text box
      ctx.beginPath();
      
      // Move to the first point
      const startX = polygon[0].x * imageMetadata.scale + imageMetadata.offsetX;
      const startY = polygon[0].y * imageMetadata.scale + imageMetadata.offsetY;
      ctx.moveTo(startX, startY);
      
      // Draw lines to each subsequent point
      for (let i = 1; i < polygon.length; i++) {
        const x = polygon[i].x * imageMetadata.scale + imageMetadata.offsetX;
        const y = polygon[i].y * imageMetadata.scale + imageMetadata.offsetY;
        ctx.lineTo(x, y);
      }
      
      // Close the path back to the start point
      ctx.lineTo(startX, startY);
      
      // Stroke the path to draw the polygon
      ctx.stroke();
    });
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const image = new Image();
    const reader = new FileReader();

    reader.onload = async (e) => {
      image.src = e.target.result;
      image.onload = async () => {
        const imageMetadata = drawImageOnCanvas(image);
        
        const formData = new FormData();
        formData.append('file', file);

        try {
          setToast({ show: true, message: 'Processing image...', type: 'info' });
          const ocrResponse = await axios.post(
            'https://cloudjourneygateway.azure-api.net/api/ReadText', 
            formData, 
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              }
            }
          );
          
          if (ocrResponse.data.recognizedText) {
            drawTextBoxes(ocrResponse.data.recognizedText, imageMetadata);
            
            const textChunks = ocrResponse.data.recognizedText.map(item => item.text);

            setToast({ show: true, message: 'Translating text...', type: 'info' });
            const translationResponse = await axios.post(
              'https://cloudjourneygateway.azure-api.net/api/Translate',
              {
                targetLanguage: selectedLanguage,
                textChunks: textChunks
              },
              {
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );

            if (translationResponse.data.translations) {
              const translatedTexts = translationResponse.data.translations
                .map(t => t.translatedText)
                .join('\n');
              setTranslatedText(translatedTexts);
              setToast({ show: true, message: 'Translation completed successfully!', type: 'success' });
            }
          } else {
            setToast({ show: true, message: 'No text was found in the image', type: 'warning' });
          }
        } catch (error) {
          console.error('Error processing image:', error);
          setTranslatedText('');
          setToast({ 
            show: true, 
            message: 'Error: ' + (error.response?.data?.message || 'Failed to process the image'),
            type: 'danger'
          });
        }
      };
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="container my-4">
      {/* Toast notification */}
      <div className="position-fixed top-0 start-50 translate-middle-x pt-3" style={{ zIndex: 1050 }}>
        <div 
          className={`toast ${toast.show ? 'show' : ''}`} 
          role="alert" 
          aria-live="assertive" 
          aria-atomic="true"
          style={{ minWidth: '300px' }}
        >
          <div className={`toast-header bg-${toast.type} text-white`}>
            <strong className="me-auto">Message</strong>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={() => setToast({ ...toast, show: false })}
            ></button>
          </div>
          <div className="toast-body">
            {toast.message}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-9">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="border"
          />
        </div>
        <div className="col-md-3">
          <label htmlFor="languageSelect" className="form-label">Language Destination</label>
          <select
            id="languageSelect"
            className="form-select mb-3"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
          
          <label htmlFor="translatedTextArea" className="form-label">Translated Text</label>
          <textarea
            id="translatedTextArea"
            className="form-control mb-3"
            rows="10"
            value={translatedText}
            readOnly
            disabled
          />
          <div className="text-center">
            <label className="btn btn-primary">
              Submit Image
              <input
                type="file"
                hidden
                accept=".jpeg,.jpg,.png,.bmp,.svg"
                onChange={handleImageUpload}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageProcessingSection;
import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';

const ImageProcessingSection = () => {
  const canvasRef = useRef(null);
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const canvasWidth = window.innerWidth * 0.75;
  const canvasHeight = 900;

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
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;

    recognizedText.forEach(({ polygon }) => {
      const x = polygon.x * imageMetadata.scale + imageMetadata.offsetX;
      const y = polygon.y * imageMetadata.scale + imageMetadata.offsetY;
      ctx.strokeRect(x - 5, y - 5, 10, 10);
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
          const ocrResponse = await axios.post('https://api.cloudjourney.dev/readtext', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          if (ocrResponse.data.recognizedText) {
            drawTextBoxes(ocrResponse.data.recognizedText, imageMetadata);
            
            const textChunks = ocrResponse.data.recognizedText.map(item => ({
              text: item.text
            }));

            const translationResponse = await axios.post('https://api.cloudjourney.dev/translate', {
              targetLanguage: selectedLanguage,
              text_chunks: textChunks
            });

            if (translationResponse.data.translations) {
              const translatedTexts = translationResponse.data.translations
                .map(t => t.translatedText)
                .join('\n');
              setTranslatedText(translatedTexts);
            }
          }
        } catch (error) {
          console.error('Error processing image:', error);
          setTranslatedText('Error processing image. Please try again.');
        }
      };
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="container my-4">
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
          <select
            className="form-select mb-3"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
          <textarea
            className="form-control mb-3"
            rows="10"
            value={translatedText}
            readOnly
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
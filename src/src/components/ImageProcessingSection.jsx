import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import { 
  Box, 
  Paper, 
  Select, 
  MenuItem, 
  TextField, 
  Button, 
  Alert, 
  Snackbar,
  FormControl,
  InputLabel,
  Typography
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { validateFile } from '../utils/securityUtils';

const ImageProcessingSection = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [toast, setToast] = useState({ show: false, message: '', type: 'danger' });
  const [lastOcrResult, setLastOcrResult] = useState(null);
  const [lastImageMetadata, setLastImageMetadata] = useState(null);
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

  // Effect to handle language changes
  useEffect(() => {
    if (lastOcrResult && lastImageMetadata) {
      handleTranslation(lastOcrResult, lastImageMetadata);
    }
  }, [selectedLanguage]);

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    processImage: (file) => handleImageUpload({ target: { files: [file] } }),
    showToast: (toastConfig) => setToast(toastConfig)
  }));

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

  const handleTranslation = async (ocrResult, imageMetadata) => {
    try {
      setToast({ show: true, message: 'Translating text...', type: 'info' });
      const textChunks = ocrResult.recognizedText.map(item => item.text);

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
    } catch (error) {
      console.error('Error translating text:', error);
      setTranslatedText('');
      setToast({ 
        show: true, 
        message: 'Error: ' + (error.response?.data?.message || 'Failed to translate the text'),
        type: 'danger'
      });
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Validate file before processing
      await validateFile(file);
      
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
                },
                timeout: 30000, // 30 second timeout
                maxContentLength: 5 * 1024 * 1024, // 5MB max
                maxBodyLength: 5 * 1024 * 1024
              }
            );
            
            if (ocrResponse.data.recognizedText) {
              drawTextBoxes(ocrResponse.data.recognizedText, imageMetadata);
              
              setLastOcrResult(ocrResponse.data);
              setLastImageMetadata(imageMetadata);
              
              await handleTranslation(ocrResponse.data, imageMetadata);
            } else {
              setToast({ show: true, message: 'No text was found in the image', type: 'warning' });
            }
          } catch (error) {
            console.error('Error processing image:', error);
            setTranslatedText('');
            setLastOcrResult(null);
            setLastImageMetadata(null);
            setToast({ 
              show: true, 
              message: 'Error: ' + (error.response?.data?.message || 'Failed to process the image'),
              type: 'error'
            });
          }
        };

        // Add error handling for image loading
        image.onerror = () => {
          setToast({ 
            show: true, 
            message: 'Error: Failed to load the image',
            type: 'error'
          });
        };
      };

      reader.onerror = () => {
        setToast({ 
          show: true, 
          message: 'Error: Failed to read the file',
          type: 'error'
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      setToast({ 
        show: true, 
        message: error.message,
        type: 'error'
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Modern Snackbar instead of Bootstrap Toast */}
      <Snackbar
        open={toast.show}
        autoHideDuration={5000}
        onClose={() => setToast({ ...toast, show: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setToast({ ...toast, show: false })} 
          severity={toast.type === 'success' ? 'success' : 
                   toast.type === 'info' ? 'info' : 
                   toast.type === 'warning' ? 'warning' : 'error'}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Paper 
          elevation={3} 
          sx={{ 
            flex: '1 1 70%',
            minWidth: '300px',
            p: 2,
            borderRadius: 2,
            background: '#ffffff',
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa'
            }}
          />
        </Paper>

        <Paper 
          elevation={3} 
          sx={{ 
            flex: '1 1 25%',
            minWidth: '250px',
            p: 3,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <FormControl fullWidth>
            <InputLabel id="language-select-label">Target Language</InputLabel>
            <Select
              labelId="language-select-label"
              value={selectedLanguage}
              label="Target Language"
              onChange={(e) => setSelectedLanguage(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Spanish</MenuItem>
              <MenuItem value="fr">French</MenuItem>
            </Select>
          </FormControl>

          <TextField
            multiline
            rows={8}
            value={translatedText}
            disabled
            label="Translated Text"
            sx={{
              backgroundColor: '#f8f9fa',
              '& .MuiInputBase-input.Mui-disabled': {
                WebkitTextFillColor: '#000000',
                opacity: 0.7,
              }
            }}
          />

          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
            sx={{
              mt: 2,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1CA7F3 90%)',
              }
            }}
          >
            Submit Image
            <input
              type="file"
              hidden
              accept=".jpeg,.jpg,.png,.bmp,.svg"
              onChange={handleImageUpload}
            />
          </Button>
        </Paper>
      </Box>
    </Box>
  );
});

ImageProcessingSection.displayName = 'ImageProcessingSection';

export default ImageProcessingSection;
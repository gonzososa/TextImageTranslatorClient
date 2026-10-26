import React, { useCallback, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Box, 
  Paper, 
  Select, 
  MenuItem, 
  Button, 
  Alert, 
  Snackbar,
  FormControl,
  InputLabel,
  Typography
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { validateFile } from '../utils/securityUtils';
import { ApiService } from '../services/api';
import { isPointInPolygon } from '../utils/geometry';
import { OCR_OUTLINE_COLOR } from '../theme';

const getSourceLanguageLabel = (languageCode) => {
  if (!languageCode) return 'Unknown';
  if (languageCode === 'Mixed') return 'Mixed';

  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(languageCode) || 'Unknown';
  } catch {
    return 'Unknown';
  }
};

const ImageProcessingSection = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const translationInProgressRef = useRef(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [toast, setToast] = useState({ show: false, message: '', type: 'danger' });
  const [lastOcrResult, setLastOcrResult] = useState(null);
  const [lastImageMetadata, setLastImageMetadata] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState(null);
  const [hasCurrentImage, setHasCurrentImage] = useState(false);
  const [translationLines, setTranslationLines] = useState([]);
  const [hoveredTranslation, setHoveredTranslation] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationFailed, setTranslationFailed] = useState(false);
  // Fixed bitmap size: changing the canvas width attribute on re-render clears the drawing.
  const [canvasWidth] = useState(() => window.innerWidth * 0.75);
  const canvasHeight = 900;

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(currentToast => ({ ...currentToast, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  useImperativeHandle(ref, () => ({
    processImage: (file) => handleImageFile(file),
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
    ctx.strokeStyle = OCR_OUTLINE_COLOR;
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

  const handleTranslation = useCallback(async (ocrResult, targetLanguage) => {
    if (translationInProgressRef.current) return;

    translationInProgressRef.current = true;
    setIsTranslating(true);
    setTranslationFailed(false);
    setTranslationLines([]);
    setHoveredTranslation(null);

    try {
      setToast({ show: true, message: 'Translating text...', type: 'info' });
      const textChunks = ocrResult.recognizedText.map(item => item.text);
      const translationResponse = await ApiService.translateText({
        textChunks,
        targetLanguage
      });
      const translations = translationResponse.data.translations;

      if (!Array.isArray(translations) || translations.length !== textChunks.length) {
        throw new Error('Translation response did not match recognized text.');
      }

      setTranslationLines(ocrResult.recognizedText.map((recognizedText, index) => ({
        polygon: recognizedText.polygon,
        translatedText: translations[index].translatedText
      })));
      setToast({ show: true, message: 'Translation completed successfully!', type: 'success' });
    } catch (error) {
      console.error('Error translating text:', error);
      setTranslationLines([]);
      setHoveredTranslation(null);
      setTranslationFailed(true);
      setToast({ 
        show: true, 
        message: 'Error: ' + (error.response?.data?.message || 'Failed to translate the text'),
        type: 'danger'
      });
    } finally {
      translationInProgressRef.current = false;
      setIsTranslating(false);
    }
  }, []);

  const handleLanguageChange = (event) => {
    const targetLanguage = event.target.value;
    setSelectedLanguage(targetLanguage);
    if (lastOcrResult) {
      handleTranslation(lastOcrResult, targetLanguage);
    }
  };

  const handleCanvasMouseMove = (event) => {
    const canvas = canvasRef.current;
    if (!canvas || !lastImageMetadata || translationLines.length === 0) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    const canvasX = (event.clientX - bounds.left) * canvas.width / bounds.width;
    const canvasY = (event.clientY - bounds.top) * canvas.height / bounds.height;
    const imagePoint = {
      x: (canvasX - lastImageMetadata.offsetX) / lastImageMetadata.scale,
      y: (canvasY - lastImageMetadata.offsetY) / lastImageMetadata.scale
    };
    const match = translationLines.find(line =>
      line.translatedText && isPointInPolygon(imagePoint, line.polygon)
    );

    if (!match) {
      setHoveredTranslation(null);
      return;
    }

    const center = match.polygon.reduce(
      (result, point) => ({ x: result.x + point.x / match.polygon.length, y: result.y + point.y / match.polygon.length }),
      { x: 0, y: 0 }
    );
    const tooltipCanvasX = center.x * lastImageMetadata.scale + lastImageMetadata.offsetX;
    const tooltipCanvasY = center.y * lastImageMetadata.scale + lastImageMetadata.offsetY;

    setHoveredTranslation({
      text: match.translatedText,
      left: tooltipCanvasX / canvas.width * 100,
      top: tooltipCanvasY / canvas.height * 100
    });
  };

  const handleImageFile = async (file) => {
    if (!file) return;

    try {
      await validateFile(file);
      setTranslationLines([]);
      setHoveredTranslation(null);
      setLastOcrResult(null);
      setLastImageMetadata(null);
      setSourceLanguage(null);
      setHasCurrentImage(false);
      setTranslationFailed(false);
      
      const image = new Image();
      const reader = new FileReader();

      reader.onload = async (e) => {
        image.src = e.target.result;
        image.onload = async () => {
          const imageMetadata = drawImageOnCanvas(image);
          setHasCurrentImage(true);
          setLastImageMetadata(imageMetadata);
          
          const formData = new FormData();
          formData.append('file', file);

          try {
            setToast({ show: true, message: 'Processing image...', type: 'info' });
            const ocrResponse = await ApiService.processImage(formData);

            if (Array.isArray(ocrResponse.data.recognizedText) && ocrResponse.data.recognizedText.length > 0) {
              const { recognizedText } = ocrResponse.data;
              drawTextBoxes(recognizedText, imageMetadata);
              setLastOcrResult(ocrResponse.data);
              setSourceLanguage(ocrResponse.data.sourceLanguage || null);
              await handleTranslation(ocrResponse.data, selectedLanguage);
            } else {
              setLastOcrResult(null);
              setLastImageMetadata(null);
              setSourceLanguage(null);
              setToast({ show: true, message: 'No text was found in the image', type: 'warning' });
            }
          } catch (error) {
            console.error('Error processing image:', error);
            setTranslationLines([]);
            setHoveredTranslation(null);
            setLastOcrResult(null);
            setLastImageMetadata(null);
            setToast({ 
              show: true, 
              message: 'Error: ' + (error.response?.data?.message || 'Failed to process the image'),
              type: 'error'
            });
          }
        };

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

  const handleImageUpload = (event) => handleImageFile(event.target.files?.[0]);

  const handleImageFileRef = useRef(handleImageFile);
  useEffect(() => {
    handleImageFileRef.current = handleImageFile;
  });

  useEffect(() => {
    const handlePaste = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, [contenteditable="true"]')) return;

      const items = Array.from(event.clipboardData?.items ?? []);
      const imageItem = items.find(item => item.kind === 'file' && item.type.startsWith('image/'));
      const file = imageItem?.getAsFile();
      if (!file) return;

      event.preventDefault();
      const extension = file.type.split('/')[1]?.split('+')[0] || 'png';
      const namedFile = file.name
        ? file
        : new File([file], `pasted-image.${extension}`, { type: file.type });
      handleImageFileRef.current(namedFile);
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const handleDragEnter = (event) => {
    event.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingFile(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDraggingFile(false);
    }
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    setIsDraggingFile(false);
    return handleImageFile(event.dataTransfer.files?.[0]);
  };

  return (
    <Box sx={{ p: 3 }}>
      {}
      <Snackbar
        open={toast.show}
        autoHideDuration={5000}
        onClose={() => setToast(currentToast => ({ ...currentToast, show: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setToast(currentToast => ({ ...currentToast, show: false }))} 
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
          elevation={0} 
          sx={{ 
            flex: '1 1 70%',
            minWidth: '300px',
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ position: 'relative', lineHeight: 0 }}>
            {hasCurrentImage && (
              <Typography
                aria-label="Detected source language"
                variant="subtitle1"
                sx={{ mb: 1, lineHeight: 1.5 }}
              >
                Source language: {getSourceLanguageLabel(sourceLanguage)}
              </Typography>
            )}
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoveredTranslation(null)}
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '8px',
                backgroundColor: '#F5F7FB'
              }}
            />
            {hoveredTranslation && (
              <Paper
                role="tooltip"
                sx={{
                  position: 'absolute',
                  left: `${hoveredTranslation.left}%`,
                  top: `${hoveredTranslation.top}%`,
                  transform: 'translate(-50%, calc(-100% - 8px))',
                  maxWidth: '80%',
                  px: 1.5,
                  py: 1,
                  lineHeight: 1.4,
                  backgroundColor: 'background.paper',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'primary.main',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              >
                {hoveredTranslation.text}
              </Paper>
            )}
          </Box>
        </Paper>

        <Paper 
          elevation={0} 
          sx={{ 
            flex: '1 1 25%',
            minWidth: '250px',
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
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
              onChange={handleLanguageChange}
              disabled={isTranslating}
              sx={{ mb: 2 }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Spanish</MenuItem>
              <MenuItem value="fr">French</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary">
            Hover over an outlined text region to see its translation.
          </Typography>

          {lastOcrResult?.recognizedText?.length > 0 && (
            <Button
              variant="outlined"
              onClick={() => handleTranslation(lastOcrResult, selectedLanguage)}
              disabled={isTranslating}
            >
              {isTranslating ? 'Translating...' : translationFailed ? 'Retry translation' : 'Translate again'}
            </Button>
          )}

          <Box
            role="region"
            aria-label="Image upload drop area"
            sx={{
              mt: 2,
              p: 2,
              border: '2px dashed',
              borderColor: isDraggingFile ? 'primary.main' : 'divider',
              borderRadius: 2,
              textAlign: 'center',
              backgroundColor: isDraggingFile ? 'action.hover' : 'transparent',
              transition: 'background-color 150ms ease, border-color 150ms ease'
            }}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {isDraggingFile ? 'Drop image to upload' : 'Drag and drop a JPEG or PNG image here, or'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              You can also paste an image with Ctrl+V.
            </Typography>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
            >
              Submit Image
              <input
                type="file"
                hidden
                accept=".jpeg,.jpg,.png"
                onChange={handleImageUpload}
              />
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
});

ImageProcessingSection.displayName = 'ImageProcessingSection';

export default ImageProcessingSection;
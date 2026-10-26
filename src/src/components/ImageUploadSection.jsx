import React, { useState } from 'react';
import { Paper, InputBase, IconButton, Box, Alert, Snackbar } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import { validateImageUrl } from '../utils/securityUtils';

const ImageUploadSection = ({ onTranslateFromUrl }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  const handleTranslate = async () => {
    if (imageUrl) {
      try {
        await validateImageUrl(imageUrl);
        onTranslateFromUrl(imageUrl);
        setError('');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleTranslate();
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
      <Paper
        elevation={0}
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          borderRadius: '50px',
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover, &:focus-within': {
            borderColor: 'primary.main',
          }
        }}
      >
        <IconButton sx={{ p: '10px' }} aria-label="link">
          <LinkIcon />
        </IconButton>
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder="Paste image URL here"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          inputProps={{
            'aria-label': 'paste image url',
            maxLength: 2048 // Prevent extremely long URLs
          }}
        />
        <IconButton 
          sx={{ 
            p: '10px',
            bgcolor: imageUrl ? 'primary.main' : 'action.disabledBackground',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: imageUrl ? 'primary.dark' : 'action.disabledBackground'
            },
            transition: 'all 0.3s'
          }} 
          aria-label="translate"
          onClick={handleTranslate}
          disabled={!imageUrl}
        >
          <SearchIcon />
        </IconButton>
      </Paper>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ImageUploadSection;
import React, { useState } from 'react';
import { Paper, InputBase, IconButton, Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';

const ImageUploadSection = ({ onTranslateFromUrl }) => {
  const [imageUrl, setImageUrl] = useState('');

  const handleTranslate = () => {
    if (imageUrl) {
      onTranslateFromUrl(imageUrl);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
      <Paper
        elevation={3}
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          borderRadius: '50px',
          background: '#f8f9fa',
          '&:hover': {
            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.12)',
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
        />
        <IconButton 
          sx={{ 
            p: '10px',
            bgcolor: imageUrl ? '#2196F3' : 'grey.300',
            color: 'white',
            '&:hover': {
              bgcolor: imageUrl ? '#1976D2' : 'grey.400'
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
    </Box>
  );
};

export default ImageUploadSection;
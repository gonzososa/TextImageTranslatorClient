import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[100]
            : theme.palette.grey[900],
      }}
    >
      <Container maxWidth="sm">
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}
        >
          © {new Date().getFullYear()} - Made with
          <FavoriteIcon sx={{ fontSize: 16, color: '#FF1744' }} />
          under the MIT License
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
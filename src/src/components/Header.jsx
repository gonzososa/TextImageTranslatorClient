import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Button, 
  IconButton, 
  Box, 
  useTheme, 
  useMediaQuery, 
  Typography,
  Menu,
  MenuItem
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GitHubIcon from '@mui/icons-material/GitHub';
import translationImage from '../assets/translation.png';

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleGithubClick = () => {
    window.open('https://www.github.com/gonzososa', '_blank');
  };
  
  return (
    <AppBar 
      position="static" 
      sx={{ 
        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
        boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
      }}
    >
      <Toolbar>
        <img 
          src={translationImage} 
          alt="Translation" 
          style={{ 
            height: '32px',
            marginRight: '16px',
          }} 
        />
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 500,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Text within Images Translator
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {!isMobile ? (
            <>
              <Button 
                color="inherit" 
                startIcon={<GitHubIcon />}
                onClick={handleGithubClick}
              >
                Github
              </Button>
              <Button color="inherit">About</Button>
            </>
          ) : (
            <>
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={handleClick}
                aria-controls={open ? 'mobile-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="mobile-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    mt: 1.5,
                    '& .MuiMenuItem-root': {
                      px: 2,
                      py: 1,
                      borderRadius: 0,
                      '&:hover': {
                        backgroundColor: 'rgba(33, 150, 243, 0.08)',
                      },
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleGithubClick}>
                  <GitHubIcon sx={{ mr: 1 }} />
                  Github
                </MenuItem>
                <MenuItem>About</MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
import React from 'react';

const Footer = () => {
  return (
    <footer className="footer mt-auto py-3 bg-light">
      <div className="container text-center">
        <span className="text-muted">
          © {new Date().getFullYear()} - Licensed under the MIT License
        </span>
      </div>
    </footer>
  );
};

export default Footer;
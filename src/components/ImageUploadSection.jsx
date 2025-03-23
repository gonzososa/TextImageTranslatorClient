import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const ImageUploadSection = ({ onTranslateFromUrl }) => {
  const [imageUrl, setImageUrl] = useState('');

  const handleTranslate = () => {
    if (imageUrl) {
      onTranslateFromUrl(imageUrl);
    }
  };

  return (
    <div className="container my-4">
      <div className="row">
        <div className="col">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Paste image URL here"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={handleTranslate}
              disabled={!imageUrl}
            >
              Translate Image from URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadSection;
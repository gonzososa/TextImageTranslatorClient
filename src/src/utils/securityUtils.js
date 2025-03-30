export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/bmp',
  'image/svg+xml'
];

export const validateFile = async (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  // Validate MIME type
  const validMime = await validateMimeType(file);
  if (!validMime) {
    throw new Error('Invalid file type. Only JPEG, PNG, BMP and SVG files are allowed.');
  }

  // Additional validation for SVG files to prevent XSS
  if (file.type === 'image/svg+xml') {
    return validateSVG(file);
  }

  return true;
};

const validateMimeType = async (file) => {
  // Check both the file extension and actual file signature
  const fileExtension = file.name.toLowerCase().split('.').pop();
  const validExtensions = ['jpg', 'jpeg', 'png', 'bmp', 'svg'];
  
  if (!validExtensions.includes(fileExtension)) {
    return false;
  }

  // Read file header to verify actual content type
  const headerBytes = await readFileHeader(file);
  const mimeType = getMimeTypeFromHeader(headerBytes);
  
  return ALLOWED_MIME_TYPES.includes(mimeType);
};

const readFileHeader = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      const arr = new Uint8Array(e.target.result).subarray(0, 4);
      resolve(arr);
    };
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

const getMimeTypeFromHeader = (headerBytes) => {
  const signature = Array.from(headerBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('').toUpperCase();

  // Common image file signatures
  const signatures = {
    'FFD8FF': 'image/jpeg',
    '89504E47': 'image/png',
    '424D': 'image/bmp',
    '3C3F786D': 'image/svg+xml'
  };

  for (const [sig, mime] of Object.entries(signatures)) {
    if (signature.startsWith(sig)) {
      return mime;
    }
  }
  
  return 'unknown';
};

const validateSVG = async (file) => {
  const content = await file.text();
  
  // Check for potentially malicious content in SVG
  const dangerous = [
    '<script',
    'javascript:',
    'data:',
    'onload=',
    'onerror=',
    'onclick=',
    'onmouseover=',
    'eval(',
    'Function(',
  ];

  if (dangerous.some(pattern => content.toLowerCase().includes(pattern))) {
    throw new Error('SVG contains potentially malicious content');
  }

  return true;
};

export const validateImageUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    
    // Whitelist allowed protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL protocol. Only HTTP and HTTPS are allowed.');
    }

    // Prevent localhost and private IP access
    const hostname = parsedUrl.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      throw new Error('Access to local or private networks is not allowed');
    }

    return true;
  } catch (error) {
    throw new Error(error.message || 'Invalid URL format');
  }
};
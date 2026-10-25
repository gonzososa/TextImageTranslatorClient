export const MAX_FILE_SIZE = 12 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png'
];

export const validateFile = async (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024} MiB limit`);
  }

  // Validate MIME type
  const validMime = await validateMimeType(file);
  if (!validMime) {
    throw new Error('Invalid file type. Only JPEG, PNG, BMP and SVG files are allowed.');
  }

  return true;
};

const validateMimeType = async (file) => {
  const fileExtension = file.name.toLowerCase().match(/\.([^.]+)$/)?.[1];
  const extensionTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png'
  };

  if (fileExtension && !Object.hasOwn(extensionTypes, fileExtension)) {
    return false;
  }

  const headerBytes = await readFileHeader(file);
  const mimeType = getMimeTypeFromHeader(headerBytes);

  return ALLOWED_MIME_TYPES.includes(mimeType) &&
    (!file.type || file.type === mimeType) &&
    (!fileExtension || extensionTypes[fileExtension] === mimeType);
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

  const signatures = {
    'FFD8FF': 'image/jpeg',
    '89504E47': 'image/png'
  };

  for (const [sig, mime] of Object.entries(signatures)) {
    if (signature.startsWith(sig)) {
      return mime;
    }
  }
  
  return 'unknown';
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
    throw new Error(error.message || 'Invalid URL format', { cause: error });
  }
};
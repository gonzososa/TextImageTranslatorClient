import { describe, expect, it } from 'vitest';
import { MAX_FILE_SIZE, validateFile, validateImageUrl } from '../utils/securityUtils';

describe('validateFile', () => {
  it('accepts a JPEG with a matching filename and signature', async () => {
    const file = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])],
      'photo.jpg',
      { type: 'image/jpeg' }
    );

    await expect(validateFile(file)).resolves.toBe(true);
  });

  it('accepts a JPEG whose generated filename has no extension', async () => {
    const file = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])],
      'image-from-url',
      { type: 'image/jpeg' }
    );

    await expect(validateFile(file)).resolves.toBe(true);
  });

  it('accepts a PNG with a matching filename and signature', async () => {
    const file = new File(
      [Uint8Array.from([0x89, 0x50, 0x4e, 0x47])],
      'photo.png',
      { type: 'image/png' }
    );

    await expect(validateFile(file)).resolves.toBe(true);
  });

  it('rejects a BMP image because the backend supports only JPEG and PNG', async () => {
    const file = new File(
      [Uint8Array.from([0x42, 0x4d, 0x00, 0x00])],
      'photo.bmp',
      { type: 'image/bmp' }
    );

    await expect(validateFile(file)).rejects.toThrow('Invalid file type');
  });

  it('rejects files above the configured upload limit', async () => {
    const file = { size: MAX_FILE_SIZE + 1 };

    await expect(validateFile(file)).rejects.toThrow('12 MiB limit');
  });

  it('rejects an unsupported file signature', async () => {
    const file = new File(
      [Uint8Array.from([0, 1, 2, 3])],
      'document.jpg',
      { type: 'image/jpeg' }
    );

    await expect(validateFile(file)).rejects.toThrow('Invalid file type');
  });
});

describe('validateImageUrl', () => {
  it.each([
    'https://example.test/image.jpg',
    'http://example.test/image?format=png'
  ])('accepts an HTTP(S) URL: %s', (url) => {
    expect(validateImageUrl(url)).toBe(true);
  });

  it('rejects unsupported protocols', () => {
    expect(() => validateImageUrl('file:///tmp/image.jpg'))
      .toThrow('Only HTTP and HTTPS are allowed');
  });

  it('rejects private-network hosts', () => {
    expect(() => validateImageUrl('http://192.168.1.4/image.jpg'))
      .toThrow('local or private networks');
  });
});

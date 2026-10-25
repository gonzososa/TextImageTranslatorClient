import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const processingMocks = vi.hoisted(() => ({
  processImage: vi.fn(),
  showToast: vi.fn()
}));

vi.mock('../components/ImageProcessingSection', async () => {
  const ReactModule = await import('react');

  return {
    default: ReactModule.forwardRef((_props, ref) => {
      ReactModule.useImperativeHandle(ref, () => processingMocks);
      return ReactModule.createElement('div', { 'data-testid': 'image-processing' });
    })
  };
});

vi.mock('../components/Header', () => ({ default: () => null }));
vi.mock('../components/Footer', () => ({ default: () => null }));

describe('App URL upload flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches a browser-accessible image URL and forwards it for processing', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/jpeg; charset=binary' },
      blob: async () => new Blob(['jpeg-bytes'], { type: 'image/jpeg' })
    });
    render(<App />);

    await user.type(
      screen.getByRole('textbox', { name: 'paste image url' }),
      'https://example.test/image?format=jpg'
    );
    await user.click(screen.getByRole('button', { name: 'translate' }));

    await waitFor(() => expect(processingMocks.processImage).toHaveBeenCalledOnce());
    const file = processingMocks.processImage.mock.calls[0][0];
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/jpeg');
  });

  it('shows an error when the fetched resource is not an image', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      blob: async () => new Blob(['not an image'])
    });
    render(<App />);

    await user.type(
      screen.getByRole('textbox', { name: 'paste image url' }),
      'https://example.test/page'
    );
    await user.click(screen.getByRole('button', { name: 'translate' }));

    await waitFor(() => expect(processingMocks.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Error: URL does not point to a supported JPEG or PNG image' })
    ));
    expect(processingMocks.processImage).not.toHaveBeenCalled();
  });

  it('shows an error when fetching the image fails', async () => {
    const user = userEvent.setup();
    fetch.mockRejectedValue(new Error('Failed to fetch image'));
    render(<App />);

    await user.type(
      screen.getByRole('textbox', { name: 'paste image url' }),
      'https://example.test/unavailable.jpg'
    );
    await user.click(screen.getByRole('button', { name: 'translate' }));

    await waitFor(() => expect(processingMocks.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Error: Failed to fetch image' })
    ));
    expect(processingMocks.processImage).not.toHaveBeenCalled();
  });
});

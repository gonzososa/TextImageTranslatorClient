import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImageProcessingSection from '../components/ImageProcessingSection';

const serviceMocks = vi.hoisted(() => ({
  processImage: vi.fn(),
  translateText: vi.fn(),
  validateFile: vi.fn()
}));

vi.mock('../services/api', () => ({
  ApiService: {
    processImage: serviceMocks.processImage,
    translateText: serviceMocks.translateText
  }
}));

vi.mock('../utils/securityUtils', () => ({
  validateFile: serviceMocks.validateFile
}));

class TestImage {
  width = 100;
  height = 100;

  set src(_source) {
    queueMicrotask(() => this.onload?.());
  }
}

describe('ImageProcessingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('Image', TestImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn()
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      return {
        left: 0,
        top: 0,
        width: this.width,
        height: this.height,
        right: this.width,
        bottom: this.height
      };
    });
    serviceMocks.validateFile.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows only the translation for the hovered OCR polygon and hides it on exit', async () => {
    const user = userEvent.setup();
    serviceMocks.processImage.mockResolvedValue({
      data: {
        recognizedText: [
          {
            text: 'Hello',
            polygon: [
              { x: 0, y: 0 },
              { x: 20, y: 0 },
              { x: 20, y: 20 },
              { x: 0, y: 20 }
            ]
          },
          {
            text: 'Goodbye',
            polygon: [
              { x: 50, y: 0 },
              { x: 70, y: 0 },
              { x: 70, y: 20 },
              { x: 50, y: 20 }
            ]
          }
        ]
      }
    });
    serviceMocks.translateText.mockResolvedValue({
      data: {
        translations: [
          { translatedText: 'Hello translated' },
          { translatedText: 'Goodbye translated' }
        ]
      }
    });
    const { container } = render(<ImageProcessingSection />);
    const file = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])],
      'sample.jpg',
      { type: 'image/jpeg' }
    );

    await user.upload(container.querySelector('input[type="file"]'), file);

    await waitFor(() => expect(serviceMocks.processImage).toHaveBeenCalledOnce());
    await waitFor(() => expect(serviceMocks.translateText).toHaveBeenCalledWith({
      textChunks: ['Hello', 'Goodbye'],
      targetLanguage: 'en'
    }));

    const canvas = container.querySelector('canvas');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 100 });
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Hello translated');
    expect(screen.queryByText('Goodbye translated')).not.toBeInTheDocument();

    fireEvent.mouseMove(canvas, { clientX: 500, clientY: 100 });
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Goodbye translated');
    expect(screen.queryByText('Hello translated')).not.toBeInTheDocument();

    fireEvent.mouseLeave(canvas);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('keeps the canvas bitmap size when the window is resized and the component re-renders', async () => {
    const user = userEvent.setup();
    serviceMocks.processImage.mockResolvedValue({
      data: {
        recognizedText: [
          {
            text: 'Hello',
            polygon: [
              { x: 0, y: 0 },
              { x: 20, y: 0 },
              { x: 20, y: 20 },
              { x: 0, y: 20 }
            ]
          }
        ]
      }
    });
    serviceMocks.translateText.mockResolvedValue({
      data: { translations: [{ translatedText: 'Hello translated' }] }
    });
    const { container } = render(<ImageProcessingSection />);
    const file = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])], 'sample.jpg', { type: 'image/jpeg' });

    await user.upload(container.querySelector('input[type="file"]'), file);
    await waitFor(() => expect(serviceMocks.translateText).toHaveBeenCalled());

    const canvas = container.querySelector('canvas');
    const initialWidth = canvas.width;
    const originalInnerWidth = window.innerWidth;

    try {
      window.innerWidth = originalInnerWidth / 2;
      fireEvent(window, new Event('resize'));
      fireEvent.mouseMove(canvas, {       clientX: 50, clientY: 100 });
      expect(await screen.findByRole('tooltip')).toHaveTextContent('Hello translated');
      expect(canvas.width).toBe(initialWidth);
    } finally {
      window.innerWidth = originalInnerWidth;
    }
  });

  it('retranslates the current OCR result when the target language changes', async () => {
    const user = userEvent.setup();
    serviceMocks.processImage.mockResolvedValue({
      data: {
        sourceLanguage: 'zh-Hans',
        recognizedText: [{
          text: 'Hello',
          polygon: [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 20 },
            { x: 0, y: 20 }
          ]
        }]
      }
    });
    serviceMocks.translateText.mockImplementation(({ targetLanguage }) => Promise.resolve({
      data: {
        translations: [{ translatedText: targetLanguage === 'es' ? 'Hola' : 'Hello' }]
      }
    }));
    const { container } = render(<ImageProcessingSection />);
    const file = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])],
      'sample.jpg',
      { type: 'image/jpeg' }
    );

    await user.upload(container.querySelector('input[type="file"]'), file);
    await waitFor(() => expect(serviceMocks.translateText).toHaveBeenCalledWith({
      textChunks: ['Hello'],
      targetLanguage: 'en'
    }));
    expect(screen.getByLabelText('Detected source language')).toHaveTextContent('Simplified Chinese');
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Spanish' }));
    await waitFor(() => expect(serviceMocks.translateText).toHaveBeenCalledWith({
      textChunks: ['Hello'],
      targetLanguage: 'es'
    }));

    fireEvent.mouseMove(container.querySelector('canvas'), { clientX: 50, clientY: 100 });
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Hola');
    expect(screen.getByLabelText('Detected source language')).toHaveTextContent('Simplified Chinese');
  });

  it('shows a neutral source-language label when OCR detection is unavailable', async () => {
    const user = userEvent.setup();
    serviceMocks.processImage.mockResolvedValue({
      data: {
        recognizedText: [{
          text: 'こんにちは',
          polygon: [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 20 },
            { x: 0, y: 20 }
          ]
        }]
      }
    });
    serviceMocks.translateText.mockResolvedValue({
      data: { translations: [{ translatedText: 'Hello' }] }
    });
    const { container } = render(<ImageProcessingSection />);
    const file = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])], 'sample.jpg', { type: 'image/jpeg' });

    await user.upload(container.querySelector('input[type="file"]'), file);

    expect(await screen.findByLabelText('Detected source language')).toHaveTextContent('Source language: Unknown');
  });

  it('shows a mixed-language source label when OCR detection reports mixed text', async () => {
    const user = userEvent.setup();
    serviceMocks.processImage.mockResolvedValue({
      data: {
        sourceLanguage: 'Mixed',
        recognizedText: [{
          text: 'Hello こんにちは',
          polygon: [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 20 },
            { x: 0, y: 20 }
          ]
        }]
      }
    });
    serviceMocks.translateText.mockResolvedValue({
      data: { translations: [{ translatedText: 'Hola' }] }
    });
    const { container } = render(<ImageProcessingSection />);
    const file = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])], 'sample.jpg', { type: 'image/jpeg' });

    await user.upload(container.querySelector('input[type="file"]'), file);

    expect(await screen.findByLabelText('Detected source language')).toHaveTextContent('Source language: Mixed');
  });

  it('shows the no-text state without calling translation when OCR is empty', async () => {
    const user = userEvent.setup();
    serviceMocks.processImage.mockResolvedValue({ data: { recognizedText: [] } });
    const { container } = render(<ImageProcessingSection />);
    const file = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])],
      'sample.jpg',
      { type: 'image/jpeg' }
    );

    await user.upload(container.querySelector('input[type="file"]'), file);

    expect(await screen.findByText('No text was found in the image')).toBeInTheDocument();
    expect(serviceMocks.translateText).not.toHaveBeenCalled();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows an explicit error when OCR fails and does not call translation', async () => {
    const user = userEvent.setup();
    serviceMocks.processImage.mockRejectedValue(new Error('network failure'));
    const { container } = render(<ImageProcessingSection />);
    const file = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])],
      'sample.jpg',
      { type: 'image/jpeg' }
    );

    await user.upload(container.querySelector('input[type="file"]'), file);

    await waitFor(() => expect(screen.getByText('Error: Failed to process the image')).toBeInTheDocument());
    expect(serviceMocks.translateText).not.toHaveBeenCalled();
  });

  it('retries translation from stored OCR text without uploading or running OCR again', async () => {
    const user = userEvent.setup();
    serviceMocks.processImage.mockResolvedValue({
      data: {
        recognizedText: [{
          text: 'Hello',
          polygon: [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 20 },
            { x: 0, y: 20 }
          ]
        }]
      }
    });
    serviceMocks.translateText
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        data: { translations: [{ translatedText: 'Hola' }] }
      });
    const { container } = render(<ImageProcessingSection />);
    const file = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])], 'sample.jpg', { type: 'image/jpeg' });

    await user.upload(container.querySelector('input[type="file"]'), file);
    expect(await screen.findByRole('button', { name: 'Retry translation' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Retry translation' }));

    await waitFor(() => expect(screen.getByText('Translation completed successfully!')).toBeInTheDocument());
    expect(serviceMocks.processImage).toHaveBeenCalledOnce();
    expect(serviceMocks.validateFile).toHaveBeenCalledOnce();
    expect(serviceMocks.translateText).toHaveBeenCalledTimes(2);
    expect(serviceMocks.translateText).toHaveBeenLastCalledWith({
      textChunks: ['Hello'],
      targetLanguage: 'en'
    });
    fireEvent.mouseMove(container.querySelector('canvas'), { clientX: 50, clientY: 100 });
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Hola');
    expect(screen.getByRole('button', { name: 'Translate again' })).toBeEnabled();
  });

  it('keeps the OCR result available after repeated translation failures', async () => {
    const user = userEvent.setup();
    serviceMocks.processImage.mockResolvedValue({
      data: {
        recognizedText: [{
          text: 'Hello',
          polygon: [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 20 },
            { x: 0, y: 20 }
          ]
        }]
      }
    });
    serviceMocks.translateText.mockRejectedValue(new Error('temporary failure'));
    const { container } = render(<ImageProcessingSection />);
    const file = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])], 'sample.jpg', { type: 'image/jpeg' });

    await user.upload(container.querySelector('input[type="file"]'), file);
    await user.click(await screen.findByRole('button', { name: 'Retry translation' }));

    await waitFor(() => expect(serviceMocks.translateText).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Retry translation' })).toBeEnabled();
    expect(screen.getByText('Error: Failed to translate the text')).toBeInTheDocument();
    expect(serviceMocks.processImage).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Detected source language')).toHaveTextContent('Unknown');
  });

  it('retries with the newly selected target language', async () => {
    const user = userEvent.setup();
    serviceMocks.processImage.mockResolvedValue({
      data: {
        recognizedText: [{
          text: 'Hello',
          polygon: [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 20 },
            { x: 0, y: 20 }
          ]
        }]
      }
    });
    serviceMocks.translateText
      .mockRejectedValueOnce(new Error('initial failure'))
      .mockRejectedValueOnce(new Error('spanish failure'))
      .mockResolvedValueOnce({
        data: { translations: [{ translatedText: 'Hola' }] }
      });
    const { container } = render(<ImageProcessingSection />);
    const file = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])], 'sample.jpg', { type: 'image/jpeg' });

    await user.upload(container.querySelector('input[type="file"]'), file);
    await screen.findByRole('button', { name: 'Retry translation' });
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Spanish' }));
    await waitFor(() => expect(serviceMocks.translateText).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry translation' })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: 'Retry translation' }));

    await waitFor(() => expect(screen.getByText('Translation completed successfully!')).toBeInTheDocument());
    expect(serviceMocks.translateText).toHaveBeenLastCalledWith({
      textChunks: ['Hello'],
      targetLanguage: 'es'
    });
    expect(serviceMocks.processImage).toHaveBeenCalledOnce();
  });

  it('disables translation retry and language selection while translation is in progress', async () => {
    const user = userEvent.setup();
    serviceMocks.processImage.mockResolvedValue({
      data: {
        recognizedText: [{
          text: 'Hello',
          polygon: [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 20 },
            { x: 0, y: 20 }
          ]
        }]
      }
    });
    serviceMocks.translateText.mockReturnValue(new Promise(() => {}));
    const { container } = render(<ImageProcessingSection />);
    const file = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])], 'sample.jpg', { type: 'image/jpeg' });

    await user.upload(container.querySelector('input[type="file"]'), file);

    expect(await screen.findByRole('button', { name: 'Translating...' })).toBeDisabled();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
    expect(serviceMocks.translateText).toHaveBeenCalledOnce();
  });

  it('processes a dropped image through the same validation and OCR flow', async () => {
    const file = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])],
      'dropped.jpg',
      { type: 'image/jpeg' }
    );
    serviceMocks.processImage.mockResolvedValue({ data: { recognizedText: [] } });
    const { container } = render(<ImageProcessingSection />);
    const dropArea = screen.getByRole('region', { name: 'Image upload drop area' });

    fireEvent.dragEnter(dropArea, { dataTransfer: { files: [file], types: ['Files'] } });
    expect(screen.getByText('Drop image to upload')).toBeInTheDocument();
    fireEvent.dragOver(dropArea, { dataTransfer: { files: [file], types: ['Files'] } });
    fireEvent.dragLeave(dropArea, { relatedTarget: document.body });
    expect(screen.getByText('Drag and drop a JPEG or PNG image here, or')).toBeInTheDocument();

    fireEvent.dragEnter(dropArea, { dataTransfer: { files: [file], types: ['Files'] } });
    fireEvent.drop(dropArea, { dataTransfer: { files: [file], types: ['Files'] } });

    await waitFor(() => expect(serviceMocks.validateFile).toHaveBeenCalledWith(file));
    await waitFor(() => expect(serviceMocks.processImage).toHaveBeenCalledOnce());
    expect(serviceMocks.processImage.mock.calls[0][0].get('file')).toBe(file);
    expect(screen.getByText('Drag and drop a JPEG or PNG image here, or')).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toHaveAttribute('accept', '.jpeg,.jpg,.png');
  });

  describe('clipboard paste', () => {
    const pasteEvent = (target, items) => {
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { items } });
      target.dispatchEvent(event);
      return event;
    };
    const imageItem = (file) => ({ kind: 'file', type: file.type, getAsFile: () => file });

    it('processes a pasted image through the same flow and names unnamed images', async () => {
      serviceMocks.processImage.mockResolvedValue({ data: { recognizedText: [] } });
      render(<ImageProcessingSection />);
      const file = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], '', { type: 'image/png' });

      const event = pasteEvent(document.body, [imageItem(file)]);

      expect(event.defaultPrevented).toBe(true);
      await waitFor(() => expect(serviceMocks.processImage).toHaveBeenCalledOnce());
      const sent = serviceMocks.processImage.mock.calls[0][0].get('file');
      expect(sent.name).toBe('pasted-image.png');
      expect(sent.type).toBe('image/png');
      expect(serviceMocks.validateFile).toHaveBeenCalledOnce();
    });

    it('ignores pasted text', () => {
      render(<ImageProcessingSection />);

      const event = pasteEvent(document.body, [{ kind: 'string', type: 'text/plain', getAsFile: () => null }]);

      expect(event.defaultPrevented).toBe(false);
      expect(serviceMocks.validateFile).not.toHaveBeenCalled();
    });

    it('ignores pastes made inside a text input', () => {
      render(
        <>
          <input aria-label="url" />
          <ImageProcessingSection />
        </>
      );
      const file = new File(['x'], 'a.png', { type: 'image/png' });

      const event = pasteEvent(screen.getByLabelText('url'), [imageItem(file)]);

      expect(event.defaultPrevented).toBe(false);
      expect(serviceMocks.validateFile).not.toHaveBeenCalled();
    });

    it('shows the validation error for an unsupported pasted image', async () => {
      serviceMocks.validateFile.mockRejectedValue(new Error('Invalid file type'));
      render(<ImageProcessingSection />);
      const file = new File(['x'], 'a.gif', { type: 'image/gif' });

      pasteEvent(document.body, [imageItem(file)]);

      expect(await screen.findByText(/Invalid file type/)).toBeInTheDocument();
      expect(serviceMocks.processImage).not.toHaveBeenCalled();
    });

    it('removes the paste listener on unmount', () => {
      const { unmount } = render(<ImageProcessingSection />);
      unmount();
      const file = new File(['x'], 'a.png', { type: 'image/png' });

      const event = pasteEvent(document.body, [imageItem(file)]);

      expect(event.defaultPrevented).toBe(false);
      expect(serviceMocks.validateFile).not.toHaveBeenCalled();
    });
  });

  it('does not process files dropped outside the upload area', () => {
    const file = new File(['image'], 'sample.jpg', { type: 'image/jpeg' });
    render(<ImageProcessingSection />);

    fireEvent.drop(document.body, { dataTransfer: { files: [file], types: ['Files'] } });

    expect(serviceMocks.validateFile).not.toHaveBeenCalled();
    expect(serviceMocks.processImage).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'unsupported',
      file: () => new File(['not an image'], 'document.gif', { type: 'image/gif' }),
      message: 'Invalid file type'
    },
    {
      name: 'oversized',
      file: () => new File([new Uint8Array(12 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' }),
      message: 'File size exceeds'
    }
  ])('surfaces validation errors for a dropped $name file', async ({ file: createFile, message }) => {
    const file = createFile();
    serviceMocks.validateFile.mockRejectedValue(new Error(message));
    const { container } = render(<ImageProcessingSection />);
    const dropArea = screen.getByRole('region', { name: 'Image upload drop area' });

    fireEvent.drop(dropArea, { dataTransfer: { files: [file], types: ['Files'] } });

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(serviceMocks.processImage).not.toHaveBeenCalled();
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument();
  });
});

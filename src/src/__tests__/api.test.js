import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { ApiService } from '../services/api';
import { MAX_FILE_SIZE } from '../utils/securityUtils';
import { API_CONFIG } from '../config/apiConfig';

vi.mock('axios', () => ({
  default: { post: vi.fn() }
}));

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.post.mockResolvedValue({ data: {} });
  });

  it('posts image form data with the supported upload limit', async () => {
    const formData = new FormData();

    await ApiService.processImage(formData);

    expect(axios.post).toHaveBeenCalledWith(
      API_CONFIG.OCR_ENDPOINT,
      formData,
      expect.objectContaining({
        timeout: 30000,
        maxContentLength: MAX_FILE_SIZE,
        maxBodyLength: MAX_FILE_SIZE
      })
    );
  });

  it('posts translation requests as JSON', async () => {
    const request = { textChunks: ['Hello'], targetLanguage: 'es' };

    await ApiService.translateText(request);

    expect(axios.post).toHaveBeenCalledWith(
      API_CONFIG.TRANSLATE_ENDPOINT,
      request,
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });
});

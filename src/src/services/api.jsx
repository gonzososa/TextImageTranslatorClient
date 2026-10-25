import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';
import { MAX_FILE_SIZE } from '../utils/securityUtils';

export const ApiService = {
  async processImage(formData) {
    return axios.post (API_CONFIG.OCR_ENDPOINT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
      maxContentLength: MAX_FILE_SIZE,
      maxBodyLength: MAX_FILE_SIZE
    });
  },

  async translateText(data) {
    return axios.post(API_CONFIG.TRANSLATE_ENDPOINT, data, {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
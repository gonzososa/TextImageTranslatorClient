import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig';

export const ApiService = {
  async processImage(formData) {
    return axios.post (API_CONFIG.OCR_ENDPOINT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
      maxContentLength: 5 * 1024 * 1024,
      maxBodyLength: 5 * 1024 * 1024
    });
  },

  async translateText(data) {
    return axios.post(API_CONFIG.TRANSLATE_ENDPOINT, data, {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
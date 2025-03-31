const env = import.meta.env;

export const API_CONFIG = {
    OCR_ENDPOINT: env.VITE_APP_OCR_ENDPOINT,
    TRANSLATE_ENDPOINT: env.VITE_APP_TRANSLATE_ENDPOINT
};
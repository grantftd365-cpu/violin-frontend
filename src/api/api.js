import axios from 'axios';
import { Platform } from 'react-native';

// For Android Emulator, use 10.0.2.2. For physical device, use your machine's IP.
// On iOS Simulator, localhost works.
const DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://localhost:8000',
  default: 'http://localhost:8000',
});

// Use environment variable in production, fallback to dev URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEV_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Long timeout for transcription
});

export const searchImslp = async (keyword) => {
  try {
    const response = await api.post('/search/imslp', { keyword });
    return response.data;
  } catch (error) {
    console.error('Error searching IMSLP:', error);
    throw error;
  }
};

export const browseViolin = async () => {
  try {
    const response = await api.get('/browse/violin');
    return response.data;
  } catch (error) {
    console.error('Error browsing violin:', error);
    throw error;
  }
};

export const transcribeYoutube = async (url) => {
  try {
    const response = await api.post('/transcribe/youtube', { url });
    return response.data;
  } catch (error) {
    console.error('Error transcribing YouTube:', error);
    throw error;
  }
};

export default api;

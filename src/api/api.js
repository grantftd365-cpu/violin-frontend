import axios from 'axios';
import { Platform } from 'react-native';

// For Android Emulator, use 10.0.2.2. For physical device, use your machine's IP.
// On iOS Simulator, localhost works.
const DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://localhost:8000',
  default: 'http://localhost:8000',
});

// Use environment variable in production, fallback to hardcoded Render URL, then dev URL
// CRITICAL: Pointing to Alibaba Cloud server (HTTP) to match frontend (HTTP)
const PROD_API_URL = 'http://47.251.244.43:8000';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || PROD_API_URL;

console.log('API_BASE_URL configured:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for YouTube download + AI transcription on free tier
});

export const testBackendConnection = async () => {
  try {
    console.log('Testing backend connection to:', API_BASE_URL);
    const response = await api.get('/');
    console.log('Backend health check passed:', response.data);
    return { success: true, url: API_BASE_URL };
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return { 
      success: false, 
      error: error.message,
      url: API_BASE_URL
    };
  }
};

export const searchImslp = async (keyword) => {
  try {
    console.log(`[API] Searching IMSLP for: ${keyword}`);
    const response = await api.post('/search/imslp', { keyword });
    console.log(`[API] IMSLP search results:`, response.data);
    return response.data;
  } catch (error) {
    console.error('[API] IMSLP search error:', error);
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
    console.log(`Requesting transcription for: ${url}`);
    const response = await api.post('/transcribe/youtube', { url });
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Response data type:', typeof response.data);
    console.log('Response data keys:', response.data ? Object.keys(response.data) : 'null');
    return response.data;
  } catch (error) {
    console.error('Error transcribing YouTube:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    throw error;
  }
};

export const uploadAudio = async (file, onProgress) => {
  try {
    console.log(`Uploading audio file: ${file.name} (${file.size} bytes)`);
    
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
        formData.append('file', file);
    } else {
        // Native FormData requires { uri, name, type }
        formData.append('file', {
            uri: file.uri,
            name: file.name || 'upload.mp3',
            type: file.mimeType || 'audio/mp3'
        });
    }
    
    const response = await api.post('/transcribe/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes for processing
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
        if (onProgress) onProgress(percentCompleted);
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
};

export default api;

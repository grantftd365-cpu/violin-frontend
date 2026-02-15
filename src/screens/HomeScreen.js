import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { transcribeYoutube, testBackendConnection, uploadAudio, searchImslp } from '../api/api';
import SheetMusicViewer from '../components/SheetMusicViewer';

const HomeScreen = () => {
  const [url, setUrl] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [musicXml, setMusicXml] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // Test that alerts work
    setTimeout(() => {
      alert('App Loaded - Alerts Working (v2.2)');
    }, 1000);

    // Check backend connection on load
    const checkConnection = async () => {
      const result = await testBackendConnection();
      if (!result.success) {
        alert(`Connection Error: Cannot reach backend at ${result.url}. \n\nError: ${result.error}\n\nPlease check your VPN connection.`);
      }
    };
    checkConnection();
  }, []);

  const downloadMusicXML = () => {
    if (!musicXml) return;
    
    // Create filename based on timestamp
    const filename = `violin-sheet-${Date.now()}.musicxml`;
    
    // Create blob from XML string
    const blob = new Blob([musicXml], { type: 'application/vnd.recordare.musicxml+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event) => {
    // STEP 1: File selection
    alert('Debug: Step 1/6: File input triggered!');
    
    const file = event.target.files[0];
    if (!file) {
      alert('Debug: Error: No file selected');
      return;
    }
    
    // STEP 2: Validation
    alert(`Debug: Step 2/6: Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Validate file size (max 100MB for video)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert(`Error: File too large. Maximum size is 100MB.`);
      return;
    }
    
    // STEP 3: State update
    alert('Debug: Step 3/6: Starting upload process...');
    setIsLoading(true);
    setUploadProgress(0);
    setStatusMessage(`Uploading ${file.name}...`);
    setMusicXml(null);
    
    // Clear any existing timer
    if (window.progressTimer) clearInterval(window.progressTimer);
    
    try {
      // STEP 4: Call API
      alert('Debug: Step 4/6: Sending file to backend...');
      
      const result = await uploadAudio(file, (progress) => {
        setUploadProgress(progress);
        if (progress < 100) {
          setStatusMessage(`Uploading: ${progress}%`);
        } else {
          setStatusMessage('Upload complete! Processing on server...');
          
          // Start the processing timer only AFTER upload is done
          if (!window.progressTimer) {
            let elapsedSeconds = 0;
            window.progressTimer = setInterval(() => {
              elapsedSeconds += 5;
              setStatusMessage(prev => {
                if (elapsedSeconds <= 5) return 'Processing: Analyzing audio structure...';
                if (elapsedSeconds === 10) return 'Processing: Transcribing to MIDI (AI model running)...';
                if (elapsedSeconds === 20) return 'Processing: Converting MIDI to Sheet Music...';
                if (elapsedSeconds === 30) return 'Processing: Formatting notation...';
                if (elapsedSeconds === 45) return 'Still working... (Large files take longer)';
                if (elapsedSeconds === 60) return 'Almost done... (1m elapsed)';
                if (elapsedSeconds >= 90) return `Still processing (${Math.floor(elapsedSeconds)}s)...`;
                return prev;
              });
            }, 5000);
          }
        }
      });
      
      // STEP 5: Response received
      if (window.progressTimer) clearInterval(window.progressTimer);
      window.progressTimer = null;
      
      // Check for AcoustID recognition
      if (result.recognized && result.metadata) {
        alert(
          `🎵 Song Recognized!\n\n` +
          `Title: ${result.metadata.title}\n` +
          `Artist: ${result.metadata.artist}\n\n` +
          `(Generating AI transcription for you now...)`
        );
      }

      alert(`Debug: Step 5/6: Response received!\nKeys: ${result ? Object.keys(result).join(', ') : 'null'}\nXML Length: ${result?.musicxml?.length}`);
      
      setStatusMessage('Done!');
      
      if (result && result.musicxml && typeof result.musicxml === 'string' && result.musicxml.length > 0) {
        // STEP 6: Setting State
        alert('Debug: Step 6/6: Setting sheet music state...');
        setMusicXml(result.musicxml);
      } else {
        alert('Error: No sheet music generated from uploaded file');
      }
    } catch (error) {
      console.error(error);
      alert(`Debug: Catch Error\nCode: ${error.code}\nMessage: ${error.message}\nResponse: ${JSON.stringify(error.response?.data)}`);
      
      let errorMessage = 'Failed to process uploaded audio.';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The file may be too large or the server is busy.';
      } else if (error.response?.data?.detail) {
        errorMessage = `Backend Error: ${error.response.data.detail}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(`Upload Failed: ${errorMessage}`);
      setStatusMessage('Failed');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleTranscribe = async () => {
    if (!url) {
      Alert.alert('Error', 'Please enter a YouTube or Bilibili URL');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Downloading audio...');
    setMusicXml(null);

    try {
      // Simulate progress updates for better UX since backend is one big request
      let elapsedSeconds = 0;
      const progressTimer = setInterval(() => {
        elapsedSeconds += 10;
        setStatusMessage(prev => {
          if (elapsedSeconds === 10) return 'Downloading audio from YouTube/Bilibili...';
          if (elapsedSeconds === 20) return 'Transcribing to MIDI... (this takes ~30s)';
          if (elapsedSeconds === 30) return 'Converting to Sheet Music...';
          if (elapsedSeconds === 60) return 'Still working... AI is analyzing the audio (1m)...';
          if (elapsedSeconds === 90) return 'Almost there... generating sheet music (1m30s)...';
          if (elapsedSeconds === 120) return 'Processing notes and rhythms (2m)...';
          if (elapsedSeconds === 150) return 'Finalizing sheet music (2m30s)...';
          if (elapsedSeconds === 180) return 'Still processing... (3m) - free tier is slow...';
          return prev;
        });
      }, 10000);

      const result = await transcribeYoutube(url);
      
      // DEBUG: Alert exactly what we received to diagnose missing data
      alert(
        `Debug: Backend Response\nKeys: ${result ? Object.keys(result).join(', ') : 'null'}\nmusicxml length: ${result && result.musicxml ? result.musicxml.length : '0/undefined'}\nPreview: ${JSON.stringify(result).slice(0, 100)}`
      );

      clearInterval(progressTimer);
      setStatusMessage('Done!');
      
      if (result && result.musicxml && typeof result.musicxml === 'string' && result.musicxml.length > 0) {
        setMusicXml(result.musicxml);
      } else {
        alert('Error: No sheet music generated. Backend returned empty result.');
      }
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message || 'Unknown error occurred'}`);
      setStatusMessage('Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImslpSearch = () => {
    if (!searchKeyword.trim()) {
      alert('Please enter a song name to search');
      return;
    }
    
    // Construct Google Search URL targeting IMSLP PDFs
    // site:imslp.org -> Restrict to IMSLP
    // filetype:pdf -> Only PDF files
    // violin -> Ensure it's for violin
    const query = `site:imslp.org filetype:pdf ${searchKeyword} violin`;
    // Use cn.bing.com because Google is blocked in China
    const searchUrl = `https://cn.bing.com/search?q=${encodeURIComponent(query)}`;
    
    if (Platform.OS === 'web') {
      window.open(searchUrl, '_blank');
    } else {
      alert(`Search feature requires browser. Please visit:\n${searchUrl}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Violin Sheet Gen (v2.9)</Text>
        <Text style={styles.subtitle}>YouTube / Bilibili to Sheet Music</Text>
      </View>

      {/* IMSLP Search Section */}
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Find Standard Sheet Music (IMSLP)</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search song (e.g. Liang Zhu, Canon)"
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            autoCapitalize="none"
          />
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={handleImslpSearch}
          >
            <Text style={styles.searchButtonText}>
              Search Bing
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Results removed - opening in new tab instead */}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Paste YouTube or Bilibili Link"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleTranscribe}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Processing...' : 'Generate Sheet'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.uploadSection}>
        <Text style={styles.orText}>OR</Text>
        
        {/* Hidden file input */}
        {Platform.OS === 'web' ? (
          <input
            type="file"
            id="audio-upload"
            accept=".mp3,.wav,.m4a,.ogg,.flac,.aac,.wma,.mp4,.mov,.avi,.webm,.mkv,audio/*,video/*"
            style={{ 
              opacity: 0, 
              position: 'absolute', 
              height: 1, 
              width: 1,
              top: -1000,
              left: -1000,
              pointerEvents: 'none'
            }}
            onChange={handleFileUpload}
          />
        ) : null}

        <TouchableOpacity 
          style={[styles.uploadButton, isLoading && styles.buttonDisabled]}
          onPress={() => {
            if (Platform.OS === 'web') {
              alert('Button pressed - opening file picker...');
              document.getElementById('audio-upload').click();
            } else {
              alert('Not Supported: File upload not supported on native yet');
            }
          }}
          disabled={isLoading}
        >
          <Text style={styles.uploadButtonText}>
            {isLoading ? 'Uploading...' : 'Upload Audio/Video File'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.uploadHint}>
          Supports: MP3, MP4, WAV, MOV, M4A, AVI, OGG... (Max 100MB)
        </Text>
      </View>

      {isLoading && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{statusMessage}</Text>
          {uploadProgress > 0 && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
            </View>
          )}
          {uploadProgress > 0 && <Text style={styles.progressText}>{uploadProgress}%</Text>}
        </View>
      )}

      <View style={styles.viewerContainer}>
        {musicXml ? (
          <>
            <SheetMusicViewer musicXml={musicXml} isLoading={false} />
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.downloadBtn]}
                onPress={downloadMusicXML}
              >
                <Text style={styles.actionButtonText}>Download MusicXML</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.printBtn]}
                onPress={() => {
                  if (typeof window !== 'undefined' && window.print) {
                    window.print();
                  } else {
                    alert('Print: Printing not available on this device');
                  }
                }}
              >
                <Text style={styles.actionButtonText}>Print Sheet (PDF)</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          !isLoading && (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                Enter a song link to generate violin sheet music instantly.
              </Text>
              <Text style={styles.placeholderSubtext}>
                Powered by Basic Pitch AI & Music21
              </Text>
            </View>
          )
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchSection: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#fafafa',
  },
  searchButton: {
    backgroundColor: '#5856D6',
    width: 80,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  resultsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#555',
  },
  resultItem: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  resultLink: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  
  inputContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  uploadSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  orText: {
    color: '#999',
    marginVertical: 10,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#FF9500', // Orange color for upload
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 30,
    marginBottom: 5,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  uploadHint: {
    fontSize: 12,
    color: '#999',
  },
  statusContainer: {
    padding: 10,
    alignItems: 'center',
    width: '100%',
  },
  progressBarContainer: {
    width: '80%',
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginTop: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
  },
  statusText: {
    textAlign: 'center',
    margin: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  viewerContainer: {
    flex: 1,
    margin: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
  },
  downloadButton: {
    display: 'none', // Deprecated, replaced by buttonContainer
  },
  downloadButtonText: {
    display: 'none', // Deprecated
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    backgroundColor: '#34C759',
  },
  printBtn: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  }
});

export default HomeScreen;

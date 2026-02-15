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
import { transcribeYoutube, testBackendConnection } from '../api/api';
import SheetMusicViewer from '../components/SheetMusicViewer';

const HomeScreen = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [musicXml, setMusicXml] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // Check backend connection on load
    const checkConnection = async () => {
      const result = await testBackendConnection();
      if (!result.success) {
        Alert.alert(
          'Connection Error',
          `Cannot reach backend at ${result.url}. \n\nError: ${result.error}\n\nPlease check your VPN connection.`
        );
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
      
      clearInterval(progressTimer);
      setStatusMessage('Done!');
      
      if (result.musicxml) {
        setMusicXml(result.musicxml);
      } else {
        Alert.alert('Error', 'No sheet music generated');
      }
    } catch (error) {
      console.error(error);
      let errorMessage = 'Failed to generate sheet music.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out after 5 minutes. The backend is taking too long.\n\nPossible causes:\n- Free tier cold start (try again)\n- Long video (try a shorter one)\n- Backend is overloaded';
      } else if (error.response && error.response.data && error.response.data.detail) {
        errorMessage = `Backend Error: ${error.response.data.detail}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      Alert.alert('Generation Failed', errorMessage);
      setStatusMessage('Failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Violin Sheet Gen</Text>
        <Text style={styles.subtitle}>YouTube / Bilibili to Sheet Music</Text>
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

      {isLoading && (
        <Text style={styles.statusText}>{statusMessage}</Text>
      )}

      <View style={styles.viewerContainer}>
        {musicXml ? (
          <>
            <SheetMusicViewer musicXml={musicXml} isLoading={false} />
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={downloadMusicXML}
            >
              <Text style={styles.downloadButtonText}>Download MusicXML</Text>
            </TouchableOpacity>
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
    backgroundColor: '#34C759',
    padding: 12,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  }
});

export default HomeScreen;

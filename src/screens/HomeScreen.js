import React, { useState } from 'react';
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
import { transcribeYoutube } from '../api/api';
import SheetMusicViewer from '../components/SheetMusicViewer';

const HomeScreen = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [musicXml, setMusicXml] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const handleTranscribe = async () => {
    if (!url) {
      Alert.alert('Error', 'Please enter a YouTube URL');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Downloading audio...');
    setMusicXml(null);

    try {
      // Simulate progress updates for better UX since backend is one big request
      const progressTimer = setInterval(() => {
        setStatusMessage(prev => {
            if (prev === 'Downloading audio...') return 'Transcribing to MIDI... (this takes ~30s)';
            if (prev.startsWith('Transcribing')) return 'Converting to Sheet Music...';
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
      Alert.alert('Error', 'Failed to generate sheet music. Ensure backend is running.');
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
        <Text style={styles.subtitle}>YouTube to Sheet Music</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Paste YouTube Link"
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
          <SheetMusicViewer musicXml={musicXml} isLoading={false} />
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
  }
});

export default HomeScreen;

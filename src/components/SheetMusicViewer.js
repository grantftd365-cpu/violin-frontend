import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

// Helper to base64 encode unicode strings
const utf8_to_b64 = (str) => {
  return window.btoa(unescape(encodeURIComponent(str)));
};

const SheetMusicViewer = ({ musicXml, isLoading }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorTitle}>Failed to render sheet music</Text>
        <Text style={styles.errorText}>Viewer Error: {errorMsg}</Text>
        <Text style={styles.errorSubtext}>Try downloading the file instead.</Text>
      </View>
    );
  }

  if (!musicXml) {
    return null;
  }

  // Use base64 encoding to safely pass XML to WebView
  // In React Native environment, we might need a polyfill or Buffer, 
  // but let's try a safer string replacement first if btoa isn't available
  // Or better: Pass it via postMessage after load, but injecting is simpler if encoded right.
  // We'll use a robust escaping for now, or assume XML is clean.
  // Actually, let's use a simpler approach: encodeURI inside the template literal.
  
  const encodedXml = encodeURIComponent(musicXml);

  // HTML content that loads OpenSheetMusicDisplay via CDN and renders the passed XML
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/opensheetmusicdisplay/1.8.8/opensheetmusicdisplay.min.js"></script>
        <style>
          body { margin: 0; padding: 0; background-color: #fff; height: 100vh; display: flex; flex-direction: column; }
          #osmdCanvas { flex: 1; width: 100%; overflow-y: auto; }
          #error-msg { color: red; padding: 20px; display: none; }
        </style>
      </head>
      <body>
        <div id="error-msg"></div>
        <div id="osmdCanvas"></div>
        <script>
          // Error handler
          window.onerror = function(msg, url, line) {
            document.getElementById('error-msg').style.display = 'block';
            document.getElementById('error-msg').innerText = 'Error: ' + msg;
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', message: msg}));
          };

          try {
            var osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("osmdCanvas", {
              autoResize: true,
              backend: "svg",
              drawingParameters: "compacttight", // Optimize for mobile
              drawTitle: true,
            });

            // Decode the URI component
            var musicXml = decodeURIComponent("${encodedXml}");

            osmd.load(musicXml).then(function() {
              osmd.render();
              window.ReactNativeWebView.postMessage(JSON.stringify({type: 'success', message: 'Rendered'}));
            }, function(err) {
              throw err;
            });
          } catch (e) {
            document.getElementById('error-msg').style.display = 'block';
            document.getElementById('error-msg').innerText = 'Render Error: ' + e.message;
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', message: e.message}));
          }
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <iframe
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Sheet Music"
        />
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              console.log('WebView Message:', data);
              if (data.type === 'error') {
                setHasError(true);
                setErrorMsg(data.message);
              }
            } catch (e) {
              console.log('WebView Raw Message:', event.nativeEvent.data);
            }
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
            setHasError(true);
            setErrorMsg('WebView failed to load');
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    minHeight: 400, // Ensure minimum height
    borderWidth: 1,
    borderColor: '#eee',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff0f0',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 5,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#666',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
  },
});

export default SheetMusicViewer;

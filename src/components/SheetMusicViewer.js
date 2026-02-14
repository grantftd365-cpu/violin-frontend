import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const SheetMusicViewer = ({ musicXml, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!musicXml) {
    return null;
  }

  // HTML content that loads OpenSheetMusicDisplay via CDN and renders the passed XML
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/opensheetmusicdisplay/1.8.8/opensheetmusicdisplay.min.js"></script>
        <style>
          body { margin: 0; padding: 0; background-color: #fff; }
          #osmdCanvas { width: 100%; height: 100vh; overflow-y: scroll; }
        </style>
      </head>
      <body>
        <div id="osmdCanvas"></div>
        <script>
          var osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("osmdCanvas", {
            autoResize: true,
            backend: "svg",
            drawingParameters: "compacttight", // Optimize for mobile
            drawTitle: true,
          });

          // The XML content is injected here
          var musicXml = \`${musicXml.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;

          osmd.load(musicXml).then(function() {
            osmd.render();
          }, function(err) {
            console.error(err);
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', message: err.message}));
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={(event) => {
          console.log('WebView Message:', event.nativeEvent.data);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
  },
});

export default SheetMusicViewer;

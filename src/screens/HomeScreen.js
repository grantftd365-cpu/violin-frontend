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
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { transcribeYoutube, testBackendConnection, uploadAudio } from '../api/api';
import SheetMusicViewer from '../components/SheetMusicViewer';

// --- TRANSLATIONS ---
const TEXT = {
  en: {
    title: "Violin Master",
    subtitle: "AI-Powered Sheet Music Generator",
    badge: "✨ Smart Recognition",
    uploadTitle: "Upload Audio or Video",
    uploadSubtitle: "Tap to select MP3, MP4, WAV...",
    uploadFormats: ["MP3", "MP4", "WAV"],
    searchLabel: "Find Professional Scores",
    searchPlaceholder: "🔍 Search (e.g. Liang Zhu, Canon)",
    searchButton: "Search",
    searchHint: "Searches IMSLP, Musescore & more",
    recognized: "🎵 Song Identified",
    by: "by",
    findSheetMusic: "Find Sheet Music →",
    dismiss: "Dismiss",
    processing: "Processing...",
    uploading: (percent) => `Uploading: ${percent}%`,
    generatedTitle: "Generated Sheet Music",
    aiTranscribed: "AI Transcribed",
    download: "Download XML",
    print: "Print PDF",
    emptyTitle: "Ready to Create",
    emptyText: "Upload audio or paste a link to begin",
    errorLargeFile: "File too large. Max 100MB.",
    errorNoSelection: "No file selected",
    linkPlaceholder: "Paste YouTube or Bilibili Link",
    generateButton: "Generate",
    language: "Language",
  },
  zh: {
    title: "AI谱",
    subtitle: "AI 智能乐谱生成器",
    badge: "✨ 智能听歌识曲",
    uploadTitle: "上传音频或视频",
    uploadSubtitle: "点击选择 MP3, MP4, WAV, 录屏...",
    uploadFormats: ["MP3", "MP4", "WAV"],
    searchLabel: "查找专业乐谱",
    searchPlaceholder: "🔍 搜索 (如: 梁祝, 卡农)",
    searchButton: "全网搜谱",
    searchHint: "搜索 IMSLP、虫虫钢琴、简谱网等",
    recognized: "🎵 识别成功",
    by: "艺术家",
    findSheetMusic: "查找标准乐谱 →",
    dismiss: "关闭",
    processing: "正在处理...",
    uploading: (percent) => `上传中: ${percent}%`,
    generatedTitle: "AI 生成乐谱",
    aiTranscribed: "AI 听写版",
    download: "下载 XML",
    print: "打印 / 存PDF",
    emptyTitle: "开始创作",
    emptyText: "上传音频或粘贴链接",
    errorLargeFile: "文件过大，最大 100MB",
    errorNoSelection: "未选择文件",
    linkPlaceholder: "粘贴 Bilibili / YouTube 链接",
    generateButton: "生成乐谱",
    language: "语言",
  }
};

const HomeScreen = () => {
  const [url, setUrl] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [musicXml, setMusicXml] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [recognizedSong, setRecognizedSong] = useState(null);
  const [lang, setLang] = useState('zh'); // Default to Chinese

  const t = (key, ...args) => {
    const val = TEXT[lang][key];
    return typeof val === 'function' ? val(...args) : val;
  };

  useEffect(() => {
    const checkConnection = async () => {
      const result = await testBackendConnection();
      if (!result.success) {
        alert(`Connection Error: ${result.error}`);
      }
    };
    checkConnection();
  }, []);

  const handleFileUpload = async (event) => {
    // WEB ONLY HANDLER
    const file = event.target.files[0];
    if (!file) return;
    await processFile(file);
    event.target.value = '';
  };

  const handleNativePick = async () => {
    // NATIVE ONLY HANDLER
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      await processFile(file);
    } catch (err) {
      alert('Error picking file: ' + err.message);
    }
  };

  const processFile = async (file) => {
    // SHARED UPLOAD LOGIC
    const maxSize = 100 * 1024 * 1024; 
    // Handle size check for both Web (file.size) and Native (file.size)
    if (file.size > maxSize) {
      alert(t('errorLargeFile'));
      return;
    }
    
    setIsLoading(true);
    setUploadProgress(0);
    setStatusMessage(t('uploading', 0));
    setMusicXml(null);
    setRecognizedSong(null);
    
    if (window.progressTimer) clearInterval(window.progressTimer);
    
    try {
      const result = await uploadAudio(file, (progress) => {
        setUploadProgress(progress);
        if (progress < 100) {
          setStatusMessage(t('uploading', progress));
        } else {
          setStatusMessage('Processing on server...');
          // Start fake progress
          if (!window.progressTimer) {
            let elapsed = 0;
            window.progressTimer = setInterval(() => {
              elapsed += 5;
              setStatusMessage(`Processing: ${elapsed}s... AI is listening...`);
            }, 5000);
          }
        }
      });
      
      if (window.progressTimer) clearInterval(window.progressTimer);
      window.progressTimer = null;
      
      // Recognition Logic
      if (result.recognized && result.metadata) {
        const title = result.metadata.title;
        const artist = result.metadata.artist;
        const query = `${title} ${artist} violin sheet music 小提琴谱`;
        
        setRecognizedSong({ title, artist, query });
        setSearchKeyword(`${title} ${artist}`);
      }

      setStatusMessage('Done!');
      
      if (result && result.musicxml && result.musicxml.length > 0) {
        setMusicXml(result.musicxml);
      } else {
        alert('Error: Backend returned empty result.');
      }
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
      setStatusMessage('Failed');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleImslpSearch = () => {
    if (!searchKeyword.trim()) {
      alert(t('searchPlaceholder'));
      return;
    }
    const query = `${searchKeyword} violin sheet music 小提琴谱`;
    const searchUrl = `https://cn.bing.com/search?q=${encodeURIComponent(query)}`;
    
    if (Platform.OS === 'web') {
      window.open(searchUrl, '_blank');
    } else {
      alert(`Search URL: ${searchUrl}`);
    }
  };

  const handleTranscribe = async () => {
    if (!url) { alert('Please enter URL'); return; }
    setIsLoading(true);
    setStatusMessage('Downloading...');
    setMusicXml(null);
    try {
      const result = await transcribeYoutube(url);
      if (result.recognized && result.metadata) {
         setRecognizedSong({ 
             title: result.metadata.title, 
             artist: result.metadata.artist,
             query: `${result.metadata.title} ${result.metadata.artist} violin sheet music`
         });
      }
      if (result.musicxml) setMusicXml(result.musicxml);
    } catch (e) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadMusicXML = () => {
    if (!musicXml) return;
    const filename = `violin-sheet-${Date.now()}.musicxml`;
    const blob = new Blob([musicXml], { type: 'application/vnd.recordare.musicxml+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HERO HEADER */}
        <View style={styles.heroHeader}>
          {/* Language Toggle */}
          <View style={styles.langToggle}>
            <TouchableOpacity 
              style={[styles.langButton, lang === 'en' && styles.langActive]}
              onPress={() => setLang('en')}
            >
              <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.langButton, lang === 'zh' && styles.langActive]}
              onPress={() => setLang('zh')}
            >
              <Text style={[styles.langText, lang === 'zh' && styles.langTextActive]}>中</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.iconContainer}>
            <Text style={styles.appIcon}>🎻</Text>
          </View>
          <Text style={styles.appTitle}>{t('title')} v4.0</Text>
          <Text style={styles.appTagline}>{t('subtitle')}</Text>
          
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('badge')}</Text>
          </View>
        </View>

        {/* UPLOAD HERO */}
        <View style={styles.uploadHero}>
          <TouchableOpacity 
            style={styles.uploadZone}
            onPress={() => {
              if (Platform.OS === 'web') {
                document.getElementById('audio-upload').click();
              } else {
                handleNativePick();
              }
            }}
            activeOpacity={0.9}
          >
            <View style={styles.uploadIconCircle}>
              <Text style={styles.uploadIcon}>📁</Text>
            </View>
            <Text style={styles.uploadTitle}>{t('uploadTitle')}</Text>
            <Text style={styles.uploadSubtitle}>{t('uploadSubtitle')}</Text>
            <View style={styles.supportedFormats}>
              {t('uploadFormats').map((f, i) => (
                <Text key={i} style={styles.formatBadge}>{f}</Text>
              ))}
            </View>
          </TouchableOpacity>
          
          {/* Hidden Input (Web Only) */}
          {Platform.OS === 'web' && (
            <input
              type="file"
              id="audio-upload"
              accept=".mp3,.wav,.m4a,.ogg,.flac,.aac,.wma,.mp4,.mov,.avi,.webm,.mkv,audio/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          )}
        </View>

        {/* RECOGNITION CARD */}
        {recognizedSong && (
          <View style={[styles.resultCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.pulseDot} />
              <Text style={styles.cardTitle}>{t('recognized')}</Text>
            </View>
            <View style={styles.songInfo}>
              <Text style={styles.songTitle}>{recognizedSong.title}</Text>
              <Text style={styles.songArtist}>{t('by')} {recognizedSong.artist}</Text>
            </View>
            <TouchableOpacity 
              style={styles.primaryAction}
              onPress={() => {
                const bingUrl = `https://cn.bing.com/search?q=${encodeURIComponent(recognizedSong.query)}`;
                window.open(bingUrl, '_blank');
              }}
            >
              <Text style={styles.primaryActionText}>{t('findSheetMusic')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryAction} 
              onPress={() => setRecognizedSong(null)}
            >
              <Text style={styles.secondaryActionText}>{t('dismiss')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchLabel}>{t('searchLabel')}</Text>
          <View style={styles.floatingSearch}>
            <TextInput 
              style={styles.searchInputPremium}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor="#9E9E9E"
              value={searchKeyword}
              onChangeText={setSearchKeyword}
            />
            <TouchableOpacity 
              style={styles.searchButtonPremium}
              onPress={handleImslpSearch}
            >
              <Text style={styles.searchButtonText}>{t('searchButton')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.searchHint}>{t('searchHint')}</Text>
        </View>

        {/* LINK SECTION */}
        <View style={styles.linkSection}>
          <Text style={styles.searchLabel}>{t('linkPlaceholder')}</Text>
          <View style={styles.floatingSearch}>
            <TextInput 
              style={styles.searchInputPremium}
              placeholder="URL..."
              value={url}
              onChangeText={setUrl}
            />
            <TouchableOpacity 
              style={[styles.searchButtonPremium, { backgroundColor: '#FF5722' }]}
              onPress={handleTranscribe}
            >
              <Text style={styles.searchButtonText}>{t('generateButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PROGRESS OVERLAY */}
        {isLoading && (
          <View style={styles.progressOverlay}>
            <View style={styles.progressCard}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.progressTitle}>{statusMessage}</Text>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* VIEWER */}
        <View style={styles.viewerContainerPremium}>
          {musicXml ? (
            <>
              <View style={styles.viewerHeader}>
                <Text style={styles.viewerTitle}>{t('generatedTitle')}</Text>
                <View style={styles.qualityBadge}>
                  <Text style={styles.qualityText}>{t('aiTranscribed')}</Text>
                </View>
              </View>
              <SheetMusicViewer musicXml={musicXml} isLoading={false} />
              <View style={styles.actionBar}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonDownload]}
                  onPress={downloadMusicXML}
                >
                  <Text style={styles.actionButtonText}>{t('download')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonPrint]}
                  onPress={() => window.print()}
                >
                  <Text style={styles.actionButtonTextOutline}>{t('print')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎼</Text>
              <Text style={styles.emptyTitle}>{t('emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('emptyText')}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D47A1' },
  scrollContent: { paddingBottom: 40 },
  
  // HEADER
  heroHeader: {
    backgroundColor: '#1A237E',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    elevation: 10,
  },
  langToggle: {
    position: 'absolute',
    top: 10,
    right: 15,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 2,
  },
  langButton: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  langActive: { backgroundColor: '#FFD700' },
  langText: { fontSize: 12, color: '#FFF', fontWeight: '600' },
  langTextActive: { color: '#1A237E' },
  
  iconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10, borderWidth: 2, borderColor: '#FFD700',
  },
  appIcon: { fontSize: 40 },
  appTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  appTagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 5 },
  badge: {
    backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, marginTop: 15,
  },
  badgeText: { color: '#1A237E', fontWeight: 'bold', fontSize: 12 },

  // UPLOAD
  uploadHero: { padding: 20, marginTop: -30 },
  uploadZone: {
    backgroundColor: '#FFF', borderRadius: 24, padding: 30,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1,
    elevation: 8,
  },
  uploadIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8EAF6', justifyContent: 'center', alignItems: 'center',
    marginBottom: 15,
  },
  uploadIcon: { fontSize: 40 },
  uploadTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A237E', marginBottom: 5 },
  uploadSubtitle: { fontSize: 14, color: '#757575', marginBottom: 15 },
  supportedFormats: { flexDirection: 'row', gap: 8 },
  formatBadge: {
    backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, fontSize: 12, color: '#5C6BC0', fontWeight: 'bold',
  },

  // RECOGNITION CARD
  resultCard: {
    backgroundColor: '#E3F2FD', marginHorizontal: 20, marginBottom: 20,
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#2196F3',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#1976D2' },
  songTitle: { fontSize: 22, fontWeight: 'bold', color: '#0D47A1', marginBottom: 4 },
  songArtist: { fontSize: 16, color: '#546E7A', marginBottom: 15 },
  primaryAction: {
    backgroundColor: '#2196F3', padding: 12, borderRadius: 10, alignItems: 'center',
  },
  primaryActionText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  secondaryAction: { alignItems: 'center', padding: 10 },
  secondaryActionText: { color: '#757575' },

  // SEARCH
  searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
  searchLabel: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 10, marginLeft: 5 },
  floatingSearch: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14,
    padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
  },
  searchInputPremium: { flex: 1, height: 45, paddingHorizontal: 15, fontSize: 16 },
  searchButtonPremium: {
    backgroundColor: '#FFD700', paddingHorizontal: 20, borderRadius: 10,
    justifyContent: 'center',
  },
  searchButtonText: { color: '#1A237E', fontWeight: 'bold' },
  searchHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 5, marginLeft: 5 },

  // VIEWER
  viewerContainerPremium: {
    flex: 1, marginHorizontal: 20, backgroundColor: '#FFF',
    borderRadius: 20, overflow: 'hidden', minHeight: 400,
  },
  viewerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE',
  },
  viewerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  qualityBadge: { backgroundColor: '#E8F5E9', padding: 5, borderRadius: 5 },
  qualityText: { color: '#4CAF50', fontSize: 10, fontWeight: 'bold' },
  actionBar: {
    flexDirection: 'row', padding: 10, gap: 10, borderTopWidth: 1, borderTopColor: '#EEE',
  },
  actionButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  actionButtonDownload: { backgroundColor: '#1A237E' },
  actionButtonPrint: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#1A237E' },
  actionButtonText: { color: '#FFF', fontWeight: 'bold' },
  actionButtonTextOutline: { color: '#1A237E', fontWeight: 'bold' },

  // LINK SECTION
  linkSection: { paddingHorizontal: 20, marginBottom: 20 },

  // PROGRESS
  progressOverlay: {
    ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  progressCard: {
    backgroundColor: '#FFF', padding: 30, borderRadius: 20, alignItems: 'center', width: 250,
  },
  progressTitle: { marginTop: 15, marginBottom: 10, fontWeight: 'bold', color: '#333' },
  progressTrack: { width: '100%', height: 6, backgroundColor: '#EEE', borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 3 },

  // EMPTY
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 50, opacity: 0.3, marginBottom: 10 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#CCC' },
  emptyText: { color: '#CCC' },
});

export default HomeScreen;
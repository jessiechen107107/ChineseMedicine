import AnalysisScreen from '@/components/AnalysisScreen';
import ResultsScreen from '@/components/ResultsScreen';
import { estimatePulse, INQUIRY_QUESTIONS, IntakePhoto, SMELL_OPTIONS } from '@/services/FourExamsService';
import { HealthData, healthService } from '@/services/HealthService';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PhotoTarget = 'face' | 'tongue';

const MIN_ANSWERS = 4;

export default function DiagnosisScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [facePhoto, setFacePhoto] = useState<IntakePhoto | null>(null);
  const [tonguePhoto, setTonguePhoto] = useState<IntakePhoto | null>(null);
  const [smellTags, setSmellTags] = useState<string[]>([]);
  const [smellNote, setSmellNote] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [question, setQuestion] = useState('');
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isReadingPulse, setIsReadingPulse] = useState(false);

  const [cameraModal, setCameraModal] = useState<{ open: boolean; target: PhotoTarget | null }>({ open: false, target: null });
  const [currentScreen, setCurrentScreen] = useState<'assessment' | 'analysis' | 'results'>('assessment');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const answeredCount = Object.keys(answers).length;
  const pulse = useMemo(() => estimatePulse(healthData), [healthData]);
  const canStart = !!healthData && answeredCount >= MIN_ANSWERS;

  const setPhoto = (target: PhotoTarget, photo: IntakePhoto) => {
    if (target === 'face') setFacePhoto(photo);
    else setTonguePhoto(photo);
  };

  const openCamera = async (target: PhotoTarget) => {
    const granted = cameraPermission?.granted || (await requestCameraPermission()).granted;
    if (!granted) {
      Alert.alert('Camera permission needed', 'Please allow camera access to take a photo.');
      return;
    }
    setCameraModal({ open: true, target });
  };

  const pickFromLibrary = async (target: PhotoTarget) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPhoto(target, { uri: result.assets[0].uri, base64: result.assets[0].base64 });
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const choosePhotoSource = (target: PhotoTarget) => {
    Alert.alert(target === 'face' ? 'Face photo' : 'Tongue photo', 'Use natural light and no filters.', [
      { text: 'Take Photo', onPress: () => openCamera(target) },
      { text: 'Choose from Library', onPress: () => pickFromLibrary(target) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const takePhoto = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5, base64: true });
      if (photo?.uri && cameraModal.target) {
        setPhoto(cameraModal.target, { uri: photo.uri, base64: photo.base64 });
        setCameraModal({ open: false, target: null });
      }
    } catch {
      Alert.alert('Failed to take photo', 'Please try again.');
    }
  };

  const toggleSmell = (id: string) => {
    setSmellTags((prev) => {
      if (id === 'none') return prev.includes('none') ? [] : ['none'];
      const withoutNone = prev.filter((t) => t !== 'none');
      return withoutNone.includes(id) ? withoutNone.filter((t) => t !== id) : [...withoutNone, id];
    });
  };

  const readPulse = async () => {
    setIsReadingPulse(true);
    try {
      // Falls back to sample data when Apple Health is unavailable (e.g. simulator)
      const today = await healthService.getHealthData(new Date());
      setHealthData(today);
    } catch {
      Alert.alert('Sync failed', 'Could not read heart data. Please try again.');
    } finally {
      setIsReadingPulse(false);
    }
  };

  const handleAnalysisComplete = (result: any) => {
    setAnalysisResult(result);
    setCurrentScreen('results');
  };

  const handleReturnToAssessment = () => {
    setCurrentScreen('assessment');
    setFacePhoto(null);
    setTonguePhoto(null);
    setSmellTags([]);
    setSmellNote('');
    setAnswers({});
    setQuestion('');
    setHealthData(null);
    setAnalysisResult(null);
  };

  const bottomNav = (active: number) => (
    <View style={styles.bottomNav}>
      {(['flower', 'musical-notes', 'person-circle'] as const).map((icon, i) => (
        <TouchableOpacity key={icon} style={styles.navItem}>
          <Ionicons name={icon} size={24} color={i === active ? '#4ECDC4' : '#666'} />
        </TouchableOpacity>
      ))}
    </View>
  );

  if (currentScreen === 'analysis') {
    return (
      <View style={styles.container}>
        <AnalysisScreen
          onAnalysisComplete={handleAnalysisComplete}
          intake={{ facePhoto, tonguePhoto, smellTags, smellNote, answers, question, healthData }}
        />
        {bottomNav(1)}
      </View>
    );
  }

  if (currentScreen === 'results') {
    return (
      <View style={styles.container}>
        <ResultsScreen onReturnToAssessment={handleReturnToAssessment} analysisResult={analysisResult} />
        {bottomNav(1)}
      </View>
    );
  }

  const renderPhotoTile = (target: PhotoTarget, photo: IntakePhoto | null, label: string) => (
    <TouchableOpacity style={styles.photoTile} onPress={() => choosePhotoSource(target)} activeOpacity={0.8}>
      {photo ? (
        <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
      ) : (
        <Ionicons name="camera-outline" size={28} color="#9EDAD6" />
      )}
      <Text style={styles.photoLabel}>{photo ? `${label} ✓` : label}</Text>
    </TouchableOpacity>
  );

  const sectionHeader = (image: any, color: string, title: string, subtitle: string, done: boolean) => (
    <View style={styles.sectionHeaderRow}>
      <View style={[styles.stepIcon, { backgroundColor: color }]}>
        <Image source={image} style={styles.observationImage} resizeMode="cover" />
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{subtitle}</Text>
      </View>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? '#4ECDC4' : '#5A6B6F'} />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollViewContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]} />

        {/* Main TCM Card */}
        <View style={styles.mainCard}>
          <ImageBackground
            source={require('@/assets/images/ChatGPT Image 2025年8月8日 下午12_36_12.png')}
            style={styles.gradientCard}
            imageStyle={styles.backgroundImage}
          >
            <View style={styles.overlay} />
            <View style={styles.cardContent}>
              <Text style={styles.mainTitle}>Four Examinations</Text>
              <Text style={styles.mainSubtitle}>Look · Listen · Ask · Feel. A gentle TCM check-in, the way a practitioner would.</Text>
            </View>
            <View style={styles.decorativeElements}>
              <Ionicons name="leaf" size={40} color="rgba(255,255,255,0.2)" style={styles.leaf1} />
              <Ionicons name="flower" size={30} color="rgba(255,255,255,0.15)" style={styles.leaf2} />
              <Ionicons name="leaf" size={25} color="rgba(255,255,255,0.1)" style={styles.leaf3} />
            </View>
          </ImageBackground>
        </View>

        <View style={styles.stepsContainer}>
          {/* Look (望) */}
          <View style={styles.sectionCard}>
            {sectionHeader(
              require('@/assets/images/ChatGPT Image 2025年8月8日 下午01_03_41.png'),
              '#4ECDC4',
              'Look (望)',
              'Face and tongue photos. Take one or upload from your library.',
              !!facePhoto || !!tonguePhoto
            )}
            <View style={styles.photoRow}>
              {renderPhotoTile('face', facePhoto, 'Face')}
              {renderPhotoTile('tongue', tonguePhoto, 'Tongue')}
            </View>
          </View>

          {/* Listen & Smell (聞) */}
          <View style={styles.sectionCard}>
            {sectionHeader(
              require('@/assets/images/ChatGPT Image 2025年8月8日 下午01_12_29.png'),
              '#45B7D1',
              'Listen & Smell (聞)',
              'Have you noticed any body odors lately?',
              smellTags.length > 0 || !!smellNote.trim()
            )}
            <View style={styles.chipRow}>
              {SMELL_OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.id}
                  style={[styles.chip, smellTags.includes(o.id) && styles.chipSelected]}
                  onPress={() => toggleSmell(o.id)}
                >
                  <Text style={[styles.chipText, smellTags.includes(o.id) && styles.chipTextSelected]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Anything else? e.g. voice feels weak, coughing"
              placeholderTextColor="#999"
              value={smellNote}
              onChangeText={setSmellNote}
              multiline
            />
          </View>

          {/* Ask (問) */}
          <View style={styles.sectionCard}>
            {sectionHeader(
              require('@/assets/images/ChatGPT Image 2025年8月8日 下午02_00_53.png'),
              '#96CEB4',
              'Ask (問)',
              `Answer at least ${MIN_ANSWERS} questions (${answeredCount}/${INQUIRY_QUESTIONS.length}).`,
              answeredCount >= MIN_ANSWERS
            )}
            {INQUIRY_QUESTIONS.map((q) => (
              <View key={q.id} style={styles.questionBlock}>
                <Text style={styles.questionText}>{q.question}</Text>
                <View style={styles.chipRow}>
                  {q.options.map((o) => {
                    const selected = answers[q.id] === o.id;
                    return (
                      <TouchableOpacity
                        key={o.id}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: o.id }))}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            <Text style={styles.questionText}>What would you like to ask?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Why do I feel tired after lunch?"
              placeholderTextColor="#999"
              value={question}
              onChangeText={setQuestion}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Feel the pulse (切) */}
          <View style={styles.sectionCard}>
            {sectionHeader(
              require('@/assets/images/ChatGPT Image 2025年8月8日 下午02_23_35.png'),
              '#FFEAA7',
              'Feel (切)',
              'Estimate your pulse from Apple Watch heart rate and HRV.',
              !!healthData
            )}
            {healthData ? (
              <View style={styles.pulseBox}>
                <Text style={styles.metricText}>
                  Heart rate {healthData.heartRate} bpm · HRV {healthData.heartRateVariability} ms
                  {healthData.source === 'demo' ? ' (sample data)' : ''}
                </Text>
                {pulse && <Text style={styles.pulseLabel}>{pulse.label}</Text>}
                {pulse && <Text style={styles.stepDescription}>{pulse.description}</Text>}
              </View>
            ) : (
              <TouchableOpacity style={styles.syncButton} onPress={readPulse} disabled={isReadingPulse}>
                <Ionicons name="watch-outline" size={18} color="#1E2B2F" />
                <Text style={styles.syncButtonText}>{isReadingPulse ? 'Reading…' : 'Read from Apple Watch'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ marginTop: 6, marginBottom: 16, alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.startButton, { opacity: canStart ? 1 : 0.5 }]}
            disabled={!canStart}
            onPress={() => setCurrentScreen('analysis')}
          >
            <Ionicons name="play" size={14} color="#1E2B2F" />
            <Text style={styles.startButtonText}>start assessment</Text>
          </TouchableOpacity>
          {!canStart && (
            <Text style={styles.smallHint}>
              {!healthData ? 'Read your pulse and ' : ''}answer {Math.max(MIN_ANSWERS - answeredCount, 0)} more question(s) to start.
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>For reference only. Not medical advice.</Text>
        </View>
      </ScrollView>

      <Modal visible={cameraModal.open} animationType="slide" onRequestClose={() => setCameraModal({ open: false, target: null })}>
        <View style={styles.cameraContainer}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraHint}>
              {cameraModal.target === 'face' ? 'Center your face and keep it steady.' : 'Stick out your tongue and hold still.'}
            </Text>
          </View>
          <CameraView ref={cameraRef} style={styles.cameraView} facing="front" />
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setCameraModal({ open: false, target: null })}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutterBtn} onPress={takePhoto}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {bottomNav(0)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E2B2F',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },

  mainCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradientCard: {
    padding: 30,
    minHeight: 150,
    position: 'relative',
  },
  cardContent: {
    zIndex: 2,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  mainSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    marginBottom: 25,
  },
  // removed small variants, restored to original hero styles
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 20,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E2B2F',
    marginLeft: 8,
  },
  actionButton: {
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 999,
    alignSelf: 'center',
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  leaf1: {
    position: 'absolute',
    top: 20,
    right: 30,
    transform: [{ rotate: '15deg' }],
  },
  leaf2: {
    position: 'absolute',
    bottom: 60,
    right: 50,
    transform: [{ rotate: '-25deg' }],
  },
  leaf3: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    transform: [{ rotate: '45deg' }],
  },
  stepsContainer: {
    marginTop: 3,
    gap: 10,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 8,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepIconText: {
    fontSize: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: '#B0B0B0',
    lineHeight: 18,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  metricText: {
    fontSize: 13,
    color: '#E5E5E5',
    marginTop: 6,
  },
  stepStatus: {
    alignItems: 'center',
    minWidth: 60,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  pendingCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#B0B0B0',
    backgroundColor: 'transparent',
  },
  observationImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#1E2B2F',
    borderTopWidth: 1,
    borderTopColor: '#2A3B3F',
  },
  navItem: {
    padding: 8,
  },
  backgroundImage: {
    borderRadius: 20,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  smallHint: {
    marginTop: 6,
    color: '#9EDAD6',
    fontSize: 12,
  },
  footer: {
    marginTop: 8,
    paddingVertical: 12,
  },
  footerText: {
    color: '#9AA6AC',
    fontSize: 12,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraHeader: {
    paddingTop: 48,
    paddingBottom: 12,
    alignItems: 'center',
  },
  cameraHint: {
    color: '#fff',
    fontSize: 14,
  },
  cameraView: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)'
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  closeCameraBtn: {
    position: 'absolute',
    right: 24,
    top: -36,
    padding: 6,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoTile: {
    flex: 1,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A4B4F',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  photoLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#4A5B5F',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  chipText: {
    color: '#D0D8DA',
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#1E2B2F',
    fontWeight: '600',
  },
  questionBlock: {
    marginBottom: 12,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  pulseBox: {
    gap: 4,
  },
  pulseLabel: {
    color: '#FFEAA7',
    fontSize: 16,
    fontWeight: '700',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFEAA7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  syncButtonText: {
    color: '#1E2B2F',
    fontWeight: '600',
  },
}); 
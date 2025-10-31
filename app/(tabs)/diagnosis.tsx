import AnalysisScreen from '@/components/AnalysisScreen';
import ResultsScreen from '@/components/ResultsScreen';
import { HealthData, healthService } from '@/services/HealthService';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DiagnosisScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();


  const [facePhotoUri, setFacePhotoUri] = useState<string | null>(null);
  const [tonguePhotoUri, setTonguePhotoUri] = useState<string | null>(null);
  const [userInput, setUserInput] = useState<string>('');
  const [healthData, setHealthData] = useState<HealthData | null>(null);

  const [cameraModal, setCameraModal] = useState<{ open: boolean; target: 'face' | 'tongue' | null }>({ open: false, target: null });
  const [currentScreen, setCurrentScreen] = useState<'assessment' | 'analysis' | 'results'>('assessment');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  const canStart = useMemo(() => !!facePhotoUri && !!tonguePhotoUri && !!userInput.trim() && !!healthData, [facePhotoUri, tonguePhotoUri, userInput, healthData]);

  const handleStartAssessment = () => {
    Alert.alert(
      'Start assessment',
      'All set. We will use your inputs to create helpful insights.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Start',
          onPress: () => {
            // Switch to analysis screen within assessment
            setCurrentScreen('analysis');
          }
        }
      ]
    );
  };

  const ensureCameraPermission = async (): Promise<boolean> => {
    if (cameraPermission?.granted) return true;
    const res = await requestCameraPermission();
    return !!res.granted;
  };

  const openCamera = async (target: 'face' | 'tongue') => {
    const ok = await ensureCameraPermission();
    if (!ok) {
      Alert.alert('Camera permission needed', 'Please allow camera access to take a photo.');
      return;
    }
    setCameraModal({ open: true, target });
  };

  const takePhoto = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7, skipProcessing: true });
      if (photo?.uri && cameraModal.target) {
        if (cameraModal.target === 'face') setFacePhotoUri(photo.uri);
        if (cameraModal.target === 'tongue') setTonguePhotoUri(photo.uri);
        setCameraModal({ open: false, target: null });
      }
    } catch (e) {
      Alert.alert('Failed to take photo', 'Please try again.');
    }
  };



  const connectHealth = async () => {
    try {
      const available = await healthService.isHealthDataAvailable();
      if (!available) {
        Alert.alert('Not available', 'Health data is only available on iOS with Apple Health.');
        return;
      }
      await healthService.requestPermissions();
      const today = await healthService.getHealthData(new Date());
      setHealthData(today);
    } catch (e) {
      Alert.alert('Sync failed', 'Could not sync with Apple Watch. Please try again.');
    }
  };

  const handleAnalysisComplete = (result: any) => {
    setAnalysisResult(result);
    setCurrentScreen('results');
  };

  const handleReturnToAssessment = () => {
    setCurrentScreen('assessment');
    // Reset all states for fresh assessment
    setFacePhotoUri(null);
    setTonguePhotoUri(null);
    setUserInput('');
    setHealthData(null);
    setAnalysisResult(null);
  };

  // Render different screens based on current state
  if (currentScreen === 'analysis') {
    return (
      <View style={styles.container}>
        <AnalysisScreen 
          onAnalysisComplete={handleAnalysisComplete} 
          assessmentData={{
            facePhotoUri,
            tonguePhotoUri,
            userInput,
            healthData
          }}
        />
        
        {/* Bottom Navigation - keep original 3 buttons */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="flower" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="musical-notes" size={24} color="#4ECDC4" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="person-circle" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentScreen === 'results') {
    return (
      <View style={styles.container}>
        <ResultsScreen 
          onReturnToAssessment={handleReturnToAssessment} 
          analysisResult={analysisResult}
        />
        
        {/* Bottom Navigation - keep original 3 buttons */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="flower" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="musical-notes" size={24} color="#4ECDC4" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="person-circle" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - hero only, no top start button */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        </View>

        {/* Main TCM Card */}
        <View style={styles.mainCard}>
          <ImageBackground
            source={require('@/assets/images/ChatGPT Image 2025年8月8日 下午12_36_12.png')}
            style={styles.gradientCard}
            imageStyle={styles.backgroundImage}
          >
            {/* Overlay for better text readability */}
            <View style={styles.overlay} />
            
            <View style={styles.cardContent}>
              <Text style={styles.mainTitle}>Chinese Medicine</Text>
              <Text style={styles.mainSubtitle}>
              Sometimes the best medicine is to nourish, not to fight.
              </Text>
            </View>
            
            {/* Decorative elements */}
            <View style={styles.decorativeElements}>
              <Ionicons name="leaf" size={40} color="rgba(255,255,255,0.2)" style={styles.leaf1} />
              <Ionicons name="flower" size={30} color="rgba(255,255,255,0.15)" style={styles.leaf2} />
              <Ionicons name="leaf" size={25} color="rgba(255,255,255,0.1)" style={styles.leaf3} />
            </View>
          </ImageBackground>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {/* Look */}
          <TouchableOpacity style={styles.stepCard} activeOpacity={0.7} onPress={() => openCamera('face')}>
            <View style={[styles.stepIcon, { backgroundColor: '#4ECDC4' }]}>
              <Image 
                source={require('@/assets/images/ChatGPT Image 2025年8月8日 下午01_03_41.png')}
                style={styles.observationImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Look</Text>
              <Text style={styles.stepDescription}>Tap and take a front-face photo.</Text>
            </View>
            <View style={styles.stepStatus}>
              <TouchableOpacity style={styles.actionButton} onPress={() => openCamera('face')}>
                {facePhotoUri ? (
                  <Ionicons name="checkmark" size={28} color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={28} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Listen (tongue) */}
          <TouchableOpacity style={styles.stepCard} activeOpacity={0.7} onPress={() => openCamera('tongue')}>
            <View style={[styles.stepIcon, { backgroundColor: '#45B7D1' }]}>
              <Image 
                source={require('@/assets/images/ChatGPT Image 2025年8月8日 下午01_12_29.png')}
                style={styles.observationImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Listen</Text>
              <Text style={styles.stepDescription}>Tap and take a clear tongue photo.</Text>
            </View>
            <View style={styles.stepStatus}>
              <TouchableOpacity style={styles.actionButton} onPress={() => openCamera('tongue')}>
                {tonguePhotoUri ? (
                  <Ionicons name="checkmark" size={28} color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={28} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Ask (text input) */}
          <View style={styles.stepCard}>
            <View style={[styles.stepIcon, { backgroundColor: '#96CEB4' }]}>
              <Image 
                source={require('@/assets/images/ChatGPT Image 2025年8月8日 下午02_00_53.png')}
                style={styles.observationImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Ask</Text>
              <Text style={styles.stepDescription}>Describe how you feel or what you want to improve.</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Type your concerns or questions here..."
                placeholderTextColor="#999"
                value={userInput}
                onChangeText={setUserInput}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              {!!userInput.trim() && <Text style={styles.smallHint}>Input saved</Text>}
            </View>
            <View style={styles.stepStatus}>
              <View style={styles.actionButton}>
                {userInput.trim() ? (
                  <Ionicons name="checkmark" size={28} color="#FFFFFF" />
                ) : (
                  <Ionicons name="create-outline" size={28} color="#FFFFFF" />
                )}
              </View>
            </View>
          </View>

          {/* Check (Apple Watch / Health) */}
          <TouchableOpacity style={styles.stepCard} activeOpacity={0.7} onPress={connectHealth}>
            <View style={[styles.stepIcon, { backgroundColor: '#FFEAA7' }]}>
              <Image 
                source={require('@/assets/images/ChatGPT Image 2025年8月8日 下午02_23_35.png')}
                style={styles.observationImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Check</Text>
              <Text style={styles.stepDescription}>Sync Apple Watch to fetch current pulse and variability.</Text>
              {healthData ? (
                <View>
                  <Text style={styles.metricText}>Heart rate: {healthData.heartRate} bpm</Text>
                  <Text style={styles.metricText}>HRV: {healthData.heartRateVariability} ms</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.stepStatus}>
              <TouchableOpacity style={styles.actionButton} onPress={connectHealth}>
                {healthData ? (
                  <Ionicons name="checkmark" size={28} color="#FFFFFF" />
                ) : (
                  <Ionicons name="watch" size={28} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Start button after steps */}
        <View style={{ marginTop: 6, marginBottom: 16, alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.startButton, { opacity: canStart ? 1 : 0.5 }]}
            disabled={!canStart}
            onPress={handleStartAssessment}
          >
            <Ionicons name="play" size={14} color="#1E2B2F" />
            <Text style={styles.startButtonText}>start assessment</Text>
          </TouchableOpacity>
        </View>

        {/* Footer disclaimer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>For reference only. Not medical advice.</Text>
        </View>
      </ScrollView>

      {/* Camera modal (camera only, no gallery) */}
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

      {/* Bottom Navigation Placeholder */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="flower" size={24} color="#4ECDC4" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="musical-notes" size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-circle" size={24} color="#666" />
        </TouchableOpacity>
      </View>
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
}); 
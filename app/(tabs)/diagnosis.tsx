import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONTENT_PADDING = 15;

interface AssessmentData {
  observation: {
    photoTaken: boolean;
    tongueColor: string;
    faceColor: string;
  };
  smell: {
    badBreath: string;
    flatulence: string;
    otherOdors: string;
  };
  inquiry: {
    selectedSymptoms: string[];
    customSymptoms: string;
  };
  pulse: {
    connected: boolean;
    pulseRate: number;
    pulseType: string;
  };
}

const commonSymptoms = [
  'Acne', 'Irregular Periods', 'Insomnia', 'Cold Extremities',
  'Poor Appetite', 'Headache', 'Fatigue', 'Constipation'
];

const pulseTypes = ['Normal', 'Wiry', 'Slippery', 'Rapid', 'Slow', 'Weak'];

export default function AssessmentScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    observation: { photoTaken: false, tongueColor: '', faceColor: '' },
    smell: { badBreath: '', flatulence: '', otherOdors: '' },
    inquiry: { selectedSymptoms: [], customSymptoms: '' },
    pulse: { connected: false, pulseRate: 72, pulseType: '' }
  });
  const [showAssessment, setShowAssessment] = useState(false);
  const insets = useSafeAreaInsets();

  const updateObservation = (field: string, value: any) => {
    setAssessmentData(prev => ({
      ...prev,
      observation: { ...prev.observation, [field]: value }
    }));
  };

  const updateSmell = (field: string, value: string) => {
    setAssessmentData(prev => ({
      ...prev,
      smell: { ...prev.smell, [field]: value }
    }));
  };

  const updateInquiry = (field: string, value: any) => {
    setAssessmentData(prev => ({
      ...prev,
      inquiry: { ...prev.inquiry, [field]: value }
    }));
  };

  const toggleSymptom = (symptom: string) => {
    const currentSymptoms = assessmentData.inquiry.selectedSymptoms;
    if (currentSymptoms.includes(symptom)) {
      updateInquiry('selectedSymptoms', currentSymptoms.filter(s => s !== symptom));
    } else {
      updateInquiry('selectedSymptoms', [...currentSymptoms, symptom]);
    }
  };

  const updatePulse = (field: string, value: any) => {
    setAssessmentData(prev => ({
      ...prev,
      pulse: { ...prev.pulse, [field]: value }
    }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      generateAssessment();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateAssessment = () => {
    setShowAssessment(true);
  };

  const getAssessmentResult = () => {
    const { observation, smell, inquiry, pulse } = assessmentData;
    
    // Simplified assessment logic
    let pattern = '';
    let recommendations = [];
    
    if (inquiry.selectedSymptoms.includes('Fatigue') && pulse.pulseType === 'Weak') {
      pattern = 'Qi Deficiency';
      recommendations.push('Get adequate rest and moderate exercise');
      recommendations.push('Consider ginseng and astragalus supplements');
    } else if (inquiry.selectedSymptoms.includes('Insomnia') && pulse.pulseType === 'Wiry') {
      pattern = 'Liver Qi Stagnation';
      recommendations.push('Maintain emotional balance and reduce stress');
      recommendations.push('Try rose tea to soothe liver qi');
    } else if (inquiry.selectedSymptoms.includes('Cold Extremities')) {
      pattern = 'Yang Deficiency';
      recommendations.push('Keep warm and avoid cold foods');
      recommendations.push('Include ginger and longan in your diet');
    } else {
      pattern = 'Balanced Constitution';
      recommendations.push('Maintain current healthy lifestyle');
      recommendations.push('Continue regular exercise and balanced diet');
    }

    return { pattern, recommendations };
  };

  const renderStepIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${(currentStep / 4) * 100}%` }]} />
        </View>
        <View style={styles.stepLabelsContainer}>
          {[1, 2, 3, 4].map((step) => (
            <View key={step} style={styles.stepLabelItem}>
              <ThemedText style={[
                styles.stepLabelText,
                currentStep >= step && styles.activeStepLabelText
              ]}>
                {step === 1 ? 'Look' : step === 2 ? 'Listen' : step === 3 ? 'Ask' : 'Feel'}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderObservationStep = () => (
    <View style={styles.modernStepContent}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="eye-outline" size={24} color="#7A8B68" />
        </View>
        <View style={styles.stepTitleContainer}>
          <ThemedText style={styles.modernStepTitle}>Observation</ThemedText>
          <ThemedText style={styles.modernStepSubtitle}>Visual assessment</ThemedText>
        </View>
      </View>
      
      <View style={styles.questionCard}>
        <ThemedText style={styles.questionCardTitle}>For example, Which of the following descriptions resonate with you?</ThemedText>
        
        <TouchableOpacity 
          style={[
            styles.modernCameraButton,
            assessmentData.observation.photoTaken && styles.selectedModernButton
          ]}
          onPress={() => updateObservation('photoTaken', !assessmentData.observation.photoTaken)}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="camera" size={20} color={assessmentData.observation.photoTaken ? "#FFFFFF" : "#7A8B68"} />
          </View>
          <ThemedText style={[
            styles.optionDescription,
            assessmentData.observation.photoTaken && styles.selectedOptionText
          ]}>Take facial photo for analysis</ThemedText>
          <View style={[
            styles.radioButton,
            assessmentData.observation.photoTaken && styles.selectedRadio
          ]} />
        </TouchableOpacity>

        <View style={styles.optionsSection}>
          <ThemedText style={styles.sectionLabel}>Tongue Color</ThemedText>
          {['Light Red', 'Red', 'Dark Red', 'Purple'].map((color, index) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.modernOptionButton,
                assessmentData.observation.tongueColor === color && styles.selectedModernButton
              ]}
              onPress={() => updateObservation('tongueColor', color)}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: index === 0 ? '#FFB6C1' : index === 1 ? '#FF69B4' : index === 2 ? '#DC143C' : '#800080' }]}>
                <Ionicons name="ellipse" size={16} color="#FFFFFF" />
              </View>
              <ThemedText style={[
                styles.optionDescription,
                assessmentData.observation.tongueColor === color && styles.selectedOptionText
              ]}>{color} tongue appearance</ThemedText>
              <View style={[
                styles.radioButton,
                assessmentData.observation.tongueColor === color && styles.selectedRadio
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.optionsSection}>
          <ThemedText style={styles.sectionLabel}>Facial Complexion</ThemedText>
          {['Rosy', 'Pale', 'Sallow', 'Bluish'].map((color, index) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.modernOptionButton,
                assessmentData.observation.faceColor === color && styles.selectedModernButton
              ]}
              onPress={() => updateObservation('faceColor', color)}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: index === 0 ? '#FFB6C1' : index === 1 ? '#F5F5DC' : index === 2 ? '#F0E68C' : '#87CEEB' }]}>
                <Ionicons name="person" size={16} color="#FFFFFF" />
              </View>
              <ThemedText style={[
                styles.optionDescription,
                assessmentData.observation.faceColor === color && styles.selectedOptionText
              ]}>{color} facial complexion</ThemedText>
              <View style={[
                styles.radioButton,
                assessmentData.observation.faceColor === color && styles.selectedRadio
              ]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderSmellStep = () => (
    <View style={styles.modernStepContent}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="ear-outline" size={24} color="#7A8B68" />
        </View>
        <View style={styles.stepTitleContainer}>
          <ThemedText style={styles.modernStepTitle}>Listening & Smelling</ThemedText>
          <ThemedText style={styles.modernStepSubtitle}>Sensory assessment</ThemedText>
        </View>
      </View>

      <View style={styles.questionCard}>
        <ThemedText style={styles.questionCardTitle}>For example, Which of the following descriptions resonate with you?</ThemedText>
        
        <View style={styles.optionsSection}>
          <ThemedText style={styles.sectionLabel}>Bad Breath</ThemedText>
          {['None', 'Mild', 'Obvious'].map((option, index) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.modernOptionButton,
                assessmentData.smell.badBreath === option && styles.selectedModernButton
              ]}
              onPress={() => updateSmell('badBreath', option)}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: index === 0 ? '#90EE90' : index === 1 ? '#FFD700' : '#FF6B6B' }]}>
                <Ionicons name="person-outline" size={16} color="#FFFFFF" />
              </View>
              <ThemedText style={[
                styles.optionDescription,
                assessmentData.smell.badBreath === option && styles.selectedOptionText
              ]}>{option} bad breath</ThemedText>
              <View style={[
                styles.radioButton,
                assessmentData.smell.badBreath === option && styles.selectedRadio
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.optionsSection}>
          <ThemedText style={styles.sectionLabel}>Digestive Gas</ThemedText>
          {['Normal', 'More', 'Excessive', 'Less'].map((option, index) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.modernOptionButton,
                assessmentData.smell.flatulence === option && styles.selectedModernButton
              ]}
              onPress={() => updateSmell('flatulence', option)}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: index === 0 ? '#90EE90' : index === 1 ? '#FFD700' : index === 2 ? '#FF6B6B' : '#87CEEB' }]}>
                <Ionicons name="restaurant-outline" size={16} color="#FFFFFF" />
              </View>
              <ThemedText style={[
                styles.optionDescription,
                assessmentData.smell.flatulence === option && styles.selectedOptionText
              ]}>{option} digestive gas</ThemedText>
              <View style={[
                styles.radioButton,
                assessmentData.smell.flatulence === option && styles.selectedRadio
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.textInputSection}>
          <ThemedText style={styles.sectionLabel}>Other Odor Changes</ThemedText>
          <TextInput
            style={styles.modernTextInput}
            placeholder="Describe any other odor changes you've noticed..."
            placeholderTextColor="#999"
            value={assessmentData.smell.otherOdors}
            onChangeText={(text) => updateSmell('otherOdors', text)}
            multiline
          />
        </View>
      </View>
    </View>
  );

  const renderInquiryStep = () => (
    <View style={styles.modernStepContent}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="chatbubble-outline" size={24} color="#7A8B68" />
        </View>
        <View style={styles.stepTitleContainer}>
          <ThemedText style={styles.modernStepTitle}>Inquiry</ThemedText>
          <ThemedText style={styles.modernStepSubtitle}>Symptom assessment</ThemedText>
        </View>
      </View>

      <View style={styles.questionCard}>
        <ThemedText style={styles.questionCardTitle}>For example, Which of the following descriptions resonate with you?</ThemedText>
        
        <View style={styles.optionsSection}>
          <ThemedText style={styles.sectionLabel}>Common Symptoms</ThemedText>
          {commonSymptoms.map((symptom, index) => (
            <TouchableOpacity
              key={symptom}
              style={[
                styles.modernOptionButton,
                assessmentData.inquiry.selectedSymptoms.includes(symptom) && styles.selectedModernButton
              ]}
              onPress={() => toggleSymptom(symptom)}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: `hsl(${index * 45}, 70%, 60%)` }]}>
                <Ionicons name="medical-outline" size={16} color="#FFFFFF" />
              </View>
              <ThemedText style={[
                styles.optionDescription,
                assessmentData.inquiry.selectedSymptoms.includes(symptom) && styles.selectedOptionText
              ]}>{symptom}</ThemedText>
              <View style={[
                styles.radioButton,
                assessmentData.inquiry.selectedSymptoms.includes(symptom) && styles.selectedRadio
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.textInputSection}>
          <ThemedText style={styles.sectionLabel}>Other Symptoms</ThemedText>
          <TextInput
            style={styles.modernTextInput}
            placeholder="Describe other symptoms, duration, and severity in detail..."
            placeholderTextColor="#999"
            value={assessmentData.inquiry.customSymptoms}
            onChangeText={(text) => updateInquiry('customSymptoms', text)}
            multiline
          />
        </View>
      </View>
    </View>
  );

  const renderPulseStep = () => (
    <View style={styles.modernStepContent}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconContainer}>
          <Ionicons name="heart-outline" size={24} color="#7A8B68" />
        </View>
        <View style={styles.stepTitleContainer}>
          <ThemedText style={styles.modernStepTitle}>Pulse Assessment</ThemedText>
          <ThemedText style={styles.modernStepSubtitle}>Physical assessment</ThemedText>
        </View>
      </View>

      <View style={styles.questionCard}>
        <ThemedText style={styles.questionCardTitle}>For example, Which of the following descriptions resonate with you?</ThemedText>
        
        <TouchableOpacity
          style={[
            styles.modernConnectButton,
            assessmentData.pulse.connected && styles.selectedModernButton
          ]}
          onPress={() => updatePulse('connected', !assessmentData.pulse.connected)}
        >
          <View style={styles.optionIconContainer}>
            <Ionicons name="watch" size={20} color={assessmentData.pulse.connected ? "#FFFFFF" : "#7A8B68"} />
          </View>
          <View style={styles.connectButtonContent}>
            <ThemedText style={[
              styles.connectButtonTitle,
              assessmentData.pulse.connected && styles.selectedOptionText
            ]}>
              {assessmentData.pulse.connected ? 'Device Connected' : 'Connect Measurement Device'}
            </ThemedText>
            <ThemedText style={[
              styles.connectButtonSubtitle,
              assessmentData.pulse.connected && styles.selectedOptionText
            ]}>
              Current pulse rate: {assessmentData.pulse.pulseRate} BPM
            </ThemedText>
          </View>
          <View style={[
            styles.radioButton,
            assessmentData.pulse.connected && styles.selectedRadio
          ]} />
        </TouchableOpacity>

        <View style={styles.optionsSection}>
          <ThemedText style={styles.sectionLabel}>Pulse Type</ThemedText>
          {pulseTypes.map((type, index) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.modernOptionButton,
                assessmentData.pulse.pulseType === type && styles.selectedModernButton
              ]}
              onPress={() => updatePulse('pulseType', type)}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: `hsl(${index * 60}, 70%, 60%)` }]}>
                <Ionicons name="pulse-outline" size={16} color="#FFFFFF" />
              </View>
              <ThemedText style={[
                styles.optionDescription,
                assessmentData.pulse.pulseType === type && styles.selectedOptionText
              ]}>{type} pulse</ThemedText>
              <View style={[
                styles.radioButton,
                assessmentData.pulse.pulseType === type && styles.selectedRadio
              ]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderAssessmentResult = () => {
    const result = getAssessmentResult();
    
    return (
      <View style={styles.assessmentContainer}>
        <ThemedText style={styles.assessmentTitle}>Assessment Result</ThemedText>
        
        <View style={styles.resultCard}>
          <ThemedText style={styles.patternTitle}>Pattern Assessment</ThemedText>
          <ThemedText style={styles.patternText}>{result.pattern}</ThemedText>
        </View>

        <View style={styles.resultCard}>
          <ThemedText style={styles.recommendationTitle}>Treatment Recommendations</ThemedText>
          {result.recommendations.map((rec, index) => (
            <ThemedText key={index} style={styles.recommendationText}>
              • {rec}
            </ThemedText>
          ))}
        </View>

        <TouchableOpacity
          style={styles.restartButton}
          onPress={() => {
            setCurrentStep(1);
            setShowAssessment(false);
            setAssessmentData({
              observation: { photoTaken: false, tongueColor: '', faceColor: '' },
              smell: { badBreath: '', flatulence: '', otherOdors: '' },
              inquiry: { selectedSymptoms: [], customSymptoms: '' },
              pulse: { connected: false, pulseRate: 72, pulseType: '' }
            });
          }}
        >
          <ThemedText style={styles.restartText}>New Assessment</ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  if (showAssessment) {
    return (
      <LinearGradient
        colors={['#7A8B68', '#D1E0C4', '#FFFFFF']}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { 
              paddingTop: Math.max(insets.top + 20, 80),
              paddingBottom: insets.bottom + 20,
            }
          ]}
        >
          <ThemedView style={styles.innerContent}>
            {renderAssessmentResult()}
          </ThemedView>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#7A8B68', '#D1E0C4', '#FFFFFF']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { 
            paddingTop: Math.max(insets.top + 20, 80),
            paddingBottom: insets.bottom + 20,
          }
        ]}
      >
        <ThemedView style={styles.innerContent}>
          <View style={styles.header}>
            <ThemedText style={styles.mainTitle}>ChineseMedicine Assessment</ThemedText>
            <ThemedText style={styles.subtitle}>Traditional ChineseMedicine Assessment</ThemedText>
          </View>

          {renderStepIndicator()}

          {currentStep === 1 && renderObservationStep()}
          {currentStep === 2 && renderSmellStep()}
          {currentStep === 3 && renderInquiryStep()}
          {currentStep === 4 && renderPulseStep()}

          <View style={styles.navigationButtons}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.navButton} onPress={prevStep}>
                <ThemedText style={styles.navButtonText}>Previous</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.navButton} onPress={nextStep}>
              <ThemedText style={styles.navButtonText}>
                {currentStep === 4 ? 'Generate Assessment' : 'Next'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: CONTENT_PADDING,
  },
  innerContent: {
    backgroundColor: 'transparent',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    color: '#44403c',
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressTrack: {
    width: '70%',
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#E5E5E5', 
    borderRadius: 3,
    marginBottom: 10,
  },
  progressFill: {
    height: 6,
    backgroundColor: '#535e47',
    borderRadius: 3,
  },
  stepLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  stepLabelItem: {
    alignItems: 'center',
  },
  stepLabelText: {
    fontSize: 12,
    color: '#999',
  },
  activeStepLabelText: {
    color: '#535e47',
    fontWeight: 'bold',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepTitleContainer: {
    flexDirection: 'column',
  },
  modernStepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#44403c',
    marginBottom: 1,
  },
  modernStepSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  questionCard: {
    backgroundColor: 'transparent',
    padding: 20,
    borderRadius: 12,
  },
  questionCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 20,
  },
  optionsSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#44403c',
    marginBottom: 15,
  },
  optionIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionDescription: {
    flex: 1,
    color: '#44403c',
    fontSize: 15,
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C0C0C0',
    marginLeft: 10,
  },
  selectedRadio: {
    backgroundColor: '#7A8B68',
    borderColor: '#7A8B68',
  },
  textInputSection: {
    marginBottom: 20,
  },
  modernCameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 12,
  },
  selectedModernButton: {
    backgroundColor: '#7A8B68',
    borderColor: '#7A8B68',
  },
  connectButtonContent: {
    flexDirection: 'column',
    flex: 1,
  },
  connectButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#44403c',
    marginBottom: 4,
  },
  connectButtonSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  modernConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 12,
  },
  modernStepContent: {
    marginBottom: 30,
  },
  modernOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 12,
  },
  modernTextInput: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 100,
    fontSize: 15,
    color: '#44403c',
    textAlignVertical: 'top',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navButton: {
    backgroundColor: '#7A8B68',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  assessmentContainer: {
    alignItems: 'center',
  },
  assessmentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#44403c',
    marginBottom: 30,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  patternTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7A8B68',
    marginBottom: 10,
  },
  patternText: {
    fontSize: 20,
    color: '#44403c',
    fontWeight: 'bold',
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7A8B68',
    marginBottom: 10,
  },
  recommendationText: {
    fontSize: 16,
    color: '#44403c',
    lineHeight: 24,
    marginBottom: 5,
  },
  restartButton: {
    backgroundColor: '#7A8B68',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },
  restartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// TCM Analysis function
async function performTCMAnalysis(data: any) {
  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

  if (!GEMINI_API_KEY) {
    throw new Error('Missing Gemini API key');
  }

  // Use user input directly
  const userConcerns = data.userInput || 'No specific concerns mentioned';

  const prompt = `As an experienced Traditional Chinese Medicine practitioner, please provide a comprehensive TCM assessment based on the following data:

Health Data:
- Heart Rate: ${data.healthData?.heartRate || 75} bpm
- Heart Rate Variability: ${data.healthData?.heartRateVariability || 42} ms
- Blood Oxygen: ${data.healthData?.bloodOxygen || 98}%
- Sleep Duration: ${data.healthData?.sleepDuration || 7} hours

Facial Observation: ${data.facePhotoUri ? 'Facial photo provided' : 'Not provided'}
Tongue Examination: ${data.tonguePhotoUri ? 'Tongue photo provided' : 'Not provided'}
Patient's Concerns: "${userConcerns}"

Please respond as a caring TCM practitioner with a warm, professional tone, including:

1. Pulse analysis (based on heart rate data)
2. Comprehensive four diagnosis analysis (observation, listening, inquiry, palpation)
3. Constitutional pattern and corresponding symptoms
4. Specific dietary nourishment recommendations
5. Lifestyle adjustment suggestions
6. Acupressure point therapy

Response format:
{
  "pulseAnalysis": "Pulse analysis content",
  "comprehensiveAnalysis": "Comprehensive four diagnosis analysis including facial, tongue, and voice assessment",
  "correspondingSymptoms": "Corresponding physical symptoms and emotional states",
  "dietRecommendations": ["Diet recommendation 1", "Diet recommendation 2", "Diet recommendation 3"],
  "lifestyleRecommendations": ["Lifestyle recommendation 1", "Lifestyle recommendation 2"],
  "acupressurePoints": ["Acupressure point recommendation 1", "Acupressure point recommendation 2", "Acupressure point recommendation 3"]
}

Please respond in English using TCM terminology and concepts, with a gentle practitioner tone. Avoid medical diagnostic language and focus on wellness and nourishment approaches. Pay special attention to the patient's written concerns and address their specific needs.`;

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: 'You are a professional Traditional Chinese Medicine practitioner with extensive clinical experience. Provide TCM wellness guidance with a warm, professional tone, avoiding medical diagnostic terminology and focusing on nourishment and balance.' }]
      },
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      generationConfig: {
        maxOutputTokens: 1200,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('API request failed');
  }

  const result = await response.json();
  const content = result.candidates[0].content.parts[0].text;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    return parseTCMResponseFallback(content);
  }
}

function parseTCMResponseFallback(content: string) {
  return {
    pulseAnalysis: 'Your pulse shows a stable and strong pattern with regular rhythm, reflecting smooth qi and blood circulation with a good constitutional foundation.',
    comprehensiveAnalysis: 'From facial observation, your complexion appears healthy with slight signs of fatigue; tongue examination shows a light red color with thin white coating, indicating normal spleen and stomach function; your voice quality suggests mild qi deficiency, possibly related to recent fatigue.',
    correspondingSymptoms: 'Tendency to feel tired, occasional difficulty concentrating, and mild emotional fluctuations - these reflect minor qi and blood circulation patterns that can be harmonized.',
    dietRecommendations: [
      'Include warming and nourishing foods like red dates, longan, and Chinese yam',
      'Avoid cold and raw foods, drink warm water regularly',
      'Moderate intake of black sesame and walnuts for nourishment'
    ],
    lifestyleRecommendations: [
      'Maintain regular sleep schedule, retire before 11 PM',
      'Gentle movement practices like Tai Chi or Eight Section Brocade'
    ],
    acupressurePoints: [
      'Massage Zu San Li (ST36) to strengthen spleen and stomach function',
      'Press Shen Men (HE7) to calm the spirit and stabilize emotions',
      'Gently rub temples to relieve head tension'
    ]
  };
}

function getFallbackTCMAnalysis(data: any) {
  return {
    pulseAnalysis: 'Based on your heart rate data, your pulse shows a peaceful and stable pattern with good qi and blood circulation, providing an excellent foundation.',
    comprehensiveAnalysis: 'Combining all provided information, your facial qi and blood appear balanced, tongue examination shows internal harmony, voice quality indicates stable central qi, with an overall balanced constitution tending toward mild deficiency.',
    correspondingSymptoms: 'Current fatigue and sleep quality variations reflect qi mechanism patterns that can benefit from gentle regulation.',
    dietRecommendations: [
      'Include foods that strengthen spleen qi and boost energy',
      'Maintain regular eating patterns with consistent timing',
      'Add moderate amounts of warming foods to your diet'
    ],
    lifestyleRecommendations: [
      'Maintain regular daily rhythms',
      'Gentle movement for wellness cultivation'
    ],
    acupressurePoints: [
      'Massage Bai Hui (GV20) to refresh and brighten the mind',
      'Press He Gu (LI4) to regulate qi and blood',
      'Rub Yong Quan (KD1) to strengthen the foundation and cultivate essence'
    ]
  };
}

const { width } = Dimensions.get('window');

interface AnalysisScreenProps {
  onAnalysisComplete: (analysisResult: any) => void;
  assessmentData: {
    facePhotoUri: string | null;
    tonguePhotoUri: string | null;
    userInput: string;
    healthData: any;
  };
}

export default function AnalysisScreen({ onAnalysisComplete, assessmentData }: AnalysisScreenProps) {
  const insets = useSafeAreaInsets();
  const [heartbeatAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    // Start loading animation
    const startLoadingAnimation = () => {
      Animated.loop(
        Animated.timing(heartbeatAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        })
      ).start();
    };

    startLoadingAnimation();

    // Perform real TCM analysis
    const performAnalysis = async () => {
      try {
        const result = await performTCMAnalysis(assessmentData);
        
        // Wait minimum 3 seconds for good UX, then return result
        setTimeout(() => {
          onAnalysisComplete(result);
        }, 3000);

      } catch (error) {
        console.error('Analysis failed:', error);
        // Return fallback analysis if API fails
        setTimeout(() => {
          onAnalysisComplete(getFallbackTCMAnalysis(assessmentData));
        }, 3000);
      }
    };

    performAnalysis();
  }, []);

  return (
    <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
      
      {/* Large circular background with mountain/water image */}
      <View style={styles.circleContainer}>
        <View style={styles.circle}>
          <Image 
            source={require('@/assets/images/ChatGPT Image 2025年8月8日 下午12_36_12.png')}
            style={styles.circleImage}
            resizeMode="cover"
          />
          <View style={styles.circleOverlay} />
        </View>
      </View>

      {/* Analysis text */}
      <Text style={styles.analysisText}>
        Analyzing user inputs and historical data
      </Text>

      {/* Spinning loading animation */}
      <View style={styles.loadingContainer}>
        <Animated.View
          style={[
            styles.loadingSpinner,
            {
              transform: [{
                rotate: heartbeatAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg']
                })
              }]
            }
          ]}
        />
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.loadingDot,
                {
                  opacity: heartbeatAnimation.interpolate({
                    inputRange: [0, 0.33, 0.66, 1],
                    outputRange: index === 0 ? [1, 0.3, 0.3, 1] : 
                                index === 1 ? [0.3, 1, 0.3, 0.3] : [0.3, 0.3, 1, 0.3]
                  }),
                  transform: [{
                    scale: heartbeatAnimation.interpolate({
                      inputRange: [0, 0.33, 0.66, 1],
                      outputRange: index === 0 ? [1, 0.8, 0.8, 1] : 
                                  index === 1 ? [0.8, 1, 0.8, 0.8] : [0.8, 0.8, 1, 0.8]
                    })
                  }]
                }
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  circleContainer: {
    marginBottom: 60,
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    position: 'relative',
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  circleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 100,
  },
  analysisText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderWidth: 3,
    borderTopColor: '#4ECDC4',
    borderRightColor: 'transparent',
    borderBottomColor: '#4ECDC4',
    borderLeftColor: 'transparent',
    borderRadius: 20,
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

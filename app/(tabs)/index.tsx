import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import type { ComprehensiveAnalysis, PersonalizedAdvice } from '@/services/AIAnalysisService';
import { aiAnalysisService } from '@/services/AIAnalysisService';
import { HealthData, healthService } from '@/services/HealthService';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CONTENT_PADDING = 15;

interface HealthTrend {
  labels: string[];
  data: number[];
}

interface TCMAnalysis {
  title: string;
  subtitle: string;
  description: string;
  result: string;
  recommendations: string[];
  acupressurePoints?: string[];
  acupressureMethods?: string[];
  icon: string;
  color: string;
}

interface AcupressurePoint {
  name: string;
  x: number;
  y: number;
  active: boolean;
  description: string;
}

interface ConstitutionData {
  qi: number;
  blood: number;
  yin: number;
  yang: number;
  dampness: number;
  heat: number;
}

interface WeatherSymptomData {
  date: string;
  temperature: number;
  humidity: number;
  hrv: number;
  sleepScore: number;
  symptomScore: number;
}

export default function HealthOverviewScreen() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [weeklyTrends, setWeeklyTrends] = useState<{
    steps: HealthTrend;
    heartRate: HealthTrend;
    sleep: HealthTrend;
    bloodOxygen: HealthTrend;
    exerciseMinutes: HealthTrend;
    walkingHeartRate: HealthTrend;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('advice');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState('Your Name');
  const [userLocation, setUserLocation] = useState('Your Location');
  const [aiAnalysis, setAiAnalysis] = useState<TCMAnalysis | null>(null);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<ComprehensiveAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [acupressurePoints, setAcupressurePoints] = useState<AcupressurePoint[]>([]);
  const [constitutionData, setConstitutionData] = useState<ConstitutionData | null>(null);
  const [weatherSymptomData, setWeatherSymptomData] = useState<WeatherSymptomData[]>([]);
  const [organHighlights, setOrganHighlights] = useState<string[]>([]);
  const [personalizedAdvice, setPersonalizedAdvice] = useState<PersonalizedAdvice | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadHealthOverviewData();
  }, []);

  const loadHealthOverviewData = async () => {
    try {
      // Load today's data
      const today = new Date();
      const todayData = await healthService.getHealthData(today);
      setHealthData(todayData);

      // Load weekly trends
      const trends = {
        steps: { labels: [] as string[], data: [] as number[] },
        heartRate: { labels: [] as string[], data: [] as number[] },
        sleep: { labels: [] as string[], data: [] as number[] },
        bloodOxygen: { labels: [] as string[], data: [] as number[] },
        exerciseMinutes: { labels: [] as string[], data: [] as number[] },
        walkingHeartRate: { labels: [] as string[], data: [] as number[] },
      };

      // Get data for the past 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const data = await healthService.getHealthData(date);
        
        const dayLabel = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
        
        trends.steps.labels.push(dayLabel);
        trends.steps.data.push(data.steps);
        
        trends.heartRate.labels.push(dayLabel);
        trends.heartRate.data.push(data.heartRate);
        
        trends.sleep.labels.push(dayLabel);
        trends.sleep.data.push(data.sleepDuration);
        
        trends.bloodOxygen.labels.push(dayLabel);
        trends.bloodOxygen.data.push(data.bloodOxygen);

        trends.exerciseMinutes.labels.push(dayLabel);
        trends.exerciseMinutes.data.push(Math.floor(Math.random() * 60) + 10);
        
        trends.walkingHeartRate.labels.push(dayLabel);
        trends.walkingHeartRate.data.push(data.heartRate - Math.floor(Math.random() * 20) + 10);
      }

      setWeeklyTrends(trends);
      
      // Perform comprehensive AI analysis
      setIsAnalyzing(true);
      setAiError(null);
      try {
        const analysis = await aiAnalysisService.analyzeComprehensive(todayData, undefined, userLocation);
        setComprehensiveAnalysis(analysis);
        
        // Also set the constitution analysis for backward compatibility
        const tcmAnalysis: TCMAnalysis = {
          title: 'Body Constitution Tendency',
          subtitle: 'Current Tendency Toward',
          description: 'Based on health data, assessment records, and your residential climate environment (such as Taiwan\'s humid and hot climate), AI identifies constitutional tendencies including Qi deficiency, Blood deficiency, Damp-heat, Yin deficiency, Yang deficiency, etc.',
          result: analysis.constitution.tendency,
          recommendations: analysis.constitution.recommendations,
          icon: 'body-outline',
          color: '#7A8B68'
        };
        setAiAnalysis(tcmAnalysis);

        // Generate visualization data
        setAcupressurePoints(generateAcupressurePoints(todayData));
        setConstitutionData(generateConstitutionData(todayData));
        setWeatherSymptomData(generateWeatherSymptomData());
        setOrganHighlights(getOrganHighlights(todayData));

        // Generate personalized advice
        const personalizedAdviceResult = await aiAnalysisService.analyzePersonalizedAdvice(todayData, undefined, userLocation);
        setPersonalizedAdvice(personalizedAdviceResult);
      } catch (error) {
        console.error('Error performing comprehensive AI analysis:', error);
        setAiError('AI analysis temporarily unavailable. Using basic analysis.');
        
        // 如果AI分析失敗，也嘗試獲取個人化建議
        try {
          const personalizedAdviceResult = await aiAnalysisService.analyzePersonalizedAdvice(todayData, undefined, userLocation);
          setPersonalizedAdvice(personalizedAdviceResult);
        } catch (adviceError) {
          console.error('Error performing personalized advice analysis:', adviceError);
          setAiError('AI analysis temporarily unavailable. Using basic analysis.');
        }
      } finally {
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Error loading health overview data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarPress = () => {
    Alert.alert(
      'Change Avatar',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove Photo', onPress: () => setUserAvatar(null) },
        { text: 'Choose Photo', onPress: () => {
          // In a real app, this would open image picker
          Alert.alert('Photo Picker', 'This would open the photo picker in a real app');
        }},
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert(
      'Edit Profile',
      'Edit your profile information',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit Name', onPress: () => {
          Alert.prompt('Edit Name', 'Enter your name:', (text) => {
            if (text) setUserName(text);
          });
        }},
        { text: 'Edit Location', onPress: () => {
          Alert.prompt('Edit Location', 'Enter your location:', (text) => {
            if (text) setUserLocation(text);
          });
        }},
      ]
    );
  };

  const getBasicConstitutionAnalysis = (healthData: HealthData) => {
    if (healthData.heartRate > 90 && healthData.sleepDuration < 6) {
      return {
        tendency: 'Yin Deficiency Constitution',
        recommendations: [
          'Consume nourishing foods like goji berries and black sesame',
          'Practice gentle exercises like Tai Chi',
          'Maintain regular sleep schedule before 11 PM'
        ]
      };
    } else if (healthData.steps < 5000) {
      return {
        tendency: 'Qi Deficiency Constitution',
        recommendations: [
          'Include warming foods like ginger and dates',
          'Gradually increase physical activity',
          'Consider ginseng supplements after consulting TCM practitioner'
        ]
      };
    } else if (healthData.heartRate > 85) {
      return {
        tendency: 'Damp-Heat Constitution',
        recommendations: [
          'Avoid spicy and greasy foods',
          'Drink chrysanthemum tea for cooling',
          'Increase moderate cardio exercise'
        ]
      };
    } else {
      return {
        tendency: 'Balanced Constitution',
        recommendations: [
          'Maintain current healthy lifestyle',
          'Seasonal dietary adjustments',
          'Continue balanced exercise routine'
        ]
      };
    }
  };

  const generateAcupressurePoints = (healthData: HealthData): AcupressurePoint[] => {
    const basePoints: AcupressurePoint[] = [
      // 手部穴位座標 (基於您提供的SVG手掌輪廓，經過縮放和位移調整)
      { name: 'Laogong (PC8)', x: 165, y: 280, active: false, description: 'Heart calming, stress relief' },
      { name: 'Shenmen (HE7)', x: 130, y: 350, active: false, description: 'Anxiety relief, sleep improvement' },
      { name: 'Hegu (LI4)', x: 110, y: 220, active: false, description: 'Pain relief, headache' },
      { name: 'Yintang (EX-HN3)', x: 140, y: 120, active: false, description: 'Mental clarity, stress relief' },
      { name: 'Ear Shenmen', x: 200, y: 100, active: false, description: 'Addiction recovery, calm mind' },
      { name: 'Kidney Point', x: 150, y: 370, active: false, description: 'Energy boost, kidney health' },
      { name: 'Liver Point', x: 190, y: 300, active: false, description: 'Liver qi regulation, detox' },
      { name: 'Spleen Point', x: 140, y: 330, active: false, description: 'Digestion, energy' },
    ];

    // 根據健康數據激活相應穴位
    if (healthData.sleepDuration < 6 || healthData.heartRate > 90) {
      basePoints[0].active = true; // Laogong - 心火旺
      basePoints[1].active = true; // Shenmen - 失眠
    }
    if (healthData.steps < 5000) {
      basePoints[5].active = true; // Kidney Point - 腎氣虛
      basePoints[7].active = true; // Spleen Point - 脾虛
    }
    if (healthData.heartRate > 85) {
      basePoints[6].active = true; // Liver Point - 肝氣鬱結
    }
    if (healthData.sleepDuration < 6) {
      basePoints[2].active = true; // Hegu - 頭痛失眠
      basePoints[3].active = true; // Yintang - 安神
    }

    return basePoints;
  };

  const generateConstitutionData = (healthData: HealthData): ConstitutionData => {
    // Generate constitution radar data based on health metrics
    let qi = 70, blood = 75, yin = 80, yang = 65, dampness = 30, heat = 40;

    if (healthData.steps < 5000) qi -= 20;
    if (healthData.sleepDuration < 6) yin -= 15;
    if (healthData.heartRate > 90) heat += 20;
    if (healthData.heartRate < 60) yang -= 15;

    return { qi, blood, yin, yang, dampness, heat };
  };

  const generateWeatherSymptomData = (): WeatherSymptomData[] => {
    const data: WeatherSymptomData[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      data.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        temperature: 20 + Math.random() * 15, // 20-35°C
        humidity: 60 + Math.random() * 30, // 60-90%
        hrv: 30 + Math.random() * 40, // 30-70
        sleepScore: 60 + Math.random() * 40, // 60-100
        symptomScore: Math.random() * 50, // 0-50 (lower is better)
      });
    }
    
    return data;
  };

  const getOrganHighlights = (healthData: HealthData): string[] => {
    const highlights: string[] = [];
    
    if (healthData.heartRate > 90 || healthData.sleepDuration < 6) {
      highlights.push('heart');
    }
    if (healthData.steps < 5000) {
      highlights.push('spleen');
    }
    if (healthData.heartRate > 85) {
      highlights.push('liver');
    }
    
    return highlights;
  };

  const getTCMAnalysis = (): TCMAnalysis[] => {
    if (!healthData || !weeklyTrends) return [];

    const avgSleep = weeklyTrends.sleep.data.reduce((a, b) => a + b, 0) / weeklyTrends.sleep.data.length;
    const avgSteps = weeklyTrends.steps.data.reduce((a, b) => a + b, 0) / weeklyTrends.steps.data.length;
    const avgHR = weeklyTrends.heartRate.data.reduce((a, b) => a + b, 0) / weeklyTrends.heartRate.data.length;
    const avgExercise = weeklyTrends.exerciseMinutes.data.reduce((a, b) => a + b, 0) / weeklyTrends.exerciseMinutes.data.length;

    // Body Constitution Analysis - Use AI analysis if available
    let constitutionAnalysis: TCMAnalysis;
    if (aiAnalysis) {
      constitutionAnalysis = aiAnalysis;
    } else {
      // Fallback to basic analysis
      const basicAnalysis = getBasicConstitutionAnalysis(healthData);
      constitutionAnalysis = {
        title: 'Body Constitution Tendency',
        subtitle: 'Current Tendency Toward',
        description: 'Based on health data, assessment records, and your residential climate environment (such as Taiwan\'s humid and hot climate), AI identifies constitutional tendencies including Qi deficiency, Blood deficiency, Damp-heat, Yin deficiency, Yang deficiency, etc.',
        result: basicAnalysis.tendency,
        recommendations: basicAnalysis.recommendations,
        icon: 'body-outline',
        color: '#7A8B68'
      };
    }

    // External Pathogenic Factors - Use AI analysis if available
    let externalAnalysis: TCMAnalysis;
    if (comprehensiveAnalysis?.externalPathogen) {
      externalAnalysis = {
        title: 'Detection of External Pathogenic Factors',
        subtitle: 'External Pathogen Assessment',
        description: 'When physiological data such as elevated body temperature, increased heart rate, or interrupted sleep appears, it may indicate external pathogenic invasion.',
        result: comprehensiveAnalysis.externalPathogen.pathogenType,
        recommendations: comprehensiveAnalysis.externalPathogen.recommendations,
        icon: 'shield-outline',
        color: '#B6892F'
      };
    } else {
      // Fallback analysis
      let externalFactor = '';
      let externalRecommendations = [];
      
      if (healthData.heartRate > 100 || avgSleep < 5) {
        externalFactor = 'Wind-Heat Pattern';
        externalRecommendations = [
          'Drink peppermint or honeysuckle tea',
          'Avoid exposure to wind and heat',
          'Get adequate rest and avoid overexertion'
        ];
      } else if (avgSteps < 3000 && avgSleep > 9) {
        externalFactor = 'Dampness Accumulation';
        externalRecommendations = [
          'Reduce intake of dairy and sweet foods',
          'Include warming spices like ginger',
          'Increase physical movement to promote circulation'
        ];
      } else {
        externalFactor = 'No Significant External Pathogen';
        externalRecommendations = [
          'Maintain good hygiene and diet',
          'Dress appropriately for weather',
          'Keep regular daily routine'
        ];
      }

      externalAnalysis = {
        title: 'Detection of External Pathogenic Factors',
        subtitle: 'External Pathogen Assessment',
        description: 'When physiological data such as elevated body temperature, increased heart rate, or interrupted sleep appears, it may indicate external pathogenic invasion.',
        result: externalFactor,
        recommendations: externalRecommendations,
        icon: 'shield-outline',
        color: '#B6892F'
      };
    }

    // Organ Imbalance Patterns - Use AI analysis if available
    let organAnalysis: TCMAnalysis;
    if (comprehensiveAnalysis?.organImbalance) {
      organAnalysis = {
        title: 'Internal Organ Imbalance Patterns',
        subtitle: 'Organ Function Evaluation',
        description: 'Organ function is evaluated using stress indicators, sleep duration and quality, and activity frequency.',
        result: comprehensiveAnalysis.organImbalance.imbalanceType,
        recommendations: comprehensiveAnalysis.organImbalance.recommendations,
        icon: 'medical-outline',
        color: '#B6442E'
      };
    } else {
      // Fallback analysis
      let organPattern = '';
      let organRecommendations = [];
      
      if (avgSleep < 6.5 && avgHR > 80) {
        organPattern = 'Heart Yin Deficiency';
        organRecommendations = [
          'Practice meditation and stress reduction',
          'Consume longan and red dates',
          'Maintain emotional balance'
        ];
      } else if (avgSteps < 4000 && avgExercise < 15) {
        organPattern = 'Spleen Qi Deficiency with Dampness';
        organRecommendations = [
          'Eat warm, cooked foods',
          'Avoid cold drinks and raw foods',
          'Consider gentle abdominal massage'
        ];
      } else if (avgHR > 85) {
        organPattern = 'Liver Qi Stagnation';
        organRecommendations = [
          'Practice deep breathing exercises',
          'Drink rose tea for liver soothing',
          'Maintain regular sleep schedule'
        ];
    } else {
        organPattern = 'Harmonious Organ Function';
        organRecommendations = [
          'Continue current healthy practices',
          'Seasonal organ nourishment',
          'Regular TCM check-ups'
        ];
      }

      organAnalysis = {
        title: 'Internal Organ Imbalance Patterns',
        subtitle: 'Organ Function Evaluation',
        description: 'Organ function is evaluated using stress indicators, sleep duration and quality, and activity frequency.',
        result: organPattern,
        recommendations: organRecommendations,
        icon: 'medical-outline',
        color: '#B6442E'
      };
    }

    return [constitutionAnalysis, externalAnalysis, organAnalysis];
  };

  const getPersonalizedWellnessAdvice = (): string => {
    if (comprehensiveAnalysis?.wellnessAdvice) {
      return comprehensiveAnalysis.wellnessAdvice.advice;
    }

    // Fallback advice
    if (!healthData || !weeklyTrends) return '';

    const avgSleep = weeklyTrends.sleep.data.reduce((a, b) => a + b, 0) / weeklyTrends.sleep.data.length;
    const avgSteps = weeklyTrends.steps.data.reduce((a, b) => a + b, 0) / weeklyTrends.steps.data.length;
    const avgHR = weeklyTrends.heartRate.data.reduce((a, b) => a + b, 0) / weeklyTrends.heartRate.data.length;

    if (avgSleep < 6 && avgHR > 85) {
      return 'Your data suggests a Yin deficiency pattern. Focus on nourishing foods like black sesame, goji berries, and lily bulbs. Consider acupuncture points Shenmen (HE7) and Yintang (EX-HN3) for calming the mind. Establish a cooling bedtime routine with herbal teas like chrysanthemum or schisandra.';
    } else if (avgSteps < 5000) {
      return 'Your activity level indicates potential Qi stagnation. Incorporate gentle movement like Qigong or walking meditation. Dietary recommendations include warming foods like ginger, cinnamon, and cooked grains. Consider moxibustion therapy at Zusanli (ST36) to boost energy and circulation.';
    } else {
      return 'Your health data shows good overall balance. Continue your current wellness practices while making seasonal adjustments. Focus on maintaining harmony through balanced nutrition, regular exercise, and mindful living. Consider preventive acupuncture sessions during seasonal transitions.';
    }
  };

  const getPersonalizedAdviceByCategory = () => {
    // 優先使用AI分析結果
    if (personalizedAdvice) {
      return {
        diet: personalizedAdvice.diet,
        sleep: personalizedAdvice.sleep,
        emotions: personalizedAdvice.emotions,
        exercise: personalizedAdvice.exercise,
        acupressure: personalizedAdvice.acupressure
      };
    }

    // Fallback to basic analysis if AI is not available
    if (!healthData || !weeklyTrends) return {
      diet: 'Maintain balanced nutrition',
      sleep: 'Aim for 7-8 hours quality sleep',
      emotions: 'Practice mindfulness daily',
      exercise: 'Regular moderate exercise',
      acupressure: 'Use preventive acupressure'
    };

    const avgSleep = weeklyTrends.sleep.data.reduce((a, b) => a + b, 0) / weeklyTrends.sleep.data.length;
    const avgSteps = weeklyTrends.steps.data.reduce((a, b) => a + b, 0) / weeklyTrends.steps.data.length;
    const avgHR = weeklyTrends.heartRate.data.reduce((a, b) => a + b, 0) / weeklyTrends.heartRate.data.length;

    let diet = '';
    let sleep = '';
    let emotions = '';
    let exercise = '';
    let acupressure = '';

    // Diet recommendations based on constitution
    if (avgHR > 85 && avgSleep < 6) {
      diet = 'Focus on cooling foods like goji berries and black sesame. Avoid spicy foods.';
    } else if (avgSteps < 5000) {
      diet = 'Include warming foods like ginger and dates. Avoid cold drinks.';
    } else {
      diet = 'Maintain balanced nutrition with seasonal vegetables and lean proteins.';
    }

    // Sleep recommendations
    if (avgSleep < 6) {
      sleep = 'Sleep before 11 PM. Try herbal teas like chrysanthemum.';
    } else if (avgSleep > 9) {
      sleep = 'Improve sleep quality. Consider morning light exposure.';
    } else {
      sleep = 'Continue current sleep schedule. Maintain consistency.';
    }

    // Emotional recommendations
    if (avgHR > 90) {
      emotions = 'Practice deep breathing and meditation. Reduce stress.';
    } else if (avgSteps < 3000) {
      emotions = 'Engage in social activities and gentle movement.';
    } else {
      emotions = 'Maintain emotional balance through mindfulness.';
    }

    // Exercise recommendations
    if (avgSteps < 5000) {
      exercise = 'Gradually increase activity with Tai Chi or walking.';
    } else if (avgHR > 85) {
      exercise = 'Focus on moderate cardio and yoga.';
    } else {
      exercise = 'Continue current routine with seasonal adjustments.';
    }

    // Acupressure recommendations
    const activePoints = acupressurePoints.filter(p => p.active);
    if (activePoints.length > 0) {
      acupressure = `Focus on ${activePoints.map(p => p.name.split(' ')[0]).join(', ')} points.`;
    } else {
      acupressure = 'Regular acupressure at Zusanli and Shenmen points.';
    }

    return { diet, sleep, emotions, exercise, acupressure };
  };

  const renderAcupressurePointsMap = () => {
    // 使用您提供的SVG文件中的完整手掌輪廓路徑
    const handOutlinePath = "M0 3120 l0 -3120 4120 0 4120 0 0 3120 0 3120 -4120 0 -4120 0 0 -3120z m5860 2534 c107 -91 137 -358 145 -1314 2 -256 15 -378 48 -475 14 -40 14 -40 70 -43 53 -3 55 -2 61 25 18 84 36 333 36 513 0 113 5 261 11 330 5 69 13 215 18 325 9 215 24 286 79 388 92 171 262 127 301 -78 6 -29 9 -372 9 -800 0 -454 4 -780 10 -825 6 -41 16 -113 22 -160 13 -104 33 -185 61 -250 26 -60 45 -64 111 -20 57 38 71 55 92 110 21 55 89 171 131 225 20 26 35 61 43 98 16 83 74 197 127 252 100 103 259 140 357 82 23 -14 51 -38 60 -55 17 -29 17 -30 -28 -123 -50 -102 -69 -159 -108 -319 -17 -69 -36 -118 -54 -145 -16 -22 -55 -85 -87 -140 -32 -55 -91 -154 -130 -220 -40 -66 -96 -167 -125 -225 -29 -58 -66 -124 -82 -147 -15 -23 -58 -116 -94 -205 -129 -320 -223 -470 -366 -583 -53 -41 -73 -88 -99 -235 -20 -108 -15 -395 11 -655 11 -121 24 -254 27 -296 l6 -76 -46 -35 c-55 -42 -218 -111 -325 -139 -136 -35 -291 -45 -482 -31 -117 8 -189 18 -230 32 -80 27 -262 113 -277 131 -9 11 -10 37 -2 105 49 455 49 664 -2 1104 -15 131 -25 181 -38 201 -34 47 -88 163 -114 244 -46 148 -115 439 -137 575 -12 74 -32 196 -45 270 -13 74 -29 171 -35 215 -7 44 -23 141 -35 215 -13 74 -28 164 -34 200 -6 36 -26 102 -45 146 -30 72 -61 170 -94 299 -6 22 -25 85 -43 140 -39 123 -46 258 -16 313 20 36 71 72 102 72 34 0 90 -56 127 -127 60 -114 187 -418 209 -500 11 -43 32 -98 46 -123 14 -25 34 -74 45 -110 21 -70 54 -130 69 -130 28 0 -58 638 -143 1060 -35 176 -37 190 -37 351 -1 176 11 238 58 288 23 24 37 31 68 31 63 0 123 -37 160 -99 44 -73 59 -130 84 -306 11 -82 36 -233 54 -335 31 -166 46 -263 59 -370 5 -44 82 -412 96 -462 11 -38 23 -45 48 -29 28 17 35 191 33 761 -2 597 8 880 34 968 11 35 30 68 59 97 38 41 47 45 89 45 35 0 53 -6 77 -26z m-3412 -39 c39 -33 59 -77 82 -182 23 -107 27 -372 16 -1103 -8 -523 -9 -517 44 -522 22 -3 26 3 42 62 26 94 75 399 83 510 3 52 17 147 31 210 14 63 34 160 45 215 76 381 140 565 209 600 71 37 135 2 169 -91 37 -98 30 -238 -33 -609 -13 -82 -32 -203 -41 -267 -8 -64 -24 -152 -35 -194 -11 -42 -20 -92 -20 -110 0 -18 -11 -109 -25 -204 -14 -95 -25 -192 -25 -218 0 -49 20 -82 51 -82 25 0 75 108 142 310 30 91 67 191 81 223 14 32 26 67 26 78 0 33 58 197 91 260 17 31 43 69 59 84 51 49 121 31 155 -42 30 -63 30 -120 0 -234 -15 -57 -31 -131 -35 -164 -13 -97 -38 -199 -69 -282 -16 -43 -32 -100 -36 -128 -9 -67 -67 -314 -105 -445 -38 -132 -64 -268 -84 -440 -31 -264 -39 -316 -58 -409 -36 -172 -111 -351 -237 -564 -28 -46 -55 -104 -61 -128 -17 -74 -24 -430 -11 -579 15 -167 50 -494 57 -536 5 -28 1 -35 -48 -73 -76 -61 -144 -93 -300 -139 -333 -100 -601 -94 -841 17 -77 36 -122 70 -165 124 -39 49 -39 46 1 277 28 155 60 423 77 632 12 146 9 157 -64 237 -136 148 -330 411 -414 561 -48 86 -159 362 -193 479 -43 148 -80 220 -278 536 -44 71 -83 145 -87 164 -8 51 -57 220 -116 399 -31 97 -48 163 -44 178 4 14 25 34 54 51 61 36 150 37 230 3 103 -44 204 -191 235 -341 11 -54 23 -78 64 -128 27 -33 71 -98 98 -143 27 -46 66 -109 88 -142 39 -58 40 -58 79 -53 22 3 45 10 50 15 5 5 20 69 34 143 13 74 35 188 49 254 13 66 27 158 30 205 4 47 11 105 17 130 5 25 13 316 18 655 7 559 9 618 28 702 23 104 45 143 98 168 31 15 42 15 81 4 25 -6 60 -26 78 -43 65 -62 98 -245 84 -471 -5 -71 -5 -139 -2 -150 3 -11 7 -123 8 -250 1 -165 6 -254 18 -315 9 -47 21 -144 26 -215 17 -223 40 -287 106 -299 21 -4 41 -4 45 1 5 4 20 85 35 178 20 128 29 231 36 420 22 658 29 801 49 950 25 194 32 216 76 255 46 40 108 42 152 5z";
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.handAcupointContainer}>
          {/* 使用您提供的SVG手掌輪廓 */}
          <Svg height={400} width={330} viewBox="0 0 824 624" style={styles.svgOverlay}>
            {/* 手掌輪廓路徑 */}
            <Path
              d={handOutlinePath}
              fill="rgba(255, 255, 255, 0.05)"
              stroke="#56696D"
              strokeWidth="1"
              transform="scale(0.35) translate(50, 80)"
            />
            
            {/* 穴位點 */}
            {acupressurePoints.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="8"
                fill={point.active ? '#58C8D0' : 'rgba(255, 255, 255, 0.6)'}
                stroke={point.active ? '#FFFFFF' : '#56696D'}
                strokeWidth="2"
              />
            ))}
            
            {/* 激活穴位的標籤 */}
            {acupressurePoints.filter(p => p.active).map((point, index) => (
              <SvgText
                key={index}
                x={point.x + 15}
                y={point.y + 5}
                fontSize="10"
                fill="#58C8D0"
                fontWeight="bold"
              >
                {point.name}
              </SvgText>
            ))}
            
            {/* 座標顯示 (可選，用於調試) */}
            {acupressurePoints.filter(p => p.active).map((point, index) => (
              <SvgText
                key={`coord-${index}`}
                x={point.x - 10}
                y={point.y - 10}
                fontSize="8"
                fill="#FFFFFF"
                opacity={0.7}
              >
                ({point.x},{point.y})
              </SvgText>
            ))}
          </Svg>
        </View>
      </View>
    );
  };


  const renderWeatherSymptomChart = () => {
    if (weatherSymptomData.length === 0) return null;

    const chartWidth = 330;
    const chartHeight = 180;
    const padding = 65;
    const leftPadding = 80; // 增加左邊距以對齊Y軸標籤
    const topPadding = 20; // 減少上邊距
    const dataWidth = chartWidth - leftPadding - 20;
    const dataHeight = chartHeight - topPadding - 30;

    const maxTemp = Math.max(...weatherSymptomData.map(d => d.temperature));
    const minTemp = Math.min(...weatherSymptomData.map(d => d.temperature));
    const maxHumidity = Math.max(...weatherSymptomData.map(d => d.humidity));
    const maxHRV = Math.max(...weatherSymptomData.map(d => d.hrv));
    const maxSleep = Math.max(...weatherSymptomData.map(d => d.sleepScore));

    const tempPoints = weatherSymptomData.map((data, index) => ({
      x: leftPadding + (index / (weatherSymptomData.length - 1)) * dataWidth,
      y: topPadding + ((maxTemp - data.temperature) / (maxTemp - minTemp)) * dataHeight
    }));

    const humidityPoints = weatherSymptomData.map((data, index) => ({
      x: leftPadding + (index / (weatherSymptomData.length - 1)) * dataWidth,
      y: topPadding + ((maxHumidity - data.humidity) / maxHumidity) * dataHeight
    }));

    const hrvPoints = weatherSymptomData.map((data, index) => ({
      x: leftPadding + (index / (weatherSymptomData.length - 1)) * dataWidth,
      y: topPadding + ((maxHRV - data.hrv) / maxHRV) * dataHeight
    }));

    const sleepPoints = weatherSymptomData.map((data, index) => ({
      x: leftPadding + (index / (weatherSymptomData.length - 1)) * dataWidth,
      y: topPadding + ((maxSleep - data.sleepScore) / maxSleep) * dataHeight
    }));

    return (
      <View style={styles.chartContainer}>
        <Svg height={chartHeight + 10} width={chartWidth} style={styles.svgChart}>
          {/* Temperature line */}
          <Path
            d={`M ${tempPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke="#2e6c70"
            strokeWidth="2"
            fill="none"
          />
          
          {/* Humidity line */}
          <Path
            d={`M ${humidityPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke="#58C8D0"
            strokeWidth="2"
            fill="none"
          />

          {/* HRV line */}
          <Path
            d={`M ${hrvPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke="#facc00"
            strokeWidth="2"
            fill="none"
          />
          
          {/* Sleep Quality line */}
          <Path
            d={`M ${sleepPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke="#f2e8b8"
            strokeWidth="2"
            fill="none"
          />
          
          {/* X-axis labels */}
          {weatherSymptomData.map((data, index) => (
            <SvgText
              key={index}
              x={leftPadding + (index / (weatherSymptomData.length - 1)) * dataWidth}
              y={chartHeight }
              fontSize="8"
              fill="#B0B0B0"
              textAnchor="middle"
            >
              {data.date}
            </SvgText>
          ))}
          
          {/* Y-axis labels */}
          <SvgText x={10} y={20} fontSize="8" fill="#2e6c70" fontWeight="bold">Temperature</SvgText>
          <SvgText x={10} y={35} fontSize="8" fill="#58C8D0" fontWeight="bold">Humidity</SvgText>
          <SvgText x={10} y={50} fontSize="8" fill="#facc00" fontWeight="bold">HRV</SvgText>
          <SvgText x={10} y={65} fontSize="8" fill="#f2e8b8" fontWeight="bold">Sleep</SvgText>
        </Svg>
          </View>
    );
  };

  const renderOrganMap = () => {
    return (
      <View style={styles.chartContainer}>
        <Svg height={300} width={280} style={styles.svgChart}>
          {/* Heart */}
          <Circle
            cx={140}
            cy={80}
            r="25"
            fill={organHighlights.includes('heart') ? '#FF6B6B' : '#56696D'}
            opacity={organHighlights.includes('heart') ? 0.8 : 0.3}
          />
          <SvgText x={140} y={85} fontSize="12" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">
            Heart
          </SvgText>
          
          {/* Liver */}
          <Circle
            cx={100}
            cy={140}
            r="25"
            fill={organHighlights.includes('liver') ? '#4ECDC4' : '#56696D'}
            opacity={organHighlights.includes('liver') ? 0.8 : 0.3}
          />
          <SvgText x={100} y={145} fontSize="12" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">
            Liver
          </SvgText>
          
          {/* Spleen */}
          <Circle
            cx={180}
            cy={140}
            r="25"
            fill={organHighlights.includes('spleen') ? '#FFE66D' : '#56696D'}
            opacity={organHighlights.includes('spleen') ? 0.8 : 0.3}
          />
          <SvgText x={180} y={145} fontSize="12" fill="#000000" textAnchor="middle" fontWeight="bold">
            Spleen
          </SvgText>
          
          {/* Lungs */}
          <Circle
            cx={80}
            cy={200}
            r="20"
            fill={organHighlights.includes('lung') ? '#A8E6CF' : '#56696D'}
            opacity={organHighlights.includes('lung') ? 0.8 : 0.3}
          />
          <SvgText x={80} y={205} fontSize="10" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">
            Lung
          </SvgText>
          
          <Circle
            cx={200}
            cy={200}
            r="20"
            fill={organHighlights.includes('lung') ? '#A8E6CF' : '#56696D'}
            opacity={organHighlights.includes('lung') ? 0.8 : 0.3}
          />
          <SvgText x={200} y={205} fontSize="10" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">
            Lung
          </SvgText>
          
          {/* Kidneys */}
          <Circle
            cx={120}
            cy={250}
            r="20"
            fill={organHighlights.includes('kidney') ? '#B19CD9' : '#56696D'}
            opacity={organHighlights.includes('kidney') ? 0.8 : 0.3}
          />
          <SvgText x={120} y={255} fontSize="10" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">
            Kidney
          </SvgText>
          
          <Circle
            cx={160}
            cy={250}
            r="20"
            fill={organHighlights.includes('kidney') ? '#B19CD9' : '#56696D'}
            opacity={organHighlights.includes('kidney') ? 0.8 : 0.3}
          />
          <SvgText x={160} y={255} fontSize="10" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">
            Kidney
          </SvgText>
        </Svg>
        </View>
    );
  };

  const renderTCMAnalysisCard = (analysis: TCMAnalysis) => {
    return (
      <View style={styles.analysisCard}>
        <View style={styles.analysisHeader}>
          <View style={styles.analysisTitleRow}>
                        <View style={styles.analysisTitleContainer}>
              <ThemedText style={styles.analysisTitle}>{analysis.title}</ThemedText>
              <ThemedText style={styles.analysisSubtitle}>{analysis.subtitle}</ThemedText>
            </View>
          </View>
        </View>
        
        <ThemedText style={styles.analysisDescription}>{analysis.description}</ThemedText>
        
        <View style={styles.resultContainer}>
          <ThemedText style={styles.resultLabel}>Current Assessment:</ThemedText>
          <ThemedText style={styles.resultText}>{analysis.result}</ThemedText>
        </View>

          <View style={styles.recommendationsContainer}>
          <ThemedText style={styles.recommendationTitle}>Recommendations:</ThemedText>
            {analysis.recommendations.map((rec, index) => (
              <ThemedText key={index} style={styles.recommendationText}>• {rec}</ThemedText>
            ))}
        </View>
      </View>
    );
  };

  const renderConstitutionRadarChart = () => {
    if (!constitutionData) return null;

    const centerX = 120;
    const centerY = 120;
    const radius = 80;
    const categories = ['Qi', 'Blood', 'Yin', 'Yang', 'Dampness', 'Heat'];
    const values = [
      constitutionData.qi,
      constitutionData.blood,
      constitutionData.yin,
      constitutionData.yang,
      constitutionData.dampness,
      constitutionData.heat
    ];

    const points = categories.map((_, index) => {
      const angle = (index * 2 * Math.PI) / categories.length - Math.PI / 2;
      const value = values[index] / 100;
      return {
        x: centerX + Math.cos(angle) * radius * value,
        y: centerY + Math.sin(angle) * radius * value,
        labelX: centerX + Math.cos(angle) * (radius + 20),
        labelY: centerY + Math.sin(angle) * (radius + 20),
        label: categories[index]
      };
    });

    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`
    ).join(' ') + ' Z';

    return (
      <View style={styles.chartContainer}>
        <Svg height={240} width={240} style={styles.svgChart}>
          {/* Grid circles */}
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, index) => (
            <Circle
              key={index}
              cx={centerX}
              cy={centerY}
              r={radius * scale}
              stroke="#56696D"
              strokeWidth="1"
              fill="none"
              opacity={0.3}
            />
          ))}
          
          {/* Grid lines */}
          {categories.map((_, index) => {
            const angle = (index * 2 * Math.PI) / categories.length - Math.PI / 2;
            return (
              <Line
                key={index}
                x1={centerX}
                y1={centerY}
                x2={centerX + Math.cos(angle) * radius}
                y2={centerY + Math.sin(angle) * radius}
                stroke="#56696D"
                strokeWidth="1"
                opacity={0.3}
              />
            );
          })}
          
          {/* Data polygon */}
          <Path
            d={pathData}
            fill="#58C8D0"
            fillOpacity={0.3}
            stroke="#58C8D0"
            strokeWidth="2"
          />
          
          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#58C8D0"
            />
          ))}
          
          {/* Labels */}
          {points.map((point, index) => (
            <SvgText
              key={index}
              x={point.labelX}
              y={point.labelY}
              fontSize="12"
              fill="#FFFFFF"
              textAnchor="middle"
              fontWeight="bold"
            >
              {point.label}
            </SvgText>
          ))}
        </Svg>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: '#FFFFFF' }}>Loading health data...</ThemedText>
        </View>
      </View>
    );
  }

  const tcmAnalyses = getTCMAnalysis();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          {
            paddingTop: Math.max(insets.top + 20, 80),
            paddingBottom: insets.bottom + 15,
          },
        ]}
      >
        <ThemedView style={styles.content}>
          {/* Header with Menu and Edit */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.menuButton}>
            </TouchableOpacity>
            <View style={styles.logoContainer}>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <ThemedText style={styles.editText}>edit</ThemedText>
            </TouchableOpacity>
          </View>

          {/* User Profile */}
          <View style={styles.profileContainer}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress}>
              <View style={styles.avatar}>
                {userAvatar ? (
                  <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
                ) : null}
              </View>
            </TouchableOpacity>
            <ThemedText style={styles.userName}>{userName}</ThemedText>
            <ThemedText style={styles.userLocation}>{userLocation}</ThemedText>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'advice' && styles.activeTab]}
              onPress={() => setActiveTab('advice')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'advice' && styles.activeTabText]}>ADVICE</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'constitution' && styles.activeTab]}
              onPress={() => setActiveTab('constitution')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'constitution' && styles.activeTabText]}>CONSTITUTION</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'external' && styles.activeTab]}
              onPress={() => setActiveTab('external')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'external' && styles.activeTabText]}>EXTERNAL</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'organ' && styles.activeTab]}
              onPress={() => setActiveTab('organ')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'organ' && styles.activeTabText]}>ORGAN</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Content based on active tab */}
          {activeTab === 'advice' && (
            <View style={styles.wellnessAdviceCard}>
              <ThemedText style={styles.wellnessAdviceTitle}>Advice</ThemedText>
              {renderAcupressurePointsMap()}
              
              <View style={styles.personalizedAdviceContainer}>
                <ThemedText style={styles.personalizedAdviceTitle}>Personalized wellness advice</ThemedText>
                
                {isAnalyzing ? (
                  <View style={styles.loadingAdviceContainer}>
                    <ThemedText style={styles.loadingAdviceText}>
                      AI is analyzing your health data, climate environment, and assessment records to provide personalized advice...
                    </ThemedText>
                    {aiError && (
                      <ThemedText style={styles.errorText}>
                        {aiError}
                      </ThemedText>
                    )}
                  </View>
                ) : (
                  (() => {
                    const advice = getPersonalizedAdviceByCategory();
                    return (
                      <View style={styles.adviceCategories}>
                        <View style={styles.adviceCategory}>
                          <ThemedText style={styles.adviceCategoryTitle}>Diet:</ThemedText>
                          <ThemedText style={styles.adviceCategoryText}>{advice.diet}</ThemedText>
                        </View>
                        
                        <View style={styles.adviceCategory}>
                          <ThemedText style={styles.adviceCategoryTitle}>Sleep:</ThemedText>
                          <ThemedText style={styles.adviceCategoryText}>{advice.sleep}</ThemedText>
                        </View>
                        
                        <View style={styles.adviceCategory}>
                          <ThemedText style={styles.adviceCategoryTitle}>Emotions:</ThemedText>
                          <ThemedText style={styles.adviceCategoryText}>{advice.emotions}</ThemedText>
                        </View>
                        
                        <View style={styles.adviceCategory}>
                          <ThemedText style={styles.adviceCategoryTitle}>Exercise:</ThemedText>
                          <ThemedText style={styles.adviceCategoryText}>{advice.exercise}</ThemedText>
                        </View>
                        
                        <View style={styles.adviceCategory}>
                          <ThemedText style={styles.adviceCategoryTitle}>Acupressure:</ThemedText>
                          <ThemedText style={styles.adviceCategoryText}>{advice.acupressure}</ThemedText>
                        </View>
                      </View>
                    );
                  })()
                )}
              </View>
            </View>
          )}

          {activeTab === 'constitution' && (
            <View style={styles.wellnessAdviceCard}>
              <ThemedText style={styles.wellnessAdviceTitle}>Constitution</ThemedText>
              {renderConstitutionRadarChart()}
              <ThemedText style={styles.wellnessAdviceText}>
                Your current data suggests a tendency toward mild Qi and Yang deficiency, reflected by signs like low morning energy, sensitivity to cold, occasional loose stools, and fatigue after exertion.
              </ThemedText>
            </View>
          )}

          {activeTab === 'external' && (
            <View style={styles.wellnessAdviceCard}>
              <ThemedText style={styles.wellnessAdviceTitle}>External Factors</ThemedText>
              {renderWeatherSymptomChart()}
              <ThemedText style={styles.wellnessAdviceText}>
                There may be mild sensitivity to Wind-Cold or Dampness, especially noticeable during seasonal changes or outdoor exposure (e.g., hiking). Occasional body heaviness or bloating may indicate dampness accumulation.
              </ThemedText>
            </View>
          )}

          {activeTab === 'organ' && (
            <View style={styles.wellnessAdviceCard}>
              <ThemedText style={styles.wellnessAdviceTitle}>Organ Imbalance Tendency</ThemedText>
              {renderOrganMap()}
              <ThemedText style={styles.wellnessAdviceText}>
                Signs point to a pattern of Liver Qi stagnation with mild Spleen deficiency. This may relate to emotional stress, irregular eating habits, or weak digestion. Possible symptoms include premenstrual mood changes, digestive sluggishness, or occasional bloating.
              </ThemedText>
            </View>
          )}

          {/* Updated Footer */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              AI-generated suggestions based on health data. For reference only. Not medical advice.
            </ThemedText>
          </View>

        </ThemedView>
      </ScrollView>
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
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: CONTENT_PADDING,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  menuButton: {
    padding: 1,
  },
  logoContainer: {
    alignItems: 'center',
  },
  editButton: {
    padding: 5,
  },
  editText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  userName: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#56696D',
  },
  tab: {
    flex: 1,
    paddingVertical: 2,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#58C8D0',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#56696D',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  activeTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  wellnessAdviceCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 24,
    marginBottom: 24,
    alignItems: 'flex-start',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  wellnessAdviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'left',
  },
  wellnessAdviceSubtitle: {
    fontSize: 11,
    color: '#B0B0B0',
    textAlign: 'left',
    marginBottom: 16,
    lineHeight: 20,
  },
  wellnessAdviceText: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'left',
    lineHeight: 22,
  },
  analysisCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 20,
    marginBottom: 15,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  analysisHeader: {
    marginBottom: 15,
  },
  analysisTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  analysisTitleContainer: {
    flex: 1,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  analysisSubtitle: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 2,
  },
  analysisDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
    marginBottom: 16,
  },
  resultContainer: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 12,
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  recommendationsContainer: {
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    paddingTop: 15,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
    marginBottom: 4,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  chartContainer: {
    marginBottom: 10,
  },
  svgChart: {
    width: '100%',
    height: '100%',
  },

  personalizedAdviceContainer: {
    marginBottom: 16,
  },
  personalizedAdviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'left',
  },
  adviceCategories: {
    marginTop: 8,
  },
  adviceCategory: {
    marginBottom: 12,
  },
  adviceCategoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#58C8D0',
    marginBottom: 4,
  },
  adviceCategoryText: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
  },
  handAcupointContainer: {
    width: 330,
    height: 400,
    alignSelf: 'center',
  },
  svgOverlay: {
    width: '100%',
    height: '100%',
  },
  loadingAdviceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAdviceText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 10,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 14,
  },
});

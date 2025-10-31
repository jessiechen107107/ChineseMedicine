import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import type { ComprehensiveAnalysis, PersonalizedAdvice } from '@/services/AIAnalysisService';
import { aiAnalysisService } from '@/services/AIAnalysisService';
import { getHRVAndHeartRate, HealthData, healthService } from '@/services/HealthService';
import { TCMWeatherAnalysis, WeatherData, weatherIntegrationService } from '@/services/WeatherIntegrationService';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

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

interface ConstitutionData {
  qi: number;
  blood: number;
  yin: number;
  yang: number;
  dampness: number;
  heat: number;
}



interface ExternalPathogensData {
  wind: number;      // 風邪 0-100
  cold: number;      // 寒邪 0-100
  dampness: number;  // 濕邪 0-100
  dryness: number;   // 燥邪 0-100
  heat: number;      // 火邪 0-100
  summerHeat: number; // 暑邪 0-100
}

export default function HealthOverviewScreen() {
  const [latestHR, setLatestHR] = useState<number | null>(null);
  const [latestHRV, setLatestHRV] = useState<number | null>(null);
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
  const [constitutionData, setConstitutionData] = useState<ConstitutionData | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean>(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [tcmWeatherAnalysis, setTcmWeatherAnalysis] = useState<TCMWeatherAnalysis | null>(null);
  
  // Function to open iOS Weather app
  const openWeatherApp = async () => {
    try {
      const weatherURL = 'weather://';
      const canOpen = await Linking.canOpenURL(weatherURL);
      if (canOpen) {
        await Linking.openURL(weatherURL);
      } else {
        // Fallback to App Store if Weather app is not available
        const appStoreURL = 'https://apps.apple.com/app/weather/id1069513131';
        await Linking.openURL(appStoreURL);
      }
    } catch (error) {
      console.error('Failed to open Weather app:', error);
      Alert.alert('Error', 'Unable to open Weather app');
    }
  };
  const [organHighlights, setOrganHighlights] = useState<string[]>([]);
  const [personalizedAdvice, setPersonalizedAdvice] = useState<PersonalizedAdvice | null>(null);
  const [hrvData, setHrvData] = useState<{ date: string; hrv: number }[]>([]);
  const [organFunctionData, setOrganFunctionData] = useState<{
    heart: number;
    liver: number;
    spleen: number;
    lung: number;
    kidney: number;
  }>({ heart: 70, liver: 70, spleen: 70, lung: 70, kidney: 70 });
  const [externalPathogensData, setExternalPathogensData] = useState<ExternalPathogensData>({
    wind: 20,
    cold: 15,
    dampness: 30,
    dryness: 10,
    heat: 25,
    summerHeat: 15
  });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadHealthOverviewData();
    // 讀取最近的 HR 與 HRV 作為示範（全域共用函式）
    getHRVAndHeartRate(24)
      .then(({ heartRate, hrv }) => {
        setLatestHR(heartRate);
        setLatestHRV(hrv);
      })
      .catch(() => {});
  }, []);

  const loadHealthOverviewData = async () => {
    try {
      // Load today's data
      const today = new Date();
      const todayData = await healthService.getHealthData(today);
      setHealthData(todayData);

      // Get weather data for TCM analysis
      try {
        console.log('Loading weather data for TCM analysis...');
        const weatherData = await weatherIntegrationService.getCurrentWeather();
        
        if (weatherData) {
          setCurrentWeather(weatherData);
          setLocationPermissionGranted(true);
          // Update overview header location using reverse-geocoded city/country
          const displayCity = weatherData.location.city && weatherData.location.city !== 'Unknown'
            ? weatherData.location.city
            : 'Current Location';
          const displayCountry = weatherData.location.country && weatherData.location.country !== 'Unknown'
            ? weatherData.location.country
            : '';
          setUserLocation(displayCountry ? `${displayCity}, ${displayCountry}` : displayCity);
          
          // Analyze weather factors for TCM
          const tcmAnalysis = weatherIntegrationService.analyzeTCMWeatherFactors(weatherData);
          setTcmWeatherAnalysis(tcmAnalysis);
          
          console.log('Weather data loaded:', {
            location: weatherData.location.city,
            temperature: weatherData.current.temperature,
            humidity: weatherData.current.humidity,
            tcmFactors: tcmAnalysis.environmentalFactors
          });
          
        } else {
          console.log('Failed to get weather data, using fallback');
          setLocationPermissionGranted(false);
        }
      } catch (weatherError) {
        console.error('Weather integration error:', weatherError);
        setLocationPermissionGranted(false);
      }

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
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const data = await healthService.getHealthData(date);
        
        const dayLabel = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
        
        // 只有當數據存在時才添加到趨勢中
        if (data) {
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
        } else {
          // 如果沒有數據（未來日期），添加佔位符
          trends.steps.labels.push(dayLabel);
          trends.steps.data.push(0);
          
          trends.heartRate.labels.push(dayLabel);
          trends.heartRate.data.push(0);
          
          trends.sleep.labels.push(dayLabel);
          trends.sleep.data.push(0);
          
          trends.bloodOxygen.labels.push(dayLabel);
          trends.bloodOxygen.data.push(0);

          trends.exerciseMinutes.labels.push(dayLabel);
          trends.exerciseMinutes.data.push(0);
          
          trends.walkingHeartRate.labels.push(dayLabel);
          trends.walkingHeartRate.data.push(0);
        }
      }

      setWeeklyTrends(trends);
      
      // Perform comprehensive AI analysis
      setIsAnalyzing(true);
      try {
        // 只有當todayData存在時才進行AI分析
        if (!todayData) {
          console.log('No health data available for today, skipping AI analysis');
          setAiError('No health data available for analysis.');
          return;
        }

        // Generate external pathogens data first
        const pathogensData = generateExternalPathogensData();
        setExternalPathogensData(pathogensData);
        
        const analysis = await aiAnalysisService.analyzeComprehensive(todayData, undefined, userLocation, pathogensData);
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
        setConstitutionData(generateConstitutionData(todayData));

        setOrganHighlights(getOrganHighlights(todayData));
        setHrvData(generateHrvData());
        setOrganFunctionData(generateOrganFunctionData(todayData));

        // Generate personalized advice
        const personalizedAdviceResult = await aiAnalysisService.analyzePersonalizedAdvice(todayData, undefined, userLocation);
        setPersonalizedAdvice(personalizedAdviceResult);
      } catch (error) {
        console.error('Error performing comprehensive AI analysis:', error);
        setAiError('AI analysis temporarily unavailable. Using basic analysis.');
        
        // 如果AI分析失敗，也嘗試獲取個人化建議
        if (todayData) {
          try {
            const personalizedAdviceResult = await aiAnalysisService.analyzePersonalizedAdvice(todayData, undefined, userLocation);
            setPersonalizedAdvice(personalizedAdviceResult);
          } catch (adviceError) {
            console.error('Error performing personalized advice analysis:', adviceError);
            setAiError('AI analysis temporarily unavailable. Using basic analysis.');
            // 設置fallback個人化建議
            setPersonalizedAdvice({
              diet: 'Maintain a balanced diet with warm, cooked foods',
              sleep: 'Maintain a regular sleep schedule, sleeping before 11 PM',
              emotions: 'Practice stress management through meditation or gentle activities',
              exercise: 'Engage in moderate exercise like walking or tai chi',
              acupressure: 'Consider gentle acupressure on Yintang and Baihui points for relaxation'
            });
          }
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
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
      ]
    );
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Sorry, we need camera and photo library permissions to change your avatar.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUserAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUserAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
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

  const generateConstitutionData = (healthData: HealthData): ConstitutionData => {
    // Generate constitution radar data based on health metrics and AI analysis
    let qi = 70, blood = 75, yin = 80, yang = 65, dampness = 30, heat = 40;

    // Analyze heart rate patterns
    if (healthData.heartRate > 90) {
      heat += 25; // High heart rate suggests heat pattern
      yin -= 20;  // Yin deficiency often accompanies heat
    } else if (healthData.heartRate < 60) {
      yang -= 25; // Low heart rate suggests yang deficiency
      qi -= 15;   // Often accompanied by qi deficiency
    }

    // Analyze sleep patterns
    if (healthData.sleepDuration < 6) {
      yin -= 25;  // Poor sleep indicates yin deficiency
      heat += 15; // Sleep disturbance often shows heat pattern
    } else if (healthData.sleepDuration > 9) {
      yang -= 20; // Excessive sleep may indicate yang deficiency
      dampness += 15; // May suggest dampness retention
    }

    // Analyze activity levels
    if (healthData.steps < 3000) {
      qi -= 30;   // Very low activity suggests significant qi deficiency
      yang -= 20; // Low energy indicates yang deficiency
      dampness += 20; // Inactivity can lead to dampness accumulation
    } else if (healthData.steps < 5000) {
      qi -= 15;   // Moderate low activity
      yang -= 10;
    } else if (healthData.steps > 12000) {
      yang += 10; // High activity suggests good yang qi
      qi += 5;
    }

    // Analyze blood oxygen (circulation indicator)
    if (healthData.bloodOxygen < 95) {
      blood -= 20; // Poor oxygen suggests blood stasis
      qi -= 15;    // Often accompanied by qi deficiency
    }

    // Ensure values stay within reasonable bounds
    qi = Math.max(10, Math.min(100, qi));
    blood = Math.max(10, Math.min(100, blood));
    yin = Math.max(10, Math.min(100, yin));
    yang = Math.max(10, Math.min(100, yang));
    dampness = Math.max(0, Math.min(80, dampness));
    heat = Math.max(0, Math.min(80, heat));

    return { qi, blood, yin, yang, dampness, heat };
  };



  const generateHrvData = (): { date: string; hrv: number }[] => {
    const data: { date: string; hrv: number }[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // Generate realistic HRV values (20-80 range)
      const baseHrv = 45; // Average HRV
      const variation = (Math.random() - 0.5) * 30; // ±15 variation
      const hrv = Math.max(20, Math.min(80, baseHrv + variation));
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hrv: Math.round(hrv)
      });
    }
    
    return data;
  };

  const generateOrganFunctionData = (healthData: HealthData) => {
    // Use AI analysis if available, otherwise fallback to simple logic
    if (comprehensiveAnalysis?.internalBalance?.organFunctionScores) {
      return comprehensiveAnalysis.internalBalance.organFunctionScores;
    }

    // Fallback logic (simplified version of the original)
    let heart = 75, liver = 75, spleen = 75, lung = 75, kidney = 75;

    // Basic adjustments based on key health indicators
    if (healthData.heartRate > 90 || healthData.sleepDuration < 6) {
      heart -= 20;
    }
    if (healthData.heartRate > 85 || healthData.sleepDuration < 6) {
      liver -= 15;
    }
    if (healthData.steps < 5000) {
      spleen -= 20;
    }
    if (healthData.bloodOxygen < 95 || healthData.steps < 4000) {
      lung -= 20;
    }
    if (healthData.sleepDuration < 6 || healthData.steps < 3000) {
      kidney -= 20;
    }

    // Ensure values stay within reasonable range
    heart = Math.max(30, Math.min(100, heart));
    liver = Math.max(30, Math.min(100, liver));
    spleen = Math.max(30, Math.min(100, spleen));
    lung = Math.max(30, Math.min(100, lung));
    kidney = Math.max(30, Math.min(100, kidney));

    return { heart, liver, spleen, lung, kidney };
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
    if (!healthData || !weeklyTrends) {
      return {
        diet: 'Load health data for personalized advice.',
        sleep: 'Load health data for personalized advice.',
        emotions: 'Load health data for personalized advice.',
        exercise: 'Load health data for personalized advice.',
        acupressure: 'Load health data for personalized advice.'
      };
    }

    const avgSleep = weeklyTrends.sleep.data.reduce((a, b) => a + b, 0) / weeklyTrends.sleep.data.length;
    const avgSteps = weeklyTrends.steps.data.reduce((a, b) => a + b, 0) / weeklyTrends.steps.data.length;
    const avgHR = weeklyTrends.heartRate.data.reduce((a, b) => a + b, 0) / weeklyTrends.heartRate.data.length;

    let diet = '', sleep = '', emotions = '', exercise = '', acupressure = '';

    // Diet recommendations based on constitution
    if (avgSleep < 6 && avgHR > 85) {
      diet = 'Focus on Yin-nourishing foods: lily bulbs, white fungus, and herbal soups.';
    } else if (avgSteps < 5000) {
      diet = 'Include Qi-boosting foods: ginseng tea, dates, and warm grains.';
    } else {
      diet = 'Maintain balanced nutrition with seasonal adjustments.';
    }

    // Sleep recommendations
    if (avgSleep < 6) {
      sleep = 'Establish calming bedtime routine. Try chrysanthemum tea before bed.';
    } else if (avgSleep > 9) {
      sleep = 'Consider gentle morning exercise to optimize sleep quality.';
    } else {
      sleep = 'Continue good sleep habits with consistent schedule.';
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

    // Acupressure recommendations (simplified without hand chart data)
    if (avgSleep < 6) {
      acupressure = 'Focus on Shenmen (HE7) and Yintang (EX-HN3) points for better sleep.';
    } else if (avgSteps < 5000) {
      acupressure = 'Regular acupressure at Zusanli (ST36) point to boost energy.';
    } else {
      acupressure = 'Regular acupressure at Zusanli and Shenmen points for maintenance.';
    }

    return { diet, sleep, emotions, exercise, acupressure };
  };

  const renderAdviceChart = () => {
    if (!hrvData || !weeklyTrends?.sleep) {
      return null;
    }

    const chartWidth = 320;
    const chartHeight = 200;
    const padding = { top: 20, right: 25, bottom: 35, left: 45 };
    const drawableWidth = chartWidth - padding.left - padding.right;
    
    const hrvValues = hrvData.map(d => d.hrv);
    const sleepValues = weeklyTrends.sleep.data;
    const labels = weeklyTrends.sleep.labels;

    const maxHrv = 100; // Assume max HRV is 100 for normalization
    const maxSleep = 12; // Assume max sleep is 12 hours for normalization

    const yTicks = [0, 20, 40, 60, 80, 100];
    const yTickLabels = ['0', '20', '40', '60', '80', '100'];

    const getYPosition = (value: number) => {
      return padding.top + (1 - value / 100) * (chartHeight - padding.top - padding.bottom);
    };

    const barWidth = drawableWidth / labels.length * 0.4;

    return (
      <View style={styles.chartContainer}>
        <Svg height={chartHeight} width={chartWidth}>
          {/* Y-Axis labels and grid lines */}
          {yTicks.map((tick, index) => (
            <G key={`y-tick-${index}`}>
              <Line
                x1={padding.left}
                y1={getYPosition(tick)}
                x2={chartWidth - padding.right}
                y2={getYPosition(tick)}
                stroke="#56696D"
                strokeDasharray="2, 2"
              />
              <SvgText
                x={padding.left - 8}
                y={getYPosition(tick) + 4}
                fontSize="10"
                fill="#B0B0B0"
                textAnchor="end"
              >
                {yTickLabels[index]}
              </SvgText>
            </G>
          ))}

          {/* X-Axis labels and bars */}
          {labels.map((label, index) => {
            const centerX = padding.left + (index + 0.5) * (drawableWidth / labels.length);
            const sleepValue = (sleepValues[index] / maxSleep) * 100;
            const hrvValue = (hrvValues[index] / maxHrv) * 100;
            
            const sleepBarHeight = (sleepValue / 100) * (chartHeight - padding.top - padding.bottom);
            const hrvBarHeight = (hrvValue / 100) * (chartHeight - padding.top - padding.bottom);

            // Calculate bar positions to ensure they're centered and properly spaced
            const barSpacing = 2; // Space between the two bars
            const sleepBarX = centerX - barWidth - (barSpacing / 2);
            const hrvBarX = centerX + (barSpacing / 2);

            return (
              <G key={`x-tick-${index}`}>
                <SvgText
                  x={centerX}
                  y={chartHeight - padding.bottom + 15}
                  fontSize="10"
                  fill="#B0B0B0"
                  textAnchor="middle"
                >
                  {label}
                </SvgText>

                {/* Sleep Bar (darker) */}
                <Rect
                  x={sleepBarX}
                  y={chartHeight - padding.bottom - sleepBarHeight}
                  width={barWidth}
                  height={sleepBarHeight}
                  fill="#46787d"
                  fillOpacity={0.85}
                  rx="3"
                  ry="3"
                />

                {/* HRV Bar (lighter) */}
                <Rect
                  x={hrvBarX}
                  y={chartHeight - padding.bottom - hrvBarHeight}
                  width={barWidth}
                  height={hrvBarHeight}
                  fill="#8ac8cf"
                  fillOpacity={0.85}
                  rx="3"
                  ry="3"
                />
              </G>
            );
          })}
         </Svg>
         
         {/* Legend */}
         <View style={styles.chartLegend}>
           <View style={styles.legendItem}>
             <View style={[styles.legendColor, { backgroundColor: '#46787d', opacity: 0.9 }]} />
             <ThemedText style={styles.legendText}>Sleep</ThemedText>
           </View>
           <View style={styles.legendItem}>
             <View style={[styles.legendColor, { backgroundColor: '#8ac8cf', opacity: 0.9 }]} />
             <ThemedText style={styles.legendText}>HRV</ThemedText>
           </View>
         </View>
       </View>
     );
   };

  const renderHrvChart = () => {
    if (hrvData.length === 0) return null;

    const chartWidth = 330;
    const chartHeight = 200;
    const leftPadding = 35;
    const rightPadding = 35;
    const topPadding = 20;
    const bottomPadding = 40;
    const dataWidth = chartWidth - leftPadding - rightPadding;
    const dataHeight = chartHeight - topPadding - bottomPadding;

    const maxHrv = Math.max(...hrvData.map(d => d.hrv));
    const minHrv = Math.min(...hrvData.map(d => d.hrv));
    const hrvRange = maxHrv - minHrv;

    // HRV background zones
    const normalZone = 50; // Above 50 is normal, below 50 is low

    const getYPosition = (hrv: number) => {
      return topPadding + ((maxHrv - hrv) / hrvRange) * dataHeight;
    };

    const hrvPoints = hrvData.map((data, index) => ({
      x: leftPadding + (index / (hrvData.length - 1)) * dataWidth,
      y: getYPosition(data.hrv)
    }));

    const pathData = hrvPoints.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`
    ).join(' ');

    return (
      <View style={[styles.chartContainer, { marginVertical: 15 }]}>
        <View style={{ alignItems: 'center' }}>
          <Svg height={chartHeight + 20} width={chartWidth} style={styles.svgChart}>
          {/* Background zones */}
          {/* Low zone (below 50) */}
          <Path
            d={`M ${leftPadding} ${getYPosition(50)} L ${leftPadding + dataWidth} ${getYPosition(50)} L ${leftPadding + dataWidth} ${topPadding + dataHeight} L ${leftPadding} ${topPadding + dataHeight} Z`}
            fill="#d5ebed"
            fillOpacity={0.2}
          />
          {/* Normal zone (above 50) */}
          <Path
            d={`M ${leftPadding} ${topPadding} L ${leftPadding + dataWidth} ${topPadding} L ${leftPadding + dataWidth} ${getYPosition(50)} L ${leftPadding} ${getYPosition(50)} Z`}
            fill="#8ac8cf"
            fillOpacity={0.2}
          />
          
          {/* Grid lines */}
          <Line
            x1={leftPadding}
            y1={getYPosition(normalZone)}
            x2={leftPadding + dataWidth}
            y2={getYPosition(normalZone)}
            stroke="#56696D"
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity={0.3}
          />
          
          {/* HRV line */}
          <Path
            d={pathData}
            stroke="#8ac8cf"
            strokeWidth="3"
            fill="none"
          />
          
          {/* Data points */}
          {hrvPoints.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#8ac8cf"
            />
          ))}
          
          {/* X-axis labels */}
          {hrvData.map((data, index) => (
            <SvgText
              key={index}
              x={leftPadding + (index / (hrvData.length - 1)) * dataWidth}
              y={chartHeight + 15}
              fontSize="10"
              fill="#B0B0B0"
              textAnchor="middle"
            >
              {data.date}
            </SvgText>
          ))}
          
          {/* Y-axis labels */}
          {[minHrv, normalZone, maxHrv].map((value, index) => (
            <SvgText
              key={index}
              x={leftPadding - 10}
              y={getYPosition(value) + 3}
              fontSize="10"
              fill="#B0B0B0"
              textAnchor="end"
            >
              {Math.round(value)}
            </SvgText>
          ))}
          
          {/* Zone labels */}
          <SvgText x={leftPadding + dataWidth - 45} y={topPadding + 15} fontSize="9" fill="#8ac8cf" fontWeight="bold">
            Normal
          </SvgText>
          <SvgText x={leftPadding + dataWidth - 45} y={getYPosition(35)} fontSize="9" fill="#d5ebed" fontWeight="bold">
            Low
          </SvgText>
        </Svg>
        </View>
      </View>
    );
  };



  const renderOrganFunctionChart = () => {
    const organs = [
      { name: 'Heart', key: 'heart', value: organFunctionData.heart },
      { name: 'Liver', key: 'liver', value: organFunctionData.liver },
      { name: 'Spleen', key: 'spleen', value: organFunctionData.spleen },
      { name: 'Lung', key: 'lung', value: organFunctionData.lung },
      { name: 'Kidney', key: 'kidney', value: organFunctionData.kidney },
    ];

    const getProgressColor = (value: number) => {
      if (value >= 70) return '#8ac8cf'; // Normal Function
      return '#46787d'; // Abnormal Function
    };

    const getStatusText = (value: number) => {
      return ''; // 移除所有狀態文字
    };

    return (
      <View style={styles.chartContainer}>
        <View style={styles.organFunctionContainer}>
          {organs.map((organ, index) => (
            <View key={index} style={styles.organProgressItem}>
              <View style={styles.organProgressHeader}>
                <Text style={styles.organName}>{organ.name}</Text>
                <Text style={[styles.organStatus, { color: getProgressColor(organ.value) }]}>
                  {getStatusText(organ.value)}
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${organ.value}%`, 
                        backgroundColor: getProgressColor(organ.value) 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressValue}>{organ.value}%</Text>
              </View>
            </View>
          ))}
        </View>
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

    const centerX = 130;
    const centerY = 130;
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
        <Svg height={260} width={260} style={styles.svgChart}>
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
            fill="#8ac8cf"
            fillOpacity={0.3}
            stroke="#8ac8cf"
            strokeWidth="2"
          />
          
          {/* Data points */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#8ac8cf"
            />
          ))}
          
          {/* Labels with percentages */}
          {points.map((point, index) => (
            <G key={index}>
            <SvgText
                x={point.labelX}
                y={point.labelY - 8}
                fontSize="12"
                fill="#FFFFFF"
                textAnchor="middle"
                fontWeight="bold"
              >
                {point.label}
              </SvgText>
              <SvgText
                x={point.labelX}
                y={point.labelY + 6}
                fontSize="10"
                fill="#8ac8cf"
                textAnchor="middle"
                fontWeight="normal"
              >
                {values[index]}%
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>
    );
  };

  const generateExternalPathogensData = (): ExternalPathogensData => {
    // 基於健康數據、天氣數據和assessment記錄分析外邪程度
    let wind = 20; // 基礎值
    let cold = 15;
    let dampness = 30;
    let dryness = 10;
    let heat = 25;
    let summerHeat = 15;

    // 基於健康數據分析
    if (healthData) {
      // 心率異常可能是風邪或火邪
      if (healthData.heartRate > 90) {
        wind += 20;
        heat += 25;
      } else if (healthData.heartRate < 60) {
        cold += 25;
      }

      // 睡眠品質差可能是心火或風邪
      if (healthData.sleepDuration < 6) {
        heat += 20;
        wind += 15;
      } else if (healthData.sleepDuration > 9) {
        dampness += 20; // 嗜睡可能是濕邪
      }

      // 活動量低可能是濕邪或寒邪
      if (healthData.steps < 3000) {
        dampness += 25;
        cold += 15;
      }

      // 血氧低可能是痰濕阻肺
      if (healthData.bloodOxygen < 95) {
        dampness += 30;
      }
    }

    // 基於真實天氣數據的環境分析
    if (currentWeather && tcmWeatherAnalysis) {
      // 使用真實天氣數據的 TCM 分析結果
      const weatherFactors = tcmWeatherAnalysis.environmentalFactors;
      
      wind += weatherFactors.wind * 0.6;
      cold += weatherFactors.cold * 0.6;
      heat += weatherFactors.heat * 0.6;
      dampness += weatherFactors.dampness * 0.6;
      dryness += weatherFactors.dryness * 0.6;
      summerHeat += weatherFactors.summerHeat * 0.6;
      
      console.log('Applied weather factors to pathogen analysis:', {
        temperature: currentWeather.current.temperature,
        humidity: currentWeather.current.humidity,
        appliedFactors: {
          wind: weatherFactors.wind * 0.6,
          cold: weatherFactors.cold * 0.6,
          heat: weatherFactors.heat * 0.6,
          dampness: weatherFactors.dampness * 0.6
        }
      });
    } else if (locationPermissionGranted) {
      // 備用的季節性分析
      const currentMonth = new Date().getMonth() + 1;
      
      if (currentMonth >= 12 || currentMonth <= 2) {
        cold += 25; wind += 20; dryness += 15;
      } else if (currentMonth >= 6 && currentMonth <= 8) {
        heat += 25; summerHeat += 30; dampness += 15;
      } else if (currentMonth >= 3 && currentMonth <= 5) {
        wind += 25; dampness += 10;
      } else {
        dryness += 30; wind += 15;
      }
    }


    // 限制在0-100範圍內
    return {
      wind: Math.min(100, Math.max(0, wind)),
      cold: Math.min(100, Math.max(0, cold)),
      dampness: Math.min(100, Math.max(0, dampness)),
      dryness: Math.min(100, Math.max(0, dryness)),
      heat: Math.min(100, Math.max(0, heat)),
      summerHeat: Math.min(100, Math.max(0, summerHeat))
    };
  };

  const renderExternalPathogensChart = () => {
    if (!externalPathogensData) return null;

    const centerX = 130;
    const centerY = 130;
    const radius = 80;
    const categories = ['Wind', 'Cold', 'Dampness', 'Dryness', 'Heat', 'Summer Heat'];
    const values = [
      externalPathogensData.wind,
      externalPathogensData.cold,
      externalPathogensData.dampness,
      externalPathogensData.dryness,
      externalPathogensData.heat,
      externalPathogensData.summerHeat
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
        <View style={styles.svgChartWrapper}>
          <Svg height={260} width={260} style={styles.svgChart}>
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
              fill="#8ac8cf"
              fillOpacity={0.3}
              stroke="#8ac8cf"
              strokeWidth="2"
            />
            
            {/* Data points */}
            {points.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#8ac8cf"
              />
            ))}
            
            {/* Labels with percentages */}
            {points.map((point, index) => (
              <G key={index}>
                <SvgText
              x={point.labelX}
                  y={point.labelY - 8}
              fontSize="12"
              fill="#FFFFFF"
              textAnchor="middle"
              fontWeight="bold"
            >
              {point.label}
            </SvgText>
                <SvgText
                  x={point.labelX}
                  y={point.labelY + 6}
                  fontSize="10"
                  fill="#8ac8cf"
                  textAnchor="middle"
                  fontWeight="normal"
                >
                  {values[index]}%
                </SvgText>
              </G>
            ))}

            {/* Center point */}
            <Circle
              cx={centerX}
              cy={centerY}
              r="3"
              fill="#56696D"
            />
        </Svg>
        </View>
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
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialIcons name="camera-alt" size={40} color="#8ac8cf" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <ThemedText style={styles.userName}>{userName}</ThemedText>
            <ThemedText style={styles.userLocation}>{userLocation}</ThemedText>
          </View>

          {/* Quick HR/HRV from HealthKit */}
          <View style={{ marginBottom: 10 }}>
            <ThemedText style={{ color: '#FFFFFF' }}>
              HR: {latestHR ?? '-'} bpm  |  HRV: {latestHRV ?? '-'} ms
            </ThemedText>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'advice' && styles.activeTab]}
              onPress={() => setActiveTab('advice')}
            >
              <ThemedText 
                style={[styles.tabText, activeTab === 'advice' && styles.activeTabText]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                ADVICE
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'constitution' && styles.activeTab]}
              onPress={() => setActiveTab('constitution')}
            >
              <ThemedText 
                style={[styles.tabText, activeTab === 'constitution' && styles.activeTabText]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                CONSTITUTION
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'external' && styles.activeTab]}
              onPress={() => setActiveTab('external')}
            >
              <ThemedText 
                style={[styles.tabText, activeTab === 'external' && styles.activeTabText]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                EXTERNAL
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'internal' && styles.activeTab]}
              onPress={() => setActiveTab('internal')}
            >
              <ThemedText 
                style={[styles.tabText, activeTab === 'internal' && styles.activeTabText]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                INTERNAL
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Content based on active tab */}
          {activeTab === 'advice' && (
            <View style={styles.wellnessAdviceCard}>
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
                        {/* HRV Chart */}
                        {renderAdviceChart()}
                        
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
              <ThemedText style={styles.wellnessAdviceTitle}>Body Constitution Tendency</ThemedText>
              {renderConstitutionRadarChart()}
              <View style={styles.constitutionContent}>
                {comprehensiveAnalysis?.constitution ? (
                  <>
                    <ThemedText style={styles.constitutionLabel}>Constitution:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                      {comprehensiveAnalysis.constitution.tendency}
                    </ThemedText>
                    <ThemedText style={styles.constitutionLabel}>Corresponding symptoms:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                      {comprehensiveAnalysis.constitution.explanation}
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <ThemedText style={styles.constitutionLabel}>Constitution:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                      Qi and Yang Deficiency
                    </ThemedText>
                    <ThemedText style={styles.constitutionLabel}>Corresponding symptoms:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                Your current data suggests a tendency toward mild Qi and Yang deficiency, reflected by signs like low morning energy, sensitivity to cold, occasional loose stools, and fatigue after exertion.
              </ThemedText>
                  </>
                )}
              </View>
            </View>
          )}

          {activeTab === 'external' && (
            <View style={styles.wellnessAdviceCard}>
              <ThemedText style={styles.wellnessAdviceTitle}>Response to External Conditions</ThemedText>
              {renderExternalPathogensChart()}
              <View style={styles.constitutionContent}>
                {comprehensiveAnalysis?.externalPathogen ? (
                  <>
                    <ThemedText style={styles.constitutionLabel}>External factors:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                      {comprehensiveAnalysis.externalPathogen.pathogenType}
                    </ThemedText>
                    <ThemedText style={styles.constitutionLabel}>Corresponding symptoms:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                      {comprehensiveAnalysis.externalPathogen.explanation}
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <ThemedText style={styles.constitutionLabel}>External factors:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                      Wind-Cold or Dampness sensitivity
                    </ThemedText>
                    <ThemedText style={styles.constitutionLabel}>Corresponding symptoms:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                There may be mild sensitivity to Wind-Cold or Dampness, especially noticeable during seasonal changes or outdoor exposure (e.g., hiking). Occasional body heaviness or bloating may indicate dampness accumulation.
              </ThemedText>
                  </>
                )}
              </View>
            </View>
          )}

          {activeTab === 'internal' && (
            <View style={styles.wellnessAdviceCard}>
              <ThemedText style={styles.wellnessAdviceTitle}>Internal Balance Reference</ThemedText>
              {renderOrganFunctionChart()}
              <View style={styles.constitutionContent}>
                {comprehensiveAnalysis?.internalBalance ? (
                  <>
                    <ThemedText style={styles.constitutionLabel}>Patterns of Disharmony:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                      {comprehensiveAnalysis.internalBalance.patterns.join(', ')}
                    </ThemedText>
                    <ThemedText style={styles.constitutionLabel}>Corresponding symptoms:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                      {comprehensiveAnalysis.internalBalance.explanation}
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <ThemedText style={styles.constitutionLabel}>Patterns of Disharmony:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                      Heart Qi Deficiency, Spleen Qi Deficiency
                    </ThemedText>
                    <ThemedText style={styles.constitutionLabel}>Corresponding symptoms:</ThemedText>
                    <ThemedText style={styles.constitutionSymptoms}>
                Signs point to a pattern of Liver Qi stagnation with mild Spleen deficiency. This may relate to emotional stress, irregular eating habits, or weak digestion. Possible symptoms include premenstrual mood changes, digestive sluggishness, or occasional bloating.
              </ThemedText>
                  </>
                )}
              </View>
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
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8ac8cf',
  },
  tabText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#56696D',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  activeTabText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
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
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 0,
  },
  svgChart: {
    alignSelf: 'center',
  },
  svgChartWrapper: {
    width: '100%',
    maxWidth: 600,
    paddingHorizontal: 24,
    alignSelf: 'center',
  },
  constitutionContent: {
    marginTop: 15,
  },
  constitutionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  constitutionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8ac8cf',
  },
  constitutionValue: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  constitutionSymptoms: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
    marginTop: 8,
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
    color: '#8ac8cf',
    marginBottom: 4,
  },
  adviceCategoryText: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
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
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  organFunctionContainer: {
    width: '90%',
    maxWidth: 600,
    paddingHorizontal: 24,
    alignSelf: 'center',
  },
  organProgressItem: {
    marginBottom: 15,
  },
  organProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  organName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  organStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 2,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginRight: 10,
    minWidth: 200,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressValue: {
    fontSize: 12,
    color: '#B0B0B0',
    minWidth: 35,
    textAlign: 'right',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: -5,
    paddingRight: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#B0B0B0',
  },
});

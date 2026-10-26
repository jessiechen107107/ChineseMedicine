# Resume Project Description (English)

## Chinese Medicine Health App | Personal Project

**Technologies**: React Native, TypeScript, Expo, Claude API (Anthropic), Apple HealthKit, iOS Native (Swift), AsyncStorage

Developed a comprehensive mobile health application that integrates Traditional Chinese Medicine (TCM) principles with modern health monitoring technology. The app provides AI-powered wellness analysis by combining real-time health data, weather conditions, and user inputs to deliver personalized TCM-based health insights and recommendations.

**Key Accomplishments:**
- **Architecture & Development**: Built a full-stack mobile application using React Native 0.79.5 and Expo Router with TypeScript, implementing a scalable service-oriented architecture with modular services for health data management, AI analysis, and weather integration

- **Health Data Integration**: Integrated Apple HealthKit (react-native-health) to synchronize and analyze real-time health metrics including heart rate, Heart Rate Variability (HRV), sleep duration/quality, blood oxygen levels, step count, exercise minutes, ECG readings, and menstrual cycle tracking. Implemented historical data aggregation and weekly trend visualizations with custom chart components

- **AI-Powered Analysis Engine**: Implemented comprehensive TCM analysis using Claude API (Anthropic) with multiple analysis types:
  - Constitution analysis (Qi deficiency, Blood deficiency, Yin/Yang imbalance, Damp-heat)
  - Organ function assessment (Heart, Liver, Spleen, Lung, Kidney) with 0-100 scoring system
  - External pathogen detection (Wind, Cold, Dampness, Dryness, Heat, Summer Heat)
  - Internal balance analysis with TCM pattern identification
  - Personalized wellness advice across diet, sleep, emotions, exercise, and acupressure

- **Visual Diagnosis System**: Developed camera-based diagnostic features using expo-camera for facial and tongue diagnosis, with image capture, processing, and AI integration for diagnostic insights

- **Data Visualization**: Created custom interactive visualizations using react-native-svg and react-native-chart-kit:
  - Heart rate and HRV trend charts with time-series data
  - Body constitution radar charts
  - Organ function score displays
  - External pathogen level visualizations
  - Weekly and monthly health trend analysis

- **Weather Integration**: Integrated location-based weather services (expo-location) with TCM weather analysis algorithm that correlates climate factors (temperature, humidity, wind, pressure) with six TCM external pathogens, providing weather-dependent health recommendations

- **Sleep Quality Analysis**: Implemented sleep quality scoring algorithm combining sleep duration, heart rate patterns, HRV data, and blood oxygen levels, with AI-powered analysis and personalized improvement recommendations

- **User Experience**: Built complete authentication system (welcome, sign-in, sign-up screens), tab-based navigation (Overview, Diagnosis, Info), responsive UI with modern design, and iOS native project configuration with Swift integration for HealthKit permissions

**Technical Highlights:**
- Implemented complex state management using React hooks with AsyncStorage for local data persistence and real-time health data synchronization
- Developed robust error handling with retry mechanisms (3 attempts) for API calls, timeout management (25s), and fallback analysis when APIs are unavailable
- Managed sensitive permissions for health data (HealthKit), camera, and location access with proper user prompts and error handling
- Created reusable component architecture with themed components (ThemedText, ThemedView) and specialized modules (AnalysisScreen, ResultsScreen, HeartChart, SleepQualityModal)
- Integrated multiple external APIs (Claude Messages API, Weather APIs) with proper authentication, request/response parsing, and error recovery
- Implemented data aggregation algorithms for historical health data analysis and trend calculation


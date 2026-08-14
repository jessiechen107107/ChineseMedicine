# Chinese Medicine Health App - Project Description

## Project Overview
A comprehensive mobile health application built with React Native and Expo that integrates Traditional Chinese Medicine (TCM) principles with modern health monitoring technology. The app provides AI-powered wellness analysis by combining real-time health data, weather conditions, and user inputs to deliver personalized TCM-based health insights.

## Technical Stack
- **Frontend Framework**: React Native 0.79.5, Expo 53.0.20
- **Language**: TypeScript 5.8.3
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Hooks
- **Health Integration**: react-native-health (Apple HealthKit)
- **AI Services**: Google Gemini API for health analysis
- **Visualization**: react-native-chart-kit, react-native-svg
- **Native Features**: Camera, Location, Image Picker, AsyncStorage
- **Platform**: iOS (with native Swift integration), Android support

## Key Features Implemented

### 1. **User Authentication System**
- Welcome screen with modern UI
- Email-based sign-in and sign-up flows
- User profile management

### 2. **Apple Health Integration**
- Real-time synchronization with Apple HealthKit
- Health data collection including:
  - Heart rate and Heart Rate Variability (HRV)
  - Sleep duration and quality metrics
  - Blood oxygen levels
  - Step count and exercise minutes
  - Menstrual cycle tracking
  - ECG readings
- Historical data analysis with weekly trends visualization
- Permission management and data privacy handling

### 3. **AI-Powered TCM Analysis**
- Comprehensive health analysis using Google Gemini API
- Multiple analysis types:
  - **Constitution Analysis**: Identifies body constitution tendencies (Qi deficiency, Blood deficiency, Yin/Yang imbalance, Damp-heat, etc.)
  - **Organ Function Analysis**: Evaluates the health of five major organs (Heart, Liver, Spleen, Lung, Kidney)
  - **External Pathogen Analysis**: Detects wind, cold, dampness, dryness, heat, and summer heat pathogens
  - **Internal Balance Analysis**: Assesses organ imbalances and patterns
- Personalized wellness advice generation
- Confidence scoring for each analysis

### 4. **Visual Diagnosis System**
- Camera-based facial diagnosis (face reading)
- Tongue diagnosis using camera
- Image capture and processing
- Integration with AI analysis for diagnostic insights

### 5. **Health Data Visualization**
- Interactive charts for health trends:
  - Heart rate variability (HRV) tracking
  - Heart rate trends over time
  - Sleep quality metrics
  - Step count and exercise data
  - Blood oxygen levels
- Custom SVG visualizations for:
  - Body constitution radar charts
  - Organ function scores
  - External pathogen levels
- Weekly and monthly trend analysis

### 6. **Weather Integration**
- Location-based weather data integration
- TCM-based weather analysis correlating climate with health
- Weather-dependent health recommendations
- Integration with iOS Weather app

### 7. **Sleep Quality Analysis**
- Sleep duration tracking
- Sleep quality scoring
- Sleep pattern analysis
- Personalized sleep improvement recommendations

### 8. **Personalized Health Dashboard**
- Real-time health metrics overview
- Daily and weekly health summaries
- Organ system highlights
- Actionable health recommendations
- Tab-based navigation (Overview, Diagnosis, Info)

## Architecture Highlights

### Service Layer
- **HealthService**: Manages Apple HealthKit integration and health data synchronization
- **AIAnalysisService**: Handles Google Gemini API integration and TCM analysis logic
- **WeatherIntegrationService**: Manages weather data fetching and TCM weather analysis
- **SleepQualityService**: Processes sleep data and generates quality metrics

### Component Structure
- Reusable themed components (ThemedText, ThemedView)
- Specialized components (AnalysisScreen, ResultsScreen, HeartChart, SleepQualityModal)
- Modal components for health sync and quality assessment
- Custom SVG chart components

### Data Management
- AsyncStorage for local data persistence
- Real-time health data fetching
- Historical data aggregation and analysis
- State management using React hooks and context

## Development Status
✅ **Completed**:
- Core application structure and navigation
- User authentication flows
- Apple HealthKit integration
- AI analysis service implementation
- Camera-based diagnosis features
- Health data visualization
- Weather integration
- Sleep quality analysis
- iOS native project setup
- UI/UX implementation with modern design

🔄 **In Progress**:
- Android platform optimization
- Additional health metrics integration
- Enhanced AI analysis accuracy
- User onboarding improvements

## Technical Achievements
- Successfully integrated multiple native APIs (HealthKit, Camera, Location)
- Implemented complex data visualization using SVG and chart libraries
- Built scalable service architecture for modular functionality
- Created responsive UI that adapts to different screen sizes
- Integrated external APIs (Google Gemini, Weather) with proper error handling
- Implemented permission management for sensitive health data
- Developed custom health analysis algorithms combining TCM principles with modern health metrics

## Skills Demonstrated
- React Native mobile development
- TypeScript programming
- iOS native development (Swift integration)
- API integration and data management
- Health data processing and visualization
- AI/ML integration
- Camera and media handling
- Location-based services
- State management and data persistence
- Modern UI/UX design implementation


import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyzeFourExams, IntakeData } from '@/services/FourExamsService';

const { width } = Dimensions.get('window');

interface AnalysisScreenProps {
  onAnalysisComplete: (analysisResult: any) => void;
  intake: IntakeData;
}

export default function AnalysisScreen({ onAnalysisComplete, intake }: AnalysisScreenProps) {
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

    // Never throws: falls back to the offline constitution analysis
    const performAnalysis = async () => {
      const [result] = await Promise.all([
        analyzeFourExams(intake),
        new Promise((resolve) => setTimeout(resolve, 3000)), // minimum time for the loading animation
      ]);
      onAnalysisComplete(result);
    };

    performAnalysis();
  }, []);

  return (
    <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
      
      {/* Large circular background with mountain/water image */}
      <View style={styles.circleContainer}>
        <View style={styles.circle}>
          <Image 
            source={require('@/assets/images/tcm-card-bg.png')}
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

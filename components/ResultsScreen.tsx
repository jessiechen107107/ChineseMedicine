import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONSTITUTIONS, FourExamsResult } from '@/services/FourExamsService';

interface ResultsScreenProps {
  onReturnToAssessment: () => void;
  analysisResult: FourExamsResult | null;
}

export default function ResultsScreen({ onReturnToAssessment, analysisResult }: ResultsScreenProps) {
  const insets = useSafeAreaInsets();

  if (!analysisResult) {
    return null; // Don't show anything if no analysis result
  }

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollViewContent,
        { paddingBottom: insets.bottom + 20 }
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Assessment Results</Text>
      </View>

      {/* Results Content */}
      <View style={styles.resultsContainer}>

        {/* Constitution profile */}
        {analysisResult.scores?.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Your Constitution Profile:</Text>
            <Text style={styles.primaryConstitution}>
              {CONSTITUTIONS[analysisResult.primary].name} {CONSTITUTIONS[analysisResult.primary].zh}
            </Text>
            <Text style={styles.sectionSubtitle}>{CONSTITUTIONS[analysisResult.primary].summary}</Text>
            {analysisResult.scores.map(({ key, score }) => (
              <View key={key} style={styles.barRow}>
                <Text style={styles.barLabel}>{CONSTITUTIONS[key].name}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.max(score, 2)}%`, backgroundColor: key === analysisResult.primary ? '#4ECDC4' : '#5A7F7B' },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{score}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Look */}
        {!!analysisResult.observation && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Face & Tongue Observation:</Text>
            <Text style={styles.bodyText}>{analysisResult.observation}</Text>
          </View>
        )}

        {/* Answer to the user's question */}
        {!!analysisResult.answerToQuestion && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>About Your Question:</Text>
            <Text style={styles.bodyText}>{analysisResult.answerToQuestion}</Text>
          </View>
        )}

        {/* Pulse Analysis */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Pulse Analysis:</Text>
          <Text style={styles.bodyText}>{analysisResult.pulseAnalysis || 'Your pulse shows a stable pattern with smooth qi and blood circulation.'}</Text>
        </View>

        {/* Comprehensive Four Diagnosis Analysis */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Comprehensive Assessment:</Text>
          <Text style={styles.bodyText}>{analysisResult.comprehensiveAnalysis || 'Based on observation, listening, inquiry, and assessment, your overall condition appears balanced.'}</Text>
        </View>

        {/* Corresponding Patterns */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Constitutional Patterns:</Text>
          <Text style={styles.bodyText}>{analysisResult.correspondingSymptoms || 'Mental state appears stable with occasional mild fatigue patterns.'}</Text>
        </View>

        {/* Dietary Nourishment Recommendations */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Dietary Nourishment:</Text>
          {(analysisResult.dietRecommendations || []).map((item: string, index: number) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bodyText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Lifestyle Harmony Recommendations */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Lifestyle Harmony:</Text>
          {(analysisResult.lifestyleRecommendations || []).map((item: string, index: number) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bodyText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Acupressure Point Therapy */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Acupressure Guidance:</Text>
          {(analysisResult.acupressurePoints || []).map((item: string, index: number) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.bodyText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Return Button */}
      <View style={styles.returnButtonContainer}>
        <TouchableOpacity style={styles.returnButton} onPress={onReturnToAssessment}>
          <Text style={styles.returnButtonSymbol}>＜</Text>
          <Text style={styles.returnButtonText}>Return to Assessment</Text>
        </TouchableOpacity>
      </View>

      {/* Footer disclaimer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {analysisResult.source === 'gemini'
            ? 'These results are AI-generated from your answers, photos and health data.'
            : 'These results come from an on-device questionnaire analysis of your answers and health data.'}{' '}
          They are for reference only and do not constitute a medical diagnosis or advice.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({

  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resultsContainer: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3B3F',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ECDC4',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#9AA6AC',
    marginBottom: 8,
  },
  primaryConstitution: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabel: {
    width: 110,
    fontSize: 12,
    color: '#C9D3D6',
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2A3B3F',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    width: 32,
    textAlign: 'right',
    fontSize: 12,
    color: '#C9D3D6',
  },
  bodyText: {
    fontSize: 13,
    color: '#E5E5E5',
    lineHeight: 18,
  },
  analysisCategory: {
    fontWeight: '600',
    color: '#4ECDC4',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 13,
    color: '#4ECDC4',
    marginRight: 8,
    marginTop: 2,
  },
  returnButtonContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  returnButtonSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  returnButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    color: '#9AA6AC',
    fontSize: 12,
    textAlign: 'center',
  },

});

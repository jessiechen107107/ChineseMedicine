import { HealthData } from '@/services/HealthService';
import { SleepQualityResult, sleepQualityService } from '@/services/SleepQualityService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

const { width } = Dimensions.get('window');

interface SleepQualityModalProps {
  visible: boolean;
  onClose: () => void;
  healthData: HealthData | null;
}

export function SleepQualityModal({ visible, onClose, healthData }: SleepQualityModalProps) {
  const [qualityResult, setQualityResult] = useState<SleepQualityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && healthData) {
      analyzeSleepQuality();
    }
  }, [visible, healthData]);

  const analyzeSleepQuality = async () => {
    if (!healthData) return;
    
    setIsLoading(true);
    try {
      const result = await sleepQualityService.analyzeSleepQuality(healthData);
      setQualityResult(result);
    } catch (error) {
      console.error('Error analyzing sleep quality:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getQualityColor = (level: string) => {
    switch (level) {
      case 'Great': return '#34C759';
      case 'Normal': return '#007AFF';
      case 'Low': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const getQualityRangeColor = (range: string) => {
    switch (range) {
      case 'Low': return '#FF9500';
      case 'Normal': return '#007AFF';
      case 'Great': return '#34C759';
      default: return '#8E8E93';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#34C759" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Quality</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quality Score Section */}
          <View style={styles.qualitySection}>
            <View style={styles.qualityHeader}>
              <Ionicons name="star" size={20} color="#007AFF" />
              <ThemedText style={styles.qualityLabel}>Quality</ThemedText>
            </View>
            
            {isLoading ? (
              <ThemedText style={styles.loadingText}>Analyzing sleep quality...</ThemedText>
            ) : (
              <ThemedText style={styles.qualityScore}>
                {qualityResult?.qualityScore || 0}%
              </ThemedText>
            )}
          </View>

          {/* Quality Range Bar */}
          <View style={styles.rangeBarContainer}>
            <View style={styles.rangeBar}>
              <View style={[styles.rangeSegment, { backgroundColor: '#FF9500', flex: 1 }]} />
              <View style={[styles.rangeSegment, { backgroundColor: '#007AFF', flex: 1 }]} />
              <View style={[styles.rangeSegment, { backgroundColor: '#34C759', flex: 1 }]} />
            </View>
            
            <View style={styles.rangeLabels}>
              <View style={styles.rangeLabel}>
                <ThemedText style={[styles.rangeText, { color: '#FF9500' }]}>Low</ThemedText>
                <ThemedText style={styles.rangeValue}>&lt;60%</ThemedText>
              </View>
              <View style={styles.rangeLabel}>
                <ThemedText style={[styles.rangeText, { color: '#007AFF' }]}>Normal</ThemedText>
                <ThemedText style={styles.rangeValue}>60-85%</ThemedText>
              </View>
              <View style={styles.rangeLabel}>
                <ThemedText style={[styles.rangeText, { color: '#34C759' }]}>Great</ThemedText>
                <ThemedText style={styles.rangeValue}>&gt;85%</ThemedText>
              </View>
            </View>
          </View>

          {/* Explanation */}
          {qualityResult && (
            <View style={styles.explanationSection}>
              <ThemedText style={styles.explanationText}>
                {qualityResult.explanation}
              </ThemedText>
              
              {qualityResult.recommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <ThemedText style={styles.recommendationsTitle}>Recommendations:</ThemedText>
                  {qualityResult.recommendations.map((rec, index) => (
                    <ThemedText key={index} style={styles.recommendationText}>
                      • {rec}
                    </ThemedText>
                  ))}
                </View>
              )}
            </View>
          )}

          <ThemedText style={styles.disclaimerText}>
            Sleep Quality is calculated based on a comprehensive assessment of your sleep duration, sleep stages, restorative sleep, and other factors. It serves as a reference for evaluating the quality of your sleep on any given day.
          </ThemedText>
          
          <ThemedText style={styles.disclaimerText}>
            If data on sleep stages is missing, sleep quality cannot be assessed for that day.
          </ThemedText>
        </ScrollView>

        {/* Bottom Indicator */}
        <View style={styles.bottomIndicator} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  qualitySection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  qualityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  qualityLabel: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  qualityScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 10,
  },
  rangeBarContainer: {
    marginVertical: 30,
  },
  rangeBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 15,
  },
  rangeSegment: {
    height: '100%',
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    alignItems: 'center',
    flex: 1,
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  rangeValue: {
    fontSize: 12,
    color: '#8E8E93',
  },
  explanationSection: {
    marginVertical: 20,
  },
  explanationText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 24,
    marginBottom: 20,
  },
  recommendationsSection: {
    marginTop: 15,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  recommendationText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 5,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 15,
  },
  bottomIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
}); 
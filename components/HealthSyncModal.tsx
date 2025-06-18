import { ThemedText } from '@/components/ThemedText';
import { healthService } from '@/services/HealthService';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View
} from 'react-native';

interface HealthDataToggle {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
  section: 'write' | 'read';
}

interface HealthSyncModalProps {
  visible: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

export function HealthSyncModal({ visible, onClose, onSyncComplete }: HealthSyncModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [healthToggles, setHealthToggles] = useState<HealthDataToggle[]>([ 
    // READ Section
    { id: 'activity', name: 'Activity', icon: 'flame.fill', color: '#FF3B30', enabled: false, section: 'read' },
    { id: 'bodyMeasurements', name: 'Body Measurements', icon: 'body', color: '#AF52DE', enabled: false, section: 'read' },
    { id: 'cycleTracking', name: 'Cycle Tracking', icon: 'microbe', color: '#FF375F', enabled: false, section: 'read' },
    { id: 'hearing', name: 'Hearing', icon: 'ear-outline', color: '#007AFF', enabled: false, section: 'read' },
    { id: 'heart', name: 'Heart', icon: 'heart.fill', color: '#FF2D55', enabled: false, section: 'read' },
    { id: 'medications', name: 'Medications', icon: 'pills.fill', color: '#5AC8FA', enabled: false, section: 'read' },
    { id: 'mentalWellbeing', name: 'Mental Wellbeing', icon: 'brain.head.profile', color: '#00C7BE', enabled: false, section: 'read' },
    { id: 'mobility', name: 'Mobility', icon: 'figure.walk', color: '#FF9500', enabled: false, section: 'read' },
    { id: 'nutrition', name: 'Nutrition', icon: 'nutrition-outline', color: '#34C759', enabled: false, section: 'read' },
    { id: 'respiratory', name: 'Respiratory', icon: 'lungs.fill', color: '#0A84FF', enabled: false, section: 'read' },
    { id: 'sleep', name: 'Sleep', icon: 'bed.double.fill', color: '#00C7BE', enabled: false, section: 'read' },
    { id: 'symptoms', name: 'Symptoms', icon: 'thermometer.variable.and.figure', color: '#AF52DE', enabled: false, section: 'read' },
    { id: 'vitals', name: 'Vitals', icon: 'waveform.path.ecg', color: '#FF2D92', enabled: false, section: 'read' },
  ]);

  // Load current sync preferences when modal opens
  useEffect(() => {
    const loadSyncPreferences = async () => {
      if (visible) {
        const isConnected = await healthService.isHealthConnected();
        setIsReturningUser(isConnected);
        
        if (isConnected) {
          const permissions = healthService.getPermissions();
          setHealthToggles(prev => 
            prev.map(toggle => ({
              ...toggle,
              enabled: permissions[toggle.id as keyof typeof permissions] || false
            }))
          );
        }
      }
    };

    loadSyncPreferences();
  }, [visible]);

  // Check if any toggles are enabled
  const hasEnabledToggles = healthToggles.some(toggle => toggle.enabled);
  const isAllowButtonDisabled = isLoading || !hasEnabledToggles;

  const handleToggleChange = (id: string) => {
    setHealthToggles(prev => 
      prev.map(toggle => 
        toggle.id === id ? { ...toggle, enabled: !toggle.enabled } : toggle
      )
    );
  };

  const handleTurnOnAll = () => {
    setHealthToggles(prev => 
      prev.map(toggle => ({ ...toggle, enabled: true }))
    );
  };

  const handleAllow = async () => {
    // Require at least one toggle to be enabled
    if (!hasEnabledToggles) {
      return;
    }

    setIsLoading(true);
    try {
      const available = await healthService.isHealthDataAvailable();
      
      if (!available) {
        Alert.alert(
          'Sync Unavailable',
          'This device does not support health data synchronization.',
          [{ text: 'OK', onPress: onClose }]
        );
        return;
      }

      const permissions = await healthService.requestPermissions();
      
      if (permissions.steps || permissions.heartRate || isReturningUser) {
        onSyncComplete();
        onClose();
      } else {
        Alert.alert(
          'Sync Failed',
          'Could not obtain necessary health data permissions.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('Health sync error:', error);
      Alert.alert(
        'Sync Error',
        'An error occurred during health data synchronization.',
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const writeToggles = healthToggles.filter(toggle => toggle.section === 'write');
  const readToggles = healthToggles.filter(toggle => toggle.section === 'read');

  // Helper function to determine if icon is SF Symbol or Ionicon
  const SF_SYMBOLS = [
    'flame.fill', 'heart.fill', 'pills.fill', 'brain.head.profile', 
    'figure.walk', 'lungs.fill', 'bed.double.fill', 
    'thermometer.variable.and.figure', 'waveform.path.ecg',
    'microbe' // Add any SF Symbols without dots here
  ];
  
  const isSFSymbol = (iconName: string) => SF_SYMBOLS.includes(iconName);

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
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <ThemedText style={styles.dontAllowText}>Don't Allow</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Health Access</ThemedText>
          <TouchableOpacity 
            onPress={handleAllow} 
            style={styles.headerButton} 
            disabled={isAllowButtonDisabled}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <ThemedText style={[
                styles.allowText, 
                isAllowButtonDisabled && styles.allowTextDisabled
              ]}>
                Allow
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Health App Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.healthIcon}>
                <Image 
                  source={require('@/assets/images/Icon - Apple Health.png')} 
                  style={styles.healthIconImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Title */}
            <ThemedText style={styles.title}>Health</ThemedText>

            {/* Description */}
            <ThemedText style={styles.description}>
              {isReturningUser 
                ? '"ChineseMedicine" is already connected to Health. Adjust your data sharing preferences below.'
                : '"ChineseMedicine" would like to access and update your Health data.'
              }
            </ThemedText>

            {/* Turn On All Button */}
            <TouchableOpacity style={styles.turnOnAllButton} onPress={handleTurnOnAll}>
              <ThemedText style={styles.turnOnAllText}>Turn On All</ThemedText>
            </TouchableOpacity>

            {/* READ Section */}
            <ThemedText style={[styles.sectionTitle, styles.readSectionTitle]}>ALLOW "ChineseMedicine" TO READ</ThemedText>
            <View style={styles.togglesList}>
              {readToggles.map((toggle, index) => (
                <View key={toggle.id} style={[styles.toggleItem, index === readToggles.length - 1 && styles.lastToggleItem]}>
                  <View style={styles.toggleLeft}>
                    {isSFSymbol(toggle.icon) ? (
                      <SymbolView
                        name={toggle.icon as any}
                        size={20}
                        tintColor={toggle.color}
                        weight="regular"
                        style={styles.symbolIcon}
                        fallback={<Ionicons name="help-outline" size={20} color={toggle.color} />}
                      />
                    ) : (
                      <Ionicons name={toggle.icon as any} size={20} color={toggle.color} />
                    )}
                    <ThemedText style={styles.toggleText}>{toggle.name}</ThemedText>
                  </View>
                  <Switch
                    value={toggle.enabled}
                    onValueChange={() => handleToggleChange(toggle.id)}
                    trackColor={{ false: '#E5E5E5', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E5E5E5"
                  />
                </View>
              ))}
            </View>

            {/* Final App Explanation */}
            <ThemedText style={[styles.explanation, styles.finalExplanation]}>
              App Explanation: Analyze Health Data for ChineseMedicine Insights
            </ThemedText>
            <ThemedText style={styles.footerText}>
              Data you allow can be accessed by the app in the background.
            </ThemedText>
            <ThemedText style={styles.footerText}>
              You can turn off background access in Settings &gt; General &gt; Background App Refresh.
            </ThemedText>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  headerButton: {
    minWidth: 70,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  dontAllowText: {
    fontSize: 17,
    color: '#007AFF',
  },
  allowText: {
    fontSize: 17,
    color: '#007AFF',
    textAlign: 'right',
  },
  allowTextDisabled: {
    color: '#C0C0C0',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  healthIcon: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: '#E5E5E5',
  },
  healthIconImage: {
    width: '100%',
    height: '100%',
  },
  heartContainer: {
    position: 'relative',
  },
  heartGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#000000',
  },
  description: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 20,
    color: '#000000',
    lineHeight: 22,
  },
  turnOnAllButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  turnOnAllText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '400',
    textAlign: 'left',
    paddingLeft: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 10,
    fontWeight: '600',
  },
  readSectionTitle: {
    marginTop: 10,
  },
  togglesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  lastToggleItem: {
    borderBottomWidth: 0,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  symbolIcon: {
    width: 20,
    height: 20,
  },
  toggleText: {
    fontSize: 17,
    color: '#000000',
    flex: 1,
    marginLeft: 12,
  },
  explanation: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 15,
    lineHeight: 18,
  },
  finalExplanation: {
    marginTop: 5,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 5,
  },
}); 
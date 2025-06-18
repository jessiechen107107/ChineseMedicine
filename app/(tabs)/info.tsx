import { HealthSyncModal } from '@/components/HealthSyncModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { HealthData, healthService } from '@/services/HealthService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CONTENT_PADDING = 15;
const DATE_RANGE_DAYS = 60; // Total days to generate (e.g., 30 days before and 30 days after)

interface DayItem {
  date: string;
  day: string;
  fullDate: Date;
  active: boolean;
}

export default function InfoScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dates, setDates] = useState<DayItem[]>([]);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isHealthConnected, setIsHealthConnected] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Helper to format month and day
  const formatMonthDay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  // Check health sync status on component mount
  useEffect(() => {
    const checkHealthSyncStatus = async () => {
      try {
        const connected = await healthService.isHealthConnected();
        setIsHealthConnected(connected);
        
        if (!connected) {
          // Show sync modal if not connected
          setShowSyncModal(true);
        } else {
          // Load health data for selected date
          await loadHealthData(selectedDate);
        }
      } catch (error) {
        console.error('Error checking health sync status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkHealthSyncStatus();
  }, [selectedDate]);

  const loadHealthData = async (date: Date) => {
    try {
      const data = await healthService.getHealthData(date);
      setHealthData(data);
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  };

  useEffect(() => {
    const generateDates = () => {
      const newDates = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today to start of day

      const centralIndex = Math.floor(DATE_RANGE_DAYS / 2);
      const startDate = new Date();
      startDate.setDate(today.getDate() - centralIndex); // Start X days before today

      for (let i = 0; i < DATE_RANGE_DAYS; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        currentDate.setHours(0, 0, 0, 0); // Normalize current date to start of day

        const isToday = currentDate.toDateString() === today.toDateString();
        const isSelected = currentDate.toDateString() === selectedDate.toDateString();

        newDates.push({
          date: currentDate.getDate().toString(),
          day: isToday ? 'Today' : currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: currentDate,
          active: isSelected,
        });
      }
      setDates(newDates);

      // Scroll to the selected date (or today if first render)
      const selectedDateIndex = newDates.findIndex(
        (item) => item.fullDate.toDateString() === selectedDate.toDateString()
      );
      if (scrollViewRef.current && selectedDateIndex !== -1) {
        // Calculate scroll position to center the selected date
        // Approximation: each bubble is ~50px width + 8px margin = 58px.
        // Screen width is 'width', so center is width / 2.
        // Scroll to: (selectedDateIndex * itemWidth) - (scrollViewWidth / 2) + (itemWidth / 2)
        // This is a rough estimation, fine-tuning might be needed.
        const itemWidth = 58; // Approximate width of a date bubble + margin
        const offset = (selectedDateIndex * itemWidth) - (width / 2) + (itemWidth / 2);
        scrollViewRef.current.scrollTo({ x: offset, animated: false });
      }
    };

    generateDates();
  }, [selectedDate]);

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    if (isHealthConnected) {
      await loadHealthData(date);
    }
  };

  const handleTodayPress = async () => {
    const today = new Date();
    setSelectedDate(today);
    if (isHealthConnected) {
      await loadHealthData(today);
    }
  };

  const handleSyncComplete = async () => {
    setIsHealthConnected(true);
    await loadHealthData(selectedDate);
  };

  const handleSyncData = async () => {
    try {
      const success = await healthService.syncHealthData();
      if (success) {
        await loadHealthData(selectedDate);
        Alert.alert('Sync Successful', 'Health data has been updated');
      } else {
        Alert.alert('Sync Failed', 'Please check the Health app permissions');
      }
    } catch (error) {
      Alert.alert('Sync Error', 'An error occurred during synchronization');
    }
  };

  // Format health data values
  const formatSleepDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  };

  return (
    <LinearGradient
      colors={['#7A8B68', '#D1E0C4', '#FFFFFF']}
      style={styles.container}
    >
      {/* Fixed Date Selector Header */}
      <View style={[styles.fixedHeader, { paddingTop: Math.max(insets.top + 20, 80) }]}>
          <View style={styles.headerContainer}>
            <View style={styles.currentDateDisplay}>
              <ThemedText style={styles.currentMonthDay}>{formatMonthDay(selectedDate)}</ThemedText>
            <View style={styles.headerActions}>
              {isHealthConnected && (
                <>
                  <TouchableOpacity onPress={() => setShowSyncModal(true)} style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={15} color={'#FFFFFF'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSyncData} style={styles.syncButton}>
                    <Ionicons name="sync" size={15} color={'#FFFFFF'} />
                  </TouchableOpacity>
                </>
              )}
              {selectedDate.toDateString() !== new Date().toDateString() && (
                <TouchableOpacity onPress={handleTodayPress}>
                  <ThemedText style={styles.todayButton}>Today</ThemedText>
                </TouchableOpacity>
              )}
            </View>
            </View>

            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateSelectorScroll}
            >
              {dates.map((dayItem, index) => (
                <TouchableOpacity
                  key={dayItem.fullDate.toISOString()}
                  style={[styles.dateBubble, dayItem.active && styles.activeDateBubble]}
                  onPress={() => handleDateSelect(dayItem.fullDate)}
                >
                  <ThemedText style={[styles.dateDay, dayItem.active && styles.activeDateDay]}>{dayItem.day}</ThemedText>
                  <ThemedText style={[styles.dateDate, dayItem.active && styles.activeDateDate]}>{dayItem.date}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          {
            paddingBottom: insets.bottom + CONTENT_PADDING,
          },
        ]}
      >
        <ThemedView style={styles.content}>
          {/* Health Status Banner */}
          {!isHealthConnected && (
            <TouchableOpacity 
              style={styles.healthStatusBanner}
              onPress={() => setShowSyncModal(true)}
            >
              <Ionicons name="fitness" size={17} color="#FF6B6B" />
              <ThemedText style={styles.healthStatusText}>Tap to enable health data sync</ThemedText>
              <Ionicons name="chevron-forward" size={17} color="#FF6B6B" />
            </TouchableOpacity>
          )}

          {/* Sleep Card */}
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bed" size={17} color={'#00C7BE'} />
              <ThemedText type="subtitle" style={styles.cardTitle}>Sleep</ThemedText>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={17} color={'#44403c'} />
            </View>
            <View style={styles.cardContentRow}>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricLabel}>Duration</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {healthData ? formatSleepDuration(healthData.sleepDuration) : '-'}
                </ThemedText>
              </View>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricLabel}>Quality</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {healthData ? `${healthData.sleepQuality}%` : '-'}
                </ThemedText>
              </View>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricLabel}>Avg HR</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {healthData ? `${healthData.heartRate}` : '-'}
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>

          {/* Activity Card */}
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="flame" size={17} color={'#FF3B30'} />
              <ThemedText type="subtitle" style={styles.cardTitle}>Activity</ThemedText>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={17} color={'#44403c'} />
            </View>
            <View style={styles.cardContentRow}>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricLabel}>Move</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {healthData ? `${Math.round(healthData.steps * 0.4)}` : '-'}
                  <ThemedText style={styles.unit}>cal</ThemedText>
                </ThemedText>
              </View>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricLabel}>Exercise</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {healthData ? `${Math.round(healthData.steps * 0.02)}` : '-'}
                  <ThemedText style={styles.unit}>min</ThemedText>
                </ThemedText>
              </View>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricLabel}>Stand</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {healthData ? `${Math.round(healthData.steps * 0.008)}` : '-'}
                  <ThemedText style={styles.unit}>hr</ThemedText>
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>

          {/* Heart Rate Card */}
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="heart" size={17} color={'#FF2D55'} />
              <ThemedText type="subtitle" style={styles.cardTitle}>Heart Rate</ThemedText>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={17} color={'#44403c'} />
            </View>
            <View style={styles.cardContentRow}>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricLabel}>Current</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {healthData ? `${healthData.heartRate}` : '-'}
                  <ThemedText style={styles.unit}>bpm</ThemedText>
                </ThemedText>
              </View>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricLabel}>HRV</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {healthData ? `${healthData.heartRateVariability}` : '-'}
                  <ThemedText style={styles.unit}>ms</ThemedText>
                </ThemedText>
              </View>
            </View>
            </TouchableOpacity>

          {/* Blood Oxygen Card */}
          <TouchableOpacity style={styles.card}>
              <View style={styles.cardHeader}>
              <Ionicons name="water" size={17} color={'#d62920'} />
              <ThemedText type="subtitle" style={styles.cardTitle}>Blood Oxygen</ThemedText>
                <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={17} color={'#44403c'} />
              </View>
            <ThemedText style={styles.smallMetricValue}>
              {healthData ? `${healthData.bloodOxygen}%` : '-%'}
            </ThemedText>
            </TouchableOpacity>

          {/* Electrocardiograms (ECG) Card */}
          <TouchableOpacity style={styles.card}>
              <View style={styles.cardHeader}>
              <Ionicons name="medical" size={17} color={'#f2150a'} />
              <ThemedText type="subtitle" style={styles.cardTitle}>Electrocardiograms (ECG)</ThemedText>
                <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={17} color={'#44403c'} />
              </View>
            <ThemedText style={styles.smallMetricValue}>
              {healthData ? healthData.ecgReading : 'No Data'}
            </ThemedText>
            </TouchableOpacity>

          {/* Cycle Tracking Card */}
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="ellipse" size={17} color={'#FF375F'} />
              <ThemedText type="subtitle" style={styles.cardTitle}>Cycle Tracking</ThemedText>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={17} color={'#44403c'} />
            </View>
            <View style={styles.cardContentRow}>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricLabel}>Avg Cycle</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {healthData ? `${healthData.averageCycleLength || 28}` : '-'}
                  <ThemedText style={styles.unit}>days</ThemedText>
                </ThemedText>
              </View>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricLabel}>Period</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {healthData ? `${healthData.periodDuration || 5}` : '-'}
                  <ThemedText style={styles.unit}>days</ThemedText>
                </ThemedText>
              </View>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricLabel}>Last Period</ThemedText>
                <ThemedText style={styles.metricValue}>
                  {healthData 
                    ? (healthData.lastPeriodDate || 'Dec 1, 2024')
                    : 'No Data'
                  }
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>

        </ThemedView>
      </ScrollView>

      {/* Health Sync Modal */}
      <HealthSyncModal
        visible={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onSyncComplete={handleSyncComplete}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    paddingHorizontal: CONTENT_PADDING,
    paddingBottom: 1,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingTop: 1,
  },
  content: {
    paddingHorizontal: CONTENT_PADDING,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    marginBottom: 1,
  },
  currentDateDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  currentMonthDay: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  todayButton: {
    fontSize: 13,
    color: '#7A8B68',
    fontWeight: 'bold',
    paddingVertical: 1,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF', // #FFFFFF
  },
  dateSelectorScroll: {
    flexGrow: 0,
    paddingVertical: 5,
    marginBottom: 15,
  },
  dateBubble: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    minWidth: 50,
    minHeight: 60,
  },
  activeDateBubble: {
    backgroundColor: '#657356',
  },
  dateDay: {
    fontSize: 12,
    color: '#d5d6d4',
  },
  dateDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d5d6d4',
  },
  activeDateDay: {
    color: '#000000',
  },
  activeDateDate: {
    color: '#000000',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#44403c',
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  metricItem: {
    alignItems: 'flex-start',
    marginRight: 60,
  },
  metricLabel: {
    fontSize: 12,
    color: '#44403c',
    marginBottom: 0,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#44403c',
  },
  unit: {
    fontSize: 12,
    color: '#44403c',
  },
  circularProgressPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: '#44403c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityRingsPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordText: {
    fontSize: 14,
    color: '#44403c',
    marginRight: 5,
  },
  feelQuestion: {
    fontSize: 14,
    color: '#44403c',
    marginTop: 8,
  },
  twoColumnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  halfWidthCard: {
    width: (width - (CONTENT_PADDING * 2) - 8) / 2,
    marginBottom: 0,
  },
  smallMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#44403c',
    marginTop: 8,
  },
  circularSmallPlaceholder: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 2,
    borderColor: '#44403c',
    marginTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    padding: 8,
    marginRight: 8,
  },
  healthStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  healthStatusText: {
    flex: 1,
    marginLeft: 12,
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsButton: {
    padding: 8,
    marginRight: 8,
  },
});
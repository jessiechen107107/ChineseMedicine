import { HealthSyncModal } from '@/components/HealthSyncModal';
import { HeartChart } from '@/components/HeartChart';
import { SleepQualityModal } from '@/components/SleepQualityModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { authService } from '@/services/AuthService';
import { HealthData, healthService } from '@/services/HealthService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  isFuture: boolean;
}

export default function InfoScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dates, setDates] = useState<DayItem[]>([]);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isHealthConnected, setIsHealthConnected] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await authService.signOut();
          router.replace('/welcome');
        },
      },
    ]);
  };

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
      setHealthData(data); // data可能為null，這樣可以指示沒有數據
    } catch (error) {
      console.error('Error loading health data:', error);
      setHealthData(null);
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
        const isFuture = currentDate > today;

        newDates.push({
          date: currentDate.getDate().toString(),
          day: isToday ? 'Today' : currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: currentDate,
          active: isSelected,
          isFuture: isFuture,
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

  const handleDateSelect = async (date: Date, isFuture: boolean) => {
    // 禁止選擇未來日期
    if (isFuture) {
      return;
    }
    
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
    <View style={styles.container}>
      {/* Fixed Date Selector Header */}
      <View style={[styles.fixedHeader, { paddingTop: Math.max(insets.top + 20, 80) }]}>
          <View style={styles.headerContainer}>
            <View style={styles.currentDateDisplay}>
              <View style={styles.dateWithBadge}>
                <ThemedText style={styles.currentMonthDay}>{formatMonthDay(selectedDate)}</ThemedText>
                {healthData && (
                  <ThemedText style={styles.dataSourceBadge}>
                    {healthData.source === 'healthkit' ? 'Apple Health' : 'Sample data'}
                  </ThemedText>
                )}
              </View>
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
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} accessibilityLabel="Log out">
                <Ionicons name="log-out-outline" size={17} color={'#FFFFFF'} />
              </TouchableOpacity>
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
                  style={[
                    styles.dateBubble, 
                    dayItem.active && styles.activeDateBubble,
                    dayItem.isFuture && styles.futureDateBubble
                  ]}
                  onPress={() => handleDateSelect(dayItem.fullDate, dayItem.isFuture)}
                  disabled={dayItem.isFuture}
                >
                  <ThemedText style={[
                    styles.dateDay, 
                    dayItem.active && styles.activeDateDay,
                    dayItem.isFuture && styles.futureDateDay
                  ]}>
                    {dayItem.day}
                  </ThemedText>
                  <ThemedText style={[
                    styles.dateDate, 
                    dayItem.active && styles.activeDateDate,
                    dayItem.isFuture && styles.futureDateDate
                  ]}>
                    {dayItem.date}
                  </ThemedText>
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
              <Ionicons name="fitness" size={17} color="#1E2B2F" />
              <ThemedText style={styles.healthStatusText}>Tap to enable health data sync</ThemedText>
              <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Future Date Banner */}
          {healthData === null && (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selected = new Date(selectedDate);
            selected.setHours(0, 0, 0, 0);
            return selected > today;
          })() && (
            <View style={styles.futureDateBanner}>
              <Ionicons name="time" size={17} color="#56696D" />
              <ThemedText style={styles.futureDateText}>Health data is not available for future dates</ThemedText>
            </View>
          )}

          {/* Sleep Section */}
          <View style={styles.sectionContainer}>
            <View style={[styles.cardHeader, styles.indentedHeader]}>
              <ThemedText type="subtitle" style={styles.cardTitle}>Sleep</ThemedText>
            </View>
            
            {/* Sleep Cards Row */}
            <View style={styles.sleepCardsRow}>
              {/* Sleep Card */}
              <View style={[styles.sleepCard, { backgroundColor: '#61A494' }]}>
                <Ionicons name="moon" size={13} color={'#FFFFFF'} />
                <ThemedText style={styles.sleepCardValue}>
                  {healthData ? formatSleepDuration(healthData.sleepDuration) : '5h 30m'}
                </ThemedText>
                <ThemedText style={styles.sleepCardLabel}>Sleep</ThemedText>
              </View>

              {/* Deep Sleep Card */}
              <View style={[styles.sleepCard, { backgroundColor: '#4E8F80' }]}>
                <ThemedText style={styles.deepSleepIcon}>Z</ThemedText>
                <ThemedText style={styles.sleepCardValue}>
                  {healthData ? `${Math.floor(healthData.sleepDuration * 0.2)}h ${Math.round((healthData.sleepDuration * 0.2 % 1) * 60)}m` : '1h 10m'}
                </ThemedText>
                <ThemedText style={styles.sleepCardLabel}>Deep</ThemedText>
              </View>

              {/* Quality Sleep Card */}
              <TouchableOpacity 
                style={[styles.sleepCard, { backgroundColor: '#68B19D' }]}
                onPress={() => setShowQualityModal(true)}
              >
                <Ionicons name="star" size={13} color={'#FFFFFF'} />
                <ThemedText style={styles.sleepCardValue}>
                  {healthData ? `${Math.floor(healthData.sleepDuration * 0.6)}h ${Math.round((healthData.sleepDuration * 0.6 % 1) * 60)}m` : '3h 30m'}
                </ThemedText>
                <ThemedText style={styles.sleepCardLabel}>Quality</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Heart Chart */}
          <HeartChart selectedDate={selectedDate} />

          {/* Activity Card */}
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle" style={styles.cardTitle}>Activity</ThemedText>
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

          {/* Cycle Tracking Card */}
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle" style={styles.cardTitle}>Cycle Tracking</ThemedText>
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

      {/* Sleep Quality Modal */}
      <SleepQualityModal
        visible={showQualityModal}
        onClose={() => setShowQualityModal(false)}
        healthData={healthData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E2B2F',
  },
  fixedHeader: {
    paddingHorizontal: CONTENT_PADDING,
    paddingBottom: 1,
    zIndex: 1,
    backgroundColor: '#1E2B2F',
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
    color: '#FFFFFF',
  },
  todayButton: {
    fontSize: 13,
    color: '#1E2B2F',
    fontWeight: 'bold',
    paddingVertical: 1,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#8ac8cf',
  },
  dateSelectorScroll: {
    flexGrow: 0,
    paddingVertical: 5,
    marginBottom: 15,
    backgroundColor: 'transparent',
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
    backgroundColor: '#8ac8cf',
  },
  dateDay: {
    fontSize: 12,
    color: '#B0B0B0',
  },
  dateDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B0B0B0',
  },
  activeDateDay: {
    color: '#1E2B2F',
  },
  activeDateDate: {
    color: '#1E2B2F',
  },
  card: {
    backgroundColor: '#2A3B3FCC',
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
    color: '#FFFFFF',
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
    color: '#B0B0B0',
    marginBottom: 0,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  unit: {
    fontSize: 12,
    color: '#B0B0B0',
  },
  circularProgressPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: '#8ac8cf',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityRingsPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A3B3F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginRight: 5,
  },
  feelQuestion: {
    fontSize: 14,
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    marginTop: 8,
  },
  circularSmallPlaceholder: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 2,
    borderColor: '#8ac8cf',
    marginTop: 8,
  },
  dateWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataSourceBadge: {
    fontSize: 11,
    color: '#1E2B2F',
    backgroundColor: '#C9D8D2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 1,
    overflow: 'hidden',
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    padding: 8,
    marginRight: 8,
  },
  logoutButton: {
    padding: 8,
    marginLeft: 4,
  },
  healthStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8ac8cf',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  healthStatusText: {
    flex: 1,
    marginLeft: 12,
    color: '#1E2B2F',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsButton: {
    padding: 8,
    marginRight: 8,
  },
  futureDateBubble: {
    opacity: 0.3,
    backgroundColor: 'transparent',
  },
  futureDateDay: {
    color: '#56696D',
  },
  futureDateDate: {
    color: '#56696D',
  },
  futureDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A3B3F',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  futureDateText: {
    flex: 1,
    marginLeft: 12,
    color: '#56696D',
    fontSize: 14,
    fontWeight: '500',
  },
  sleepCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sleepCard: {
    backgroundColor: '#2A3B3FCC',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 105,
    height: 170,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sleepCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  sleepCardLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  deepSleepIcon: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionContainer: {
    marginBottom: 10,
  },
  indentedHeader: {
    marginLeft: 15,
  },
});
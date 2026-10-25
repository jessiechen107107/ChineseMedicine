import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import AppleHealthKit, { HealthKitPermissions, HealthValue } from 'react-native-health';

export interface HealthData {
  steps: number;
  heartRate: number;
  heartRateVariability: number;
  averageRHR: number; // 平均靜息心率
  averageHRV: number; // 平均心率變異性
  bloodOxygen: number;
  sleepDuration: number;
  sleepQuality: number;
  ecgReading: string;
  lastSyncTime: Date;
  date: string; // YYYY-MM-DD format
  averageCycleLength: number;
  periodDuration: number;
  lastPeriodDate: string;
  // 'healthkit': at least some values come from Apple Health; 'demo': all values are sample data
  source?: 'healthkit' | 'demo';
}

export interface HealthPermissions {
  steps: boolean;
  heartRate: boolean;
  heartRateVariability: boolean;
  bloodOxygen: boolean;
  sleep: boolean;
  ecg: boolean;
  cycleTracking: boolean;
}

class HealthService {
  private isConnected: boolean = false;
  private initInProgress: Promise<void> | null = null;
  private permissions: HealthPermissions = {
    steps: false,
    heartRate: false,
    heartRateVariability: false,
    bloodOxygen: false,
    sleep: false,
    ecg: false,
    cycleTracking: false,
  };

  private readonly HEALTH_DATA_KEY = '@health_data_v2';
  private readonly HEALTH_SYNC_KEY = '@health_sync_enabled';
  private hasRequestedNativePermissions: boolean = false;

  // 檢查是否可以訪問健康數據
  async isHealthDataAvailable(): Promise<boolean> {
    // 在實際應用中，這裡會檢查HealthKit/Health Connect可用性
    return Platform.OS === 'ios'; // 模擬只在iOS上可用
  }

  // 檢查是否已同步
  async isHealthSyncEnabled(): Promise<boolean> {
    try {
      const syncEnabled = await AsyncStorage.getItem(this.HEALTH_SYNC_KEY);
      return syncEnabled === 'true';
    } catch (error) {
      console.error('Error checking health sync status:', error);
      return false;
    }
  }

  // 請求健康數據權限並啟用同步
  async requestPermissions(): Promise<HealthPermissions> {
    try {
      if (Platform.OS === 'ios') {
        const permissions: HealthKitPermissions = {
          permissions: {
            read: [
              AppleHealthKit.Constants.Permissions.HeartRate,
              AppleHealthKit.Constants.Permissions.HeartRateVariability,
              AppleHealthKit.Constants.Permissions.Steps,
              AppleHealthKit.Constants.Permissions.SleepAnalysis,
              AppleHealthKit.Constants.Permissions.OxygenSaturation,
              AppleHealthKit.Constants.Permissions.RestingHeartRate,
            ],
            write: [],
          },
        } as HealthKitPermissions;

        await new Promise<void>((resolve, reject) => {
          AppleHealthKit.initHealthKit(permissions, (error: string) => {
            if (error) {
              console.warn('[HealthKit] init error:', error);
              reject(new Error(error));
              return;
            }
            this.hasRequestedNativePermissions = true;
            resolve();
          });
        });
      }

      this.permissions = {
        steps: true,
        heartRate: true,
        heartRateVariability: true,
        bloodOxygen: true,
        sleep: true,
        ecg: true,
        cycleTracking: true,
      };

      this.isConnected = true;
      
      // 儲存同步狀態
      await AsyncStorage.setItem(this.HEALTH_SYNC_KEY, 'true');
      
      // 初始化一些歷史數據
      await this.initializeHistoricalData();
      
      return this.permissions;
    } catch (error) {
      console.error('Error requesting health permissions:', error);
      return this.permissions;
    }
  }

  // 僅初始化一次 HealthKit（避免重覆彈窗與重覆初始化）
  async initHealthKitOnce(): Promise<void> {
    if (this.isConnected || this.hasRequestedNativePermissions) {
      return;
    }
    if (this.initInProgress) {
      await this.initInProgress;
      return;
    }
    this.initInProgress = (async () => {
      try {
        await this.requestPermissions();
      } finally {
        this.initInProgress = null;
      }
    })();
    await this.initInProgress;
  }

  // 從 HealthKit 讀取心跳與 HRV（最近 N 小時）
  async fetchRecentHeartMetrics(hoursBack: number = 24): Promise<{ heartRate: number | null; hrv: number | null; samples: { hr: HealthValue[]; hrv: HealthValue[] } }>{
    if (Platform.OS !== 'ios') {
      return { heartRate: null, hrv: null, samples: { hr: [], hrv: [] } };
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hoursBack * 60 * 60 * 1000);

    const toISO = (d: Date) => d.toISOString();

    const hrSamples: HealthValue[] = await new Promise((resolve) => {
      AppleHealthKit.getHeartRateSamples({ startDate: toISO(startDate), endDate: toISO(endDate), ascending: false, limit: 1000 }, (err: string, results: HealthValue[]) => {
        if (err) {
          console.warn('[HealthKit] getHeartRateSamples error:', err);
          resolve([]);
          return;
        }
        resolve(results || []);
      });
    });

    const hrvSamples: HealthValue[] = await new Promise((resolve) => {
      AppleHealthKit.getHeartRateVariabilitySamples({ startDate: toISO(startDate), endDate: toISO(endDate), ascending: false, limit: 1000 }, (err: string, results: HealthValue[]) => {
        if (err) {
          console.warn('[HealthKit] getHeartRateVariabilitySamples error:', err);
          resolve([]);
          return;
        }
        resolve(results || []);
      });
    });

    const latestHR = hrSamples.length > 0 ? Number(hrSamples[0].value) : null;
    const latestHRV = hrvSamples.length > 0 ? Number(hrvSamples[0].value) : null; // SDNN in ms

    return { heartRate: latestHR, hrv: latestHRV, samples: { hr: hrSamples, hrv: hrvSamples } };
  }

  // 提供給其他畫面直接呼叫的函式：取得 HR 與 HRV
  async getHRVAndHeartRate(hoursBack: number = 24): Promise<{ heartRate: number | null; hrv: number | null; samples: { hr: HealthValue[]; hrv: HealthValue[] } }>{
    try {
      if (Platform.OS === 'ios' && !this.hasRequestedNativePermissions) {
        await this.initHealthKitOnce();
      }
    } catch (e) {
      // 即使初始化失敗，仍嘗試讀取（會回傳空資料結構）
    }
    return this.fetchRecentHeartMetrics(hoursBack);
  }

  // 初始化歷史健康數據
  private async initializeHistoricalData(): Promise<void> {
    try {
      const today = new Date();
      const healthDataMap: { [key: string]: HealthData } = {};

      // 生成過去30天的數據
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        healthDataMap[dateString] = this.generateHealthDataForDate(date);
      }

      await AsyncStorage.setItem(this.HEALTH_DATA_KEY, JSON.stringify(healthDataMap));
    } catch (error) {
      console.error('Error initializing health data:', error);
    }
  }

  // 為特定日期生成健康數據
  private generateHealthDataForDate(date: Date): HealthData {
    const dateString = date.toISOString().split('T')[0];
    
    // Seed by date for stable data; each field gets its own seed so values don't move in lockstep
    const seed = Math.floor(date.getTime() / 86400000);
    let call = 0;
    const random = (min: number, max: number) => {
      call += 1;
      const x = Math.sin(seed * 12.9898 + call * 78.233) * 43758.5453;
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
    };

    return {
      steps: random(3000, 12000),
      heartRate: random(60, 90),
      heartRateVariability: random(30, 50),
      averageRHR: random(45, 70), // 平均靜息心率
      averageHRV: random(25, 60), // 平均心率變異性
      bloodOxygen: random(95, 100),
      sleepDuration: random(6, 9),
      sleepQuality: random(60, 95),
      ecgReading: random(1, 10) > 8 ? 'Irregular' : 'Normal',
      lastSyncTime: new Date(),
      date: dateString,
      averageCycleLength: random(18, 45), // Expanded range: 18-45 days for irregular cycles
      periodDuration: random(2, 10), // Expanded range: 2-10 days for irregular periods
      lastPeriodDate: this.getLastPeriodDate(date),
      source: 'demo',
    };
  }

  // Promise wrapper for the HealthKit callback API
  private hkCall<T>(fn: (options: any, cb: (err: string, results: T) => void) => void, options: any): Promise<T | null> {
    return new Promise((resolve) => {
      try {
        fn(options, (err, results) => resolve(err ? null : results));
      } catch {
        resolve(null);
      }
    });
  }

  // Read real Apple Health data for a day; fields with no samples are omitted
  private async readHealthKitDay(date: Date): Promise<Partial<HealthData>> {
    if (Platform.OS !== 'ios' || !this.hasRequestedNativePermissions) return {};

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const range = { startDate: start.toISOString(), endDate: end.toISOString() };
    // Count sleep from 18:00 the previous evening to 12:00 on the day
    const sleepStart = new Date(start.getTime() - 6 * 3600000);
    const sleepEnd = new Date(start.getTime() + 12 * 3600000);

    const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
    const HK = AppleHealthKit as any;

    const [steps, hr, hrv, rhr, spo2, sleep] = await Promise.all([
      this.hkCall<HealthValue>(HK.getStepCount, { date: start.toISOString(), includeManuallyAdded: true }),
      this.hkCall<HealthValue[]>(HK.getHeartRateSamples, { ...range, limit: 1000 }),
      this.hkCall<HealthValue[]>(HK.getHeartRateVariabilitySamples, { ...range, limit: 1000 }),
      this.hkCall<HealthValue[]>(HK.getRestingHeartRateSamples, { ...range, limit: 10 }),
      this.hkCall<HealthValue[]>(HK.getOxygenSaturationSamples, { ...range, limit: 1000 }),
      this.hkCall<any[]>(HK.getSleepSamples, { startDate: sleepStart.toISOString(), endDate: sleepEnd.toISOString(), limit: 1000 }),
    ]);

    const result: Partial<HealthData> = {};

    if (steps && Number(steps.value) > 0) result.steps = Math.round(Number(steps.value));

    const hrAvg = avg((hr || []).map((s) => Number(s.value)));
    if (hrAvg) result.heartRate = Math.round(hrAvg);

    // HRV (SDNN) defaults to seconds; convert to ms
    const hrvAvg = avg((hrv || []).map((s) => {
      const v = Number(s.value);
      return v < 1 ? v * 1000 : v;
    }));
    if (hrvAvg) {
      result.heartRateVariability = Math.round(hrvAvg);
      result.averageHRV = Math.round(hrvAvg);
    }

    const rhrAvg = avg((rhr || []).map((s) => Number(s.value)));
    if (rhrAvg) result.averageRHR = Math.round(rhrAvg);

    // SpO2 may come back as a 0-1 fraction
    const spo2Avg = avg((spo2 || []).map((s) => {
      const v = Number(s.value);
      return v <= 1 ? v * 100 : v;
    }));
    if (spo2Avg) result.bloodOxygen = Math.round(spo2Avg);

    // Only count asleep stages (ASLEEP on older devices, CORE/DEEP/REM on newer ones)
    const asleepMs = (sleep || [])
      .filter((s) => ['ASLEEP', 'CORE', 'DEEP', 'REM'].includes(String(s.value).toUpperCase()))
      .reduce((sum, s) => sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()), 0);
    if (asleepMs > 0) result.sleepDuration = Math.round((asleepMs / 3600000) * 10) / 10;

    return result;
  }

  // 獲取健康數據
  async getHealthData(date: Date = new Date()): Promise<HealthData | null> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      // 如果是未來日期，返回null
      if (targetDate > today) {
        return null;
      }

      const dateString = date.toISOString().split('T')[0];

      // Prefer real Apple Health data and fill missing fields with sample data
      const real = await this.readHealthKitDay(date);
      if (Object.keys(real).length > 0) {
        return {
          ...this.generateHealthDataForDate(date),
          ...real,
          lastSyncTime: new Date(),
          source: 'healthkit',
        };
      }

      const storedData = await AsyncStorage.getItem(this.HEALTH_DATA_KEY);
      
      if (storedData) {
        const healthDataMap = JSON.parse(storedData);
        if (healthDataMap[dateString]) {
          return {
            ...healthDataMap[dateString],
            lastSyncTime: new Date(healthDataMap[dateString].lastSyncTime),
          };
        }
      }

      // 只為過去和今天的日期生成數據
      const newData = this.generateHealthDataForDate(date);
      
      // 儲存新數據
      const healthDataMap = storedData ? JSON.parse(storedData) : {};
      healthDataMap[dateString] = newData;
      await AsyncStorage.setItem(this.HEALTH_DATA_KEY, JSON.stringify(healthDataMap));
      
      return newData;
    } catch (error) {
      console.error('Error fetching health data:', error);
      // 即使出錯，也不為未來日期返回數據
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      if (targetDate > today) {
        return null;
      }
      
      return this.generateHealthDataForDate(date);
    }
  }

  // 手動同步健康數據
  async syncHealthData(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      // 模擬同步過程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      
      // 更新今天的數據
      const storedData = await AsyncStorage.getItem(this.HEALTH_DATA_KEY);
      const healthDataMap = storedData ? JSON.parse(storedData) : {};
      
      healthDataMap[todayString] = {
        ...this.generateHealthDataForDate(today),
        lastSyncTime: new Date(),
      };
      
      await AsyncStorage.setItem(this.HEALTH_DATA_KEY, JSON.stringify(healthDataMap));
      
      return true;
    } catch (error) {
      console.error('Error syncing health data:', error);
      return false;
    }
  }

  // 檢查是否已連接
  async isHealthConnected(): Promise<boolean> {
    return await this.isHealthSyncEnabled();
  }

  // 獲取權限狀態
  getPermissions(): HealthPermissions {
    return this.permissions;
  }

  // 斷開連接
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.permissions = {
      steps: false,
      heartRate: false,
      heartRateVariability: false,
      bloodOxygen: false,
      sleep: false,
      ecg: false,
      cycleTracking: false,
    };
    
    try {
      await AsyncStorage.setItem(this.HEALTH_SYNC_KEY, 'false');
    } catch (error) {
      console.error('Error disconnecting health service:', error);
    }
  }

  // 清除所有健康數據
  async clearHealthData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.HEALTH_DATA_KEY);
      await AsyncStorage.removeItem(this.HEALTH_SYNC_KEY);
    } catch (error) {
      console.error('Error clearing health data:', error);
    }
  }

  private getLastPeriodDate(date: Date): string {
    // Calculate a realistic last period date with variable cycle length
    // Use a more flexible approach for irregular cycles
    const seed = date.getTime();
    const random = (min: number, max: number) => {
      const x = Math.sin(seed * 1.5) * 10000; // Different seed multiplier for variety
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
    };
    
    const cycleLength = random(18, 45); // Variable cycle length
    const daysIntoCurrentCycle = random(1, cycleLength); // Random point in cycle
    
    const lastPeriodDate = new Date(date);
    lastPeriodDate.setDate(date.getDate() - daysIntoCurrentCycle);
    
    return lastPeriodDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
}

export const healthService = new HealthService(); 

// 方便在畫面中直接 import 使用的函式
export async function getHRVAndHeartRate(hoursBack: number = 24) {
  return healthService.getHRVAndHeartRate(hoursBack);
}
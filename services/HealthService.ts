import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface HealthData {
  steps: number;
  heartRate: number;
  heartRateVariability: number;
  bloodOxygen: number;
  sleepDuration: number;
  sleepQuality: number;
  ecgReading: string;
  lastSyncTime: Date;
  date: string; // YYYY-MM-DD format
  averageCycleLength: number;
  periodDuration: number;
  lastPeriodDate: string;
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
  private permissions: HealthPermissions = {
    steps: false,
    heartRate: false,
    heartRateVariability: false,
    bloodOxygen: false,
    sleep: false,
    ecg: false,
    cycleTracking: false,
  };

  private readonly HEALTH_DATA_KEY = '@health_data';
  private readonly HEALTH_SYNC_KEY = '@health_sync_enabled';

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
      // 模擬權限請求成功
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
    
    // 使用日期作為種子來生成一致的數據
    const seed = date.getTime();
    const random = (min: number, max: number) => {
      const x = Math.sin(seed) * 10000;
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
    };

    return {
      steps: random(3000, 12000),
      heartRate: random(60, 90),
      heartRateVariability: random(30, 50),
      bloodOxygen: random(95, 100),
      sleepDuration: random(6, 9),
      sleepQuality: random(60, 95),
      ecgReading: random(1, 10) > 8 ? 'Irregular' : 'Normal',
      lastSyncTime: new Date(),
      date: dateString,
      averageCycleLength: random(18, 45), // Expanded range: 18-45 days for irregular cycles
      periodDuration: random(2, 10), // Expanded range: 2-10 days for irregular periods
      lastPeriodDate: this.getLastPeriodDate(date),
    };
  }

  // 獲取健康數據
  async getHealthData(date: Date = new Date()): Promise<HealthData> {
    try {
      const dateString = date.toISOString().split('T')[0];
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

      // 如果沒有儲存的數據，生成新的
      const newData = this.generateHealthDataForDate(date);
      
      // 儲存新數據
      const healthDataMap = storedData ? JSON.parse(storedData) : {};
      healthDataMap[dateString] = newData;
      await AsyncStorage.setItem(this.HEALTH_DATA_KEY, JSON.stringify(healthDataMap));
      
      return newData;
    } catch (error) {
      console.error('Error fetching health data:', error);
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
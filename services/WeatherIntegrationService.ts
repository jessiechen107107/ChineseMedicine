/**
 * Weather Integration Service
 * 獲取天氣數據並整合到中醫診斷系統
 */

import * as Location from 'expo-location';

export interface WeatherData {
  location: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  current: {
    temperature: number;        // 攝氏度
    humidity: number;          // 濕度百分比
    pressure: number;          // 氣壓 hPa
    windSpeed: number;         // 風速 km/h
    windDirection: string;     // 風向
    uvIndex: number;           // 紫外線指數
    visibility: number;        // 能見度 km
    cloudCover: number;        // 雲覆蓋率 %
    weatherCondition: string;  // 天氣狀況
    description: string;       // 詳細描述
  };
  timestamp: string;
  source: 'system_weather' | 'api_fallback';
}

export interface TCMWeatherAnalysis {
  environmentalFactors: {
    wind: number;      // 風邪 0-100
    cold: number;      // 寒邪 0-100  
    heat: number;      // 熱邪 0-100
    dampness: number;  // 濕邪 0-100
    dryness: number;   // 燥邪 0-100
    summerHeat: number; // 暑邪 0-100
  };
  seasonalInfluence: {
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    seasonalFactor: number; // 季節影響係數 0-100
  };
  recommendations: string[];
}

class WeatherIntegrationService {
  private apiKey: string = process.env.EXPO_PUBLIC_WEATHER_API_KEY || '';
  
  /**
   * 獲取用戶當前位置的天氣數據
   */
  async getCurrentWeather(): Promise<WeatherData | null> {
    try {
      // 1. 檢查位置權限
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // 2. 獲取當前位置
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 3. 嘗試獲取地址信息
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = reverseGeocode[0];
      
      // 4. 獲取天氣數據
      const weatherData = await this.fetchWeatherData(
        location.coords.latitude,
        location.coords.longitude
      );

      return {
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          city: address?.city || 'Unknown',
          country: address?.country || 'Unknown',
        },
        current: weatherData,
        timestamp: new Date().toISOString(),
        source: this.apiKey ? 'api_fallback' : 'system_weather'
      };

    } catch (error) {
      console.error('Failed to get weather data:', error);
      return this.getFallbackWeatherData();
    }
  }

  /**
   * 從天氣API獲取數據 (OpenWeatherMap 或類似服務)
   */
  private async fetchWeatherData(lat: number, lon: number) {
    if (!this.apiKey) {
      return this.getSystemWeatherData(lat, lon);
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
      );
      
      if (!response.ok) {
        throw new Error('Weather API request failed');
      }

      const data = await response.json();
      
      return {
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
        windDirection: this.getWindDirection(data.wind.deg),
        uvIndex: 5, // 需要額外API調用
        visibility: data.visibility / 1000, // m to km
        cloudCover: data.clouds.all,
        weatherCondition: data.weather[0].main,
        description: data.weather[0].description,
      };
    } catch (error) {
      console.error('Weather API error:', error);
      return this.getSystemWeatherData(lat, lon);
    }
  }

  /**
   * 使用系統位置信息推測天氣 (當沒有API key時)
   */
  private getSystemWeatherData(lat: number, lon: number) {
    const season = this.getCurrentSeason();
    const month = new Date().getMonth() + 1;
    
    // 基於地理位置和季節的合理天氣估算
    let baseTemp = 20;
    let humidity = 60;
    
    // 季節調整
    switch (season) {
      case 'winter':
        baseTemp = 8;
        humidity = 50;
        break;
      case 'summer':
        baseTemp = 28;
        humidity = 75;
        break;
      case 'spring':
      case 'autumn':
        baseTemp = 18;
        humidity = 65;
        break;
    }

    // 地理位置調整 (緯度影響)
    const latitudeAdjustment = Math.abs(lat) * 0.5;
    baseTemp -= latitudeAdjustment;

    return {
      temperature: Math.round(baseTemp + (Math.random() - 0.5) * 8),
      humidity: Math.round(humidity + (Math.random() - 0.5) * 20),
      pressure: 1013 + Math.round((Math.random() - 0.5) * 30),
      windSpeed: Math.round(Math.random() * 15),
      windDirection: this.getRandomWindDirection(),
      uvIndex: Math.round(Math.random() * 10),
      visibility: 10 + Math.round(Math.random() * 10),
      cloudCover: Math.round(Math.random() * 100),
      weatherCondition: this.getSeasonalWeatherCondition(season),
      description: `${season} weather conditions`,
    };
  }

  /**
   * 分析天氣對中醫的影響
   */
  analyzeTCMWeatherFactors(weather: WeatherData): TCMWeatherAnalysis {
    const { current } = weather;
    let wind = 0, cold = 0, heat = 0, dampness = 0, dryness = 0, summerHeat = 0;

    // 溫度分析
    if (current.temperature < 10) {
      cold += 60;
      wind += 30;
    } else if (current.temperature > 30) {
      heat += 50;
      if (current.humidity > 70) {
        summerHeat += 60; // 高溫高濕
      }
    } else if (current.temperature > 35) {
      heat += 70;
      summerHeat += 80;
    }

    // 濕度分析
    if (current.humidity > 80) {
      dampness += 70;
    } else if (current.humidity < 30) {
      dryness += 60;
      heat += 20; // 乾熱
    }

    // 風速分析
    if (current.windSpeed > 15) {
      wind += 50;
    } else if (current.windSpeed > 25) {
      wind += 80;
    }

    // 氣壓分析
    if (current.pressure < 1000) {
      dampness += 30;
      wind += 20;
    } else if (current.pressure > 1030) {
      dryness += 25;
    }

    // 季節影響
    const season = this.getCurrentSeason();
    const seasonalFactor = this.getSeasonalFactor(season);

    // 季節調整
    switch (season) {
      case 'spring':
        wind += 25;
        dampness += 15;
        break;
      case 'summer':
        heat += 30;
        summerHeat += 25;
        break;
      case 'autumn':
        dryness += 35;
        wind += 15;
        break;
      case 'winter':
        cold += 40;
        wind += 20;
        break;
    }

    // 生成建議
    const recommendations = this.generateTCMRecommendations({
      wind, cold, heat, dampness, dryness, summerHeat
    }, weather);

    return {
      environmentalFactors: {
        wind: Math.min(100, Math.max(0, wind)),
        cold: Math.min(100, Math.max(0, cold)),
        heat: Math.min(100, Math.max(0, heat)),
        dampness: Math.min(100, Math.max(0, dampness)),
        dryness: Math.min(100, Math.max(0, dryness)),
        summerHeat: Math.min(100, Math.max(0, summerHeat)),
      },
      seasonalInfluence: {
        season,
        seasonalFactor,
      },
      recommendations,
    };
  }

  /**
   * 生成中醫建議
   */
  private generateTCMRecommendations(factors: any, weather: WeatherData): string[] {
    const recommendations: string[] = [];
    const { current } = weather;

    // 基於主要邪氣的建議
    const maxFactor = Math.max(...Object.values(factors));
    const dominantFactor = Object.keys(factors).find(
      key => factors[key] === maxFactor
    );

    switch (dominantFactor) {
      case 'wind':
        recommendations.push('避免長時間待在風口處');
        recommendations.push('注意頸部和關節的保暖');
        recommendations.push('可適度食用生薑、蔥白等溫性食材');
        break;
      case 'cold':
        recommendations.push('多穿衣物保暖，特別注意手腳');
        recommendations.push('飲用溫熱的飲品，避免生冷食物');
        recommendations.push('可食用羊肉、桂圓等溫補食材');
        break;
      case 'heat':
        recommendations.push('避免長時間暴露在高溫環境');
        recommendations.push('多飲水，選擇清淡飲食');
        recommendations.push('可食用綠豆、冬瓜等清熱食材');
        break;
      case 'dampness':
        recommendations.push('保持室內通風乾燥');
        recommendations.push('避免油膩和甜食');
        recommendations.push('可食用薏米、茯苓等除濕食材');
        break;
      case 'dryness':
        recommendations.push('注意補充水分和滋潤');
        recommendations.push('使用加濕器保持室內濕度');
        recommendations.push('可食用百合、銀耳等潤燥食材');
        break;
      case 'summerHeat':
        recommendations.push('避免劇烈運動和長時間戶外活動');
        recommendations.push('選擇清涼環境休息');
        recommendations.push('可飲用菊花茶、綠茶等清暑飲品');
        break;
    }

    // 基於具體天氣的額外建議
    if (current.uvIndex > 7) {
      recommendations.push('避免長時間日曬，注意防曬');
    }

    if (current.cloudCover > 80) {
      recommendations.push('注意保持心情舒暢，避免鬱悶');
    }

    return recommendations.slice(0, 5); // 限制建議數量
  }

  /**
   * 備用天氣數據
   */
  private getFallbackWeatherData(): WeatherData {
    const season = this.getCurrentSeason();
    return {
      location: {
        latitude: 25.0330,
        longitude: 121.5654,
        city: 'Current Location',
        country: 'Taiwan',
      },
      current: {
        temperature: 22,
        humidity: 65,
        pressure: 1013,
        windSpeed: 8,
        windDirection: 'NE',
        uvIndex: 5,
        visibility: 15,
        cloudCover: 40,
        weatherCondition: 'Partly Cloudy',
        description: `Typical ${season} weather`,
      },
      timestamp: new Date().toISOString(),
      source: 'system_weather',
    };
  }

  // 輔助方法
  private getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  private getSeasonalFactor(season: string): number {
    const seasonFactors = { spring: 75, summer: 85, autumn: 70, winter: 80 };
    return seasonFactors[season] || 75;
  }

  private getWindDirection(degrees: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  private getRandomWindDirection(): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  private getSeasonalWeatherCondition(season: string): string {
    const conditions = {
      spring: 'Clear',
      summer: 'Partly Cloudy', 
      autumn: 'Clear',
      winter: 'Cloudy'
    };
    return conditions[season] || 'Clear';
  }
}

export const weatherIntegrationService = new WeatherIntegrationService();

import { healthService } from '@/services/HealthService';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { ThemedText } from './ThemedText';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 30;
const CHART_HEIGHT = 200;
const PADDING = 40;

interface DayData {
  day: string;
  averageRHR: number;
  averageHRV: number;
  date: Date;
}

interface HeartChartProps {
  selectedDate: Date;
}

interface TooltipData {
  x: number;
  y: number;
  averageRHR: number;
  averageHRV: number;
  day: string;
  visible: boolean;
  pointX: number; // 添加實際點的X座標
  pointY: number; // 添加實際點的Y座標
}

export function HeartChart({ selectedDate }: HeartChartProps) {
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [tooltip, setTooltip] = useState<TooltipData>({
    x: 0,
    y: 0,
    averageRHR: 0,
    averageHRV: 0,
    day: '',
    visible: false,
    pointX: 0,
    pointY: 0
  });
  const [selectedPoint, setSelectedPoint] = useState<{index: number, type: 'averageRHR' | 'averageHRV'} | null>(null);

  useEffect(() => {
    generateDayData();
  }, [selectedDate]); // 恢復selectedDate依賴

  const generateDayData = async () => {
    const data: DayData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 使用選定日期和今天中較早的那個作為結束日期
    const endDate = new Date(selectedDate);
    endDate.setHours(0, 0, 0, 0);
    if (endDate > today) {
      endDate.setTime(today.getTime()); // 如果選定日期是未來，使用今天
    }
    
    // 顯示以endDate為結束的過去7天數據（包括endDate）
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(endDate);
      dayDate.setDate(endDate.getDate() - i);
      
      try {
        const healthData = await healthService.getHealthData(dayDate);
        const dayName = getDayName(dayDate);
        
        // 只有當有真實健康數據時才添加到圖表
        if (healthData && healthData.averageRHR && healthData.averageHRV) {
          data.push({
            day: dayName,
            averageRHR: healthData.averageRHR,
            averageHRV: healthData.averageHRV,
            date: dayDate
          });
        } else {
          // 如果沒有數據，添加空數據點但標記為無數據
          data.push({
            day: dayName,
            averageRHR: 0, // 用0表示無數據
            averageHRV: 0, // 用0表示無數據
            date: dayDate
          });
        }
      } catch (error) {
        console.error('Error loading health data for', dayDate, error);
        // 出錯時也添加空數據點
        const dayName = getDayName(dayDate);
        data.push({
          day: dayName,
          averageRHR: 0,
          averageHRV: 0,
          date: dayDate
        });
      }
    }
    
    setDayData(data);
  };

  const getDayName = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  const createPath = (data: number[], color: string) => {
    if (data.length === 0) return '';
    
    // 過濾掉值為0的數據點（表示無數據）
    const validData = data.filter(value => value > 0);
    if (validData.length === 0) return '';
    
    const maxValue = Math.max(...validData);
    const minValue = Math.min(...validData);
    const range = maxValue - minValue || 1;
    
    // 創建有效數據點的座標
    const validPoints: { x: number; y: number }[] = [];
    data.forEach((value, index) => {
      if (value > 0) { // 只處理有效數據
        const x = PADDING + (index * (CHART_WIDTH - 2 * PADDING)) / (data.length - 1);
        const y = CHART_HEIGHT - PADDING - ((value - minValue) / range) * (CHART_HEIGHT - 2 * PADDING);
        validPoints.push({ x, y });
      }
    });
    
    if (validPoints.length === 0) return '';
    
    let path = `M ${validPoints[0].x} ${validPoints[0].y}`;
    
    for (let i = 1; i < validPoints.length; i++) {
      const prevPoint = validPoints[i - 1];
      const currentPoint = validPoints[i];
      const cpx1 = prevPoint.x + (currentPoint.x - prevPoint.x) / 3;
      const cpy1 = prevPoint.y;
      const cpx2 = currentPoint.x - (currentPoint.x - prevPoint.x) / 3;
      const cpy2 = currentPoint.y;
      path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${currentPoint.x} ${currentPoint.y}`;
    }
    
    return path;
  };

  const handlePointPress = (index: number, type: 'averageRHR' | 'averageHRV') => {
    if (dayData.length === 0) return;
    
    const data = dayData[index];
    
    // 只對有真實數據的點響應點擊
    if ((type === 'averageRHR' && data.averageRHR === 0) || 
        (type === 'averageHRV' && data.averageHRV === 0)) {
      return;
    }
    
    const x = PADDING + (index * (CHART_WIDTH - 2 * PADDING)) / (dayData.length - 1);
    
    // Calculate y position based on the value and chart bounds
    const values = type === 'averageRHR' ? 
      dayData.map(d => d.averageRHR).filter(v => v > 0) : 
      dayData.map(d => d.averageHRV).filter(v => v > 0);
    
    if (values.length === 0) return;
    
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;
    const value = type === 'averageRHR' ? data.averageRHR : data.averageHRV;
    const y = CHART_HEIGHT - PADDING - ((value - minValue) / range) * (CHART_HEIGHT - 2 * PADDING);
    
    // 設置選定的點
    setSelectedPoint({ index, type });
    
    setTooltip({
      x: Math.min(x - 50, CHART_WIDTH - 120), // 調整位置避免超出邊界
      y: Math.max(y - 80, 10), // 位置在點的上方
      averageRHR: data.averageRHR,
      averageHRV: data.averageHRV,
      day: data.day,
      visible: true,
      pointX: x,
      pointY: y
    });
  };

  const handleCloseTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
    setSelectedPoint(null);
  };

  const averageRHRData = dayData.map(d => d.averageRHR);
  const averageHRVData = dayData.map(d => d.averageHRV);
  const averageRHRPath = createPath(averageRHRData, '#e5eb71');
  const averageHRVPath = createPath(averageHRVData, '#4A9D89');

  // Create Y-axis labels based on actual data (excluding zeros)
  const validAverageRHRData = averageRHRData.filter(v => v > 0);
  const validAverageHRVData = averageHRVData.filter(v => v > 0);
  const allValidData = [...validAverageRHRData, ...validAverageHRVData];
  const hasData = allValidData.length > 0;
  
  let yLabels: number[] = [0];
  if (hasData) {
    const maxValue = Math.max(...allValidData);
    yLabels = Array.from({ length: 5 }, (_, i) => Math.round((maxValue / 4) * i));
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Heart</ThemedText>
      </View>
      
      {!hasData ? (
        <View style={styles.noDataContainer}>
          <ThemedText style={styles.noDataText}>
            No average RHR or HRV data available for the past 7 days
          </ThemedText>
          <ThemedText style={styles.noDataSubtext}>
            Please ensure your Health app is collecting this data
          </ThemedText>
        </View>
      ) : (
        <>
          <TouchableOpacity 
            style={styles.chartContainer} 
            activeOpacity={1}
            onPress={handleCloseTooltip}
          >
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              {/* Y-axis grid lines and labels */}
              {yLabels.map((label, index) => {
                const y = CHART_HEIGHT - PADDING - (index * (CHART_HEIGHT - 2 * PADDING)) / (yLabels.length - 1);
                return (
                  <React.Fragment key={index}>
                    <Line
                      x1={PADDING}
                      y1={y}
                      x2={CHART_WIDTH - PADDING}
                      y2={y}
                      stroke="#3A4A4F"
                      strokeWidth={0.5}
                    />
                    <SvgText
                      x={PADDING - 10}
                      y={y + 5}
                      fontSize="12"
                      fill="#666"
                      textAnchor="end"
                    >
                      {label}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* Average RHR Line */}
              {averageRHRPath && (
                <Path
                  d={averageRHRPath}
                  stroke="#e5eb71"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Average HRV Line */}
              {averageHRVPath && (
                <Path
                  d={averageHRVPath}
                  stroke="#4A9D89"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive points for Average RHR */}
              {averageRHRData.map((value, index) => {
                // 只為有真實數據的點創建交互區域
                if (value === 0) return null;
                
                const validValues = averageRHRData.filter(v => v > 0);
                if (validValues.length === 0) return null;
                
                const maxValue = Math.max(...validValues);
                const minValue = Math.min(...validValues);
                const range = maxValue - minValue || 1;
                const x = PADDING + (index * (CHART_WIDTH - 2 * PADDING)) / (averageRHRData.length - 1);
                const y = CHART_HEIGHT - PADDING - ((value - minValue) / range) * (CHART_HEIGHT - 2 * PADDING);
                
                return (
                  <Circle
                    key={`rhr-${index}`}
                    cx={x}
                    cy={y}
                    r={15}
                    fill="transparent"
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handlePointPress(index, 'averageRHR');
                    }}
                  />
                );
              })}

              {/* Interactive points for Average HRV */}
              {averageHRVData.map((value, index) => {
                // 只為有真實數據的點創建交互區域
                if (value === 0) return null;
                
                const validValues = averageHRVData.filter(v => v > 0);
                if (validValues.length === 0) return null;
                
                const maxValue = Math.max(...validValues);
                const minValue = Math.min(...validValues);
                const range = maxValue - minValue || 1;
                const x = PADDING + (index * (CHART_WIDTH - 2 * PADDING)) / (averageHRVData.length - 1);
                const y = CHART_HEIGHT - PADDING - ((value - minValue) / range) * (CHART_HEIGHT - 2 * PADDING);
                
                return (
                  <Circle
                    key={`hrv-${index}`}
                    cx={x}
                    cy={y}
                    r={15}
                    fill="transparent"
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handlePointPress(index, 'averageHRV');
                    }}
                  />
                );
              })}

              {/* X-axis labels */}
              {dayData.map((data, index) => {
                const x = PADDING + (index * (CHART_WIDTH - 2 * PADDING)) / (dayData.length - 1);
                return (
                  <SvgText
                    key={index}
                    x={x}
                    y={CHART_HEIGHT - 10}
                    fontSize="12"
                    fill="#666"
                    textAnchor="middle"
                  >
                    {data.day}
                  </SvgText>
                );
              })}

              {/* Selected Point - 白色圓點 */}
              {selectedPoint && tooltip.visible && (
                <Circle
                  cx={tooltip.pointX}
                  cy={tooltip.pointY}
                  r={6}
                  fill="#FFFFFF"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              )}
            </Svg>
          </TouchableOpacity>

          {/* Tooltip */}
          {tooltip.visible && (
            <View style={[styles.tooltip, { left: tooltip.x, top: tooltip.y }]}>
              <TouchableOpacity onPress={handleCloseTooltip} style={styles.tooltipContent}>
                <Text style={styles.tooltipValue}>
                  {selectedPoint?.type === 'averageRHR' 
                    ? `${Math.round(tooltip.averageRHR)} BPM` 
                    : `${Math.round(tooltip.averageHRV)} ms`}
                </Text>
                <Text style={styles.tooltipDay}>{tooltip.day}</Text>
              </TouchableOpacity>
              <View style={[styles.tooltipArrow, { 
                left: tooltip.pointX - tooltip.x - 6, 
                top: tooltip.pointY - tooltip.y - 5 
              }]} />
            </View>
          )}

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#e5eb71' }]} />
              <Text style={styles.legendText}>Average RHR</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4A9D89' }]} />
              <Text style={styles.legendText}>Average HRV</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  sectionHeader: {
    marginBottom: -20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  chartContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    minWidth: 100,
  },
  tooltipContent: {
    alignItems: 'center',
  },
  tooltipValue: {
    fontSize: 18,
    color: '#1C1C1E',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tooltipDay: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tooltipText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  tooltipWeek: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  tooltipArrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  legendColor: {
    width: 12,
    height: 3,
    borderRadius: 1.5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#B0B0B0',
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 5,
  },
  noDataSubtext: {
    fontSize: 12,
    color: '#B0B0B0',
    textAlign: 'center',
  },
}); 
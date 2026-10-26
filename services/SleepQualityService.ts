import { askClaude } from './ClaudeService';
import { HealthData } from './HealthService';

export interface SleepQualityResult {
  qualityScore: number; // 0-100
  qualityLevel: 'Low' | 'Normal' | 'Great';
  explanation: string;
  recommendations: string[];
}

class SleepQualityService {
  async analyzeSleepQuality(healthData: HealthData): Promise<SleepQualityResult> {
    try {
      const prompt = this.buildAnalysisPrompt(healthData);
      
      const text = await askClaude({
        system: 'You are a sleep quality analysis expert. Analyze the provided health data and estimate sleep quality based on sleep duration, heart rate, and other relevant metrics. Provide a score from 0-100 and detailed explanation.',
        prompt,
      });
      const analysis = this.parseSleepQualityResponse(text);
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing sleep quality:', error);
      return this.getFallbackSleepQuality(healthData);
    }
  }

  private buildAnalysisPrompt(healthData: HealthData): string {
    return `
Please analyze the following health data and provide a sleep quality assessment:

Sleep Duration: ${healthData.sleepDuration} hours
Sleep Quality (existing): ${healthData.sleepQuality}%
Heart Rate: ${healthData.heartRate} BPM
Heart Rate Variability: ${healthData.heartRateVariability} ms
Blood Oxygen: ${healthData.bloodOxygen}%
Steps: ${healthData.steps}

Please provide your response in the following JSON format:
{
  "qualityScore": <number 0-100>,
  "qualityLevel": "<Low|Normal|Great>",
  "explanation": "<detailed explanation>",
  "recommendations": ["<recommendation1>", "<recommendation2>"]
}

Consider factors like:
- Sleep duration adequacy (7-9 hours is optimal)
- Heart rate patterns during sleep
- Heart rate variability (higher is better)
- Blood oxygen levels
- Overall activity levels
- Consistency with recommended sleep guidelines
    `;
  }

  private parseSleepQualityResponse(response: string): SleepQualityResult {
    try {
      const parsed = JSON.parse(response);
      return {
        qualityScore: parsed.qualityScore || 0,
        qualityLevel: parsed.qualityLevel || 'Low',
        explanation: parsed.explanation || 'Unable to analyze sleep quality.',
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      console.error('Error parsing sleep quality response:', error);
      return this.getFallbackSleepQuality(null);
    }
  }

  private getFallbackSleepQuality(healthData: HealthData | null): SleepQualityResult {
    if (!healthData) {
      return {
        qualityScore: 0,
        qualityLevel: 'Low',
        explanation: 'No sleep data available for analysis.',
        recommendations: ['Ensure you have sufficient sleep data for accurate analysis.']
      };
    }

    // Simple fallback calculation
    let score = 0;
    let level: 'Low' | 'Normal' | 'Great' = 'Low';
    let explanation = '';

    // Basic scoring based on sleep duration
    if (healthData.sleepDuration >= 7 && healthData.sleepDuration <= 9) {
      score += 40;
      explanation += 'Sleep duration is within optimal range. ';
    } else if (healthData.sleepDuration >= 6 && healthData.sleepDuration <= 10) {
      score += 25;
      explanation += 'Sleep duration is acceptable but could be improved. ';
    } else {
      explanation += 'Sleep duration is outside recommended range. ';
    }

    // Add points for heart rate (lower is generally better for sleep)
    if (healthData.heartRate < 60) {
      score += 20;
      explanation += 'Resting heart rate indicates good recovery. ';
    } else if (healthData.heartRate < 70) {
      score += 15;
      explanation += 'Resting heart rate is within normal range. ';
    }

    // Add points for blood oxygen
    if (healthData.bloodOxygen >= 95) {
      score += 20;
      explanation += 'Blood oxygen levels are excellent. ';
    } else if (healthData.bloodOxygen >= 90) {
      score += 10;
      explanation += 'Blood oxygen levels are acceptable. ';
    }

    // Add points for existing sleep quality if available
    if (healthData.sleepQuality > 0) {
      score += Math.min(20, healthData.sleepQuality * 0.2);
      explanation += `Existing sleep quality assessment: ${healthData.sleepQuality}%. `;
    }

    // Determine level
    if (score >= 85) {
      level = 'Great';
    } else if (score >= 60) {
      level = 'Normal';
    } else {
      level = 'Low';
    }

    const recommendations = [
      'Maintain consistent sleep schedule',
      'Create a relaxing bedtime routine',
      'Ensure your sleep environment is comfortable'
    ];

    return {
      qualityScore: Math.min(100, Math.max(0, score)),
      qualityLevel: level,
      explanation: explanation || 'Sleep quality analysis completed.',
      recommendations
    };
  }
}

export const sleepQualityService = new SleepQualityService(); 
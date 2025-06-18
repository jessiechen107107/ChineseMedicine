import { HealthData } from './HealthService';

const OPENAI_API_KEY = '***REMOVED-LEAKED-OPENAI-KEY***';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface ConstitutionAnalysis {
  tendency: string;
  explanation: string;
  recommendations: string[];
  confidence: number;
}

export interface WellnessAdvice {
  advice: string;
  keyPoints: string[];
  confidence: number;
}

export interface ExternalPathogenAnalysis {
  pathogenType: string;
  explanation: string;
  recommendations: string[];
  confidence: number;
}

export interface OrganImbalanceAnalysis {
  imbalanceType: string;
  explanation: string;
  recommendations: string[];
  confidence: number;
}

export interface ComprehensiveAnalysis {
  wellnessAdvice: WellnessAdvice;
  constitution: ConstitutionAnalysis;
  externalPathogen: ExternalPathogenAnalysis;
  organImbalance: OrganImbalanceAnalysis;
}

export interface AssessmentData {
  observation: {
    photoTaken: boolean;
    tongueColor: string;
    faceColor: string;
  };
  smell: {
    badBreath: string;
    flatulence: string;
    otherOdors: string;
  };
  inquiry: {
    selectedSymptoms: string[];
    customSymptoms: string;
  };
  pulse: {
    connected: boolean;
    pulseRate: number;
    pulseType: string;
  };
}

export interface PersonalizedAdvice {
  diet: string;
  sleep: string;
  emotions: string;
  exercise: string;
  acupressure: string;
}

export class AIAnalysisService {
  private static instance: AIAnalysisService;

  public static getInstance(): AIAnalysisService {
    if (!AIAnalysisService.instance) {
      AIAnalysisService.instance = new AIAnalysisService();
    }
    return AIAnalysisService.instance;
  }

  async analyzeConstitution(
    healthData: HealthData,
    assessmentData?: AssessmentData,
    location: string = 'Taiwan'
  ): Promise<ConstitutionAnalysis> {
    try {
      // First, validate the API key format
      if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
        console.error('Invalid API key format');
        return this.getFallbackAnalysis(healthData);
      }

      // Test API key with a simple request first
      const testResponse = await this.testAPIKey();
      if (!testResponse) {
        console.error('API key validation failed');
        return this.getFallbackAnalysis(healthData);
      }

      const prompt = this.buildConstitutionPrompt(healthData, assessmentData, location);
      
      console.log('Making API request to OpenAI...');
      console.log('API Key exists:', !!OPENAI_API_KEY);
      console.log('API Key starts with:', OPENAI_API_KEY.substring(0, 10) + '...');
      
      const requestBody = {
        model: 'gpt-3.5-turbo', // Changed from gpt-4 to gpt-3.5-turbo for better compatibility
        messages: [
          {
            role: 'system',
            content: 'You are a Traditional Chinese Medicine (TCM) expert specializing in constitutional analysis. Provide accurate, professional analysis based on the given health data and environmental factors.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      };

      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      const analysis = this.parseAIResponse(data.choices[0].message.content);
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing constitution:', error);
      // Fallback to basic analysis if API fails
      return this.getFallbackAnalysis(healthData);
    }
  }

  async analyzeComprehensive(
    healthData: HealthData,
    assessmentData?: AssessmentData,
    location: string = 'Taiwan'
  ): Promise<ComprehensiveAnalysis> {
    try {
      // First, validate the API key format
      if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
        console.error('Invalid API key format');
        return this.getFallbackComprehensiveAnalysis(healthData);
      }

      // Test API key with a simple request first
      const testResponse = await this.testAPIKey();
      if (!testResponse) {
        console.error('API key validation failed');
        return this.getFallbackComprehensiveAnalysis(healthData);
      }

      const prompt = this.buildComprehensivePrompt(healthData, assessmentData, location);
      
      console.log('Making comprehensive AI analysis request...');
      
      const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a comprehensive Traditional Chinese Medicine (TCM) expert. Analyze health data and provide detailed insights on wellness advice, constitutional tendencies, external pathogenic factors, and organ imbalances. Consider environmental and climate factors in your analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      };

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Comprehensive API Error Response:', errorText);
        throw new Error(`Comprehensive API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Comprehensive API Response:', data);
      
      const analysis = this.parseComprehensiveResponse(data.choices[0].message.content);
      
      return analysis;
    } catch (error) {
      console.error('Error in comprehensive analysis:', error);
      // Fallback to basic analysis if API fails
      return this.getFallbackComprehensiveAnalysis(healthData);
    }
  }

  async analyzePersonalizedAdvice(
    healthData: HealthData,
    assessmentData?: AssessmentData,
    location: string = 'Taiwan'
  ): Promise<PersonalizedAdvice> {
    try {
      // First, validate the API key format
      if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
        console.error('Invalid API key format');
        return this.getFallbackPersonalizedAdvice(healthData);
      }

      // Test API key with a simple request first
      const testResponse = await this.testAPIKey();
      if (!testResponse) {
        console.error('API key validation failed');
        return this.getFallbackPersonalizedAdvice(healthData);
      }

      const prompt = this.buildPersonalizedAdvicePrompt(healthData, assessmentData, location);
      
      console.log('Making personalized advice AI analysis request...');
      
      const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a Traditional Chinese Medicine (TCM) wellness expert specializing in personalized lifestyle advice. Analyze health data, assessment records, and environmental factors to provide specific recommendations for diet, sleep, emotions, exercise, and acupressure therapy.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      };

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Personalized Advice API Error Response:', errorText);
        throw new Error(`Personalized Advice API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Personalized Advice API Response:', data);
      
      const advice = this.parsePersonalizedAdviceResponse(data.choices[0].message.content);
      
      return advice;
    } catch (error) {
      console.error('Error in personalized advice analysis:', error);
      // Fallback to basic analysis if API fails
      return this.getFallbackPersonalizedAdvice(healthData);
    }
  }

  private async testAPIKey(): Promise<boolean> {
    try {
      console.log('Testing API key...');
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      });

      console.log('API key test response status:', response.status);
      
      if (response.ok) {
        console.log('API key is valid');
        return true;
      } else {
        const errorText = await response.text();
        console.error('API key test failed:', errorText);
        return false;
      }
    } catch (error) {
      console.error('API key test error:', error);
      return false;
    }
  }

  private buildConstitutionPrompt(
    healthData: HealthData,
    assessmentData?: AssessmentData,
    location: string = 'Taiwan'
  ): string {
    const climate = this.getClimateDescription(location);
    
    let prompt = `Analyze the following health data for Traditional Chinese Medicine constitutional tendency:

Health Data:
- Heart Rate: ${healthData.heartRate} bpm
- Sleep Duration: ${healthData.sleepDuration} hours
- Steps: ${healthData.steps}
- Blood Oxygen: ${healthData.bloodOxygen}%
- Menstrual Cycle: ${healthData.averageCycleLength} days (if applicable)
- Period Duration: ${healthData.periodDuration} days (if applicable)

Location & Climate: ${location} - ${climate}

`;

    if (assessmentData) {
      prompt += `Assessment Data:
- Tongue Color: ${assessmentData.observation.tongueColor}
- Face Color: ${assessmentData.observation.faceColor}
- Breath: ${assessmentData.smell.badBreath}
- Symptoms: ${assessmentData.inquiry.selectedSymptoms.join(', ')}
- Pulse Rate: ${assessmentData.pulse.pulseRate} bpm
- Pulse Type: ${assessmentData.pulse.pulseType}

`;
    }

    prompt += `Please analyze and provide:
1. Primary constitutional tendency (Qi deficiency, Blood deficiency, Damp-heat, Yin deficiency, Yang deficiency, or Balanced)
2. Detailed explanation of this constitution type
3. 3-4 specific recommendations
4. Confidence level (1-10)

Format your response as JSON:
{
  "tendency": "constitution type",
  "explanation": "detailed explanation of the constitution type and why it applies",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "confidence": confidence_score
}`;

    return prompt;
  }

  private buildComprehensivePrompt(
    healthData: HealthData,
    assessmentData?: AssessmentData,
    location: string = 'Taiwan'
  ): string {
    const climate = this.getClimateDescription(location);
    
    let prompt = `Provide a comprehensive Traditional Chinese Medicine analysis based on the following data:

Health Data:
- Heart Rate: ${healthData.heartRate} bpm
- Sleep Duration: ${healthData.sleepDuration} hours
- Steps: ${healthData.steps}
- Blood Oxygen: ${healthData.bloodOxygen}%
- Menstrual Cycle: ${healthData.averageCycleLength} days (if applicable)
- Period Duration: ${healthData.periodDuration} days (if applicable)

Location & Climate: ${location} - ${climate}

`;

    if (assessmentData) {
      prompt += `Assessment History:
- Tongue Color: ${assessmentData.observation.tongueColor}
- Face Color: ${assessmentData.observation.faceColor}
- Breath Quality: ${assessmentData.smell.badBreath}
- Reported Symptoms: ${assessmentData.inquiry.selectedSymptoms.join(', ')}
- Pulse Rate: ${assessmentData.pulse.pulseRate} bpm
- Pulse Type: ${assessmentData.pulse.pulseType}

`;
    }

    prompt += `Please provide a comprehensive analysis including:

1. WELLNESS ADVICE: Personalized advice considering health data, climate, and lifestyle
2. CONSTITUTIONAL TENDENCY: Primary constitution type (Qi deficiency, Blood deficiency, Damp-heat, Yin deficiency, Yang deficiency, or Balanced)
3. EXTERNAL PATHOGENIC FACTORS: Assessment of external pathogens (Wind-Heat, Wind-Cold, Dampness, Dryness, etc.)
4. ORGAN IMBALANCE PATTERNS: Evaluation of organ systems (Heart, Liver, Spleen, Lung, Kidney imbalances)

Consider the climate environment effects (${climate}) on the analysis.

Format your response as JSON:
{
  "wellnessAdvice": {
    "advice": "comprehensive wellness advice paragraph",
    "keyPoints": ["key point 1", "key point 2", "key point 3"],
    "confidence": confidence_score
  },
  "constitution": {
    "tendency": "constitution type",
    "explanation": "detailed explanation",
    "recommendations": ["rec 1", "rec 2", "rec 3"],
    "confidence": confidence_score
  },
  "externalPathogen": {
    "pathogenType": "pathogen type or None",
    "explanation": "detailed explanation",
    "recommendations": ["rec 1", "rec 2", "rec 3"],
    "confidence": confidence_score
  },
  "organImbalance": {
    "imbalanceType": "primary organ imbalance or Harmonious",
    "explanation": "detailed explanation",
    "recommendations": ["rec 1", "rec 2", "rec 3"],
    "confidence": confidence_score
  }
}`;

    return prompt;
  }

  private buildPersonalizedAdvicePrompt(
    healthData: HealthData,
    assessmentData?: AssessmentData,
    location: string = 'Taiwan'
  ): string {
    const climate = this.getClimateDescription(location);
    
    let prompt = `As a TCM wellness expert, provide personalized lifestyle advice based on the following data:

Health Data:
- Heart Rate: ${healthData.heartRate} bpm
- Sleep Duration: ${healthData.sleepDuration} hours
- Daily Steps: ${healthData.steps}
- Blood Oxygen: ${healthData.bloodOxygen}%
- Menstrual Cycle: ${healthData.averageCycleLength} days (if applicable)
- Period Duration: ${healthData.periodDuration} days (if applicable)

Location & Climate: ${location} - ${climate}

`;

    if (assessmentData) {
      prompt += `Assessment Records:
- Tongue Observation: ${assessmentData.observation.tongueColor}
- Facial Color: ${assessmentData.observation.faceColor}
- Breath Quality: ${assessmentData.smell.badBreath}
- Symptoms: ${assessmentData.inquiry.selectedSymptoms.join(', ')}
- Pulse: ${assessmentData.pulse.pulseRate} bpm, ${assessmentData.pulse.pulseType}

`;
    }

    prompt += `Please provide specific recommendations in 5 categories:

1. DIET: Specific food recommendations based on constitution and climate
2. SLEEP: Sleep hygiene and timing recommendations
3. EMOTIONS: Emotional wellness and stress management techniques
4. EXERCISE: Appropriate exercise types and intensity
5. ACUPRESSURE: Specific acupoints and massage techniques

Consider the local climate (${climate}) and seasonal factors in your recommendations.
Keep each recommendation concise (maximum 2-3 sentences per category).

Format your response as JSON:
{
  "diet": "concise dietary recommendations (2-3 sentences)",
  "sleep": "concise sleep recommendations (2-3 sentences)", 
  "emotions": "concise emotional wellness recommendations (2-3 sentences)",
  "exercise": "concise exercise recommendations (2-3 sentences)",
  "acupressure": "concise acupressure recommendations (2-3 sentences)"
}`;

    return prompt;
  }

  private getClimateDescription(location: string): string {
    const climateMap: { [key: string]: string } = {
      'Taiwan': 'Humid subtropical climate with hot, humid summers and mild winters. High humidity year-round.',
      'Hong Kong': 'Humid subtropical climate with hot, humid summers and mild, dry winters.',
      'Singapore': 'Tropical rainforest climate, hot and humid year-round with frequent rainfall.',
      'Japan': 'Varies by region, generally humid subtropical to humid continental.',
      'Default': 'Temperate climate with moderate humidity and seasonal variations.'
    };

    return climateMap[location] || climateMap['Default'];
  }

  private parseAIResponse(response: string): ConstitutionAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          tendency: parsed.tendency || 'Balanced Constitution',
          explanation: parsed.explanation || 'Unable to determine specific constitution type.',
          recommendations: parsed.recommendations || ['Maintain current healthy lifestyle'],
          confidence: parsed.confidence || 5
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // Fallback parsing if JSON extraction fails
    return {
      tendency: 'Balanced Constitution',
      explanation: response.substring(0, 200) + '...',
      recommendations: ['Maintain current healthy lifestyle', 'Regular exercise', 'Balanced diet'],
      confidence: 5
    };
  }

  private parseComprehensiveResponse(response: string): ComprehensiveAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          wellnessAdvice: {
            advice: parsed.wellnessAdvice?.advice || 'Maintain a balanced lifestyle based on your health data.',
            keyPoints: parsed.wellnessAdvice?.keyPoints || ['Regular exercise', 'Balanced diet', 'Adequate sleep'],
            confidence: parsed.wellnessAdvice?.confidence || 5
          },
          constitution: {
            tendency: parsed.constitution?.tendency || 'Balanced Constitution',
            explanation: parsed.constitution?.explanation || 'Your health indicators suggest balanced constitution.',
            recommendations: parsed.constitution?.recommendations || ['Maintain current lifestyle'],
            confidence: parsed.constitution?.confidence || 5
          },
          externalPathogen: {
            pathogenType: parsed.externalPathogen?.pathogenType || 'No Significant External Pathogen',
            explanation: parsed.externalPathogen?.explanation || 'No significant external pathogenic factors detected.',
            recommendations: parsed.externalPathogen?.recommendations || ['Maintain good hygiene'],
            confidence: parsed.externalPathogen?.confidence || 5
          },
          organImbalance: {
            imbalanceType: parsed.organImbalance?.imbalanceType || 'Harmonious Organ Function',
            explanation: parsed.organImbalance?.explanation || 'Organ systems appear to be functioning harmoniously.',
            recommendations: parsed.organImbalance?.recommendations || ['Continue current practices'],
            confidence: parsed.organImbalance?.confidence || 5
          }
        };
      }
    } catch (error) {
      console.error('Error parsing comprehensive AI response:', error);
    }

    // Fallback parsing if JSON extraction fails
    return this.getFallbackComprehensiveAnalysis({} as HealthData);
  }

  private parsePersonalizedAdviceResponse(response: string): PersonalizedAdvice {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          diet: parsed.diet || 'Maintain a balanced diet',
          sleep: parsed.sleep || 'Maintain a regular sleep schedule',
          emotions: parsed.emotions || 'Maintain a positive emotional state',
          exercise: parsed.exercise || 'Maintain a balanced exercise routine',
          acupressure: parsed.acupressure || 'Consider acupressure therapy for relaxation'
        };
      }
    } catch (error) {
      console.error('Error parsing personalized advice response:', error);
    }

    // Fallback parsing if JSON extraction fails
    return {
      diet: 'Maintain a balanced diet',
      sleep: 'Maintain a regular sleep schedule',
      emotions: 'Maintain a positive emotional state',
      exercise: 'Maintain a balanced exercise routine',
      acupressure: 'Consider acupressure therapy for relaxation'
    };
  }

  private getFallbackAnalysis(healthData: HealthData): ConstitutionAnalysis {
    // Basic fallback analysis when API is unavailable
    if (healthData.heartRate > 90 && healthData.sleepDuration < 6) {
      return {
        tendency: 'Yin Deficiency Constitution',
        explanation: 'Yin deficiency is characterized by insufficient cooling and nourishing substances in the body, often manifesting as elevated heart rate and poor sleep quality.',
        recommendations: [
          'Consume nourishing foods like goji berries and black sesame',
          'Practice gentle exercises like Tai Chi',
          'Maintain regular sleep schedule before 11 PM'
        ],
        confidence: 6
      };
    } else if (healthData.steps < 5000) {
      return {
        tendency: 'Qi Deficiency Constitution',
        explanation: 'Qi deficiency indicates insufficient vital energy, often showing as low activity levels and fatigue.',
        recommendations: [
          'Include warming foods like ginger and dates',
          'Gradually increase physical activity',
          'Consider ginseng supplements after consulting TCM practitioner'
        ],
        confidence: 6
      };
    } else {
      return {
        tendency: 'Balanced Constitution',
        explanation: 'Your health indicators suggest a relatively balanced constitutional state with good overall harmony.',
        recommendations: [
          'Maintain current healthy lifestyle',
          'Seasonal dietary adjustments',
          'Continue balanced exercise routine'
        ],
        confidence: 7
      };
    }
  }

  private getFallbackComprehensiveAnalysis(healthData: HealthData): ComprehensiveAnalysis {
    // Basic fallback analysis when API is unavailable
    return {
      wellnessAdvice: {
        advice: 'Maintain a balanced lifestyle based on your health data.',
        keyPoints: ['Regular exercise', 'Balanced diet', 'Adequate sleep'],
        confidence: 5
      },
      constitution: {
        tendency: 'Balanced Constitution',
        explanation: 'Your health indicators suggest balanced constitution.',
        recommendations: ['Maintain current lifestyle'],
        confidence: 5
      },
      externalPathogen: {
        pathogenType: 'No Significant External Pathogen',
        explanation: 'No significant external pathogenic factors detected.',
        recommendations: ['Maintain good hygiene'],
        confidence: 5
      },
      organImbalance: {
        imbalanceType: 'Harmonious Organ Function',
        explanation: 'Organ systems appear to be functioning harmoniously.',
        recommendations: ['Continue current practices'],
        confidence: 5
      }
    };
  }

  private getFallbackPersonalizedAdvice(healthData: HealthData): PersonalizedAdvice {
    // Basic fallback analysis when API is unavailable
    return {
      diet: 'Maintain a balanced diet',
      sleep: 'Maintain a regular sleep schedule',
      emotions: 'Maintain a positive emotional state',
      exercise: 'Maintain a balanced exercise routine',
      acupressure: 'Consider acupressure therapy for relaxation'
    };
  }
}

export const aiAnalysisService = AIAnalysisService.getInstance(); 
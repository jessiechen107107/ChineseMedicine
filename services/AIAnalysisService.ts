import { HealthData } from './HealthService';

// 請設置環境變量 EXPO_PUBLIC_OPENAI_API_KEY
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
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

export interface InternalBalanceAnalysis {
  organStatus: string;
  patterns: string[];
  explanation: string;
  recommendations: string[];
  confidence: number;
  organFunctionScores: {
    heart: number;    // 0-100
    liver: number;    // 0-100
    spleen: number;   // 0-100
    lung: number;     // 0-100
    kidney: number;   // 0-100
  };
}

export interface ComprehensiveAnalysis {
  wellnessAdvice: WellnessAdvice;
  constitution: ConstitutionAnalysis;
  externalPathogen: ExternalPathogenAnalysis;
  organImbalance: OrganImbalanceAnalysis;
  internalBalance: InternalBalanceAnalysis;
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
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

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
    location: string = 'Taiwan',
    externalPathogensData?: any
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

      const prompt = this.buildComprehensivePrompt(healthData, assessmentData, location, externalPathogensData);

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
        // Keep token budget modest to avoid transport failures on some mobile networks
        max_tokens: 1000,
        temperature: 0.7,
      };

      const data = await this.postChatCompletionWithRetry(requestBody, 'comprehensive');

      const analysis = this.parseComprehensiveResponse(data.choices[0].message.content);
      
      return analysis;
    } catch (error) {
      console.error('Error in comprehensive analysis:', error);
      // Fallback to basic analysis if API fails
      return this.getFallbackComprehensiveAnalysis(healthData);
    }
  }

  /**
   * Helper: resilient POST to OpenAI with timeout and retries.
   */
  private async postChatCompletionWithRetry(body: any, label: string) {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[${label}] API Error Response (${response.status}):`, errorText);
          // Retry on 5xx server errors
          if (response.status >= 500 && attempt < 3) {
            await new Promise(r => setTimeout(r, attempt * 1500));
            continue;
          }
          throw new Error(`${label} API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        lastErr = err;
        console.error(`[${label}] request attempt ${attempt} failed:`, err);
        // Retry on network failures/aborts
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 1500));
          continue;
        }
      }
    }
    throw lastErr ?? new Error('Unknown network error');
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

      // 重試機制：最多嘗試3次
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
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
            console.error(`Attempt ${attempt} - API Error Response:`, errorText);
            
            // 如果是5xx錯誤，嘗試重試
            if (response.status >= 500 && attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, attempt * 2000));
              continue;
            }
            
            throw new Error(`Personalized Advice API request failed: ${response.status} - ${errorText}`);
          }

          const data = await response.json();

          const advice = this.parsePersonalizedAdviceResponse(data.choices[0].message.content);
          
          return advice;
        } catch (error) {
          lastError = error as Error;
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }
        }
      }
      
      // 如果所有重試都失敗，拋出最後的錯誤
      throw lastError;
      
    } catch (error) {
      console.error('Error in personalized advice analysis:', error);
      // Fallback to basic analysis if API fails
      return this.getFallbackPersonalizedAdvice(healthData);
    }
  }

  private async testAPIKey(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
      });

      if (response.ok) {
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
    location: string = 'Taiwan',
    externalPathogensData?: any
  ): string {
    const climate = this.getClimateDescription(location);
    
    let prompt = `As a TCM wellness expert, provide comprehensive analysis based on the following data:

Health Data:
- Heart Rate: ${healthData.heartRate} bpm
- Sleep Duration: ${healthData.sleepDuration} hours
- Daily Steps: ${healthData.steps}
- Blood Oxygen: ${healthData.bloodOxygen}%
- Menstrual Cycle: ${healthData.averageCycleLength} days (if applicable)
- Period Duration: ${healthData.periodDuration} days (if applicable)

Location & Climate: ${location} - ${climate}

`;

    if (externalPathogensData) {
      prompt += `External Pathogens Analysis:
- Wind Pathogen Level: ${externalPathogensData.wind}% (風邪)
- Cold Pathogen Level: ${externalPathogensData.cold}% (寒邪)
- Dampness Pathogen Level: ${externalPathogensData.dampness}% (濕邪)
- Dryness Pathogen Level: ${externalPathogensData.dryness}% (燥邪)
- Heat Pathogen Level: ${externalPathogensData.heat}% (火邪)
- Summer Heat Pathogen Level: ${externalPathogensData.summerHeat}% (暑邪)

`;
    }

    if (assessmentData) {
      prompt += `Assessment Records:
- Tongue Observation: ${assessmentData.observation.tongueColor}
- Facial Color: ${assessmentData.observation.faceColor}
- Breath Quality: ${assessmentData.smell.badBreath}
- Digestive Issues: ${assessmentData.smell.flatulence}
- Symptoms: ${assessmentData.inquiry.selectedSymptoms.join(', ')}
- Additional Symptoms: ${assessmentData.inquiry.customSymptoms}
- Pulse Rate: ${assessmentData.pulse.pulseRate} bpm
- Pulse Type: ${assessmentData.pulse.pulseType}

`;
    }

    prompt += `Please provide a comprehensive analysis including:

1. WELLNESS ADVICE: Personalized advice considering health data, climate, and lifestyle
2. CONSTITUTIONAL TENDENCY: Primary constitution type (Qi deficiency, Blood deficiency, Damp-heat, Yin deficiency, Yang deficiency, or Balanced)
   - Analyze heart rate changes, sleep performance, and activity data from Health app
   - Consider patterns in daily energy levels, stress responses, and recovery
   - Provide constitution type and corresponding symptoms in English
   - Focus on how the user's physiological data reflects their body constitution tendency
3. EXTERNAL PATHOGENIC FACTORS: Assessment based on the external pathogens data provided
   - Analyze the specific pathogen levels (Wind, Cold, Dampness, Dryness, Heat, Summer Heat)
   - Focus on the 2-3 highest pathogen levels and their potential health impacts
   - Consider how these external factors correlate with the user's health data
   - Provide specific TCM observations about environmental sensitivity patterns
4. ORGAN IMBALANCE PATTERNS: Evaluation of organ systems (Heart, Liver, Spleen, Lung, Kidney imbalances)
5. INTERNAL BALANCE ANALYSIS: Assess the functional status of five organs based on health data
   - Provide specific function scores (0-100) for each organ: Heart, Liver, Spleen, Lung, Kidney
   - Heart function: Based on heart rate patterns, sleep quality, stress indicators (normal: 70-85, good sleep and stable HR boost score)
   - Liver function: Based on stress levels, sleep regularity, emotional balance (high stress or poor sleep patterns reduce score)
   - Spleen function: Based on activity levels, digestive health indicators, energy stability (low activity reduces score significantly)
   - Lung function: Based on blood oxygen levels, respiratory indicators, exercise capacity (low oxygen or poor activity affects score)
   - Kidney function: Based on overall vitality, sleep restoration, fundamental energy (poor sleep and low activity impact score)
   - Scores should vary meaningfully based on actual data patterns, not default to similar values

Consider the climate environment effects (${climate}) on the analysis.
${externalPathogensData ? 'Pay special attention to the external pathogens data and correlate it with health symptoms and patterns.' : 'Pay special attention to how environmental factors may correlate with Health app data showing stress changes, sleep variations, and energy fluctuations.'}

Format your response as JSON:
{
  "wellnessAdvice": {
    "advice": "comprehensive wellness advice paragraph",
    "keyPoints": ["key point 1", "key point 2", "key point 3"],
    "confidence": confidence_score
  },
  "constitution": {
    "tendency": "constitution type in English (e.g., Qi Deficiency Constitution, Yin Deficiency Constitution)",
    "explanation": "possible corresponding symptoms in English based on heart rate changes, sleep performance, and activity data. Focus on observable symptoms that reflect this constitution type (e.g., fatigue after exertion, sensitivity to cold, poor sleep quality, low energy levels)",
    "recommendations": ["rec 1", "rec 2", "rec 3"],
    "confidence": confidence_score
  },
  "externalPathogen": {
    "pathogenType": "Primary external pathogen type based on the provided pathogen data (e.g., Wind-Cold, Dampness-Heat, Wind-Heat, etc.)",
    "explanation": "As a TCM practitioner, analyze the specific external pathogen levels provided. Focus on the 2-3 highest pathogen values and explain how they correlate with the user's health data. Describe the potential symptoms and health impacts of these dominant external factors. Mention specific conditions like Wind-Cold sensitivity, Dampness accumulation, Heat patterns, etc. based on the actual data provided.",
    "recommendations": ["rec 1", "rec 2", "rec 3"],
    "confidence": confidence_score
  },
  "organImbalance": {
    "imbalanceType": "primary organ imbalance or Harmonious",
    "explanation": "detailed explanation",
    "recommendations": ["rec 1", "rec 2", "rec 3"],
    "confidence": confidence_score
  },
  "internalBalance": {
    "organStatus": "Overall organ function status in English",
    "patterns": ["Specific TCM pattern names in English based on health data analysis. Examples: Heart Qi Deficiency, Liver Qi Stagnation, Spleen Qi Deficiency, Lung Qi Deficiency, Kidney Yang Deficiency, Liver Fire Blazing, Heart Fire, Spleen Yang Deficiency, Kidney Yin Deficiency, Liver Blood Deficiency, Heart Blood Deficiency, Lung Yin Deficiency, Spleen Deficiency with Dampness, Phlegm misting the Heart, Wind-Cold Invading the Lung, etc. Select 2-3 most relevant patterns based on the health data."],
    "explanation": "As a TCM practitioner, analyze the health data (heart rate, sleep quality, activity levels, stress indicators) to identify which organs may have dysfunction. Focus on the organs that show abnormal function based on the data patterns. Provide a professional assessment describing the potential physical symptoms that may correspond to these organ dysfunctions. Do not list each organ individually - instead, provide a cohesive analysis of the main symptoms that may arise from the identified organ imbalances. Format: 'Organ Function Status' followed by 'Possible Corresponding Symptoms' - all in English.",
    "recommendations": ["rec 1", "rec 2", "rec 3"],
    "confidence": confidence_score,
    "organFunctionScores": {
      "heart": "number_0_to_100 - Assess based on heart rate stability (60-80 = good, >90 or <50 = concerning), sleep quality (7-8h = good), stress patterns. Good indicators = 75-90, average = 50-75, poor = 30-50",
      "liver": "number_0_to_100 - Assess based on stress management (reflected in HR variability), sleep regularity, emotional stability patterns. High stress/poor sleep = lower scores",
      "spleen": "number_0_to_100 - Heavily weight activity levels (>8000 steps = good, 5000-8000 = average, <5000 = poor), energy stability, digestive function indicators",
      "lung": "number_0_to_100 - Focus on blood oxygen levels (>97% = excellent, 95-97% = good, <95% = concerning), exercise capacity, respiratory health",
      "kidney": "number_0_to_100 - Assess fundamental vitality through sleep restoration quality, overall energy patterns, basic physiological stability"
    }
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
          },
          internalBalance: {
            organStatus: parsed.internalBalance?.organStatus || 'Balanced Internal Function',
            patterns: parsed.internalBalance?.patterns || ['Balanced Organ Function'],
            explanation: parsed.internalBalance?.explanation || 'Organ Function Status: Generally balanced internal function. Possible Corresponding Symptoms: No significant symptoms related to organ dysfunction are indicated by your current health data patterns.',
            recommendations: parsed.internalBalance?.recommendations || ['Continue healthy lifestyle'],
            confidence: parsed.internalBalance?.confidence || 5,
            organFunctionScores: parsed.internalBalance?.organFunctionScores || {
              heart: 75,
              liver: 75,
              spleen: 75,
              lung: 75,
              kidney: 75
            }
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
      },
      internalBalance: {
        organStatus: 'Balanced Internal Function',
        patterns: ['Heart Qi Deficiency', 'Spleen Qi Deficiency'],
        explanation: 'Organ Function Status: Generally balanced internal function. Possible Corresponding Symptoms: No significant symptoms related to organ dysfunction are indicated by your current health data patterns.',
        recommendations: ['Continue healthy lifestyle'],
        confidence: 5,
        organFunctionScores: {
          heart: 75,
          liver: 75,
          spleen: 75,
          lung: 75,
          kidney: 75
        }
      }
    };
  }

  private getFallbackPersonalizedAdvice(healthData: HealthData): PersonalizedAdvice {
    // 基於健康數據提供個性化的fallback建議
    let diet = 'Maintain a balanced diet with warm, cooked foods';
    let sleep = 'Maintain a regular sleep schedule, sleeping before 11 PM';
    let emotions = 'Practice stress management through meditation or gentle activities';
    let exercise = 'Engage in moderate exercise like walking or tai chi';
    let acupressure = 'Consider gentle acupressure on Yintang and Baihui points for relaxation';

    // 根據心率調整建議
    if (healthData.heartRate > 90) {
      diet = 'Focus on cooling foods like cucumber, watermelon, and green tea to calm excessive heat';
      emotions = 'Practice calming activities like deep breathing and avoid overstimulation';
      exercise = 'Choose gentle exercises like slow walking or stretching to avoid overexertion';
      acupressure = 'Apply gentle pressure to Shenmen and Yintang points to calm the mind';
    } else if (healthData.heartRate < 60) {
      diet = 'Include warming foods like ginger, cinnamon, and cooked grains to boost energy';
      exercise = 'Gradually increase activity with gentle movement like tai chi or qigong';
      acupressure = 'Stimulate Baihui and Qihai points to boost vital energy';
    }

    // 根據睡眠調整建議
    if (healthData.sleepDuration < 6) {
      sleep = 'Prioritize extending sleep to 7-8 hours. Create a calming bedtime routine starting 2 hours before sleep';
      emotions = 'Practice evening meditation or gentle stretching to prepare for better rest';
      diet = 'Avoid caffeine after 2 PM and have a light dinner 3 hours before bedtime';
    } else if (healthData.sleepDuration > 9) {
      sleep = 'Aim for 7-8 hours of sleep. Consider setting a consistent wake time to regulate your circadian rhythm';
      exercise = 'Increase daily activity to promote better sleep quality and daytime energy';
    }

    // 根據活動量調整建議
    if (healthData.steps < 5000) {
      exercise = 'Gradually increase daily steps to 8000+. Start with short 10-minute walks after meals';
      diet = 'Include energizing foods like dates, walnuts, and lean proteins to support increased activity';
      emotions = 'Set small, achievable movement goals to build confidence and motivation';
    }

    // 根據血氧調整建議
    if (healthData.bloodOxygen < 95) {
      exercise = 'Practice deep breathing exercises and gentle cardio to improve oxygen circulation';
      acupressure = 'Apply pressure to Feishu and Danzhong points to support respiratory function';
      diet = 'Include foods rich in iron and vitamin C to support oxygen transport';
    }

    return { diet, sleep, emotions, exercise, acupressure };
  }
}

export const aiAnalysisService = AIAnalysisService.getInstance(); 
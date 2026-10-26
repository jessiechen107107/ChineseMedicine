import { askClaude, ClaudeImage, isClaudeConfigured, parseJsonReply } from './ClaudeService';
import { HealthData } from './HealthService';

// Four Examinations (望聞問切) intake: Look, Listen/Smell, Ask, Pulse.
// Builds a constitution profile locally (works offline) and, when a Claude API key is set,
// asks Claude for a narrative reading that includes the face and tongue photos.

export type ConstitutionKey =
  | 'balanced'
  | 'qiDeficiency'
  | 'yangDeficiency'
  | 'yinDeficiency'
  | 'phlegmDamp'
  | 'dampHeat'
  | 'bloodStasis'
  | 'qiStagnation';

export const CONSTITUTIONS: Record<ConstitutionKey, { name: string; zh: string; summary: string }> = {
  balanced: { name: 'Balanced', zh: '平和質', summary: 'Energy, sleep and digestion are generally steady.' },
  qiDeficiency: { name: 'Qi Deficiency', zh: '氣虛質', summary: 'Tires easily, short of breath, catches colds often.' },
  yangDeficiency: { name: 'Yang Deficiency', zh: '陽虛質', summary: 'Cold hands and feet, prefers warm food and drinks.' },
  yinDeficiency: { name: 'Yin Deficiency', zh: '陰虛質', summary: 'Feels warm or dry, night sweats, restless sleep.' },
  phlegmDamp: { name: 'Phlegm-Damp', zh: '痰濕質', summary: 'Heavy body, sluggish digestion, greasy tongue coating.' },
  dampHeat: { name: 'Damp-Heat', zh: '濕熱質', summary: 'Oily skin, bitter taste or bad breath, irritability.' },
  bloodStasis: { name: 'Blood Stasis', zh: '血瘀質', summary: 'Dull complexion, fixed aches, dark tongue spots.' },
  qiStagnation: { name: 'Qi Stagnation', zh: '氣鬱質', summary: 'Stress, low mood, sighing, tight chest or sides.' },
};

type Weights = Partial<Record<ConstitutionKey, number>>;

export interface ChoiceOption {
  id: string;
  label: string;
  weights: Weights;
}

export interface InquiryQuestion {
  id: string;
  question: string;
  options: ChoiceOption[];
}

// A short version of the classic "Ten Questions" (十問)
export const INQUIRY_QUESTIONS: InquiryQuestion[] = [
  {
    id: 'temperature',
    question: 'Do you usually feel cold or warm?',
    options: [
      { id: 'cold', label: 'Often cold', weights: { yangDeficiency: 3, qiDeficiency: 1 } },
      { id: 'warm', label: 'Often warm', weights: { yinDeficiency: 2, dampHeat: 2 } },
      { id: 'normal', label: 'Neither', weights: { balanced: 2 } },
    ],
  },
  {
    id: 'energy',
    question: 'How is your energy during the day?',
    options: [
      { id: 'tired', label: 'Tired easily', weights: { qiDeficiency: 3, yangDeficiency: 1 } },
      { id: 'heavy', label: 'Heavy, sluggish', weights: { phlegmDamp: 3 } },
      { id: 'good', label: 'Good', weights: { balanced: 2 } },
    ],
  },
  {
    id: 'sweat',
    question: 'How do you sweat?',
    options: [
      { id: 'easy', label: 'Sweat easily', weights: { qiDeficiency: 2 } },
      { id: 'night', label: 'Night sweats', weights: { yinDeficiency: 3 } },
      { id: 'sticky', label: 'Sticky, oily', weights: { dampHeat: 2, phlegmDamp: 1 } },
      { id: 'normal', label: 'Normal', weights: { balanced: 1 } },
    ],
  },
  {
    id: 'thirst',
    question: 'Thirst and drinks?',
    options: [
      { id: 'dry', label: 'Dry mouth, want cold drinks', weights: { yinDeficiency: 2, dampHeat: 1 } },
      { id: 'warm', label: 'Prefer warm drinks', weights: { yangDeficiency: 2 } },
      { id: 'notThirsty', label: 'Rarely thirsty', weights: { phlegmDamp: 1 } },
      { id: 'normal', label: 'Normal', weights: { balanced: 1 } },
    ],
  },
  {
    id: 'digestion',
    question: 'Appetite and digestion?',
    options: [
      { id: 'bloated', label: 'Bloated after meals', weights: { qiDeficiency: 1, phlegmDamp: 2 } },
      { id: 'loose', label: 'Loose stools', weights: { yangDeficiency: 1, qiDeficiency: 1, phlegmDamp: 1 } },
      { id: 'constipated', label: 'Constipated', weights: { yinDeficiency: 1, dampHeat: 1 } },
      { id: 'normal', label: 'Normal', weights: { balanced: 2 } },
    ],
  },
  {
    id: 'sleep',
    question: 'How do you sleep?',
    options: [
      { id: 'hardToFall', label: 'Hard to fall asleep', weights: { yinDeficiency: 1, qiStagnation: 2 } },
      { id: 'wakeOften', label: 'Wake up often', weights: { yinDeficiency: 2 } },
      { id: 'sleepy', label: 'Always sleepy', weights: { phlegmDamp: 2, qiDeficiency: 1 } },
      { id: 'good', label: 'Sleep well', weights: { balanced: 2 } },
    ],
  },
  {
    id: 'mood',
    question: 'How is your mood lately?',
    options: [
      { id: 'stressed', label: 'Stressed, sighing', weights: { qiStagnation: 3 } },
      { id: 'irritable', label: 'Irritable', weights: { dampHeat: 1, qiStagnation: 1, yinDeficiency: 1 } },
      { id: 'low', label: 'Low, unmotivated', weights: { qiDeficiency: 1, qiStagnation: 1 } },
      { id: 'calm', label: 'Calm', weights: { balanced: 2 } },
    ],
  },
  {
    id: 'pain',
    question: 'Any recurring aches?',
    options: [
      { id: 'fixed', label: 'Sharp, fixed pain', weights: { bloodStasis: 3 } },
      { id: 'headache', label: 'Headaches', weights: { qiStagnation: 1, bloodStasis: 1 } },
      { id: 'heavyJoints', label: 'Heavy, achy joints', weights: { phlegmDamp: 2 } },
      { id: 'none', label: 'None', weights: { balanced: 1 } },
    ],
  },
];

export const SMELL_OPTIONS: ChoiceOption[] = [
  { id: 'badBreath', label: 'Bad breath', weights: { dampHeat: 2 } },
  { id: 'sourBreath', label: 'Sour breath', weights: { phlegmDamp: 1, dampHeat: 1 } },
  { id: 'strongSweat', label: 'Strong sweat odor', weights: { dampHeat: 2 } },
  { id: 'strongUrine', label: 'Strong urine odor', weights: { dampHeat: 1 } },
  { id: 'none', label: 'Nothing unusual', weights: { balanced: 1 } },
];

export interface IntakePhoto {
  uri: string;
  base64?: string | null;
}

export interface IntakeData {
  facePhoto: IntakePhoto | null;
  tonguePhoto: IntakePhoto | null;
  smellTags: string[];
  smellNote: string;
  answers: Record<string, string>;
  question: string;
  healthData: HealthData | null;
}

export interface PulseEstimate {
  label: string;
  description: string;
  weights: Weights;
}

export interface FourExamsResult {
  scores: { key: ConstitutionKey; score: number }[]; // 0-100, sorted high to low
  primary: ConstitutionKey;
  pulse: PulseEstimate | null;
  observation: string;
  pulseAnalysis: string;
  comprehensiveAnalysis: string;
  correspondingSymptoms: string;
  answerToQuestion: string;
  dietRecommendations: string[];
  lifestyleRecommendations: string[];
  acupressurePoints: string[];
  source: 'claude' | 'offline';
}

// Rough pulse-quality estimate from Apple Watch heart rate and HRV
export function estimatePulse(healthData: HealthData | null): PulseEstimate | null {
  if (!healthData?.heartRate) return null;
  const hr = healthData.heartRate;
  const hrv = healthData.heartRateVariability || healthData.averageHRV || 0;

  if (hr >= 90) {
    return {
      label: 'Rapid (數脈)',
      description: `Heart rate ${hr} bpm is on the fast side, which TCM links to heat.`,
      weights: { dampHeat: 2, yinDeficiency: 2 },
    };
  }
  if (hr <= 58) {
    return {
      label: 'Slow (遲脈)',
      description: `Heart rate ${hr} bpm is slow, which TCM links to cold or low yang (unless you train a lot).`,
      weights: { yangDeficiency: 2 },
    };
  }
  if (hrv > 0 && hrv < 25) {
    return {
      label: 'Wiry (弦脈)',
      description: `Low HRV (${hrv} ms) suggests tension and stress load.`,
      weights: { qiStagnation: 2, qiDeficiency: 1 },
    };
  }
  if (hrv >= 50) {
    return {
      label: 'Moderate (緩脈)',
      description: `Steady rate and healthy HRV (${hrv} ms) suggest smooth qi and blood.`,
      weights: { balanced: 3 },
    };
  }
  return {
    label: 'Even (平脈)',
    description: `Heart rate ${hr} bpm and HRV ${hrv || '-'} ms are within a typical range.`,
    weights: { balanced: 1 },
  };
}

export function scoreConstitution(intake: IntakeData): FourExamsResult['scores'] {
  const totals: Record<ConstitutionKey, number> = {
    balanced: 0,
    qiDeficiency: 0,
    yangDeficiency: 0,
    yinDeficiency: 0,
    phlegmDamp: 0,
    dampHeat: 0,
    bloodStasis: 0,
    qiStagnation: 0,
  };
  const add = (weights: Weights) => {
    (Object.keys(weights) as ConstitutionKey[]).forEach((k) => {
      totals[k] += weights[k] || 0;
    });
  };

  INQUIRY_QUESTIONS.forEach((q) => {
    const option = q.options.find((o) => o.id === intake.answers[q.id]);
    if (option) add(option.weights);
  });
  SMELL_OPTIONS.filter((o) => intake.smellTags.includes(o.id)).forEach((o) => add(o.weights));

  const pulse = estimatePulse(intake.healthData);
  if (pulse) add(pulse.weights);

  const sleepHours = intake.healthData?.sleepDuration;
  if (sleepHours && sleepHours < 6) add({ yinDeficiency: 1, qiDeficiency: 1 });
  const steps = intake.healthData?.steps;
  if (steps && steps < 4000) add({ phlegmDamp: 1, qiStagnation: 1 });

  const max = Math.max(...Object.values(totals), 1);
  return (Object.keys(totals) as ConstitutionKey[])
    .map((key) => ({ key, score: Math.round((totals[key] / max) * 100) }))
    .sort((a, b) => b.score - a.score);
}

const OFFLINE_ADVICE: Record<ConstitutionKey, { diet: string[]; lifestyle: string[]; acupressure: string[] }> = {
  balanced: {
    diet: ['Keep a varied, seasonal diet', 'Eat at regular times and stop at 80% full'],
    lifestyle: ['Keep a steady sleep schedule', 'Moderate exercise most days'],
    acupressure: ['Zu San Li (ST36) for overall vitality'],
  },
  qiDeficiency: {
    diet: ['Chinese yam, red dates, oats and congee', 'Avoid skipping breakfast and cold raw food'],
    lifestyle: ['Gentle exercise such as Tai Chi or walking', 'Avoid overworking; rest before you are exhausted'],
    acupressure: ['Zu San Li (ST36) to strengthen spleen qi', 'Qi Hai (CV6) to build energy'],
  },
  yangDeficiency: {
    diet: ['Warming foods: ginger, cinnamon, lamb, walnuts', 'Drink warm water; limit iced drinks'],
    lifestyle: ['Keep feet, lower back and belly warm', 'Morning sunlight and light movement'],
    acupressure: ['Guan Yuan (CV4) to warm yang', 'Yong Quan (KD1) before bed'],
  },
  yinDeficiency: {
    diet: ['Moistening foods: pear, lily bulb, white fungus, black sesame', 'Limit spicy, fried food and alcohol'],
    lifestyle: ['Sleep before 11 PM', 'Calming activities in the evening, less screen time'],
    acupressure: ['San Yin Jiao (SP6) to nourish yin', 'Tai Xi (KD3) to support the kidneys'],
  },
  phlegmDamp: {
    diet: ['Job’s tears (coix seed), adzuki beans, winter melon', 'Cut back on sweets, dairy and greasy food'],
    lifestyle: ['Daily sweat-inducing exercise', 'Keep living space dry and ventilated'],
    acupressure: ['Feng Long (ST40) to resolve phlegm', 'Yin Ling Quan (SP9) to drain damp'],
  },
  dampHeat: {
    diet: ['Mung beans, bitter melon, cucumber, green tea', 'Avoid alcohol, fried and very spicy food'],
    lifestyle: ['Stay cool and dry in humid weather', 'Regular bowel habits and enough water'],
    acupressure: ['Qu Chi (LI11) to clear heat', 'Yin Ling Quan (SP9) to drain damp'],
  },
  bloodStasis: {
    diet: ['Hawthorn, black fungus, turmeric, a little rose tea', 'Avoid very cold foods'],
    lifestyle: ['Move every hour; stretch and walk', 'Warm baths to keep circulation flowing'],
    acupressure: ['Xue Hai (SP10) to move blood', 'He Gu (LI4) to relieve aches'],
  },
  qiStagnation: {
    diet: ['Citrus peel, rose or jasmine tea, mint', 'Eat slowly and avoid eating when upset'],
    lifestyle: ['Daily outdoor time and deep breathing', 'Talk things through; journaling or music'],
    acupressure: ['Tai Chong (LR3) to ease liver qi', 'Nei Guan (PC6) to calm the chest'],
  },
};

function buildOfflineResult(intake: IntakeData, scores: FourExamsResult['scores'], pulse: PulseEstimate | null): FourExamsResult {
  const primary = scores[0].key;
  const secondary = scores[1]?.score >= 60 ? scores[1].key : null;
  const advice = OFFLINE_ADVICE[primary];
  const p = CONSTITUTIONS[primary];

  const smellLabels = SMELL_OPTIONS.filter((o) => o.id !== 'none' && intake.smellTags.includes(o.id)).map((o) => o.label.toLowerCase());
  const photos = [intake.facePhoto && 'face', intake.tonguePhoto && 'tongue'].filter(Boolean).join(' and ');

  return {
    scores,
    primary,
    pulse,
    observation: photos
      ? `Your ${photos} photo${photos.includes('and') ? 's are' : ' is'} saved with this assessment. Add a Claude API key to get an AI reading of complexion and tongue coating.`
      : 'No photos were provided for observation.',
    pulseAnalysis: pulse ? `${pulse.label}: ${pulse.description}` : 'No heart data was available for the pulse estimate.',
    comprehensiveAnalysis:
      `Your answers point mainly to a ${p.name} (${p.zh}) tendency${secondary ? `, with some ${CONSTITUTIONS[secondary].name} (${CONSTITUTIONS[secondary].zh}) signs` : ''}. ` +
      (smellLabels.length ? `You reported ${smellLabels.join(', ')}. ` : ''),
    correspondingSymptoms: p.summary,
    answerToQuestion: intake.question.trim()
      ? 'Detailed answers to your question need the AI reading (set EXPO_PUBLIC_ANTHROPIC_API_KEY). The suggestions below are matched to your constitution.'
      : '',
    dietRecommendations: advice.diet,
    lifestyleRecommendations: advice.lifestyle,
    acupressurePoints: advice.acupressure,
    source: 'offline',
  };
}

export async function analyzeFourExams(intake: IntakeData): Promise<FourExamsResult> {
  const scores = scoreConstitution(intake);
  const pulse = estimatePulse(intake.healthData);
  const offline = buildOfflineResult(intake, scores, pulse);

  if (!isClaudeConfigured()) return offline;

  const answers = INQUIRY_QUESTIONS.map((q) => {
    const option = q.options.find((o) => o.id === intake.answers[q.id]);
    return `- ${q.question} ${option ? option.label : 'not answered'}`;
  }).join('\n');
  const smell = SMELL_OPTIONS.filter((o) => intake.smellTags.includes(o.id)).map((o) => o.label).join(', ') || 'none selected';
  const hd = intake.healthData;
  const topScores = scores.slice(0, 3).map((s) => `${CONSTITUTIONS[s.key].name} ${s.score}`).join(', ');

  const prompt = `Act as a caring Traditional Chinese Medicine wellness advisor doing the Four Examinations (望聞問切).

LOOK (望): ${intake.facePhoto ? 'A face photo is attached.' : 'No face photo.'} ${intake.tonguePhoto ? 'A tongue photo is attached.' : 'No tongue photo.'}
LISTEN/SMELL (聞): ${smell}. Notes: ${intake.smellNote || 'none'}
ASK (問):
${answers}
User's question: ${intake.question || 'none'}
PULSE (切, estimated from Apple Watch): heart rate ${hd?.heartRate ?? '-'} bpm, HRV ${hd?.heartRateVariability ?? '-'} ms, ${pulse?.label ?? 'unknown'}
Other data: sleep ${hd?.sleepDuration ?? '-'} h, steps ${hd?.steps ?? '-'}, SpO2 ${hd?.bloodOxygen ?? '-'}%
Questionnaire constitution scores: ${topScores}

Describe what you see in the photos (complexion, tongue color, coating, shape) if provided. Use a warm tone, wellness language only, no diagnosis or medication. Reply in English as JSON only:
{
  "observation": "what the face/tongue photos suggest",
  "pulseAnalysis": "pulse reading",
  "comprehensiveAnalysis": "how the four examinations fit together",
  "correspondingSymptoms": "constitution pattern and typical signs",
  "answerToQuestion": "answer to the user's question, or empty string",
  "dietRecommendations": ["...", "...", "..."],
  "lifestyleRecommendations": ["...", "..."],
  "acupressurePoints": ["...", "...", "..."]
}`;

  const images: ClaudeImage[] = [intake.facePhoto, intake.tonguePhoto]
    .filter((photo): photo is IntakePhoto => !!photo?.base64)
    .map((photo) => ({ base64: photo.base64 as string }));

  try {
    const text = await askClaude({
      system: 'You are a caring Traditional Chinese Medicine wellness advisor. You give wellness suggestions, never diagnoses or prescriptions.',
      prompt,
      images,
    });
    const ai = parseJsonReply(text);
    return { ...offline, ...ai, scores, primary: offline.primary, pulse, source: 'claude' };
  } catch (error) {
    console.error('Four Examinations AI analysis failed:', error);
    return offline;
  }
}

// Shared Claude API client for all AI features.
// Set EXPO_PUBLIC_ANTHROPIC_API_KEY in .env. Every caller keeps an offline fallback,
// so the app still works without a key or network.
//
// Note: EXPO_PUBLIC_* values are bundled into the app, so the key ships with the build.
// That is acceptable for a personal demo; a production app should call Claude from a backend.
//
// This calls the Messages API over fetch rather than @anthropic-ai/sdk: the SDK targets
// Node/browser/Deno/Workers and fails to initialize under Hermes.

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = 'claude-opus-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
// The comprehensive analysis asks for several thousand tokens of JSON and measures around 110s.
// React Native's fetch cannot stream, so the whole response has to arrive within one request.
const TIMEOUT_MS = 180_000;

export const isClaudeConfigured = () => ANTHROPIC_API_KEY !== '';

export interface ClaudeImage {
  base64: string;
  mediaType?: 'image/jpeg' | 'image/png';
}

interface AskOptions {
  system: string;
  prompt: string;
  images?: ClaudeImage[];
}

interface MessagesResponse {
  content: { type: string; text?: string }[];
  stop_reason: string;
  stop_details?: { category?: string | null } | null;
}

// Sends one prompt and returns the reply text. Throws if no key is set or the request fails.
export async function askClaude({ system, prompt, images = [] }: AskOptions): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error('Missing EXPO_PUBLIC_ANTHROPIC_API_KEY');

  const content = [
    ...images.map((image) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: image.mediaType ?? 'image/jpeg',
        data: image.base64,
      },
    })),
    { type: 'text' as const, text: prompt },
  ];

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    system,
    // Low effort keeps replies fast enough for a mobile UI
    output_config: { effort: 'low' },
    // If a request is declined by safety classifiers, the API retries it on a fallback model
    fallbacks: 'default',
    messages: [{ role: 'user', content }],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Claude API ${response.status}: ${await response.text()}`);
  }

  const data: MessagesResponse = await response.json();

  if (data.stop_reason === 'refusal') {
    throw new Error(`Claude declined the request (${data.stop_details?.category ?? 'unknown'})`);
  }

  return data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');
}

// Pulls the first JSON object out of a reply (tolerates code fences or extra prose).
export function parseJsonReply<T = any>(text: string): T {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in reply');
  return JSON.parse(cleaned.slice(start, end + 1));
}

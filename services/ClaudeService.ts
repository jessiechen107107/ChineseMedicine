import Anthropic from '@anthropic-ai/sdk';

// Shared Claude API client for all AI features.
// Set EXPO_PUBLIC_ANTHROPIC_API_KEY in .env. Every caller keeps an offline fallback,
// so the app still works without a key or network.
//
// Note: EXPO_PUBLIC_* values are bundled into the app, so the key ships with the build.
// That is acceptable for a personal demo; a production app should call Claude from a backend.

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = 'claude-opus-5-5';

const client = ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
      // React Native looks like a browser to the SDK; the key is already in the bundle (see note above)
      dangerouslyAllowBrowser: true,
      timeout: 60_000,
      maxRetries: 2,
    })
  : null;

export const isClaudeConfigured = () => client !== null;

export interface ClaudeImage {
  base64: string;
  mediaType?: 'image/jpeg' | 'image/png';
}

interface AskOptions {
  system: string;
  prompt: string;
  images?: ClaudeImage[];
}

// Sends one prompt and returns the reply text. Throws if no key is set or the request fails.
export async function askClaude({ system, prompt, images = [] }: AskOptions): Promise<string> {
  if (!client) throw new Error('Missing EXPO_PUBLIC_ANTHROPIC_API_KEY');

  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...images.map((image) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: image.mediaType ?? 'image/jpeg', data: image.base64 },
    })),
    { type: 'text' as const, text: prompt },
  ];

  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    system,
    // Low effort keeps replies fast enough for a mobile UI
    output_config: { effort: 'low' },
    // If a request is declined by safety classifiers, the API retries it on a fallback model
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{ role: 'user', content }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error(`Claude declined the request (${response.stop_details?.category ?? 'unknown'})`);
  }

  return response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
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

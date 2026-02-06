/**
 * Bytez AI Model Configuration
 * Centralized model management for all AI operations
 */

/**
 * Available AI Models
 * - DeepSeek V3.2 Exp: High-performance model for complex reasoning and content generation
 * - Gemini 1.5 Flash: Fast, lightweight model for quick operations
 */
export const AI_MODELS = {
  // Primary model: DeepSeek V3.2 Exp - for general purpose tasks
  DEEPSEEK_V3_2: 'deepseek-ai/DeepSeek-V3.2-Exp',
  // Secondary model: Gemini 1.5 Flash - for faster operations
  GEMINI_FLASH: 'mlfoundations-dev/oh-dcft-v3.1-gemini-1.5-flash',
} as const;

/**
 * Model selection logic for different tasks
 */
export function selectModel(taskType: 'notes' | 'quiz' | 'video' | 'analysis' | 'adaptive'): string {
  // DeepSeek V3.2 for complex reasoning and comprehensive content
  if (['notes', 'quiz', 'analysis'].includes(taskType)) {
    return AI_MODELS.DEEPSEEK_V3_2;
  }

  // Gemini Flash for faster, lighter operations
  if (['video', 'adaptive'].includes(taskType)) {
    return AI_MODELS.GEMINI_FLASH;
  }

  // Default to DeepSeek for unknown tasks
  return AI_MODELS.DEEPSEEK_V3_2;
}

/**
 * Call Bytez AI API with the specified model
 */
export async function callBytezAI(
  apiKey: string,
  taskType: 'notes' | 'quiz' | 'video' | 'analysis' | 'adaptive',
  messages: { role: string; content: string }[]
): Promise<string> {
  const model = selectModel(taskType);
  
  console.log(`Calling Bytez AI (${model}) for ${taskType}...`);

  const response = await fetch('https://api.bytez.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Bytez AI error:', response.status);

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 401) {
      throw new Error('Invalid API key or authentication failed.');
    }
    if (response.status === 402) {
      throw new Error('Payment required. Please add funds to your Bytez account.');
    }

    throw new Error(`Bytez AI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

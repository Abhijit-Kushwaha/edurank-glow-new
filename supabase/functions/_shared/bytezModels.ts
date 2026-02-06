/**
 * Bytez AI Model Configuration
 * Centralized model management for all AI operations with optimization strategies
 */

/**
 * Available AI Models
 * - Qwen3-4B-Instruct: Ultra-fast lightweight model for summarization and quick note generation
 * - DeepSeek V3.2 Exp: High-performance model for complex reasoning and comprehensive content
 * - Gemini 1.5 Flash: Fast, lightweight model for quick operations and adaptive tasks
 */
export const AI_MODELS = {
  // Ultra-fast model: Qwen3-4B - for rapid summarization and note generation
  QWEN3_4B: 'Qwen/Qwen3-4B-Instruct-2507',
  // Primary model: DeepSeek V3.2 Exp - for general purpose tasks and comprehensive content
  DEEPSEEK_V3_2: 'deepseek-ai/DeepSeek-V3.2-Exp',
  // Secondary model: Gemini 1.5 Flash - for faster operations and adaptive tasks
  GEMINI_FLASH: 'mlfoundations-dev/oh-dcft-v3.1-gemini-1.5-flash',
} as const;

/**
 * Model selection logic with performance optimization
 * Prioritizes Qwen3-4B for speed-critical operations (notes, summarization)
 */
export function selectModel(taskType: 'notes' | 'summarize' | 'quiz' | 'video' | 'analysis' | 'adaptive'): string {
  // Qwen3-4B for ultra-fast note generation and summarization
  if (['notes', 'summarize'].includes(taskType)) {
    return AI_MODELS.QWEN3_4B;
  }

  // DeepSeek V3.2 for complex reasoning when needed
  if (['quiz', 'analysis'].includes(taskType)) {
    return AI_MODELS.DEEPSEEK_V3_2;
  }

  // Gemini Flash for faster, lighter operations
  if (['video', 'adaptive'].includes(taskType)) {
    return AI_MODELS.GEMINI_FLASH;
  }

  // Default to Qwen for unknown tasks (fastest fallback)
  return AI_MODELS.QWEN3_4B;
}

/**
 * Call Bytez AI API with the specified model
 * Optimized for performance with appropriate defaults
 */
export async function callBytezAI(
  apiKey: string,
  taskType: 'notes' | 'summarize' | 'quiz' | 'video' | 'analysis' | 'adaptive',
  messages: { role: string; content: string }[],
  options?: {
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
  }
): Promise<string> {
  const model = selectModel(taskType);
  
  // Optimize temperature and max_tokens based on task type
  const temperature = options?.temperature ?? (taskType === 'summarize' ? 0.3 : 0.7);
  const max_tokens = options?.max_tokens ?? (taskType === 'summarize' ? 1500 : 2000);
  
  console.log(`Calling Bytez AI (${model}) for ${taskType}...`);

  const controller = new AbortController();
  const timeout = options?.timeout ?? 30000; // 30 second default timeout
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('https://api.bytez.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
      signal: controller.signal as any,
    });

    clearTimeout(timeoutId);

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
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fast summarization using Qwen3-4B
 * Optimized for speed with minimal token usage
 */
export async function quickSummarize(
  apiKey: string,
  content: string,
  maxLength: number = 500
): Promise<string> {
  const prompt = `Summarize the following content in ${maxLength} words or less. Be concise and extract only the most important points:

${content}`;

  return callBytezAI(apiKey, 'summarize', [
    {
      role: 'user',
      content: prompt,
    },
  ], {
    temperature: 0.3,
    max_tokens: Math.min(Math.ceil(maxLength / 4), 800), // Rough token estimate
  });
}

/**
 * Batch process multiple prompts in parallel for maximum efficiency
 * Useful for generating multiple summaries or notes in one operation
 */
export async function batchCallBytezAI(
  apiKey: string,
  taskType: 'notes' | 'summarize' | 'quiz' | 'video' | 'analysis' | 'adaptive',
  messagesBatch: Array<{ role: string; content: string }[]>,
  options?: {
    temperature?: number;
    max_tokens?: number;
  }
): Promise<string[]> {
  const promises = messagesBatch.map(messages =>
    callBytezAI(apiKey, taskType, messages, options)
  );

  return Promise.all(promises);
}


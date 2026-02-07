/**
 * AI Service Integration using Bytez SDK
 * Uses DeepSeek-V3 and Kimi-K2 models only
 * Clean, simple implementation with better error handling
 */

let Bytez: any = null;
let bytezSDK: any = null;

// Load bytez dynamically
const loadBytez = async () => {
  if (!Bytez) {
    try {
      console.log('Loading bytez.js SDK...');
      const module = await import('bytez.js');
      Bytez = module.default || module;
      console.log('Bytez loaded successfully');
    } catch (err) {
      console.error('Failed to load bytez.js:', err);
      throw new Error('Failed to load AI service');
    }
  }
  return Bytez;
};

const getBytezSDK = async () => {
  if (!bytezSDK) {
    const BytezClass = await loadBytez();
    const key = import.meta.env.VITE_BYTEZ_API_KEY || "2622dd06541127bea7641c3ad0ed8859";
    console.log('Initializing Bytez SDK with key:', key.substring(0, 8) + '...');
    bytezSDK = new BytezClass(key);
  }
  return bytezSDK;
};

/**
 * Call Bytez with specified model
 */
async function callBytezModel(
  modelId: string,
  messages: Array<{ role: string; content: string }>
): Promise<{ error?: string; output?: string }> {
  try {
    console.log(`Calling Bytez model: ${modelId}`);
    const sdk = await getBytezSDK();
    
    if (!sdk) {
      throw new Error('SDK not initialized');
    }

    const model = sdk.model(modelId);
    if (!model) {
      throw new Error(`Failed to load model: ${modelId}`);
    }

    console.log('Running model with', messages.length, 'messages');
    const result = await model.run(messages);
    
    console.log('Model result:', result);

    if (result.error) {
      console.error(`Model ${modelId} error:`, result.error);
      return { error: result.error };
    }

    if (!result.output) {
      console.error(`Model ${modelId} returned empty output`);
      return { error: 'No output from model' };
    }

    return { output: result.output };
  } catch (err) {
    console.error(`Failed to call ${modelId}:`, err);
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Available models
 */
export const FAST_MODELS = {
  DEEPSEEK_V3: 'deepseek-ai/DeepSeek-V3',
  KIMI_K2: 'moonshotai/Kimi-K2-Instruct-0905',
} as const;

/**
 * Diagnostic: test API key and connectivity using Qwen3-0.6B
 */
export async function testBytezKey(): Promise<{ ok: boolean; error?: string; output?: string }> {
  try {
    const modelId = 'Qwen/Qwen3-0.6B';
    console.log('Testing Bytez key with model:', modelId);
    const { error, output } = await callBytezModel(modelId, [
      { role: 'user', content: 'Hello' },
    ]);

    if (error) {
      console.error('Test model returned error:', error);
      return { ok: false, error };
    }

    console.log('Test model output:', output);
    return { ok: true, output };
  } catch (err) {
    console.error('Test failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Generate study notes
 */
export async function generateNotesWithBytez(
  videoTitle: string,
  videoContent: string,
  filters: {
    class?: string;
    subject?: string;
    language?: string;
    board?: string;
  }
): Promise<{ notes?: string; error?: string }> {
  console.log('Starting note generation for:', videoTitle);
  
  const prompt = `Create comprehensive, well-structured study notes for an educational video.

Video Title: "${videoTitle}"
${filters.class ? `Class/Level: ${filters.class}` : ''}${filters.board ? ` | Board: ${filters.board}` : ''}
Subject: ${filters.subject || 'General'}
${filters.language ? `Language: ${filters.language}` : ''}

Content to summarize:
${videoContent || 'Generate notes based on the video title provided.'}

Create notes with the following structure:

## Key Concepts
- List key definitions and main ideas
- Explain important terminology

## Important Points
- Core facts and critical information
- Details students should memorize
- Exam-important concepts

## Summary
- Concise overview of the topic
- Main takeaways
- How concepts connect

Requirements:
- Clear, student-friendly language
- Well-organized with bullet points
- Exam-ready format
- Suitable for the specified class level
- Focus on learning and retention`;

  // Try DeepSeek first
  console.log('Attempting DeepSeek-V3...');
  let result = await callBytezModel(FAST_MODELS.DEEPSEEK_V3, [
    { role: 'user', content: prompt },
  ]);

  // Fallback to Kimi if DeepSeek fails
  if (result.error) {
    console.warn('DeepSeek failed:', result.error);
    console.log('Attempting Kimi-K2...');
    result = await callBytezModel(FAST_MODELS.KIMI_K2, [
      { role: 'user', content: prompt },
    ]);
    
    if (result.error) {
      console.error('Both models failed:', result.error);
    }
  }

  if (result.error) {
    console.error('Final error:', result.error);
    return { error: result.error };
  }

  console.log('Notes generated successfully, length:', result.output?.length);
  return { notes: result.output };
}

/**
 * Fast summarization
 */
export async function quickSummarize(
  content: string,
  maxLength: number = 300
): Promise<{ summary?: string; error?: string }> {
  const prompt = `Summarize this educational content in clear, bullet-point format (max ${maxLength} words):

${content}`;

  // Try DeepSeek first
  let result = await callBytezModel(FAST_MODELS.DEEPSEEK_V3, [
    { role: 'user', content: prompt },
  ]);

  // Fallback to Kimi if DeepSeek fails
  if (result.error) {
    result = await callBytezModel(FAST_MODELS.KIMI_K2, [
      { role: 'user', content: prompt },
    ]);
  }

  return result.error ? result : { summary: result.output };
}

/**
 * Generate quiz questions
 */
export async function generateQuizWithBytez(
  notes: string,
  filters: {
    class?: string;
    subject?: string;
    board?: string;
  },
  questionCount: number = 10,
  difficultyLevel: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<{ questions?: any[]; error?: string }> {
  const classNote = filters.class ? `Class/Level: ${filters.class}` : '';
  const boardNote = filters.board ? `Board: ${filters.board}` : '';

  const prompt = `Generate ${questionCount} multiple-choice quiz questions based on the provided notes.

${classNote}
${boardNote}
Subject: ${filters.subject || 'General'}
Difficulty Level: ${difficultyLevel}

Notes Content:
${notes}

Requirements:
- Create questions that test understanding, not just memory
- Provide 4 options for each question
- Ensure only one correct answer
- Include detailed explanations
- Make wrong options plausible but incorrect
- Avoid trick questions
- Ensure questions match the ${difficultyLevel} difficulty level

Format your response as a valid JSON array with this structure:
[
  {
    "id": 1,
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this answer is correct..."
  }
]

Return ONLY the JSON array, no markdown or extra text.`;

  // Try DeepSeek first
  let result = await callBytezModel(FAST_MODELS.DEEPSEEK_V3, [
    { role: 'user', content: prompt },
  ]);

  // Fallback to Kimi if DeepSeek fails
  if (result.error) {
    result = await callBytezModel(FAST_MODELS.KIMI_K2, [
      { role: 'user', content: prompt },
    ]);
  }

  if (result.error) {
    return result;
  }

  try {
    const questions = JSON.parse(result.output || '[]');
    return { questions };
  } catch (parseError) {
    console.error('Failed to parse quiz questions:', parseError);
    return { error: 'Failed to parse quiz questions' };
  }
}

/**
 * Find educational videos
 */
export async function findVideoWithBytez(
  topic: string,
  filters: {
    class?: string;
    subject?: string;
    board?: string;
    language?: string;
    videoType?: string;
    videoDuration?: string;
  }
): Promise<{ videos?: any[]; error?: string }> {
  // Validate that user is not searching for YouTube shorts
  if (topic.toLowerCase().includes('shorts') || topic.includes('youtube.com/shorts')) {
    return {
      error: 'YouTube Shorts are not supported for learning. Please search for full-length educational videos instead.',
    };
  }

  const classNote = filters.class ? `Class/Level: ${filters.class}` : '';
  const boardNote = filters.board ? `Board: ${filters.board}` : '';
  const videoTypeNote = filters.videoType ? `Type: ${filters.videoType}` : '';
  const durationNote = filters.videoDuration ? `Duration: ${filters.videoDuration}` : '';

  const prompt = `Find best educational videos for: "${topic}"

${classNote} ${boardNote}
Subject: ${filters.subject || 'General'}
Language: ${filters.language || 'English'}
${videoTypeNote} ${durationNote}

Rules:
- EXCLUDE YouTube Shorts (minimum 10 minutes required)
- Reputable educational channels only
- Age-appropriate for selected class
- High educational value

Recommend 5 videos in JSON format:
[{"title":"","channel":"","duration":15,"videoId":"","description":"","why":"","engagementScore":8}]

JSON ONLY, no extra text.`;

  // Try DeepSeek first
  let result = await callBytezModel(FAST_MODELS.DEEPSEEK_V3, [
    { role: 'user', content: prompt },
  ]);

  // Fallback to Kimi if DeepSeek fails
  if (result.error) {
    result = await callBytezModel(FAST_MODELS.KIMI_K2, [
      { role: 'user', content: prompt },
    ]);
  }

  if (result.error) {
    return result;
  }

  try {
    const videos = JSON.parse(result.output || '[]');

    // Additional client-side validation to ensure no shorts
    const validVideos = videos.filter((video: any) => {
      return video.duration && video.duration >= 10;
    });

    if (validVideos.length === 0) {
      return {
        error: 'No suitable educational videos found matching your criteria. Please try a different search.',
      };
    }

    return { videos: validVideos };
  } catch (parseError) {
    console.error('Failed to parse video search results:', parseError);
    return { error: 'Failed to parse video search results' };
  }
}

/**
 * Validate that a video is not a YouTube short
 */
export function validateVideoNotShort(url: string): { valid: boolean; message?: string } {
  if (url.includes('youtube.com/shorts') || url.includes('youtu.be/shorts')) {
    return {
      valid: false,
      message: 'YouTube Shorts are not supported. Please use full-length educational videos (minimum 10 minutes).',
    };
  }

  return { valid: true };
}

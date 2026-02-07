/**
 * AI Service Integration using Bytez SDK
 * Uses DeepSeek-V3 and Kimi-K2 models only
 * Clean, simple implementation
 */

import Bytez from 'bytez.js';

// Initialize SDK
const BYTEZ_KEY = import.meta.env.VITE_BYTEZ_API_KEY || "2622dd06541127bea7641c3ad0ed8859";
let bytezSDK: any = null;

const getBytezSDK = () => {
  if (!bytezSDK) {
    bytezSDK = new Bytez(BYTEZ_KEY);
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
    const sdk = getBytezSDK();
    const model = sdk.model(modelId);
    const { error, output } = await model.run(messages);

    if (error) {
      console.error(`Model ${modelId} error:`, error);
      return { error };
    }

    return { output };
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
 * Generate study notes using Bytez SDK
 * Optimized for comprehensive, structured learning material
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

  const { error, output } = await callBytezAPI(FAST_MODELS.DEEPSEEK_V3, [
    {
      role: 'user',
      content: prompt,
    },
  ], {
    temperature: 0.3,
    max_tokens: 2000,
  });

  if (error) {
    console.error('Failed to generate notes:', error);
    
    // Fallback to Kimi model
    console.log('Falling back to Kimi model...');
    const { error: fallbackError, output: fallbackOutput } = await callBytezAPI(FAST_MODELS.KIMI_K2, [
      {
        role: 'user',
        content: prompt,
      },
    ], {
      temperature: 0.3,
      max_tokens: 2000,
    });

    if (fallbackError) {
      return { error: fallbackError };
    }
    return { notes: fallbackOutput };
  }

  return { notes: output };
}

/**
 * Fast summarization function using Bytez SDK
 * Quick content extraction
 */
export async function quickSummarize(
  content: string,
  maxLength: number = 300
): Promise<{ summary?: string; error?: string }> {
  const prompt = `Summarize this educational content in clear, bullet-point format (max ${maxLength} words):

${content}`;

  const { error, output } = await callBytezAPI(FAST_MODELS.DEEPSEEK_V3, [
    {
      role: 'user',
      content: prompt,
    },
  ], {
    temperature: 0.2,
    max_tokens: Math.min(500, Math.ceil(maxLength / 4)),
  });

  if (error) {
    return { error };
  }

  return { summary: output };
}

/**
 * Generate quiz questions using Bytez SDK
 * Creates comprehensive, well-structured questions
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

  const { error, output } = await callBytezAPI(FAST_MODELS.DEEPSEEK_V3, [
    {
      role: 'user',
      content: prompt,
    },
  ], {
    temperature: 0.5,
    max_tokens: 2500,
  });

  if (error) {
    return { error };
  }

  try {
    // Parse the JSON response
    const questions = JSON.parse(output || '[]');
    return { questions };
  } catch (parseError) {
    console.error('Failed to parse quiz questions:', parseError);
    return { error: 'Failed to parse quiz questions' };
  }
}

/**
 * Find educational videos using Bytez SDK
 * Validates that videos are NOT shorts (duration >= 10 minutes)
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

  const { error, output } = await callBytezAPI(FAST_MODELS.DEEPSEEK_V3, [
    {
      role: 'user',
      content: prompt,
    },
  ], {
    temperature: 0.4,
    max_tokens: 1500,
  });

  if (error) {
    return { error };
  }

  try {
    const videos = JSON.parse(output || '[]');
    
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

/**
 * AI Service Integration
 * Optimized for fast notes generation using Qwen3-4B-Instruct model
 * Browser-compatible implementation using direct API calls
 */

// Initialize API key
const BYTEZ_API_KEY = import.meta.env.VITE_BYTEZ_API_KEY || "2622dd06541127bea7641c3ad0ed8859";

/**
 * Available high-performance models
 */
export const FAST_MODELS = {
  // Ultra-fast model for notes and summarization
  QWEN3_4B: 'Qwen/Qwen3-4B-Instruct-2507',
  // Fallback models
  DEEPSEEK_V3_2: 'deepseek-ai/DeepSeek-V3.2-Exp',
  GEMINI_FLASH: 'mlfoundations-dev/oh-dcft-v3.1-gemini-1.5-flash',
} as const;

/**
 * Direct API call to Bytez AI backend for fast model operations
 * Optimized for low-latency responses
 */
async function callBytezAPI(
  model: string,
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    max_tokens?: number;
  }
): Promise<{ error?: string; output?: string }> {
  try {
    const temperature = options?.temperature ?? 0.5; // Lower for faster, more deterministic responses
    const max_tokens = options?.max_tokens ?? 1500; // Optimized token limit

    console.log(`Calling Bytez AI with model: ${model}`);

    const response = await fetch('https://api.bytez.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BYTEZ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature,
        max_tokens: max_tokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Bytez AI error:', errorData);

      if (response.status === 401) {
        return { error: 'Invalid API key. Please check your credentials.' };
      } else if (response.status === 429) {
        return { error: 'Rate limit exceeded. Please try again later.' };
      } else if (response.status === 402) {
        return { error: 'Insufficient credits. Please add credits to your account.' };
      }

      return { error: errorData.error?.message || `API error: ${response.status}` };
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || '';

    if (!output) {
      return { error: 'No response from AI model' };
    }

    return { output };
  } catch (apiError) {
    console.error('Bytez AI call failed:', apiError);

    if (apiError instanceof TypeError && apiError.message.includes('fetch')) {
      return {
        error: 'Network error. Please check your internet connection and try again.'
      };
    }

    return {
      error: apiError instanceof Error ? apiError.message : 'Unknown error occurred',
    };
  }
}

/**
 * Ultra-fast note generation using Qwen3-4B
 * Optimized for minimal latency while preserving quality
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
  // Optimized prompt for fast Qwen3-4B execution
  const prompt = `Create concise but comprehensive study notes for an educational video.

Video: "${videoTitle}"
${filters.class ? `Level: ${filters.class}` : ''}${filters.board ? ` | Board: ${filters.board}` : ''}
Subject: ${filters.subject || 'General'}
${filters.language ? `Language: ${filters.language}\n` : ''}

Content Summary:
${videoContent}

Format notes with:
## Key Concepts
## Important Points
## Summary

Notes should be clear, student-friendly, and exam-ready.`;

  const { error, output } = await callBytezAPI(FAST_MODELS.QWEN3_4B, [
    {
      role: 'user',
      content: prompt,
    },
  ], {
    temperature: 0.3, // Lower temp for consistent, focused output
    max_tokens: 1200, // Optimized for speed
  });

  if (error) {
    // Fallback to DeepSeek if Qwen fails
    console.warn('Qwen model failed, falling back to DeepSeek:', error);
    const { error: fallbackError, output: fallbackOutput } = await callBytezAPI(FAST_MODELS.DEEPSEEK_V3_2, [
      {
        role: 'user',
        content: prompt,
      },
    ]);
    
    if (fallbackError) {
      return { error: fallbackError };
    }
    return { notes: fallbackOutput };
  }

  return { notes: output };
}

/**
 * Fast summarization function for quick content extraction
 * Uses Qwen3-4B for maximum speed
 */
export async function quickSummarize(
  content: string,
  maxLength: number = 300
): Promise<{ summary?: string; error?: string }> {
  const prompt = `Summarize this educational content in clear, bullet-point format (max ${maxLength} words):

${content}`;

  const { error, output } = await callBytezAPI(FAST_MODELS.QWEN3_4B, [
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
 * Generate quiz questions using optimal model
 * Uses DeepSeek for complex question generation
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

  const { error, output } = await callBytezAPI(FAST_MODELS.DEEPSEEK_V3_2, [
    {
      role: 'user',
      content: prompt,
    },
  ]);

  if (error) {
    return { error };
  }

  try {
    // Parse the JSON response
    const questions = JSON.parse(output || '[]');
    return { questions };
  } catch (parseError) {
    return { error: 'Failed to parse quiz questions' };
  }
}

/**
 * Find educational videos using Gemini Flash for speed
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

  const { error, output } = await callBytezAPI(FAST_MODELS.GEMINI_FLASH, [
    {
      role: 'user',
      content: prompt,
    },
  ], {
    temperature: 0.4,
    max_tokens: 1000,
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

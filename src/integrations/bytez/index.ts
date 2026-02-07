/**
 * AI Service Integration
 * Uses Perplexity API for notes generation (Bytez service unavailable)
 * Browser-compatible implementation using direct API calls
 */

// Initialize API keys
const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;

/**
 * Direct API call to Perplexity AI for notes generation
 * Optimized for low-latency responses
 */
async function callPerplexityAPI(
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    max_tokens?: number;
  }
): Promise<{ error?: string; output?: string }> {
  try {
    const temperature = options?.temperature ?? 0.5;
    const max_tokens = options?.max_tokens ?? 1500;

    console.log('Calling Perplexity AI for content generation...');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: messages,
        temperature: temperature,
        max_tokens: max_tokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Perplexity AI error:', errorData);

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
    console.error('Perplexity AI call failed:', apiError);

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
 * Generate study notes using Perplexity AI
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
  if (!PERPLEXITY_API_KEY) {
    return { error: 'Perplexity API key not configured. Please set VITE_PERPLEXITY_API_KEY.' };
  }

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

  const { error, output } = await callPerplexityAPI([
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
    return { error };
  }

  return { notes: output };
}

/**
 * Fast summarization function using Perplexity
 * Quick content extraction
 */
export async function quickSummarize(
  content: string,
  maxLength: number = 300
): Promise<{ summary?: string; error?: string }> {
  if (!PERPLEXITY_API_KEY) {
    return { error: 'Perplexity API key not configured. Please set VITE_PERPLEXITY_API_KEY.' };
  }

  const prompt = `Summarize this educational content in clear, bullet-point format (max ${maxLength} words):

${content}`;

  const { error, output } = await callPerplexityAPI([
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
 * Generate quiz questions using Perplexity
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
  if (!PERPLEXITY_API_KEY) {
    return { error: 'Perplexity API key not configured. Please set VITE_PERPLEXITY_API_KEY.' };
  }

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

  const { error, output } = await callPerplexityAPI([
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
 * Find educational videos using Perplexity
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
  if (!PERPLEXITY_API_KEY) {
    return { error: 'Perplexity API key not configured. Please set VITE_PERPLEXITY_API_KEY.' };
  }

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

  const { error, output } = await callPerplexityAPI([
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

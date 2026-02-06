/**
 * AI Service Integration
 * Handles all AI requests for notes generation, video search, and quiz generation
 * Browser-compatible implementation using AI SDK
 */

import Bytez from "bytez.js";

// Initialize AI SDK
const BYTEZ_API_KEY = import.meta.env.VITE_BYTEZ_API_KEY || "2622dd06541127bea7641c3ad0ed8859";
const sdk = new Bytez(BYTEZ_API_KEY);

/**
 * Direct API call to AI backend for models (fallback method)
 */
async function callBytezAPI(
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<{ error?: string; output?: string }> {
  try {
    console.log('Calling AI API with model:', model);

    // Try using AI SDK first
    const modelInstance = sdk.model(model);
    const { error, output } = await modelInstance.run(messages);

    if (error) {
      console.warn('AI SDK failed, falling back to direct API:', error);
      throw new Error(error);
    }

    return { output };
  } catch (sdkError) {
    console.warn('Bytez SDK failed, using direct API call:', sdkError);

    // Fallback to direct API call
    try {
      const response = await fetch('https://api.bytez.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BYTEZ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('AI API error:', errorData);

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
      console.error('AI API call failed:', apiError);

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
}

/**
 * Generate study notes using DeepSeek V3.2 Exp
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
  const prompt = `Generate comprehensive study notes for an educational video.

Video Title: "${videoTitle}"

${filters.class ? `Class/Level: ${filters.class}` : ''}
${filters.board ? `Board: ${filters.board}` : ''}
Subject: ${filters.subject || 'General'}
${filters.language ? `Language: ${filters.language}` : ''}

Content: ${videoContent}

Requirements:
- Create well-structured notes with clear headings
- Include key concepts, definitions, and important points
- Add practical examples where applicable
- Keep language simple and student-friendly
- Format for easy PDF conversion
- Ensure content is syllabus-aligned for the selected class and board

Please provide detailed, comprehensive study notes that help students understand and remember the topic.`;

  const { error, output } = await callBytezAPI('deepseek-ai/DeepSeek-V3.2-Exp', [
    {
      role: 'user',
      content: prompt,
    },
  ]);

  if (error) {
    return { error };
  }

  return { notes: output };
}

/**
 * Generate quiz questions using AI model
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

  const { error, output } = await callBytezAPI('deepseek-ai/DeepSeek-V3.2-Exp', [
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
 * Find educational videos using Gemini
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
  const videoTypeNote = filters.videoType ? `Preferred Video Type: ${filters.videoType}` : '';
  const durationNote = filters.videoDuration ? `Preferred Duration: ${filters.videoDuration}` : '';

  const prompt = `Find the best educational videos for learning about: "${topic}"

${classNote}
${boardNote}
Subject: ${filters.subject || 'General'}
Language: ${filters.language || 'English'}
${videoTypeNote}
${durationNote}

Important Constraints:
- EXCLUDE YouTube Shorts (they must be at least 10 minutes long)
- Select videos from reputable educational channels
- Ensure content aligns with the selected class and board curriculum
- Prioritize videos with high educational value
- Verify videos are appropriate for the selected age group/class

Recommend 5-7 top videos with:
- Title
- Channel name
- Duration (in minutes, must be >= 10)
- Link/YouTube ID
- Brief description (2-3 sentences)
- Why it's good for this topic
- Engagement score (1-10)

Format as JSON array with structure:
[
  {
    "title": "Video title",
    "channel": "Channel name",
    "duration": 15,
    "videoId": "dQw4w9WgXcQ",
    "description": "Brief description",
    "why": "Why this video is helpful",
    "engagementScore": 8
  }
]

Return ONLY the JSON array, no markdown or extra text.`;

  const { error, output } = await callBytezAPI('google/gemini-3-pro-preview', [
    {
      role: 'user',
      content: prompt,
    },
  ]);

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration for security
const ALLOWED_ORIGINS = [
  'https://edurank.app',
  'https://www.edurank.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://lovable.dev',
];

function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = (origin && ALLOWED_ORIGINS.includes(origin))
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };
}

// Input validation
interface SearchRequest {
  topic: string;
  subject: string;
  classOrGrade: string;
  language?: string;
  duration?: 'short' | 'medium' | 'long';
  difficulty?: 'basic' | 'advanced';
  tags?: string[];
  limit?: number;
}

interface VideoResult {
  video_id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
  difficulty: string;
  embed_url: string;
}

interface DbVideo {
  video_id: string;
  title: string;
  thumbnail_url: string;
  duration_seconds: number;
  difficulty: string;
  embed_url: string;
  topic?: string;
  subject?: string;
  class_grade?: string;
  language?: string;
  duration_category?: string;
  tags?: string[];
}

function validateInput(data: any): { isValid: boolean; errors: string[]; normalized: SearchRequest } {
  const errors: string[] = [];
  const normalized: Partial<SearchRequest> = {};

  // Required fields
  if (!data.topic || typeof data.topic !== 'string' || data.topic.trim().length === 0) {
    errors.push('topic is required and must be a non-empty string');
  } else {
    normalized.topic = data.topic.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length === 0) {
    errors.push('subject is required and must be a non-empty string');
  } else {
    normalized.subject = data.subject.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  if (!data.classOrGrade || typeof data.classOrGrade !== 'string' || data.classOrGrade.trim().length === 0) {
    errors.push('classOrGrade is required and must be a non-empty string');
  } else {
    normalized.classOrGrade = data.classOrGrade.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  // Optional fields
  if (data.language && typeof data.language === 'string') {
    normalized.language = data.language.toLowerCase().trim();
  }

  if (data.duration && ['short', 'medium', 'long'].includes(data.duration)) {
    normalized.duration = data.duration;
  } else if (data.duration) {
    errors.push('duration must be one of: short, medium, long');
  }

  if (data.difficulty && ['basic', 'advanced'].includes(data.difficulty)) {
    normalized.difficulty = data.difficulty;
  } else if (data.difficulty) {
    errors.push('difficulty must be one of: basic, advanced');
  }

  if (data.tags && Array.isArray(data.tags)) {
    normalized.tags = data.tags.map((tag: any) => typeof tag === 'string' ? tag.toLowerCase().trim() : '').filter(Boolean);
  }

  if (data.limit && typeof data.limit === 'number' && data.limit > 0 && data.limit <= 50) {
    normalized.limit = data.limit;
  } else if (data.limit) {
    errors.push('limit must be a number between 1 and 50');
  } else {
    normalized.limit = 10; // default
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized: normalized as SearchRequest,
  };
}

// Rate limiting check
async function checkRateLimit(supabase: any, userId: string, queryHash: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

  const { data, error } = await supabase
    .from('search_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('query_hash', queryHash)
    .gte('created_at', oneMinuteAgo)
    .limit(1);

  if (error) {
    console.error('Rate limit check error:', error);
    return false; // Allow on error
  }

  return data && data.length > 0; // If found, rate limited
}

// Log search request
async function logSearchRequest(supabase: any, userId: string, queryHash: string, params: SearchRequest) {
  await supabase
    .from('search_logs')
    .insert({
      user_id: userId,
      query_hash: queryHash,
      search_params: params,
    });
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const requestData = await req.json();
    const { isValid, errors, normalized } = validateInput(requestData);

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: errors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting
    const queryHash = btoa(JSON.stringify({
      topic: normalized.topic,
      subject: normalized.subject,
      classOrGrade: normalized.classOrGrade,
      language: normalized.language,
      duration: normalized.duration,
      difficulty: normalized.difficulty,
      tags: normalized.tags?.sort(),
    }));

    const isRateLimited = await checkRateLimit(supabase, user.id, queryHash);
    if (isRateLimited) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait before searching again.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the request
    await logSearchRequest(supabase, user.id, queryHash, normalized);

    // Build query
    let query = supabase
      .from('videos')
      .select(`
        video_id,
        title,
        thumbnail_url,
        duration_seconds,
        difficulty,
        embed_url,
        topic,
        subject,
        class_grade,
        language,
        duration_category,
        tags
      `);

    // Apply filters
    if (normalized.language) {
      query = query.eq('language', normalized.language);
    }
    if (normalized.duration) {
      query = query.eq('duration_category', normalized.duration);
    }
    if (normalized.difficulty) {
      query = query.eq('difficulty', normalized.difficulty);
    }

    // Execute query to get candidates
    const { data: videos, error: queryError } = await query;

    if (queryError) {
      console.error('Database query error:', queryError);
      return new Response(JSON.stringify({ error: 'Search failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!videos || videos.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate relevance scores and filter
    const scoredVideos = (videos as DbVideo[])
      .map((video) => {
        let score = 0;

        // Topic match (title or topic field)
        if (video.title?.toLowerCase().includes(normalized.topic) ||
            video.topic?.toLowerCase().includes(normalized.topic)) {
          score += 5;
        }

        // Subject match
        if (video.subject?.toLowerCase().includes(normalized.subject)) {
          score += 4;
        }

        // Class match
        if (video.class_grade?.toLowerCase().includes(normalized.classOrGrade)) {
          score += 3;
        }

        // Difficulty match
        if (video.difficulty === normalized.difficulty) {
          score += 2;
        }

        // Duration match
        if (video.duration_category === normalized.duration) {
          score += 1;
        }

        // Tags match (if provided)
        if (normalized.tags && normalized.tags.length > 0 && video.tags) {
          const videoTags = Array.isArray(video.tags) ? video.tags : [];
          const hasMatchingTag = normalized.tags.some(tag =>
            videoTags.some((vTag: string) => vTag.toLowerCase().includes(tag))
          );
          if (hasMatchingTag) {
            score += 1; // Bonus for tag match
          }
        }

        return { ...video, score };
      })
      .filter(video => video.score > 0) // Only include videos with some relevance
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, normalized.limit);

    // Format response
    const results: VideoResult[] = scoredVideos.map(video => ({
      video_id: video.video_id,
      title: video.title,
      thumbnail_url: video.thumbnail_url,
      duration_seconds: video.duration_seconds,
      difficulty: video.difficulty,
      embed_url: video.embed_url,
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
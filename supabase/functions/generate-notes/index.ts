import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - prevents CSRF attacks
const ALLOWED_ORIGINS = [
  // Production
  'https://edurank.app',
  'https://www.edurank.app',
  
  // Development
  'http://localhost:5173',
  'http://localhost:3000',
  
  // Fallback
  'https://lovable.dev',
];

function getCORSHeaders(originHeader: string | null): Record<string, string> {
  // Only allow requests from whitelisted origins
  const allowedOrigin = (originHeader && ALLOWED_ORIGINS.includes(originHeader))
    ? originHeader
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };
}

// Input validation and sanitization constants
const MAX_TITLE_LENGTH = 500;
const MAX_ID_LENGTH = 100;
const FORBIDDEN_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?previous/i,
  /system\s*:\s*/i,
  /\[\s*INST\s*\]/i,
  /<\s*\|\s*im_start\s*\|\s*>/i,
  /<\s*\|\s*im_end\s*\|\s*>/i,
  /\{\{\s*system/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if/i,
  /you\s+are\s+now/i,
  /new\s+instructions/i,
  /override\s+instructions/i,
];

function sanitizeInput(input: string, maxLength: number): { isValid: boolean; sanitized: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { isValid: false, sanitized: '', error: 'Input must be a non-empty string' };
  }

  let sanitized = input.trim();
  if (sanitized.length === 0) {
    return { isValid: false, sanitized: '', error: 'Input cannot be empty' };
  }
  if (sanitized.length > maxLength) {
    return { isValid: false, sanitized: '', error: `Input exceeds maximum length of ${maxLength} characters` };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sanitized)) {
      console.warn('Potential prompt injection detected:', sanitized.substring(0, 50));
      return { isValid: false, sanitized: '', error: 'Invalid input detected' };
    }
  }

  // Remove control characters (0-8, 11-12, 14-31, 127)
  const controlChars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 127];
  for (const charCode of controlChars) {
    sanitized = sanitized.replace(new RegExp(String.fromCharCode(charCode), 'g'), '');
  }
  sanitized = sanitized
    .replace(/[<>]/g, '')
    .replace(/\\/g, '')
    .trim();

  return { isValid: true, sanitized };
}

function validateId(id: string): { isValid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { isValid: false, error: 'ID must be a non-empty string' };
  }
  if (id.length > MAX_ID_LENGTH) {
    return { isValid: false, error: `ID exceeds maximum length of ${MAX_ID_LENGTH} characters` };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return { isValid: false, error: 'Invalid ID format' };
  }
  return { isValid: true };
}

// Fetch video context using Perplexity API
async function fetchVideoContext(videoTitle: string, videoId: string): Promise<string> {
  const PERPLEXITY_API_KEY = Deno.env.get("perplexity_api_key");
  
  if (!PERPLEXITY_API_KEY) {
    console.log("Perplexity API key not configured, skipping context fetch");
    return "";
  }

  try {
    console.log("Fetching video context using Perplexity...");
    // Do NOT log the API key or embed it in URLs - use POST with headers instead
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are a research assistant. Provide comprehensive educational content and key concepts related to the given YouTube video topic. Focus on factual information that would be helpful for study notes."
          },
          {
            role: "user",
            content: `Research the topic of this YouTube video and provide key educational content:
Title: "${videoTitle}"
YouTube Video ID: ${videoId}

Provide:
1. Main concepts and definitions related to this topic
2. Key facts and important points
3. Related subtopics and their explanations
4. Study-worthy information

Focus on educational content that would help a student understand this topic thoroughly.`
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      // Don't log the full response as it might contain sensitive headers
      console.error("Perplexity API error:", response.status);
      return "";
    }

    const data = await response.json();
    const context = data.choices?.[0]?.message?.content || "";
    console.log("Video context fetched successfully, length:", context.length);
    return context;
  } catch (error) {
    console.error("Error fetching video context:", error instanceof Error ? error.message : "Unknown error");
    return "";
  }
}

// Bytez AI call function (using Qwen3-4B-Instruct for ultra-fast notes generation)
async function callBytezAI(messages: { role: string; content: string }[]): Promise<string> {
  const BYTEZ_API_KEY = Deno.env.get('BYTEZ_API_KEY');
  if (!BYTEZ_API_KEY) {
    throw new Error('BYTEZ_API_KEY is not configured');
  }
  console.log('Calling Bytez AI (Qwen3-4B-Instruct) via bytez.js SDK for fast notes generation...');

  try {
    // Dynamically import bytez.js from esm.sh so this function can run in Deno-based runtimes
    // Using esm.sh avoids bundling Node-only packages directly into the Deno function.
    const module = await import('https://esm.sh/bytez.js@3');
    const Bytez = module.default || module;
    if (!Bytez) {
      throw new Error('Failed to load bytez.js SDK');
    }

    const sdk = new Bytez(BYTEZ_API_KEY);
    const model = sdk.model('Qwen/Qwen3-4B-Instruct-2507');
    if (!model) {
      throw new Error('Failed to load Qwen3-4B model');
    }

    // Some Bytez models don't accept `max_tokens`; omit it for compatibility
    const result = await model.run(messages, { temperature: 0.3 });

    console.log('Bytez SDK raw result:', typeof result === 'object' ? JSON.stringify(result).slice(0, 2000) : String(result));

    if (!result) {
      throw new Error('Empty response from Bytez SDK');
    }

    if (result.error) {
      console.error('Bytez SDK error:', result.error);
      if (result.error?.toString().toLowerCase().includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error(result.error?.toString() || 'Unknown Bytez SDK error');
    }

    // The SDK returns `output` like the browser/client code expects
    return result.output || '';
  } catch (err) {
    console.error('Error calling Bytez SDK:', err instanceof Error ? err.message : String(err));
    // Surface common errors as friendly messages
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401') || /invalid api key/i.test(msg)) {
      throw new Error('Invalid API key or authentication failed.');
    }
    if (msg.includes('rate limit') || msg.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw err;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    const corsHeaders = getCORSHeaders(req.headers.get('origin'));
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const corsHeaders = getCORSHeaders(req.headers.get('origin'));
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Allow a development bypass for local testing without a valid Supabase JWT.
    const devBypass = Deno.env.get('DEV_BYPASS_AUTH') === 'true';
    let user: any = null;
    let supabaseClient: any = null;
    if (devBypass) {
      user = { id: Deno.env.get('DEV_TEST_USER_ID') || 'local-test-user' };
      console.log('DEV_BYPASS_AUTH enabled - using mock user:', user.id);
      // Create a supabase client with service role for local testing so inserts/rpcs work
      supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
    } else {
      supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: getUserData, error: userError } = await supabaseClient.auth.getUser();
      user = getUserData?.user;
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Processing notes request for user ${user.id}`);

    const { videoTitle, videoId, todoId } = await req.json();

    if (!videoTitle || !videoId || !todoId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: videoTitle, videoId, todoId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const titleValidation = sanitizeInput(videoTitle, MAX_TITLE_LENGTH);
    if (!titleValidation.isValid) {
      return new Response(
        JSON.stringify({ error: titleValidation.error || "Invalid video title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoIdValidation = validateId(videoId);
    if (!videoIdValidation.isValid) {
      return new Response(
        JSON.stringify({ error: videoIdValidation.error || "Invalid video ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const todoIdValidation = validateId(todoId);
    if (!todoIdValidation.isValid) {
      return new Response(
        JSON.stringify({ error: todoIdValidation.error || "Invalid todo ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedTitle = titleValidation.sanitized;

    console.log(`Generating notes for video: ${sanitizedTitle} (${videoId})`);

    // Fetch video context using Perplexity
    const videoContext = await fetchVideoContext(sanitizedTitle, videoId);

    // Generate notes using Bytez AI
    const generatedNotes = await callBytezAI([
      {
        role: 'user',
        content: `Generate clear, structured study notes for this educational video.

**Video:** "${sanitizedTitle}"

${videoContext ? `**Content Summary:**
${videoContext}` : 'Use your knowledge to create relevant notes.'}

Format with these sections:
## Key Concepts
- List main ideas and definitions

## Important Points  
- Core facts and details

## Summary
- Overview of topic

Create concise, student-friendly notes suitable for learning and exams.`
      },
    ]);

    if (!generatedNotes) {
      throw new Error("No content generated from AI");
    }

    console.log("Notes generated successfully using Qwen3-4B (fast generation)");

    // Check achievements after generating notes
    await serviceClient.rpc('check_achievements', { uid: user.id });

    const { data: savedNote, error: saveError } = await supabaseClient
      .from("notes")
      .insert({
        user_id: user.id,
        todo_id: todoId,
        video_id: videoId,
        content: generatedNotes,
        is_ai_generated: true,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving notes:", saveError);
      return new Response(
        JSON.stringify({ 
          notes: generatedNotes, 
          saved: false,
          error: "Notes generated but failed to save" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        notes: generatedNotes, 
        saved: true,
        noteId: savedNote.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-notes function:", error);
    const errorCorsHeaders = getCORSHeaders(null);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...errorCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});

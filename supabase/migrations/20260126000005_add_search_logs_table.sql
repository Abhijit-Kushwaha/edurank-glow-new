-- Migration: Add search_logs table for rate limiting
-- Date: 2026-01-26
-- Purpose: Track search requests to prevent abuse

CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_hash TEXT NOT NULL,
  search_params JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user access (users can only see their own logs)
CREATE POLICY "Users can view their own search logs"
ON public.search_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search logs"
ON public.search_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_search_logs_user_query_time
ON public.search_logs (user_id, query_hash, created_at);

-- Clean up old logs (optional, can be run periodically)
-- DELETE FROM public.search_logs WHERE created_at < now() - interval '7 days';
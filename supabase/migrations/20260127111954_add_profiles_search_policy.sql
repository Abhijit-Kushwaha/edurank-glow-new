-- Migration: Add secure function for searching user profiles
-- Date: 2026-01-27
-- Purpose: Enable friend searching functionality with proper security

-- Create a secure function for searching users
CREATE OR REPLACE FUNCTION public.search_users(search_query TEXT, current_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return basic profile information for security
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.name,
    p.avatar_url
  FROM public.profiles p
  WHERE
    p.user_id != current_user_id
    AND p.name ILIKE '%' || search_query || '%'
  ORDER BY p.name
  LIMIT 10;
END;
$$;
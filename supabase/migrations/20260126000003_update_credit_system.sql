-- Update credit system to weekly refresh with 200 credits

-- Update the check_and_reset_credits function to reset weekly instead of monthly
CREATE OR REPLACE FUNCTION public.check_and_reset_credits(uid uuid)
RETURNS TABLE(credits_remaining integer, credits_used integer, was_reset boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_last_reset timestamp with time zone;
  v_was_reset boolean := false;
BEGIN
  -- Get last reset time
  SELECT uc.last_reset_at INTO v_last_reset
  FROM public.user_credits uc
  WHERE uc.user_id = uid;

  -- If more than a week has passed, reset credits
  IF v_last_reset IS NOT NULL AND v_last_reset < now() - interval '7 days' THEN
    UPDATE public.user_credits uc
    SET credits_remaining = 200,
        credits_used = 0,
        last_reset_at = now(),
        updated_at = now()
    WHERE uc.user_id = uid;
    v_was_reset := true;
  END IF;

  -- Return current credits
  RETURN QUERY
  SELECT uc.credits_remaining, uc.credits_used, v_was_reset
  FROM public.user_credits uc
  WHERE uc.user_id = uid;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_and_reset_credits(uuid) TO authenticated;
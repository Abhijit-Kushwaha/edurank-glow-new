-- Create leaderboard_stats table for tracking user performance
CREATE TABLE public.leaderboard_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT 'Anonymous',
  total_quizzes integer NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  average_score numeric NOT NULL DEFAULT 0,
  best_score numeric NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leaderboard_stats ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view leaderboard
CREATE POLICY "Authenticated users can view leaderboard"
ON public.leaderboard_stats
FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own stats
CREATE POLICY "Users can update their own stats"
ON public.leaderboard_stats
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own stats
CREATE POLICY "Users can insert their own stats"
ON public.leaderboard_stats
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_leaderboard_stats_updated_at
BEFORE UPDATE ON public.leaderboard_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update leaderboard stats when quiz is completed
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_quiz()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_today date := CURRENT_DATE;
  v_last_date date;
  v_new_streak integer;
BEGIN
  -- Get display name from profiles
  SELECT COALESCE(name, 'Anonymous') INTO v_display_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Get last activity date
  SELECT last_activity_date INTO v_last_date
  FROM public.leaderboard_stats
  WHERE user_id = NEW.user_id;
  
  -- Calculate streak
  IF v_last_date IS NULL THEN
    v_new_streak := 1;
  ELSIF v_last_date = v_today THEN
    -- Same day, keep current streak
    SELECT current_streak INTO v_new_streak
    FROM public.leaderboard_stats
    WHERE user_id = NEW.user_id;
  ELSIF v_last_date = v_today - 1 THEN
    -- Consecutive day, increment streak
    SELECT current_streak + 1 INTO v_new_streak
    FROM public.leaderboard_stats
    WHERE user_id = NEW.user_id;
    IF v_new_streak IS NULL THEN v_new_streak := 1; END IF;
  ELSE
    -- Streak broken
    v_new_streak := 1;
  END IF;
  
  -- Upsert leaderboard stats
  INSERT INTO public.leaderboard_stats (
    user_id,
    display_name,
    total_quizzes,
    total_correct,
    total_questions,
    average_score,
    best_score,
    current_streak,
    longest_streak,
    last_activity_date
  )
  VALUES (
    NEW.user_id,
    COALESCE(v_display_name, 'Anonymous'),
    1,
    NEW.correct_answers,
    NEW.total_questions,
    NEW.score,
    NEW.score,
    v_new_streak,
    v_new_streak,
    v_today
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(v_display_name, leaderboard_stats.display_name),
    total_quizzes = leaderboard_stats.total_quizzes + 1,
    total_correct = leaderboard_stats.total_correct + NEW.correct_answers,
    total_questions = leaderboard_stats.total_questions + NEW.total_questions,
    average_score = ROUND(
      ((leaderboard_stats.total_correct + NEW.correct_answers)::numeric / 
       NULLIF(leaderboard_stats.total_questions + NEW.total_questions, 0)) * 100,
      1
    ),
    best_score = GREATEST(leaderboard_stats.best_score, NEW.score),
    current_streak = v_new_streak,
    longest_streak = GREATEST(leaderboard_stats.longest_streak, v_new_streak),
    last_activity_date = v_today,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update leaderboard when quiz result is inserted
CREATE TRIGGER on_quiz_result_insert
AFTER INSERT ON public.quiz_results
FOR EACH ROW
EXECUTE FUNCTION public.update_leaderboard_on_quiz();
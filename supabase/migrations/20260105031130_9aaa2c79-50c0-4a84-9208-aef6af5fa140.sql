-- Fix security issue: update search_path to empty string
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_quiz()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    SELECT current_streak INTO v_new_streak
    FROM public.leaderboard_stats
    WHERE user_id = NEW.user_id;
  ELSIF v_last_date = v_today - 1 THEN
    SELECT current_streak + 1 INTO v_new_streak
    FROM public.leaderboard_stats
    WHERE user_id = NEW.user_id;
    IF v_new_streak IS NULL THEN v_new_streak := 1; END IF;
  ELSE
    v_new_streak := 1;
  END IF;
  
  -- Upsert leaderboard stats
  INSERT INTO public.leaderboard_stats (
    user_id, display_name, total_quizzes, total_correct, total_questions,
    average_score, best_score, current_streak, longest_streak, last_activity_date
  )
  VALUES (
    NEW.user_id, COALESCE(v_display_name, 'Anonymous'), 1, NEW.correct_answers,
    NEW.total_questions, NEW.score, NEW.score, v_new_streak, v_new_streak, v_today
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(v_display_name, public.leaderboard_stats.display_name),
    total_quizzes = public.leaderboard_stats.total_quizzes + 1,
    total_correct = public.leaderboard_stats.total_correct + NEW.correct_answers,
    total_questions = public.leaderboard_stats.total_questions + NEW.total_questions,
    average_score = ROUND(
      ((public.leaderboard_stats.total_correct + NEW.correct_answers)::numeric / 
       NULLIF(public.leaderboard_stats.total_questions + NEW.total_questions, 0)) * 100, 1
    ),
    best_score = GREATEST(public.leaderboard_stats.best_score, NEW.score),
    current_streak = v_new_streak,
    longest_streak = GREATEST(public.leaderboard_stats.longest_streak, v_new_streak),
    last_activity_date = v_today,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create achievements table
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  requirement_type text NOT NULL, -- 'quizzes_completed', 'streak_days', 'perfect_score', 'notes_created'
  requirement_value integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_achievements junction table
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements are viewable by all authenticated users
CREATE POLICY "Authenticated users can view achievements"
ON public.achievements FOR SELECT
USING (true);

-- Users can view their own unlocked achievements
CREATE POLICY "Users can view their own achievements"
ON public.user_achievements FOR SELECT
USING (auth.uid() = user_id);

-- Users can unlock achievements
CREATE POLICY "Users can unlock achievements"
ON public.user_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value) VALUES
('First Steps', 'Complete your first quiz', 'baby', 'quizzes_completed', 1),
('Quiz Enthusiast', 'Complete 10 quizzes', 'brain', 'quizzes_completed', 10),
('Quiz Master', 'Complete 50 quizzes', 'graduation-cap', 'quizzes_completed', 50),
('Quiz Legend', 'Complete 100 quizzes', 'crown', 'quizzes_completed', 100),
('Week Warrior', 'Maintain a 7-day streak', 'flame', 'streak_days', 7),
('Month Champion', 'Maintain a 30-day streak', 'medal', 'streak_days', 30),
('Perfectionist', 'Get a perfect score on a quiz', 'star', 'perfect_score', 100),
('Note Taker', 'Create 5 AI-generated notes', 'notebook-pen', 'notes_created', 5),
('Scholar', 'Create 20 AI-generated notes', 'book-open', 'notes_created', 20);

-- Update default credits to 50 for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, credits_remaining, credits_used)
  VALUES (NEW.id, 50, 0);
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Failed to create credits for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Update existing users credits_remaining default
ALTER TABLE public.user_credits ALTER COLUMN credits_remaining SET DEFAULT 50;
-- Achievement System Schema for EduRank
-- Date: 2026-01-26
-- Purpose: Comprehensive achievement system for user retention and engagement

-- Achievement definitions table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'onboarding', 'streak', 'quiz_performance', 'weak_topic_improvement',
    'learning_depth', 'leaderboard', 'speed_discipline'
  )),
  unlock_condition JSONB NOT NULL, -- Flexible condition structure
  reward_type TEXT NOT NULL CHECK (reward_type IN (
    'xp_boost', 'rank_protection', 'profile_highlight', 'hard_mode_access',
    'featured_status', 'learning_privilege'
  )),
  reward_value JSONB, -- Reward details (duration, multiplier, etc.)
  difficulty_level INTEGER NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User achievements progress table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  progress_value INTEGER NOT NULL DEFAULT 0, -- Current progress towards unlock
  progress_max INTEGER NOT NULL, -- Required value to unlock
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Achievement unlocks history for notifications
CREATE TABLE IF NOT EXISTS public.achievement_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notification_sent BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_unlocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Achievements are viewable by all users"
ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Users can view their own achievement progress"
ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievement progress"
ON public.user_achievements FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own achievement unlocks"
ON public.achievement_unlocks FOR SELECT USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_unlocked ON public.user_achievements(user_id, is_unlocked);
CREATE INDEX IF NOT EXISTS achievement_unlocks_user_recent ON public.achievement_unlocks(user_id, unlocked_at DESC);

-- Function to initialize user achievements
CREATE OR REPLACE FUNCTION public.initialize_user_achievements(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_achievements (user_id, achievement_id, progress_max)
  SELECT p_user_id, id, (unlock_condition->>'target')::INTEGER
  FROM public.achievements
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update achievement progress
CREATE OR REPLACE FUNCTION public.update_achievement_progress(
  p_user_id UUID,
  p_achievement_name TEXT,
  p_progress_increment INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_achievement_id UUID;
  v_current_progress INTEGER;
  v_max_progress INTEGER;
  v_is_unlocked BOOLEAN;
  v_result JSON;
BEGIN
  -- Get achievement ID
  SELECT id INTO v_achievement_id
  FROM public.achievements
  WHERE name = p_achievement_name;

  IF v_achievement_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Achievement not found');
  END IF;

  -- Update progress
  UPDATE public.user_achievements
  SET
    progress_value = LEAST(progress_value + p_progress_increment, progress_max),
    updated_at = now()
  WHERE user_id = p_user_id AND achievement_id = v_achievement_id
  RETURNING progress_value, progress_max, is_unlocked INTO v_current_progress, v_max_progress, v_is_unlocked;

  -- Check if newly unlocked
  IF v_current_progress >= v_max_progress AND NOT v_is_unlocked THEN
    -- Mark as unlocked
    UPDATE public.user_achievements
    SET is_unlocked = true, unlocked_at = now()
    WHERE user_id = p_user_id AND achievement_id = v_achievement_id;

    -- Record unlock for notifications
    INSERT INTO public.achievement_unlocks (user_id, achievement_id)
    VALUES (p_user_id, v_achievement_id);

    RETURN json_build_object(
      'success', true,
      'unlocked', true,
      'achievement_name', p_achievement_name,
      'progress', v_current_progress,
      'max_progress', v_max_progress
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'unlocked', false,
    'progress', v_current_progress,
    'max_progress', v_max_progress
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize achievements for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_achievements()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.initialize_user_achievements(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_achievements
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_achievements();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.achievements TO authenticated;
GRANT ALL ON public.user_achievements TO authenticated;
GRANT ALL ON public.achievement_unlocks TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_achievement_progress(UUID, TEXT, INTEGER) TO authenticated;
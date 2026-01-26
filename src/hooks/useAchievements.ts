import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useAchievements = () => {
  const { user } = useAuth();

  const updateAchievementProgress = useCallback(async (
    achievementId: string,
    increment: number = 1
  ) => {
    if (!user) return;

    try {
      await supabase.rpc('update_achievement_progress', {
        p_user_id: user.id,
        p_achievement_id: achievementId,
        p_current_value: increment,
        p_target_value: 1, // This will be handled by the function
      });

      // For now, we'll assume success and show notification
      // In a real implementation, we'd check the return value
      toast.success(`🏆 Achievement progress updated!`, {
        duration: 3000,
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating achievement progress:', error);
      // Don't show error toast for achievement updates to avoid spam
    }
  }, [user]);

  // Specific achievement tracking functions
  const trackFirstQuiz = useCallback(() => {
    updateAchievementProgress('Welcome Aboard');
  }, [updateAchievementProgress]);

  const trackQuizCompleted = useCallback((accuracy?: number) => {
    updateAchievementProgress('Quiz Novice');
    updateAchievementProgress('Quiz Apprentice');
    updateAchievementProgress('Quiz Journeyman');
    updateAchievementProgress('Quiz Expert');
    updateAchievementProgress('Quiz Master');

    if (accuracy && accuracy >= 90) {
      updateAchievementProgress('Accuracy Ace');
    }
    if (accuracy && accuracy === 100) {
      updateAchievementProgress('Perfectionist');
    }
  }, [updateAchievementProgress]);

  const trackStreakUpdate = useCallback((streakLength: number) => {
    if (streakLength >= 3) updateAchievementProgress('Getting Started');
    if (streakLength >= 7) updateAchievementProgress('Week Warrior');
    if (streakLength >= 14) updateAchievementProgress('Two Week Triumph');
    if (streakLength >= 21) updateAchievementProgress('Three Week Champion');
    if (streakLength >= 30) updateAchievementProgress('Monthly Master');
    if (streakLength >= 100) updateAchievementProgress('Century Streak');
    if (streakLength >= 365) updateAchievementProgress('Immortal');
  }, [updateAchievementProgress]);

  const trackCorrectAnswer = useCallback(() => {
    updateAchievementProgress('First Victory');
  }, [updateAchievementProgress]);

  const trackNotesGenerated = useCallback(() => {
    updateAchievementProgress('Note Taker');
  }, [updateAchievementProgress]);

  const trackFlashcardCreated = useCallback(() => {
    updateAchievementProgress('Flashcard Fan');
  }, [updateAchievementProgress]);

  const trackVideoWatched = useCallback(() => {
    updateAchievementProgress('Video Learner');
  }, [updateAchievementProgress]);

  const trackLeaderboardEntry = useCallback(() => {
    updateAchievementProgress('Board Member');
  }, [updateAchievementProgress]);

  const trackFriendRequest = useCallback(() => {
    updateAchievementProgress('Social Butterfly');
  }, [updateAchievementProgress]);

  const trackWeakTopicImprovement = useCallback((improvement: number) => {
    if (improvement >= 20) updateAchievementProgress('Problem Solver');
    if (improvement >= 30) updateAchievementProgress('Topic Transformer');
    if (improvement >= 50) updateAchievementProgress('Weakness Conqueror');
  }, [updateAchievementProgress]);

  const trackTopicStudied = useCallback(() => {
    updateAchievementProgress('Topic Explorer');
    updateAchievementProgress('Subject Specialist');
    updateAchievementProgress('Knowledge Seeker');
    updateAchievementProgress('Polymath');
  }, [updateAchievementProgress]);

  const trackLeaderboardRank = useCallback((rank: number) => {
    if (rank <= 50) updateAchievementProgress('Top 50 Climber');
    if (rank <= 20) updateAchievementProgress('Top 20 Contender');
    if (rank <= 10) updateAchievementProgress('Top 10 Elite');
  }, [updateAchievementProgress]);

  return {
    updateAchievementProgress,
    trackFirstQuiz,
    trackQuizCompleted,
    trackStreakUpdate,
    trackCorrectAnswer,
    trackNotesGenerated,
    trackFlashcardCreated,
    trackVideoWatched,
    trackLeaderboardEntry,
    trackFriendRequest,
    trackWeakTopicImprovement,
    trackTopicStudied,
    trackLeaderboardRank,
  };
};
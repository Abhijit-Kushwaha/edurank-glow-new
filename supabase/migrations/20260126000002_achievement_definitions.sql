-- Achievement Definitions Data
-- This file contains all 105+ achievement definitions for EduRank
-- Run this after creating the achievement tables

-- Onboarding & Early Wins (15 achievements)
INSERT INTO public.achievements (name, description, category, unlock_condition, reward_type, reward_value, difficulty_level) VALUES
('Welcome Aboard', 'Complete your first quiz on EduRank', 'onboarding', '{"type": "first_quiz_completed", "target": 1}', 'xp_boost', '{"multiplier": 1.5, "duration_hours": 24}', 1),
('Note Taker', 'Generate your first AI-powered notes', 'onboarding', '{"type": "first_notes_generated", "target": 1}', 'profile_highlight', '{"badge": "Scholar", "color": "blue"}', 1),
('Flashcard Fan', 'Create your first flashcard set', 'onboarding', '{"type": "first_flashcard_created", "target": 1}', 'learning_privilege', '{"unlock_feature": "advanced_flashcards"}', 1),
('Video Learner', 'Watch your first educational video', 'onboarding', '{"type": "first_video_watched", "target": 1}', 'xp_boost', '{"multiplier": 1.25, "duration_hours": 12}', 1),
('Board Member', 'Appear on the leaderboard for the first time', 'onboarding', '{"type": "first_leaderboard_entry", "target": 1}', 'featured_status', '{"duration_days": 1}', 1),
('First Victory', 'Get your first correct answer', 'onboarding', '{"type": "first_correct_answer", "target": 1}', 'xp_boost', '{"multiplier": 2.0, "duration_hours": 1}', 1),
('Session Starter', 'Complete your first study session', 'onboarding', '{"type": "first_session_completed", "target": 1}', 'profile_highlight', '{"badge": "Dedicated", "color": "green"}', 1),
('Profile Builder', 'Complete your user profile with name and avatar', 'onboarding', '{"type": "profile_completed", "target": 1}', 'learning_privilege', '{"unlock_feature": "custom_study_plans"}', 1),
('Social Butterfly', 'Send your first friend request', 'onboarding', '{"type": "first_friend_request", "target": 1}', 'featured_status', '{"duration_days": 3}', 1),
('Quiz Creator', 'Create your first custom quiz', 'onboarding', '{"type": "first_custom_quiz", "target": 1}', 'learning_privilege', '{"unlock_feature": "quiz_sharing"}', 1),
('Feedback Giver', 'Rate your first video or quiz', 'onboarding', '{"type": "first_rating_given", "target": 1}', 'xp_boost', '{"multiplier": 1.1, "duration_hours": 6}', 1),
('Streak Saver', 'Use your first streak protection', 'onboarding', '{"type": "first_streak_protection_used", "target": 1}', 'rank_protection', '{"duration_days": 7}', 1),
('Weak Topic Warrior', 'Identify and start fixing your first weak topic', 'onboarding', '{"type": "first_weak_topic_identified", "target": 1}', 'learning_privilege', '{"unlock_feature": "weak_topic_insights"}', 1),
('Daily Challenger', 'Complete your first daily challenge', 'onboarding', '{"type": "first_daily_challenge", "target": 1}', 'profile_highlight', '{"badge": "Challenger", "color": "orange"}', 1),
('Explorer', 'Visit 5 different sections of the platform', 'onboarding', '{"type": "platform_sections_visited", "target": 5}', 'xp_boost', '{"multiplier": 1.2, "duration_hours": 24}', 1);

-- Streak & Consistency (20 achievements)
INSERT INTO public.achievements (name, description, category, unlock_condition, reward_type, reward_value, difficulty_level) VALUES
('Getting Started', 'Maintain a 3-day study streak', 'streak', '{"type": "streak_days", "target": 3}', 'xp_boost', '{"multiplier": 1.1, "duration_hours": 24}', 1),
('Week Warrior', 'Maintain a 7-day study streak', 'streak', '{"type": "streak_days", "target": 7}', 'profile_highlight', '{"badge": "Consistent", "color": "blue"}', 2),
('Two Week Triumph', 'Maintain a 14-day study streak', 'streak', '{"type": "streak_days", "target": 14}', 'rank_protection', '{"duration_days": 3}', 2),
('Three Week Champion', 'Maintain a 21-day study streak', 'streak', '{"type": "streak_days", "target": 21}', 'featured_status', '{"duration_days": 7}', 3),
('Monthly Master', 'Maintain a 30-day study streak', 'streak', '{"type": "streak_days", "target": 30}', 'xp_boost', '{"multiplier": 2.0, "duration_hours": 168}', 4),
('Century Streak', 'Maintain a 100-day study streak', 'streak', '{"type": "streak_days", "target": 100}', 'hard_mode_access', '{}', 5),
('Streak Savior', 'Save your streak using a recovery quiz', 'streak', '{"type": "streak_recoveries", "target": 1}', 'rank_protection', '{"duration_days": 1}', 2),
('Comeback Kid', 'Return to studying after a 7-day break', 'streak', '{"type": "comeback_after_break", "target": 7}', 'xp_boost', '{"multiplier": 1.5, "duration_hours": 48}', 2),
('Daily Dynamo', 'Complete daily micro-quizzes for 7 consecutive days', 'streak', '{"type": "daily_micro_quiz_streak", "target": 7}', 'learning_privilege', '{"unlock_feature": "advanced_analytics"}', 2),
('Routine Master', 'Study at the same time for 14 days', 'streak', '{"type": "consistent_study_time", "target": 14}', 'profile_highlight', '{"badge": "Disciplined", "color": "purple"}', 3),
('Early Bird', 'Study before 7 AM for 5 days', 'streak', '{"type": "early_morning_sessions", "target": 5}', 'xp_boost', '{"multiplier": 1.3, "duration_hours": 24}', 2),
('Night Owl', 'Study after 10 PM for 5 days', 'streak', '{"type": "late_night_sessions", "target": 5}', 'xp_boost', '{"multiplier": 1.3, "duration_hours": 24}', 2),
('Weekend Warrior', 'Study every weekend for a month', 'streak', '{"type": "weekend_study_month", "target": 4}', 'featured_status', '{"duration_days": 3}', 2),
('No Excuses', 'Study on 5 different holidays or special days', 'streak', '{"type": "holiday_study_days", "target": 5}', 'profile_highlight', '{"badge": "Unstoppable", "color": "red"}', 3),
('Streak Protector', 'Use streak protection 10 times', 'streak', '{"type": "streak_protections_used", "target": 10}', 'rank_protection', '{"duration_days": 30}', 3),
('Resurrection', 'Recover from a broken 30-day streak', 'streak', '{"type": "streak_resurrection", "target": 1}', 'hard_mode_access', '{}', 4),
('Daily Habit', 'Complete at least one quiz every day for 30 days', 'streak', '{"type": "daily_quiz_completion", "target": 30}', 'xp_boost', '{"multiplier": 1.25, "duration_hours": 720}', 3),
('Consistency King', 'Never miss a day for 50 days', 'streak', '{"type": "perfect_streak", "target": 50}', 'featured_status', '{"duration_days": 30}', 5),
('Streak Stacker', 'Maintain parallel streaks in different subjects', 'streak', '{"type": "parallel_streaks", "target": 3}', 'learning_privilege', '{"unlock_feature": "multi_subject_tracking"}', 4),
('Immortal', 'Maintain a streak for 365 days', 'streak', '{"type": "year_long_streak", "target": 365}', 'hard_mode_access', '{}', 5);

-- Quiz Performance & Accuracy (20 achievements)
INSERT INTO public.achievements (name, description, category, unlock_condition, reward_type, reward_value, difficulty_level) VALUES
('Quiz Novice', 'Complete 5 quizzes', 'quiz_performance', '{"type": "quizzes_completed", "target": 5}', 'xp_boost', '{"multiplier": 1.1, "duration_hours": 12}', 1),
('Quiz Apprentice', 'Complete 10 quizzes', 'quiz_performance', '{"type": "quizzes_completed", "target": 10}', 'profile_highlight', '{"badge": "Apprentice", "color": "green"}', 1),
('Quiz Journeyman', 'Complete 25 quizzes', 'quiz_performance', '{"type": "quizzes_completed", "target": 25}', 'learning_privilege', '{"unlock_feature": "quiz_statistics"}', 2),
('Quiz Expert', 'Complete 50 quizzes', 'quiz_performance', '{"type": "quizzes_completed", "target": 50}', 'rank_protection', '{"duration_days": 7}', 3),
('Quiz Master', 'Complete 100 quizzes', 'quiz_performance', '{"type": "quizzes_completed", "target": 100}', 'featured_status', '{"duration_days": 14}', 4),
('Accuracy Ace', 'Achieve 90%+ accuracy on a single quiz', 'quiz_performance', '{"type": "single_quiz_accuracy", "target": 90}', 'xp_boost', '{"multiplier": 1.5, "duration_hours": 24}', 2),
('Perfectionist', 'Complete a quiz with 100% accuracy', 'quiz_performance', '{"type": "perfect_quiz", "target": 1}', 'profile_highlight', '{"badge": "Perfect", "color": "gold"}', 3),
('Speed Demon', 'Complete a quiz in under 2 minutes with 80%+ accuracy', 'quiz_performance', '{"type": "speed_quiz_completion", "target": 1}', 'xp_boost', '{"multiplier": 2.0, "duration_hours": 1}', 3),
('Answer Streak', 'Get 10 correct answers in a row', 'quiz_performance', '{"type": "correct_answer_streak", "target": 10}', 'learning_privilege', '{"unlock_feature": "streak_indicators"}', 2),
('First Try Hero', 'Pass a quiz on the first attempt', 'quiz_performance', '{"type": "first_attempt_pass", "target": 1}', 'xp_boost', '{"multiplier": 1.25, "duration_hours": 12}', 1),
('Improvement Seeker', 'Retry and improve score by 20%+', 'quiz_performance', '{"type": "score_improvement", "target": 20}', 'profile_highlight', '{"badge": "Improver", "color": "blue"}', 2),
('Consistent Performer', 'Maintain 80%+ accuracy across 10 quizzes', 'quiz_performance', '{"type": "consistent_accuracy", "target": 10}', 'rank_protection', '{"duration_days": 5}', 3),
('Topic Specialist', 'Score 95%+ on 5 quizzes in the same topic', 'quiz_performance', '{"type": "topic_specialist", "target": 5}', 'learning_privilege', '{"unlock_feature": "topic_mastery_badges"}', 3),
('Quick Thinker', 'Answer 20 questions correctly in under 30 seconds each', 'quiz_performance', '{"type": "fast_correct_answers", "target": 20}', 'xp_boost', '{"multiplier": 1.4, "duration_hours": 6}', 2),
('Resilient Learner', 'Pass a quiz after 3 failed attempts', 'quiz_performance', '{"type": "resilient_pass", "target": 1}', 'profile_highlight', '{"badge": "Resilient", "color": "orange"}', 2),
('Bulk Processor', 'Complete 50 questions in a single session', 'quiz_performance', '{"type": "bulk_questions_completed", "target": 50}', 'featured_status', '{"duration_days": 1}', 2),
('Accuracy Streak', 'Maintain 90%+ accuracy for 5 consecutive quizzes', 'quiz_performance', '{"type": "accuracy_streak", "target": 5}', 'hard_mode_access', '{}', 4),
('Question Crusher', 'Answer 1000 questions correctly total', 'quiz_performance', '{"type": "total_correct_answers", "target": 1000}', 'profile_highlight', '{"badge": "Crusher", "color": "red"}', 4),
('Perfect Week', 'Complete 7 perfect quizzes in a week', 'quiz_performance', '{"type": "perfect_quizzes_week", "target": 7}', 'featured_status', '{"duration_days": 30}', 5),
('Master Quizzer', 'Achieve 95%+ accuracy on 100 quizzes', 'quiz_performance', '{"type": "high_accuracy_quizzes", "target": 100}', 'hard_mode_access', '{}', 5);

-- Weak-Topic Improvement (15 achievements)
INSERT INTO public.achievements (name, description, category, unlock_condition, reward_type, reward_value, difficulty_level) VALUES
('Problem Solver', 'Improve a weak topic score by 20%', 'weak_topic_improvement', '{"type": "weak_topic_improvement", "target": 20}', 'xp_boost', '{"multiplier": 1.2, "duration_hours": 24}', 2),
('Topic Transformer', 'Improve a weak topic score by 30%', 'weak_topic_improvement', '{"type": "weak_topic_improvement", "target": 30}', 'profile_highlight', '{"badge": "Transformer", "color": "green"}', 2),
('Weakness Conqueror', 'Improve a weak topic score by 50%', 'weak_topic_improvement', '{"type": "weak_topic_improvement", "target": 50}', 'learning_privilege', '{"unlock_feature": "improvement_insights"}', 3),
('Mistake Fixer', 'Correct the same mistake 5 times', 'weak_topic_improvement', '{"type": "mistake_corrections", "target": 5}', 'xp_boost', '{"multiplier": 1.3, "duration_hours": 12}', 2),
('Error Eliminator', 'Fix 10 different types of mistakes', 'weak_topic_improvement', '{"type": "unique_mistakes_fixed", "target": 10}', 'profile_highlight', '{"badge": "Precise", "color": "blue"}', 3),
('Strength Builder', 'Turn 3 weak topics into strong ones', 'weak_topic_improvement', '{"type": "weak_to_strong_topics", "target": 3}', 'rank_protection', '{"duration_days": 14}', 4),
('Improvement Marathon', 'Complete 10 recommended improvement quizzes', 'weak_topic_improvement', '{"type": "improvement_quizzes_completed", "target": 10}', 'featured_status', '{"duration_days": 7}', 3),
('Pattern Recognizer', 'Identify and fix 5 learning patterns', 'weak_topic_improvement', '{"type": "learning_patterns_identified", "target": 5}', 'learning_privilege', '{"unlock_feature": "pattern_analysis"}', 3),
('Comeback Champion', 'Improve from below 50% to above 80% in a topic', 'weak_topic_improvement', '{"type": "major_comeback", "target": 1}', 'profile_highlight', '{"badge": "Comeback", "color": "gold"}', 4),
('Weak Topic Warrior', 'Spend 10 hours improving weak topics', 'weak_topic_improvement', '{"type": "weak_topic_study_hours", "target": 10}', 'xp_boost', '{"multiplier": 1.5, "duration_hours": 48}', 3),
('Consistent Improver', 'Show improvement in weak topics for 4 weeks', 'weak_topic_improvement', '{"type": "weekly_improvement_streak", "target": 4}', 'hard_mode_access', '{}', 4),
('Master Improver', 'Improve 20 different weak topics', 'weak_topic_improvement', '{"type": "topics_improved", "target": 20}', 'featured_status', '{"duration_days": 30}', 5),
('Flawless Fix', 'Achieve 100% on a previously failed quiz', 'weak_topic_improvement', '{"type": "failed_to_perfect", "target": 1}', 'profile_highlight', '{"badge": "Flawless", "color": "purple"}', 3),
('Improvement Architect', 'Create and complete a custom improvement plan', 'weak_topic_improvement', '{"type": "custom_improvement_plan", "target": 1}', 'learning_privilege', '{"unlock_feature": "custom_improvement_plans"}', 3),
('Growth Mindset', 'Show improvement across all weak topics simultaneously', 'weak_topic_improvement', '{"type": "holistic_improvement", "target": 5}', 'hard_mode_access', '{}', 5);

-- Learning Depth & Exploration (10 achievements)
INSERT INTO public.achievements (name, description, category, unlock_condition, reward_type, reward_value, difficulty_level) VALUES
('Topic Explorer', 'Study 5 different topics', 'learning_depth', '{"type": "topics_studied", "target": 5}', 'learning_privilege', '{"unlock_feature": "topic_recommendations"}', 1),
('Subject Specialist', 'Study 10 different topics', 'learning_depth', '{"type": "topics_studied", "target": 10}', 'profile_highlight', '{"badge": "Specialist", "color": "blue"}', 2),
('Knowledge Seeker', 'Study 25 different topics', 'learning_depth', '{"type": "topics_studied", "target": 25}', 'featured_status', '{"duration_days": 7}', 3),
('Video Master', 'Watch and complete 10 different videos', 'learning_depth', '{"type": "videos_mastered", "target": 10}', 'xp_boost', '{"multiplier": 1.2, "duration_hours": 24}', 2),
('Deep Diver', 'Spend 2+ hours on a single study session', 'learning_depth', '{"type": "long_study_session", "target": 1}', 'profile_highlight', '{"badge": "Deep Diver", "color": "purple"}', 2),
('Flashcard Expert', 'Master 100 flashcards', 'learning_depth', '{"type": "flashcards_mastered", "target": 100}', 'learning_privilege', '{"unlock_feature": "advanced_flashcard_modes"}', 3),
('Note Navigator', 'Revisit and update notes 20 times', 'learning_depth', '{"type": "notes_revisits", "target": 20}', 'xp_boost', '{"multiplier": 1.15, "duration_hours": 48}', 2),
('Session Stacker', 'Complete 5 study sessions in one day', 'learning_depth', '{"type": "daily_sessions", "target": 5}', 'rank_protection', '{"duration_days": 1}', 3),
('Knowledge Builder', 'Accumulate 100 hours of total study time', 'learning_depth', '{"type": "total_study_hours", "target": 100}', 'featured_status', '{"duration_days": 14}', 4),
('Polymath', 'Study across 50 different topics', 'learning_depth', '{"type": "topics_studied", "target": 50}', 'hard_mode_access', '{}', 5);

-- Leaderboard & Competition (15 achievements)
INSERT INTO public.achievements (name, description, category, unlock_condition, reward_type, reward_value, difficulty_level) VALUES
('Board Member', 'Enter the leaderboard for the first time', 'leaderboard', '{"type": "leaderboard_entry", "target": 1}', 'featured_status', '{"duration_days": 1}', 1),
('Top 50 Climber', 'Reach top 50 on the leaderboard', 'leaderboard', '{"type": "leaderboard_rank", "target": 50}', 'profile_highlight', '{"badge": "Top 50", "color": "silver"}', 2),
('Top 20 Contender', 'Reach top 20 on the leaderboard', 'leaderboard', '{"type": "leaderboard_rank", "target": 20}', 'rank_protection', '{"duration_days": 7}', 3),
('Top 10 Elite', 'Reach top 10 on the leaderboard', 'leaderboard', '{"type": "leaderboard_rank", "target": 10}', 'featured_status', '{"duration_days": 14}', 4),
('Rank Jumper', 'Jump 20+ positions in a week', 'leaderboard', '{"type": "rank_jump", "target": 20}', 'xp_boost', '{"multiplier": 1.5, "duration_hours": 24}', 3),
('Rank Defender', 'Maintain top 50 position for 7 days', 'leaderboard', '{"type": "rank_defense", "target": 7}', 'profile_highlight', '{"badge": "Defender", "color": "blue"}', 3),
('Friend Beater', 'Score higher than 5 friends in a week', 'leaderboard', '{"type": "friends_beaten", "target": 5}', 'featured_status', '{"duration_days": 3}', 2),
('Comeback Climber', 'Recover 30+ positions after dropping', 'leaderboard', '{"type": "rank_recovery", "target": 30}', 'rank_protection', '{"duration_days": 14}', 4),
('Weekly Winner', 'Be #1 on weekly leaderboard', 'leaderboard', '{"type": "weekly_leaderboard_win", "target": 1}', 'profile_highlight', '{"badge": "Weekly Winner", "color": "gold"}', 4),
('Monthly Champion', 'Be #1 on monthly leaderboard', 'leaderboard', '{"type": "monthly_leaderboard_win", "target": 1}', 'hard_mode_access', '{}', 5),
('Streak Champion', 'Win leaderboard for 3 consecutive weeks', 'leaderboard', '{"type": "consecutive_weekly_wins", "target": 3}', 'featured_status', '{"duration_days": 30}', 5),
('Social Climber', 'Gain 100 friends while maintaining top 100 rank', 'leaderboard', '{"type": "social_climber", "target": 100}', 'learning_privilege', '{"unlock_feature": "friend_leaderboards"}', 4),
('Rank Protector', 'Use rank protection to maintain position 10 times', 'leaderboard', '{"type": "rank_protections_used", "target": 10}', 'rank_protection', '{"duration_days": 30}', 3),
('Competitive Spirit', 'Participate in 50 competitive quiz events', 'leaderboard', '{"type": "competitive_events", "target": 50}', 'profile_highlight', '{"badge": "Competitive", "color": "red"}', 4),
('Legend', 'Hold #1 position for 30 days total', 'leaderboard', '{"type": "legendary_position", "target": 30}', 'hard_mode_access', '{}', 5);

-- Speed, Focus & Discipline (10 achievements)
INSERT INTO public.achievements (name, description, category, unlock_condition, reward_type, reward_value, difficulty_level) VALUES
('Speed Reader', 'Complete a quiz 50% faster than average with 80%+ accuracy', 'speed_discipline', '{"type": "fast_quiz_completion", "target": 1}', 'xp_boost', '{"multiplier": 1.4, "duration_hours": 6}', 2),
('Focus Master', 'Complete a 30-minute session without leaving the tab', 'speed_discipline', '{"type": "undistracted_session", "target": 1}', 'profile_highlight', '{"badge": "Focused", "color": "green"}', 2),
('Multi-Session Pro', 'Complete 3 study sessions in one day', 'speed_discipline', '{"type": "multiple_daily_sessions", "target": 3}', 'learning_privilege', '{"unlock_feature": "session_scheduling"}', 2),
('Early Riser', 'Study 10 times before 6 AM', 'speed_discipline', '{"type": "early_riser_sessions", "target": 10}', 'xp_boost', '{"multiplier": 1.3, "duration_hours": 24}', 3),
('Night Scholar', 'Study 10 times after midnight', 'speed_discipline', '{"type": "night_scholar_sessions", "target": 10}', 'xp_boost', '{"multiplier": 1.3, "duration_hours": 24}', 3),
('Time Master', 'Study for exactly 25 minutes (Pomodoro technique)', 'speed_discipline', '{"type": "pomodoro_sessions", "target": 10}', 'profile_highlight', '{"badge": "Time Master", "color": "blue"}', 2),
('Distraction Free', 'Complete 20 undistracted sessions', 'speed_discipline', '{"type": "undistracted_sessions", "target": 20}', 'rank_protection', '{"duration_days": 7}', 3),
('Efficiency Expert', 'Complete 50 questions with 90%+ accuracy in under 30 minutes', 'speed_discipline', '{"type": "efficient_question_completion", "target": 50}', 'featured_status', '{"duration_days": 7}', 4),
('Discipline Champion', 'Study at the same time every day for 30 days', 'speed_discipline', '{"type": "consistent_daily_timing", "target": 30}', 'hard_mode_access', '{}', 4),
('Ultimate Focus', 'Complete 100 undistracted sessions', 'speed_discipline', '{"type": "ultimate_focus_sessions", "target": 100}', 'hard_mode_access', '{}', 5);
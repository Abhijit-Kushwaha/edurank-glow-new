import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Lock,
  Unlock,
  Star,
  Target,
  Flame,
  BookOpen,
  TrendingUp,
  Award,
  Zap,
  Users,
  Clock,
  CheckCircle,
  Circle,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  reward_type: string;
  reward_value: any;
  tier: string;
  is_hidden: boolean;
  icon: string;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  progress: number;
  progress_max: number;
  unlocked_at?: string;
  reward_claimed: boolean;
  achievement?: Achievement;
}

const Achievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  const categories = [
    { id: 'all', name: 'All Achievements', icon: Trophy, color: 'text-yellow-500' },
    { id: 'onboarding', name: 'Getting Started', icon: Star, color: 'text-blue-500' },
    { id: 'streak', name: 'Consistency', icon: Flame, color: 'text-orange-500' },
    { id: 'quiz_performance', name: 'Quiz Mastery', icon: Target, color: 'text-green-500' },
    { id: 'weak_topic_improvement', name: 'Growth', icon: TrendingUp, color: 'text-purple-500' },
    { id: 'learning_depth', name: 'Exploration', icon: BookOpen, color: 'text-indigo-500' },
    { id: 'leaderboard', name: 'Competition', icon: Crown, color: 'text-red-500' },
    { id: 'speed_discipline', name: 'Focus', icon: Zap, color: 'text-cyan-500' },
  ];

  useEffect(() => {
    if (user) {
      loadAchievements();
      loadUserAchievements();
    }
  }, [user]);

  const loadAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('difficulty_level', { ascending: true });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error loading achievements:', error);
      toast.error('Failed to load achievements');
    }
  };

  const loadUserAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          id,
          achievement_id,
          progress,
          progress_max,
          unlocked_at,
          reward_claimed,
          achievements (
            id,
            name,
            description,
            category,
            requirement_type,
            requirement_value,
            reward_type,
            reward_value,
            tier,
            is_hidden,
            icon
          )
        `)
        .eq('user_id', user!.id);

      if (error) throw error;

      const userAchievementsWithDetails = data?.map(ua => ({
        ...ua,
        achievement: Array.isArray(ua.achievements) ? ua.achievements[0] : ua.achievements
      })) || [];

      setUserAchievements(userAchievementsWithDetails);
    } catch (error) {
      console.error('Error loading user achievements:', error);
      toast.error('Failed to load your progress');
    } finally {
      setIsLoading(false);
    }
  };

  const getRewardIcon = (rewardType: string) => {
    switch (rewardType) {
      case 'xp_boost': return '⚡';
      case 'rank_protection': return '🛡️';
      case 'profile_highlight': return '✨';
      case 'hard_mode_access': return '🔥';
      case 'featured_status': return '⭐';
      case 'learning_privilege': return '🎓';
      default: return '🎁';
    }
  };

  const getRewardDescription = (rewardType: string, rewardValue: any) => {
    switch (rewardType) {
      case 'xp_boost':
        return `${rewardValue.multiplier}x XP for ${rewardValue.duration_hours}h`;
      case 'rank_protection':
        return `${rewardValue.duration_days} days rank protection`;
      case 'profile_highlight':
        return `${rewardValue.badge} badge`;
      case 'hard_mode_access':
        return 'Hard mode unlocked';
      case 'featured_status':
        return `${rewardValue.duration_days} days featured`;
      case 'learning_privilege':
        return `Unlock: ${rewardValue.unlock_feature}`;
      default:
        return 'Special reward';
    }
  };

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1: return 'text-green-500';
      case 2: return 'text-blue-500';
      case 3: return 'text-purple-500';
      case 4: return 'text-orange-500';
      case 5: return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1: return 'Easy';
      case 2: return 'Medium';
      case 3: return 'Hard';
      case 4: return 'Expert';
      case 5: return 'Legendary';
      default: return 'Unknown';
    }
  };

  const filteredAchievements = selectedCategory === 'all'
    ? userAchievements
    : userAchievements.filter(ua => ua.achievement?.category === selectedCategory);

  const unlockedCount = userAchievements.filter(ua => ua.unlocked_at).length;
  const totalCount = userAchievements.length;
  const completionPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  // Find next closest achievement to unlock
  const nextAchievement = userAchievements
    .filter(ua => !ua.unlocked_at && ua.progress > 0)
    .sort((a, b) => (b.progress / b.progress_max) - (a.progress / a.progress_max))[0];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p>Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-2xl font-bold">Achievements</h1>
                <p className="text-muted-foreground">
                  {unlockedCount} of {totalCount} unlocked ({Math.round(completionPercentage)}%)
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Progress Overview */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div>
                  <h2 className="text-xl font-bold">Achievement Progress</h2>
                  <p className="text-muted-foreground">Keep learning to unlock more rewards!</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {unlockedCount}/{totalCount}
              </Badge>
            </div>
            <Progress value={completionPercentage} className="h-3 mb-4" />
            {nextAchievement && nextAchievement.achievement && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">🎯 Next Achievement</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{nextAchievement.achievement.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {nextAchievement.progress} / {nextAchievement.progress_max} completed
                    </p>
                  </div>
                  <Progress
                    value={(nextAchievement.progress / nextAchievement.progress_max) * 100}
                    className="w-24 h-2"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
            {categories.map((category) => {
              const Icon = category.icon;
              const categoryAchievements = category.id === 'all'
                ? userAchievements
                : userAchievements.filter(ua => ua.achievement?.category === category.id);
              const unlockedInCategory = categoryAchievements.filter(ua => ua.unlocked_at).length;

              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Icon className={`h-4 w-4 ${category.color}`} />
                  <span className="text-xs">{category.name.split(' ')[0]}</span>
                  <span className="text-xs font-bold">{unlockedInCategory}/{categoryAchievements.length}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Achievements Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAchievements.map((userAchievement) => {
              const achievement = userAchievement.achievement;
              if (!achievement) return null;

              const isUnlocked = !!userAchievement.unlocked_at;
              const progressPercentage = (userAchievement.progress / userAchievement.progress_max) * 100;

              return (
                <Card
                  key={userAchievement.id}
                  className={`transition-all duration-300 ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800'
                      : 'hover:shadow-md'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {isUnlocked ? (
                          <Unlock className="h-6 w-6 text-green-500" />
                        ) : (
                          <Lock className="h-6 w-6 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className={`text-lg ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {achievement.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getDifficultyColor(achievement.difficulty_level)}`}
                            >
                              {getDifficultyLabel(achievement.difficulty_level)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {getRewardIcon(achievement.reward_type)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isUnlocked && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className={`text-sm ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {achievement.description}
                    </p>

                    {!isUnlocked && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{userAchievement.progress} / {userAchievement.progress_max}</span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">Reward:</span>
                      <span className="text-muted-foreground">
                        {getRewardDescription(achievement.reward_type, achievement.reward_value)}
                      </span>
                    </div>

                    {isUnlocked && userAchievement.unlocked_at && (
                      <div className="text-xs text-muted-foreground">
                        Unlocked {new Date(userAchievement.unlocked_at).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredAchievements.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No achievements in this category</h3>
                <p className="text-muted-foreground text-center">
                  Check back later or try a different category.
                </p>
              </CardContent>
            </Card>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Achievements;
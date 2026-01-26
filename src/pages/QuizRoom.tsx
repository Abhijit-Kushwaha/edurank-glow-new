import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trophy, Users, Clock, CheckCircle, XCircle, Crown, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface QuizRoom {
  id: string;
  host_id: string;
  status: string;
  quiz_data: any;
  created_at: string;
}

interface QuizPlayer {
  id: string;
  room_id: string;
  user_id: string;
  score: number;
  joined_at: string;
  finished_at?: string;
  profile?: {
    name: string;
    avatar_url?: string;
  };
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

const QuizRoom = () => {
  const [searchParams] = useSearchParams();
  const friendId = searchParams.get('friend');
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [players, setPlayers] = useState<QuizPlayer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isHost, setIsHost] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [answers, setAnswers] = useState<{[questionId: string]: number}>({});
  const [scores, setScores] = useState<{[userId: string]: number}>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && friendId) {
      initializeRoom();
    }
  }, [user, friendId]);

  useEffect(() => {
    if (room && gameStarted && !gameFinished) {
      startTimer();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [room, gameStarted, gameFinished, questionIndex]);

  const initializeRoom = async () => {
    // Temporarily disabled - database migrations pending
    setIsLoading(false);
    toast.info('Quiz rooms feature coming soon!');
  };

  const joinRoom = async (roomId: string) => {
    // Temporarily disabled - database migrations pending
    toast.info('Quiz rooms feature coming soon!');
  };

  const loadPlayers = async (roomId: string) => {
    // Temporarily disabled - database migrations pending
    setPlayers([]);
  };

  const setupRealtime = (roomId: string) => {
    const channel = supabase.channel(`quiz_room_${roomId}`, {
      config: {
        presence: {
          key: user!.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        console.log('Presence sync');
      })
      .on('broadcast', { event: 'game_start' }, () => {
        setGameStarted(true);
        setGameFinished(false);
        setQuestionIndex(0);
        setAnswers({});
        loadCurrentQuestion();
      })
      .on('broadcast', { event: 'next_question' }, (payload) => {
        setQuestionIndex(payload.question_index);
        setSelectedAnswer(null);
        setTimeLeft(30);
        loadCurrentQuestion();
      })
      .on('broadcast', { event: 'game_end' }, () => {
        setGameFinished(true);
        setGameStarted(false);
      })
      .on('broadcast', { event: 'player_answer' }, (payload) => {
        // Update scores when someone answers
        setScores(prev => ({
          ...prev,
          [payload.user_id]: payload.score
        }));
      })
      .subscribe();

    channelRef.current = channel;
  };

  const generateQuizQuestions = (): QuizQuestion[] => {
    // Sample questions - in real app, these would come from your quiz system
    return [
      {
        id: 'q1',
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correct_answer: 2,
        explanation: 'Paris is the capital and most populous city of France.'
      },
      {
        id: 'q2',
        question: 'Which planet is known as the Red Planet?',
        options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correct_answer: 1,
        explanation: 'Mars is known as the Red Planet due to iron oxide on its surface.'
      },
      {
        id: 'q3',
        question: 'What is 2 + 2 × 3?',
        options: ['8', '12', '6', '10'],
        correct_answer: 0,
        explanation: 'According to order of operations (PEMDAS), multiplication comes before addition: 2 + (2 × 3) = 2 + 6 = 8.'
      },
      {
        id: 'q4',
        question: 'Who wrote "Romeo and Juliet"?',
        options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
        correct_answer: 1,
        explanation: 'William Shakespeare wrote Romeo and Juliet around 1595.'
      },
      {
        id: 'q5',
        question: 'What is the largest ocean on Earth?',
        options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
        correct_answer: 3,
        explanation: 'The Pacific Ocean is the largest ocean, covering about 46% of the Earth\'s water surface.'
      }
    ];
  };

  const loadCurrentQuestion = () => {
    if (room?.quiz_data?.questions) {
      const question = room.quiz_data.questions[questionIndex];
      setCurrentQuestion(question);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - auto submit current answer or skip
          if (selectedAnswer !== null) {
            submitAnswer();
          } else {
            nextQuestion();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const submitAnswer = async () => {
    // Temporarily disabled - database migrations pending
    toast.info('Quiz rooms feature coming soon!');
  };

  const nextQuestion = () => {
    if (!room) return;

    const nextIndex = questionIndex + 1;
    if (nextIndex >= room.quiz_data.questions.length) {
      // Game finished
      endGame();
    } else {
      // Next question
      channelRef.current?.send({
        type: 'broadcast',
        event: 'next_question',
        payload: { question_index: nextIndex }
      });
    }
  };

  const startGame = () => {
    if (!isHost || !channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'game_start'
    });
  };

  const endGame = () => {
    if (!channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'game_end'
    });

    // Update room status
    supabase
      .from('quiz_rooms')
      .update({ status: 'finished' })
      .eq('id', room!.id);
  };

  const getWinner = () => {
    const sortedPlayers = Object.entries(scores).sort(([,a], [,b]) => b - a);
    return sortedPlayers[0];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading quiz room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Failed to load quiz room</p>
            <Button onClick={() => navigate('/friends')}>Back to Friends</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/friends')}>
              ← Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Quiz Battle</h1>
              <p className="text-muted-foreground">Room: {room.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={room.status === 'waiting' ? 'secondary' : 'default'}>
              {room.status}
            </Badge>
            {isHost && room.status === 'waiting' && players.length >= 2 && (
              <Button onClick={startGame} className="bg-green-600 hover:bg-green-700">
                <Zap className="h-4 w-4 mr-2" />
                Start Game
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Players Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Players ({players.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {players.map((player) => (
                  <div key={player.user_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={player.profile?.avatar_url} />
                        <AvatarFallback>
                          {player.profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{player.profile?.name}</p>
                        {player.user_id === room.host_id && (
                          <Badge variant="outline" className="text-xs">Host</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{scores[player.user_id] || 0}</p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Game Area */}
          <div className="lg:col-span-2">
            {!gameStarted && !gameFinished ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Quiz Battle Ready!</h2>
                  <p className="text-muted-foreground mb-6">
                    {isHost
                      ? "Waiting for players to join. Click Start Game when ready!"
                      : "Waiting for the host to start the game..."}
                  </p>
                  {players.length < 2 && (
                    <p className="text-sm text-muted-foreground">
                      Need at least 2 players to start
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : gameFinished ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Crown className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-4">Game Finished!</h2>
                  {(() => {
                    const [winnerId, winnerScore] = getWinner();
                    const winner = players.find(p => p.user_id === winnerId);
                    return (
                      <div className="space-y-4">
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <p className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                            🏆 Winner: {winner?.profile?.name}
                          </p>
                          <p className="text-yellow-700 dark:text-yellow-300">
                            Score: {winnerScore} points
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-semibold">Final Scores:</h3>
                          {Object.entries(scores)
                            .sort(([,a], [,b]) => b - a)
                            .map(([userId, score]) => {
                              const player = players.find(p => p.user_id === userId);
                              return (
                                <div key={userId} className="flex justify-between items-center p-2 bg-muted rounded">
                                  <span>{player?.profile?.name}</span>
                                  <span className="font-bold">{score} pts</span>
                                </div>
                              );
                            })}
                        </div>
                        <div className="flex gap-4 justify-center mt-6">
                          <Button onClick={() => navigate('/friends')}>
                            Back to Friends
                          </Button>
                          <Button variant="outline" onClick={() => window.location.reload()}>
                            Play Again
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Question {questionIndex + 1} of {room.quiz_data?.questions?.length || 0}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      <span className="font-mono text-lg">{timeLeft}s</span>
                    </div>
                  </div>
                  <Progress value={(timeLeft / 30) * 100} className="h-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentQuestion && (
                    <>
                      <div className="text-center">
                        <h3 className="text-xl font-semibold mb-6">
                          {currentQuestion.question}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.options.map((option, index) => {
                          const isSelected = selectedAnswer === index;
                          const isAnswered = answers[currentQuestion.id] !== undefined;
                          const isCorrect = index === currentQuestion.correct_answer;
                          const userAnswered = answers[currentQuestion.id] === index;

                          let buttonClass = "p-4 text-left border-2 border-muted hover:border-primary transition-colors";

                          if (isAnswered) {
                            if (isCorrect) {
                              buttonClass += " border-green-500 bg-green-50 dark:bg-green-900/20";
                            } else if (userAnswered) {
                              buttonClass += " border-red-500 bg-red-50 dark:bg-red-900/20";
                            } else {
                              buttonClass += " opacity-50";
                            }
                          } else if (isSelected) {
                            buttonClass += " border-primary bg-primary/10";
                          }

                          return (
                            <button
                              key={index}
                              onClick={() => !isAnswered && setSelectedAnswer(index)}
                              disabled={isAnswered}
                              className={buttonClass}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold">
                                  {String.fromCharCode(65 + index)}
                                </div>
                                <span className="flex-1">{option}</span>
                                {isAnswered && isCorrect && (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                )}
                                {isAnswered && userAnswered && !isCorrect && (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {answers[currentQuestion.id] !== undefined && (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="font-semibold mb-2">Explanation:</p>
                          <p className="text-sm text-muted-foreground">
                            {currentQuestion.explanation}
                          </p>
                        </div>
                      )}

                      {!answers[currentQuestion.id] && selectedAnswer !== null && (
                        <div className="text-center">
                          <Button onClick={submitAnswer} size="lg">
                            Submit Answer
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizRoom;
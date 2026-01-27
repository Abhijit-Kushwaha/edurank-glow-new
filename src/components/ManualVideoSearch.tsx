import { useState } from 'react';
import {
  Search,
  Loader2,
  AlertCircle,
  Play,
  User,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { searchYouTubeVideos, YouTubeVideo } from '@/integrations/youtube';

interface SearchedVideo {
  id: string;
  title: string;
  channel: string;
  video_id: string;
  duration?: string;
  engagement_score?: number;
  thumbnail_url?: string;
}

interface ManualVideoSearchProps {
  onVideoSelect?: (video: SearchedVideo) => void;
  onAddToTodo?: (video: SearchedVideo, todoTitle: string) => void;
}

const ManualVideoSearch = ({ onVideoSelect, onAddToTodo }: ManualVideoSearchProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchedVideo[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SearchedVideo | null>(null);
  const [todoTitle, setTodoTitle] = useState('');
  const [showTodoInput, setShowTodoInput] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;

    setLoading(true);
    setHasSearched(true);

    try {
      // Search using YouTube API
      const videos = await searchYouTubeVideos(searchQuery.trim(), 10);
      
      if (videos && videos.length > 0) {
        const formattedVideos = videos.map((video: YouTubeVideo) => ({
          id: video.id,
          title: video.title,
          channel: video.channel,
          video_id: video.video_id,
          duration: video.duration,
          engagement_score: video.engagement_score,
          thumbnail_url: video.thumbnail_url,
        }));
        setResults(formattedVideos);
        toast.success(`Found ${formattedVideos.length} videos!`);
      } else {
        setResults([]);
        toast.info('No videos found for your search. Try different keywords.');
      }
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to search videos';
      toast.error(errorMessage);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTodo = async () => {
    if (!selectedVideo || !todoTitle.trim() || !user) {
      toast.error('Please select a video and enter a task name');
      return;
    }

    try {
      // Create a new todo with the selected video
      const { data: newTodo, error: todoError } = await supabase
        .from('todos')
        .insert([
          {
            title: todoTitle.trim(),
            video_id: selectedVideo.video_id,
            user_id: user.id,
            completed: false,
          },
        ])
        .select()
        .single();

      if (todoError) throw todoError;

      toast.success('Video added to your to-do list!');
      setTodoTitle('');
      setShowTodoInput(false);
      setSelectedVideo(null);
      setSearchQuery('');
      setResults([]);

      if (onAddToTodo) {
        onAddToTodo(selectedVideo, todoTitle);
      }
    } catch (error) {
      console.error('Error adding video to todo:', error);
      toast.error('Failed to add video to your to-do list');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-card rounded-lg p-6 border border-border/30">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Search Videos</h2>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for educational videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>

        {hasSearched && results.length === 0 && !loading && (
          <div className="mt-6 p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-warning text-sm">
              No videos found. Try searching with different keywords.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold text-gray-700">Search Results</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedVideo?.id === video.id
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-16 h-12 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <Play className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 line-clamp-2">
                        {video.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {video.channel}
                        </div>
                        {video.engagement_score && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {Math.round(video.engagement_score)}% helpful
                          </div>
                        )}
                        {video.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {video.duration}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedVideo && (
              <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-lg">
                <p className="text-sm text-success mb-3">
                  Selected: <strong>{selectedVideo.title}</strong>
                </p>
                <Button
                  onClick={() => setShowTodoInput(true)}
                  className="w-full bg-success hover:bg-success/90"
                >
                  Add to To-Do List
                </Button>

                {showTodoInput && (
                  <div className="mt-3 space-y-2">
                    <Input
                      type="text"
                      placeholder="Give this task a name..."
                      value={todoTitle}
                      onChange={(e) => setTodoTitle(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAddToTodo}
                        disabled={!todoTitle.trim()}
                        className="flex-1 bg-success hover:bg-success/90"
                      >
                        Save to To-Do
                      </Button>
                      <Button
                        onClick={() => setShowTodoInput(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualVideoSearch;

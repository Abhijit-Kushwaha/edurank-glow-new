/**
 * YouTube API Integration
 * Handles video search and recommendations from YouTube
 * Filters out shorts (videos less than 7 minutes)
 */

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  video_id: string;
  duration?: string;
  engagement_score?: number;
  description?: string;
  thumbnail?: string;
}

/**
 * Convert ISO 8601 duration to seconds
 */
function durationToSeconds(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parse ISO 8601 duration to readable format
 */
function parseDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 'N/A';

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } else if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  } else {
    return `0:${String(seconds).padStart(2, '0')}`;
  }
}

/**
 * Calculate engagement score based on video statistics
 */
function calculateEngagementScore(viewCount: number, likeCount: number, commentCount: number): number {
  if (viewCount === 0) return 50;

  const likeRate = (likeCount / viewCount) * 100;
  const commentRate = (commentCount / viewCount) * 100;

  const engagementScore = Math.min(100, (likeRate * 0.7 + commentRate * 0.3) * 10);
  return Math.round(engagementScore);
}

/**
 * Search for educational videos on YouTube
 * Automatically filters out shorts (< 7 minutes)
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 10,
  minDurationMinutes: number = 7
): Promise<YouTubeVideo[]> {
  try {
    if (!YOUTUBE_API_KEY) {
      console.error('YouTube API key not configured');
      throw new Error('YouTube API key is not configured');
    }

    // Search for videos
    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE_URL}/search?` +
        new URLSearchParams({
          key: YOUTUBE_API_KEY,
          q: query,
          part: 'snippet',
          type: 'video',
          maxResults: (maxResults * 2).toString(), // Get more results since we'll filter
          videoCategoryId: '27', // Educational category
          order: 'relevance',
          relevanceLanguage: 'en',
          safeSearch: 'strict',
        }),
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('YouTube API error:', errorData);
      throw new Error(`YouTube search failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    // Get video IDs for statistics
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    // Fetch video statistics and duration
    const statsResponse = await fetch(
      `${YOUTUBE_API_BASE_URL}/videos?` +
        new URLSearchParams({
          key: YOUTUBE_API_KEY,
          id: videoIds,
          part: 'contentDetails,statistics,snippet',
        })
    );

    if (!statsResponse.ok) {
      console.error('Failed to fetch video statistics');
      return searchData.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        video_id: item.id.videoId,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.medium?.url,
      }));
    }

    const statsData = await statsResponse.json();
    const minDurationSeconds = minDurationMinutes * 60;

    // Filter and map videos
    const videos: YouTubeVideo[] = statsData.items
      .map((item: any) => {
        const viewCount = parseInt(item.statistics.viewCount || '0');
        const likeCount = parseInt(item.statistics.likeCount || '0');
        const commentCount = parseInt(item.statistics.commentCount || '0');
        const durationSeconds = durationToSeconds(item.contentDetails.duration);

        return {
          id: item.id,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          video_id: item.id,
          duration: parseDuration(item.contentDetails.duration),
          engagement_score: calculateEngagementScore(viewCount, likeCount, commentCount),
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails?.medium?.url,
          durationSeconds: durationSeconds,
        };
      })
      .filter((video: any) => video.durationSeconds >= minDurationSeconds)
      .slice(0, maxResults)
      .map(({ durationSeconds, ...video }: any) => video);

    return videos;
  } catch (error) {
    console.error('YouTube search error:', error);
    throw error;
  }
}

/**
 * Get video recommendations based on topic
 * Automatically filters out shorts (< 7 minutes)
 */
export async function getVideoRecommendations(
  topic: string,
  options?: {
    maxResults?: number;
    minDurationMinutes?: number;
  }
): Promise<YouTubeVideo[]> {
  const searchQuery = `${topic} educational tutorial`;
  return searchYouTubeVideos(
    searchQuery,
    options?.maxResults || 5,
    options?.minDurationMinutes || 7
  );
}

/**
 * Get video details
 */
export async function getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
  try {
    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key is not configured');
    }

    const response = await fetch(
      `${YOUTUBE_API_BASE_URL}/videos?` +
        new URLSearchParams({
          key: YOUTUBE_API_KEY,
          id: videoId,
          part: 'snippet,contentDetails,statistics',
        })
    );

    if (!response.ok) {
      throw new Error('Failed to fetch video details');
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    const durationSeconds = durationToSeconds(item.contentDetails.duration);

    // Only return if video is longer than 7 minutes
    if (durationSeconds < 7 * 60) {
      console.warn('Video is a short (less than 7 minutes)');
      return null;
    }

    return {
      id: item.id,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      video_id: item.id,
      duration: parseDuration(item.contentDetails.duration),
      engagement_score: calculateEngagementScore(
        parseInt(item.statistics.viewCount || '0'),
        parseInt(item.statistics.likeCount || '0'),
        parseInt(item.statistics.commentCount || '0')
      ),
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.medium?.url,
    };
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
}

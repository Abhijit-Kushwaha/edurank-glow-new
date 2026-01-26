export interface YouTubeVideo {
  video_id: string;
  title: string;
  channel: string;
  duration: string;
  view_count: number;
  engagement_score: number;
  thumbnail_url: string;
  description: string;
}

export async function searchYouTubeVideos(query: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
  const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  if (!API_KEY) {
    console.error('YouTube API key not found');
    return [];
  }

  try {
    // First, search for videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${API_KEY}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    // Get video IDs
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    // Get detailed video info including statistics
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${API_KEY}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (!detailsData.items) {
      return [];
    }

    // Process and return videos
    return detailsData.items.map((video: any) => {
      const stats = video.statistics;
      const likes = parseInt(stats.likeCount || '0');
      const comments = parseInt(stats.commentCount || '0');
      const views = parseInt(stats.viewCount || '0');

      // Calculate engagement score (simple formula)
      const engagementScore = views > 0 ? Math.min(100, Math.round(((likes + comments) / views) * 1000)) : 0;

      // Parse duration (ISO 8601)
      const duration = parseDuration(video.contentDetails.duration);

      return {
        video_id: video.id,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        duration: duration,
        view_count: views,
        engagement_score: engagementScore,
        thumbnail_url: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url || '',
        description: video.snippet.description || '',
      };
    });
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    return [];
  }
}

function parseDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
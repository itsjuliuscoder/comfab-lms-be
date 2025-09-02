// YouTube utility functions

/**
 * Extract YouTube video ID from various YouTube URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - YouTube video ID or null if invalid
 */
export const extractYouTubeVideoId = (url) => {
  if (!url) return null;

  const patterns = [
    // youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    // youtube.com/v/VIDEO_ID
    /youtube\.com\/v\/([^&\n?#]+)/,
    // youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

/**
 * Validate if a string is a valid YouTube video ID
 * @param {string} videoId - YouTube video ID
 * @returns {boolean} - True if valid
 */
export const isValidYouTubeVideoId = (videoId) => {
  if (!videoId || typeof videoId !== 'string') return false;
  
  // YouTube video IDs are typically 11 characters long
  // and contain alphanumeric characters, hyphens, and underscores
  const youtubeIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  return youtubeIdPattern.test(videoId);
};

/**
 * Generate YouTube embed URL from video ID
 * @param {string} videoId - YouTube video ID
 * @param {Object} options - Embed options
 * @returns {string} - YouTube embed URL
 */
export const generateYouTubeEmbedUrl = (videoId, options = {}) => {
  if (!isValidYouTubeVideoId(videoId)) {
    throw new Error('Invalid YouTube video ID');
  }

  const {
    autoplay = 0,
    controls = 1,
    modestbranding = 1,
    rel = 0,
    showinfo = 0,
    width = 560,
    height = 315,
  } = options;

  const params = new URLSearchParams({
    autoplay,
    controls,
    modestbranding,
    rel,
    showinfo,
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

/**
 * Generate YouTube thumbnail URL from video ID
 * @param {string} videoId - YouTube video ID
 * @param {string} quality - Thumbnail quality (default, hq, mq, sd, maxres)
 * @returns {string} - YouTube thumbnail URL
 */
export const generateYouTubeThumbnailUrl = (videoId, quality = 'default') => {
  if (!isValidYouTubeVideoId(videoId)) {
    throw new Error('Invalid YouTube video ID');
  }

  const qualities = {
    default: 'default.jpg',
    hq: 'hqdefault.jpg',
    mq: 'mqdefault.jpg',
    sd: 'sddefault.jpg',
    maxres: 'maxresdefault.jpg',
  };

  const filename = qualities[quality] || qualities.default;
  return `https://img.youtube.com/vi/${videoId}/${filename}`;
};

/**
 * Get video information from YouTube video ID
 * Note: This would require YouTube Data API in a real implementation
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} - Video information
 */
export const getYouTubeVideoInfo = async (videoId) => {
  if (!isValidYouTubeVideoId(videoId)) {
    throw new Error('Invalid YouTube video ID');
  }

  // In a real implementation, you would use YouTube Data API
  // For now, we'll return basic structure
  return {
    id: videoId,
    title: 'Video Title',
    description: 'Video Description',
    duration: 'PT10M30S', // ISO 8601 duration
    thumbnail: generateYouTubeThumbnailUrl(videoId),
    embedUrl: generateYouTubeEmbedUrl(videoId),
  };
};

/**
 * Validate YouTube URL and extract video ID
 * @param {string} url - YouTube URL
 * @returns {Object} - Validation result with video ID
 */
export const validateYouTubeUrl = (url) => {
  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    return {
      isValid: false,
      videoId: null,
      error: 'Invalid YouTube URL format',
    };
  }

  if (!isValidYouTubeVideoId(videoId)) {
    return {
      isValid: false,
      videoId: null,
      error: 'Invalid YouTube video ID',
    };
  }

  return {
    isValid: true,
    videoId,
    error: null,
  };
};

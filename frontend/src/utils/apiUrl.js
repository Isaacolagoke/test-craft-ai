/**
 * Utility to get the base API URL that works in both development and production
 */
export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

/**
 * Get a full API endpoint URL
 * @param {string} path - The API path (should start with '/')
 * @returns {string} The full API URL
 */
export const getApiUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  // Make sure we don't have double slashes
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${formattedPath}`;
};

/**
 * Handles image URLs that may be relative or absolute
 * @param {string} imageUrl - The image URL which might be just a path
 * @returns {string} The full image URL
 */
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  // If it's already a full URL, return it as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Make sure the path starts with a slash
  const formattedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${getApiBaseUrl()}${formattedPath}`;
};

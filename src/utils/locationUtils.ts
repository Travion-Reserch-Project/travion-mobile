/**
 * Location Utilities
 * Utility functions for calculating distance and similarity scores
 */

/**
 * Calculate the great-circle distance between two points on Earth using Haversine formula.
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers
 */
export const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const EARTH_RADIUS_KM = 6371.0;

  // Convert to radians
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLng = ((lng2 - lng1) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

/**
 * Calculate cosine similarity between two vectors.
 * Used to compare user preferences with location preference scores.
 * @param vecA - First vector (user preferences)
 * @param vecB - Second vector (location preferences)
 * @returns Similarity score between 0 and 1
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // Avoid division by zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  // Calculate cosine similarity and clamp to [0, 1]
  const similarity = dotProduct / (magnitudeA * magnitudeB);
  return Math.max(0, Math.min(1, similarity));
};

/**
 * Calculate match score between user preferences and location preferences.
 * @param userPreferences - User's travel preferences {history, adventure, nature, relaxation}
 * @param locationPreferences - Location's preference scores {history, adventure, nature, relaxation}
 * @returns Match score between 0 and 1
 */
export const calculateMatchScore = (
  userPreferences: { history: number; adventure: number; nature: number; relaxation: number },
  locationPreferences: { history: number; adventure: number; nature: number; relaxation: number }
): number => {
  const userVec = [
    userPreferences.history,
    userPreferences.adventure,
    userPreferences.nature,
    userPreferences.relaxation,
  ];
  const locationVec = [
    locationPreferences.history,
    locationPreferences.adventure,
    locationPreferences.nature,
    locationPreferences.relaxation,
  ];

  return cosineSimilarity(userVec, locationVec);
};

/**
 * Location and travel preference calculation utilities
 */

import type { TravelPreferenceScores } from '@types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate match score between user preferences and location preferences
 * @param userPreferences User's travel preference scores
 * @param locationPreferences Location's preference scores
 * @returns Match score between 0 and 1
 */
export const calculateMatchScore = (
  userPreferences: TravelPreferenceScores | Record<string, number>,
  locationPreferences: Record<string, number>,
): number => {
  const userPrefs = userPreferences as Record<string, number>;

  // Get common keys between user and location preferences
  const commonKeys = Object.keys(userPrefs).filter(key => key in locationPreferences);

  if (commonKeys.length === 0) {
    return 0;
  }

  // Calculate weighted match score
  let totalScore = 0;
  let totalWeight = 0;

  commonKeys.forEach(key => {
    const userScore = userPrefs[key] ?? 0;
    const locationScore = locationPreferences[key] ?? 0;

    // Similarity is measured as 1 - absolute difference (normalized)
    const similarity = 1 - Math.abs(userScore - locationScore);
    totalScore += similarity * userScore;
    totalWeight += userScore;
  });

  // Return normalized score or default to average similarity
  if (totalWeight === 0) {
    return (
      commonKeys.reduce((sum, key) => {
        const userScore = userPrefs[key] ?? 0;
        const locationScore = locationPreferences[key] ?? 0;
        return sum + (1 - Math.abs(userScore - locationScore));
      }, 0) / commonKeys.length
    );
  }

  return totalScore / totalWeight;
};

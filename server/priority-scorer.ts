/**
 * Priority Scoring Algorithm for Multi-Business Competition
 * 
 * Calculates priority score when multiple businesses compete for the same candidate.
 * Formula: Priority Score = (Fit Score × 40%) + (Budget Score × 30%) + (Preference Score × 30%)
 * 
 * Output: Integer 0-100 representing overall priority
 */

export interface PriorityScoreInput {
  fitScore: number; // Candidate's fit score for this milestone (0-100)
  offerBudget: number; // Budget offered by business (in dollars)
  candidatePreference?: number; // Candidate's rating of this opportunity (1-5 stars)
  maxBudget?: number; // Maximum budget across all competing offers (for normalization)
}

export interface PriorityScoreResult {
  priorityScore: number; // Final priority score (0-100)
  breakdown: {
    fitContribution: number; // Contribution from fit score
    budgetContribution: number; // Contribution from budget
    preferenceContribution: number; // Contribution from candidate preference
  };
}

/**
 * Calculate priority score for a business interest
 * 
 * @param input - Scoring input parameters
 * @returns Priority score with breakdown
 */
export function calculatePriorityScore(input: PriorityScoreInput): PriorityScoreResult {
  const { fitScore, offerBudget, candidatePreference, maxBudget } = input;
  
  // Normalize fit score (already 0-100, just ensure it's valid)
  const normalizedFit = Math.max(0, Math.min(100, fitScore));
  
  // Normalize budget to 0-100 scale
  // If maxBudget provided, use it for normalization
  // Otherwise assume current offer is the max (100)
  const normalizedBudget = maxBudget && maxBudget > 0
    ? Math.min(100, (offerBudget / maxBudget) * 100)
    : Math.min(100, offerBudget > 0 ? 100 : 0);
  
  // Normalize candidate preference (1-5 stars) to 0-100 scale
  // Default to 50 (neutral) if not provided
  const normalizedPreference = candidatePreference 
    ? ((candidatePreference - 1) / 4) * 100 // Convert 1-5 to 0-100
    : 50; // Default neutral if candidate hasn't rated yet
  
  // Calculate weighted contributions
  const fitContribution = normalizedFit * 0.4; // 40% weight
  const budgetContribution = normalizedBudget * 0.3; // 30% weight
  const preferenceContribution = normalizedPreference * 0.3; // 30% weight
  
  // Calculate final priority score
  const priorityScore = Math.round(
    fitContribution + budgetContribution + preferenceContribution
  );
  
  return {
    priorityScore: Math.max(0, Math.min(100, priorityScore)),
    breakdown: {
      fitContribution: Math.round(fitContribution),
      budgetContribution: Math.round(budgetContribution),
      preferenceContribution: Math.round(preferenceContribution),
    },
  };
}

/**
 * Calculate priority scores for multiple competing business interests
 * Automatically finds max budget across all offers for normalization
 * 
 * @param interests - Array of business interests to score
 * @returns Array of scored interests with priority scores
 */
export function calculateCompetingPriorityScores(
  interests: Array<{
    id: string;
    fitScore: number;
    offerBudget: number;
    candidatePreference?: number;
  }>
): Array<{
  id: string;
  priorityScore: number;
  breakdown: PriorityScoreResult['breakdown'];
}> {
  // Find max budget across all competing offers
  const maxBudget = Math.max(...interests.map(i => i.offerBudget || 0));
  
  return interests.map(interest => {
    const result = calculatePriorityScore({
      fitScore: interest.fitScore,
      offerBudget: interest.offerBudget,
      candidatePreference: interest.candidatePreference,
      maxBudget,
    });
    
    return {
      id: interest.id,
      priorityScore: result.priorityScore,
      breakdown: result.breakdown,
    };
  });
}

/**
 * Get top N competing offers for a candidate, sorted by priority score
 * 
 * @param interests - Array of business interests
 * @param topN - Number of top offers to return (default: 3)
 * @returns Top N offers sorted by priority score (highest first)
 */
export function getTopCompetingOffers<T extends { priorityScore: number }>(
  interests: T[],
  topN: number = 3
): T[] {
  return interests
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, topN);
}

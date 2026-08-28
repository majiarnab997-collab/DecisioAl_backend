import { calculateDeterministicScores } from './scoringService.js';

/**
 * What-If & Sensitivity Analysis Engine for DecisioAI
 */

/**
 * Re-calculate decision scores under a custom user-defined weight configuration
 * @param {Object} decision - Base decision document
 * @param {Object} customWeights - Object mapping criterion.id -> new weight percentage
 */
export function simulateWhatIf(decision, customWeights) {
  const updatedCriteria = decision.criteria.map((c) => ({
    ...c.toObject ? c.toObject() : c,
    weight: customWeights[c.id] !== undefined ? Number(customWeights[c.id]) : c.weight,
  }));

  const { calculatedScores: newScores, ranking: newRanking } = calculateDeterministicScores(
    decision.alternatives,
    updatedCriteria
  );

  // Compare against base ranking to highlight changes
  const baseRankingMap = {};
  (decision.ranking || []).forEach((r) => {
    baseRankingMap[r.alternativeId] = r.rank;
  });

  const comparison = newRanking.map((item) => {
    const previousRank = baseRankingMap[item.alternativeId] || item.rank;
    const rankChange = previousRank - item.rank; // positive means moved up, negative means dropped
    return {
      ...item,
      previousRank,
      rankChange,
    };
  });

  const baseLeaderId = decision.ranking?.[0]?.alternativeId;
  const newLeaderId = newRanking[0]?.alternativeId;
  const leaderChanged = baseLeaderId !== newLeaderId;

  return {
    calculatedScores: newScores,
    ranking: comparison,
    leaderChanged,
    newLeader: newRanking[0],
    previousLeader: decision.ranking?.[0],
  };
}

/**
 * Computes Decision Stability Index by testing weight perturbations
 * across all criteria dimensions.
 */
export function computeDecisionStability(decision) {
  if (!decision.alternatives || decision.alternatives.length < 2 || !decision.criteria || decision.criteria.length === 0) {
    return {
      stabilityScore: 100,
      sensitivityAnalysis: 'Single alternative or no criteria available.',
      dominantCriterion: 'None',
      flipThresholds: [],
    };
  }

  const baseLeaderId = decision.ranking?.[0]?.alternativeId;
  const baseLeaderName = decision.ranking?.[0]?.alternativeName || 'Current leader';

  let stableCount = 0;
  let totalSimulations = 0;
  const flipThresholds = [];

  // Simulate ±10%, ±20%, ±30% shifts for each criterion
  const shifts = [-20, -10, 10, 20, 30];

  decision.criteria.forEach((crit) => {
    shifts.forEach((delta) => {
      totalSimulations++;
      const baseWeight = crit.weight;
      const newWeight = Math.max(1, Math.min(95, baseWeight + delta));
      const remainingWeight = 100 - newWeight;
      const otherCriteria = decision.criteria.filter((c) => c.id !== crit.id);
      const otherTotalWeight = otherCriteria.reduce((sum, c) => sum + c.weight, 0) || 1;

      const simCriteria = decision.criteria.map((c) => {
        if (c.id === crit.id) {
          return { ...c.toObject ? c.toObject() : c, weight: newWeight };
        } else {
          const proportional = (c.weight / otherTotalWeight) * remainingWeight;
          return { ...c.toObject ? c.toObject() : c, weight: proportional };
        }
      });

      const { ranking } = calculateDeterministicScores(decision.alternatives, simCriteria);
      if (ranking[0]?.alternativeId === baseLeaderId) {
        stableCount++;
      } else {
        const existingFlip = flipThresholds.find((f) => f.criterionId === crit.id);
        if (!existingFlip) {
          flipThresholds.push({
            criterionId: crit.id,
            criterionName: crit.name,
            weightTested: newWeight,
            newLeader: ranking[0]?.alternativeName,
          });
        }
      }
    });
  });

  const stabilityScore = Math.round((stableCount / (totalSimulations || 1)) * 100);

  // Find dominant criterion (highest original weight)
  const sortedCriteria = [...decision.criteria].sort((a, b) => b.weight - a.weight);
  const dominantCriterion = sortedCriteria[0]?.name || 'Balanced';

  let sensitivityAnalysis = '';
  if (stabilityScore >= 80) {
    sensitivityAnalysis = `High decision stability (${stabilityScore}%). ${baseLeaderName} remains the top-performing alternative across the majority of sensitivity stress tests.`;
  } else if (stabilityScore >= 50) {
    sensitivityAnalysis = `Moderate decision stability (${stabilityScore}%). Ranking is sensitive to priority shifts, especially if weights for "${dominantCriterion}" or secondary criteria fluctuate.`;
  } else {
    sensitivityAnalysis = `Low decision stability (${stabilityScore}%). Multiple close competitors exist. Moderate weight adjustments will readily flip the optimal choice.`;
  }

  return {
    stabilityScore,
    sensitivityAnalysis,
    dominantCriterion,
    flipThresholds,
  };
}

export default {
  simulateWhatIf,
  computeDecisionStability,
};

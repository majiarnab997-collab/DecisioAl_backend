/**
 * Deterministic Scoring Engine for DecisioAI
 *
 * Implements Multi-Criteria Decision Analysis (Simple Additive Weighting - SAW)
 * with robust min-max normalization and edge case safety.
 *
 * Mathematical Formulation:
 * -------------------------------------------------------------
 * 1. For "Higher is Better" Criteria:
 *    normalized = (value - min) / (max - min)
 *
 * 2. For "Lower is Better" Criteria:
 *    normalized = (max - value) / (max - min)
 *
 * 3. Edge Case (max === min):
 *    normalized = 1.0 (neutral full score, so equal values receive equal credit)
 *
 * 4. Weighted Score per Criterion:
 *    weightedScore = normalized * (criterionWeight / 100) * 100
 *
 * 5. Overall Score:
 *    overallScore = sum(weightedScore_i)
 * -------------------------------------------------------------
 */

export function calculateDeterministicScores(alternatives, criteria) {
  if (!alternatives || alternatives.length === 0 || !criteria || criteria.length === 0) {
    return { calculatedScores: [], ranking: [] };
  }

  // Step 1: Calculate min and max for each criterion
  const minMaxMap = {};
  criteria.forEach((criterion) => {
    const values = alternatives.map((alt) => {
      let v;
      if (alt.values instanceof Map) {
        v = alt.values.get(criterion.id);
      } else if (alt.values && typeof alt.values === 'object') {
        v = alt.values[criterion.id];
      }
      return typeof v === 'number' && !isNaN(v) ? v : 0;
    });

    minMaxMap[criterion.id] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });

  // Step 2: Compute normalized and weighted scores for each alternative
  const calculatedScores = alternatives.map((alt) => {
    const rawValues = {};
    const normalizedScores = {};
    const weightedScores = {};
    let overallScore = 0;

    criteria.forEach((criterion) => {
      let rawVal;
      if (alt.values instanceof Map) {
        rawVal = alt.values.get(criterion.id);
      } else if (alt.values && typeof alt.values === 'object') {
        rawVal = alt.values[criterion.id];
      }
      const val = typeof rawVal === 'number' && !isNaN(rawVal) ? rawVal : 0;
      rawValues[criterion.id] = val;

      const { min, max } = minMaxMap[criterion.id];
      let normalized = 1.0;

      if (max !== min) {
        if (criterion.direction === 'lower') {
          normalized = (max - val) / (max - min);
        } else {
          normalized = (val - min) / (max - min);
        }
      }

      // Clamp normalized value between 0 and 1
      normalized = Math.max(0, Math.min(1, normalized));

      const normalized100 = Number((normalized * 100).toFixed(2));
      const wScore = normalized * (criterion.weight / 100) * 100;

      normalizedScores[criterion.id] = normalized100;
      weightedScores[criterion.id] = Number(wScore.toFixed(2));
      overallScore += wScore;
    });

    return {
      alternativeId: alt.id,
      alternativeName: alt.name,
      rawValues,
      normalizedScores,
      weightedScores,
      overallScore: Number(overallScore.toFixed(2)),
      rank: 0,
      differenceFromTop: 0,
    };
  });

  // Step 3: Sort descending by overallScore
  calculatedScores.sort((a, b) => b.overallScore - a.overallScore);

  // Step 4: Assign rank and difference from top option
  const topScore = calculatedScores[0]?.overallScore || 0;
  calculatedScores.forEach((item, index) => {
    item.rank = index + 1;
    item.differenceFromTop = Number((topScore - item.overallScore).toFixed(2));
  });

  // Step 5: Format ranking summary
  const ranking = calculatedScores.map((item) => ({
    rank: item.rank,
    alternativeId: item.alternativeId,
    alternativeName: item.alternativeName,
    score: item.overallScore,
  }));

  return { calculatedScores, ranking };
}

export default calculateDeterministicScores;

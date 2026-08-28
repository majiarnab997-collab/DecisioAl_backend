/**
 * Risk Engine for DecisioAI
 *
 * Automatically detects mathematical risks, trade-off exposures,
 * and sensitivity fragilities based on actual decision matrix data.
 */

export function analyzeDecisionRisks(decisionData) {
  const { alternatives, criteria, calculatedScores, ranking } = decisionData;
  const risks = [];

  if (!calculatedScores || calculatedScores.length === 0 || !criteria) {
    return risks;
  }

  const topOption = calculatedScores[0];
  const secondOption = calculatedScores[1];

  // 1. Close Margin / Recommendation Fragility Risk
  if (topOption && secondOption) {
    const margin = Math.abs(topOption.overallScore - secondOption.overallScore);
    if (margin < 3.0) {
      risks.push({
        name: 'Narrow Score Margin (High Fragility)',
        severity: 'High',
        explanation: `The difference between #1 (${topOption.alternativeName}) and #2 (${secondOption.alternativeName}) is only ${margin.toFixed(1)} points. Slight adjustments in criterion weights can easily invert the ranking.`,
        criterion: 'Overall Ranking',
        alternativeName: `${topOption.alternativeName} vs ${secondOption.alternativeName}`,
      });
    } else if (margin < 6.0) {
      risks.push({
        name: 'Moderate Competitive Proximity',
        severity: 'Medium',
        explanation: `A competitive margin of ${margin.toFixed(1)} points separates the top two alternatives, suggesting high sensitivity to user priority shifts.`,
        criterion: 'Overall Ranking',
        alternativeName: `${topOption.alternativeName} vs ${secondOption.alternativeName}`,
      });
    }
  }

  // 2. Critical Criterion Deficit (Low score in high weight criterion)
  criteria.forEach((criterion) => {
    if (criterion.weight >= 15) {
      calculatedScores.forEach((altScore) => {
        const norm = altScore.normalizedScores?.[criterion.id] ?? 100;
        if (norm < 40) {
          const isTop = altScore.rank === 1;
          risks.push({
            name: `Weak Performance in High-Weight Criterion (${criterion.name})`,
            severity: isTop ? 'Critical' : 'High',
            explanation: `${altScore.alternativeName} scored only ${norm.toFixed(0)}% in "${criterion.name}" (which carries ${criterion.weight}% of the decision weight).${isTop ? ' This creates a vulnerability for the leading alternative.' : ''}`,
            criterion: criterion.name,
            alternativeId: altScore.alternativeId,
            alternativeName: altScore.alternativeName,
          });
        }
      });
    }
  });

  // 3. High Cost / Extreme Penalty Exposure (Lower is better criteria)
  const lowerCriteria = criteria.filter((c) => c.direction === 'lower');
  lowerCriteria.forEach((criterion) => {
    calculatedScores.forEach((altScore) => {
      const norm = altScore.normalizedScores?.[criterion.id] ?? 100;
      if (norm <= 15) {
        risks.push({
          name: `Severe Expense / Negative Factor Exposure (${criterion.name})`,
          severity: 'High',
          explanation: `${altScore.alternativeName} has an unfavorable value for "${criterion.name}" (${altScore.rawValues?.[criterion.id]}), ranking among the highest penalties in the comparison set.`,
          criterion: criterion.name,
          alternativeId: altScore.alternativeId,
          alternativeName: altScore.alternativeName,
        });
      }
    });
  });

  // 4. Single-Criterion Dominance
  calculatedScores.forEach((altScore) => {
    criteria.forEach((criterion) => {
      const weightedContribution = altScore.weightedScores?.[criterion.id] || 0;
      const contributionRatio = (weightedContribution / (altScore.overallScore || 1)) * 100;
      if (contributionRatio > 40 && criteria.length >= 3) {
        risks.push({
          name: `Over-Reliance on Single Factor (${criterion.name})`,
          severity: 'Medium',
          explanation: `${altScore.alternativeName} derives ${contributionRatio.toFixed(0)}% of its entire overall score from "${criterion.name}". If priorities shift away from this factor, its standing will decline sharply.`,
          criterion: criterion.name,
          alternativeId: altScore.alternativeId,
          alternativeName: altScore.alternativeName,
        });
      }
    });
  });

  // 5. Polarizing Performance Risk (High variance across criteria)
  calculatedScores.forEach((altScore) => {
    const norms = Object.values(altScore.normalizedScores || {});
    if (norms.length >= 3) {
      const minNorm = Math.min(...norms);
      const maxNorm = Math.max(...norms);
      if (maxNorm - minNorm > 70) {
        risks.push({
          name: `High Attribute Variance (Polarized Profile)`,
          severity: 'Low',
          explanation: `${altScore.alternativeName} exhibits extreme variance across criteria (ranging from ${minNorm.toFixed(0)}% to ${maxNorm.toFixed(0)}%), representing an unbalanced specialist rather than a well-rounded option.`,
          criterion: 'Attribute Distribution',
          alternativeId: altScore.alternativeId,
          alternativeName: altScore.alternativeName,
        });
      }
    }
  });

  return risks;
}

export default analyzeDecisionRisks;

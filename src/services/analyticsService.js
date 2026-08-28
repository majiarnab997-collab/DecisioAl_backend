import Decision from '../../../database/models/Decision.js';

/**
 * Analytics Aggregation Service for DecisioAI
 * Computes user-isolated metrics and decision intelligence statistics.
 */

export async function getUserAnalytics(userId) {
  const decisions = await Decision.find({ userId }).sort({ createdAt: -1 });

  const totalDecisions = decisions.length;
  const analyzedDecisions = decisions.filter((d) => d.status === 'analyzed' || (d.aiRecommendation && d.aiRecommendation.recommendedOption));
  const completedAnalyses = analyzedDecisions.length;

  let totalTopScores = 0;
  let totalConfidence = 0;
  const categoryCounts = {};
  const recommendationCounts = {};
  const monthMap = {};

  decisions.forEach((d) => {
    // Category distribution
    const cat = d.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    // Top score
    const topScore = d.ranking?.[0]?.score || (d.calculatedScores?.[0]?.overallScore || 0);
    if (topScore > 0) {
      totalTopScores += topScore;
    }

    // AI Confidence
    const conf = d.aiRecommendation?.confidence || d.confidence || 0;
    if (conf > 0) {
      totalConfidence += conf;
    }

    // Top recommendation
    const rec = d.aiRecommendation?.recommendedOption || d.ranking?.[0]?.alternativeName;
    if (rec) {
      recommendationCounts[rec] = (recommendationCounts[rec] || 0) + 1;
    }

    // Timeline distribution (Month Year)
    const date = new Date(d.createdAt);
    const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    monthMap[monthKey] = (monthMap[monthKey] || 0) + 1;
  });

  const averageScore = totalDecisions > 0 ? Number((totalTopScores / totalDecisions).toFixed(1)) : 0;
  const averageConfidence = completedAnalyses > 0 ? Number((totalConfidence / completedAnalyses).toFixed(1)) : 0;

  // Format category distribution for charts
  const categoryDistribution = Object.keys(categoryCounts).map((key) => ({
    name: key,
    count: categoryCounts[key],
    percentage: Number(((categoryCounts[key] / (totalDecisions || 1)) * 100).toFixed(1)),
  }));

  // Format decisions over time
  const decisionsOverTime = Object.keys(monthMap).map((key) => ({
    period: key,
    decisions: monthMap[key],
  }));

  // If no time data, provide sample baseline so chart renders cleanly
  if (decisionsOverTime.length === 0) {
    const currentMonth = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
    decisionsOverTime.push({ period: currentMonth, decisions: totalDecisions });
  }

  // Top recommendations breakdown
  const mostSelectedRecommendations = Object.keys(recommendationCounts)
    .map((name) => ({ name, count: recommendationCounts[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalDecisions,
    completedAnalyses,
    averageScore,
    averageConfidence,
    categoryDistribution,
    decisionsOverTime,
    mostSelectedRecommendations,
    recentDecisions: decisions.slice(0, 5).map((d) => ({
      id: d._id,
      title: d.title,
      category: d.category,
      status: d.status,
      recommendedOption: d.aiRecommendation?.recommendedOption || d.ranking?.[0]?.alternativeName || 'Pending',
      score: d.ranking?.[0]?.score || 0,
      confidence: d.aiRecommendation?.confidence || d.confidence || 0,
      createdAt: d.createdAt,
    })),
  };
}

export default {
  getUserAnalytics,
};

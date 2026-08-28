import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

/**
 * AI Decision Intelligence Analyst Service
 * Powered by Google Gemini API using the modern @google/genai SDK
 */

/**
 * Format structured prompt for Gemini
 */
function buildAnalysisPrompt(decisionData) {
  const { title, description, category, objective, alternatives, criteria, calculatedScores, ranking, riskAnalysis, decisionStability } = decisionData;

  const topOption = ranking?.[0];
  const secondOption = ranking?.[1];

  const criteriaSummary = criteria
    .map((c) => `- ${c.name} (Weight: ${c.weight}%, Direction: ${c.direction === 'lower' ? 'Lower is Better' : 'Higher is Better'}${c.description ? ` - ${c.description}` : ''})`)
    .join('\n');

  const scoresSummary = calculatedScores
    .map((s) => {
      const breakdown = criteria
        .map((c) => `${c.name}: raw=${s.rawValues?.[c.id]}, normalized=${s.normalizedScores?.[c.id]}%, weighted=${s.weightedScores?.[c.id]}`)
        .join('; ');
      return `Rank #${s.rank}: ${s.alternativeName} | Overall Score: ${s.overallScore}/100 | Difference from Top: ${s.differenceFromTop} pts\n  Criteria Breakdown: ${breakdown}`;
    })
    .join('\n\n');

  const risksSummary = (riskAnalysis && riskAnalysis.length > 0)
    ? riskAnalysis.map((r) => `- [${r.severity}] ${r.name}: ${r.explanation} (Target: ${r.alternativeName || 'All'})`).join('\n')
    : 'No severe automated risks detected.';

  const stabilitySummary = decisionStability
    ? `Stability Score: ${decisionStability.stabilityScore}% | Dominant Criterion: ${decisionStability.dominantCriterion}\nAnalysis: ${decisionStability.sensitivityAnalysis}`
    : 'Stability not pre-computed.';

  return `
You are the "DecisioAI Decision Intelligence Analyst" — an expert decision science advisor and executive consultant.
Your role is to interpret the deterministic mathematical results of a multi-criteria decision model, explain WHY the top option won, identify critical trade-offs, evaluate risks, and provide actionable decision intelligence.

CRITICAL INSTRUCTIONS:
1. Do NOT invent or hallucinate metrics or facts that contradict the structured data below.
2. The mathematical scoring engine has ALREADY calculated the deterministic scores and ranking. Respect the mathematical ranking.
3. Clearly distinguish deterministic scores from your qualitative reasoning.
4. If data is sparse, state: "The available data is insufficient for a high-confidence recommendation."
5. Output ONLY valid JSON in the exact schema specified below.

=== DECISION CONTEXT ===
Title: ${title}
Category: ${category}
Objective: ${objective}
Description: ${description || 'N/A'}

=== CRITERIA & WEIGHTS ===
${criteriaSummary}

=== DETERMINISTIC SCORING & RANKING ===
${scoresSummary}

=== DETECTED RISKS ===
${risksSummary}

=== DECISION STABILITY & SENSITIVITY ===
${stabilitySummary}

=== REQUIRED OUTPUT JSON FORMAT ===
{
  "recommendedOption": "${topOption?.alternativeName || ''}",
  "summary": "2-3 sentence executive synthesis explaining why this alternative is mathematically optimal and what the primary trade-off is.",
  "reasoning": [
    "Specific analytical point referencing criteria weights and scores",
    "Comparative advantage over the runner-up (${secondOption?.alternativeName || 'alternatives'})",
    "Evidence-backed explanation of value delivery"
  ],
  "strengths": [
    "Key strength 1 of the recommended option with score backing",
    "Key strength 2",
    "Key strength 3"
  ],
  "weaknesses": [
    "Key weakness or concession of the recommended option",
    "Secondary weakness"
  ],
  "risks": [
    "Primary risk exposure identified from the risk matrix",
    "Implementation or external contingency risk"
  ],
  "tradeoffs": [
    "Explicit trade-off statement: Choosing X means sacrificing Y in favor of Z",
    "Secondary trade-off comparison with the closest competitor"
  ],
  "confidence": 88,
  "keyFactors": [
    "Most influential criterion 1",
    "Most influential criterion 2",
    "Most influential criterion 3"
  ],
  "alternativeConsideration": "Under what specific condition would the #2 alternative (${secondOption?.alternativeName || 'the runner-up'}) become the better choice?",
  "whatCouldChangeTheDecision": [
    "Scenario or parameter change that would alter the ranking",
    "Sensitivity shift condition"
  ]
}
`;
}

/**
 * Generate fallback AI recommendation when API key is missing or offline
 */
function generateFallbackRecommendation(decisionData) {
  const { ranking, calculatedScores, criteria, riskAnalysis, decisionStability } = decisionData;
  const top = ranking?.[0];
  const second = ranking?.[1];

  const topScores = calculatedScores?.find((s) => s.alternativeId === top?.alternativeId);
  const secondScores = calculatedScores?.find((s) => s.alternativeId === second?.alternativeId);

  // Find top contributing criteria
  const sortedCriteria = [...(criteria || [])].sort((a, b) => b.weight - a.weight);
  const topCriterion = sortedCriteria[0];
  const secondCriterion = sortedCriteria[1];

  return {
    recommendedOption: top?.alternativeName || 'Top Alternative',
    summary: `${top?.alternativeName || 'The leading alternative'} emerges as the highest-scoring option with an overall score of ${top?.score || 0}/100, driven by strong alignment with your highest-weighted priorities (${topCriterion?.name || 'primary factors'}).`,
    reasoning: [
      `Deterministic scoring ranks ${top?.alternativeName} #1 with ${top?.score}/100, outperforming ${second?.alternativeName || 'the next alternative'} by ${((top?.score || 0) - (second?.score || 0)).toFixed(1)} points.`,
      `Demonstrates superior utility in "${topCriterion?.name || 'key criteria'}" (Weight: ${topCriterion?.weight || 0}%), creating a resilient advantage across the evaluated dimensions.`,
      second ? `While ${second.alternativeName} scored well (${second.score}/100), it suffers relative deficits in high-impact weight categories.` : 'Maintains a decisive lead across overall weighted criteria.',
    ],
    strengths: [
      `Leader in overall weighted utility (${top?.score || 0}/100).`,
      `Strong performance in ${topCriterion?.name || 'core priorities'}.`,
      `Favorable risk profile in deterministic sensitivity tests.`,
    ],
    weaknesses: [
      `May require compromise in lower-weighted criteria where competitors scored higher.`,
      `Sensitive to major weight shifts if secondary priorities become dominant.`,
    ],
    risks: riskAnalysis?.map((r) => r.explanation).slice(0, 3) || [
      'Score margin sensitivity under extreme weight reallocation.',
    ],
    tradeoffs: [
      `Selecting ${top?.alternativeName} maximizes overall balance across ${criteria?.length || 0} criteria rather than specializing solely in a single dimension.`,
      second ? `Trade-off: ${top?.alternativeName} over ${second.alternativeName} prioritizes balanced consistency over niche strengths.` : 'Trade-off between cost efficiency and peak feature quality.',
    ],
    confidence: decisionStability?.stabilityScore ? Math.min(95, Math.max(70, decisionStability.stabilityScore)) : 85,
    keyFactors: sortedCriteria.slice(0, 3).map((c) => `${c.name} (${c.weight}%)`),
    alternativeConsideration: second
      ? `If your priorities shift towards secondary criteria or budget constraints tighten, ${second.alternativeName} becomes the primary viable contender.`
      : 'Review secondary alternatives if constraints change.',
    whatCouldChangeTheDecision: [
      `Increasing the weight of lower-ranked criteria in sensitivity analysis.`,
      `Introduction of new alternative options with superior price-to-performance ratio.`,
    ],
    generatedAt: new Date(),
  };
}

/**
 * Main AI Analysis Execution
 */
export async function analyzeDecisionWithAI(decisionData) {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    console.warn('⚠️ GEMINI_API_KEY is not configured. Utilizing deterministic Decision Intelligence analyst fallback.');
    return generateFallbackRecommendation(decisionData);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildAnalysisPrompt(decisionData);

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '';

    // Clean JSON response if wrapped in markdown code blocks
    let cleanedText = responseText;
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanedText);

    // Validate essential keys
    const result = {
      recommendedOption: parsed.recommendedOption || decisionData.ranking?.[0]?.alternativeName || '',
      summary: parsed.summary || 'AI analysis completed.',
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      tradeoffs: Array.isArray(parsed.tradeoffs) ? parsed.tradeoffs : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 85,
      keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors : [],
      alternativeConsideration: parsed.alternativeConsideration || '',
      whatCouldChangeTheDecision: Array.isArray(parsed.whatCouldChangeTheDecision) ? parsed.whatCouldChangeTheDecision : [],
      generatedAt: new Date(),
    };

    return result;
  } catch (error) {
    console.error('❌ Gemini AI API Error:', error.message);
    console.warn('⚠️ Falling back to deterministic decision intelligence engine.');
    return generateFallbackRecommendation(decisionData);
  }
}

export { generateFallbackRecommendation };

export default {
  analyzeDecisionWithAI,
  generateFallbackRecommendation,
};

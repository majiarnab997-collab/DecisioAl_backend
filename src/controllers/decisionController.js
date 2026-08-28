import Decision from '../../../database/models/Decision.js';
import { createDecisionSchema, updateDecisionSchema, whatIfSchema } from '../validators/decisionValidator.js';
import { calculateDeterministicScores } from '../services/scoringService.js';
import { analyzeDecisionRisks } from '../services/riskService.js';
import { simulateWhatIf, computeDecisionStability } from '../services/whatIfService.js';
import {
  analyzeDecisionWithAI,
  generateFallbackRecommendation,
} from '../services/aiService.js';

/**
 * Helper to verify user ownership of a decision
 */
async function getOwnedDecision(id, userId) {
  const decision = await Decision.findById(id);
  if (!decision) {
    const error = new Error('Decision not found');
    error.statusCode = 404;
    throw error;
  }

  if (decision.userId.toString() !== userId.toString()) {
    const error = new Error('Not authorized to access this decision');
    error.statusCode = 403;
    throw error;
  }

  return decision;
}

/**
 * @desc    Get all decisions for the authenticated user
 * @route   GET /api/decisions
 * @access  Private
 */
export const getDecisions = async (req, res, next) => {
  try {
    const { search, category, sort } = req.query;
    const query = { userId: req.user._id };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { objective: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'score_desc') {
      sortOption = { 'ranking.0.score': -1 };
    } else if (sort === 'score_asc') {
      sortOption = { 'ranking.0.score': 1 };
    } else if (sort === 'title_asc') {
      sortOption = { title: 1 };
    }

    const decisions = await Decision.find(query).sort(sortOption);

    res.status(200).json({
      success: true,
      count: decisions.length,
      data: decisions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single decision by ID
 * @route   GET /api/decisions/:id
 * @access  Private
 */
export const getDecisionById = async (req, res, next) => {
  try {
    const decision = await getOwnedDecision(req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      data: decision,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new decision and calculate initial scores & risks
 * @route   POST /api/decisions
 * @access  Private
 */
export const createDecision = async (req, res, next) => {
  try {
    const validated = createDecisionSchema.parse(req.body);

    // 1. Calculate deterministic scores & ranking
    const { calculatedScores, ranking } = calculateDeterministicScores(
      validated.alternatives,
      validated.criteria
    );

    // 2. Automated risk analysis
    const riskAnalysis = analyzeDecisionRisks({
      alternatives: validated.alternatives,
      criteria: validated.criteria,
      calculatedScores,
      ranking,
    });

    // 3. Initial sensitivity & stability computation
    const decisionStability = computeDecisionStability({
      alternatives: validated.alternatives,
      criteria: validated.criteria,
      ranking,
    });

    // 4. Generate instant explainable intelligence
    const aiRecommendation = generateFallbackRecommendation({
      title: validated.title,
      description: validated.description,
      category: validated.category,
      objective: validated.objective,
      alternatives: validated.alternatives,
      criteria: validated.criteria,
      calculatedScores,
      ranking,
      riskAnalysis,
      decisionStability,
    });

    // 5. Save decision to database
    const decision = await Decision.create({
      userId: req.user._id,
      title: validated.title,
      description: validated.description || '',
      category: validated.category || 'Education',
      objective: validated.objective,
      alternatives: validated.alternatives,
      criteria: validated.criteria,
      calculatedScores,
      ranking,
      riskAnalysis,
      decisionStability,
      aiRecommendation,
      confidence: aiRecommendation.confidence || 88,
      status: 'analyzed',
    });

    res.status(201).json({
      success: true,
      message: 'Decision created and calculated successfully',
      data: decision,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing decision
 * @route   PUT /api/decisions/:id
 * @access  Private
 */
export const updateDecision = async (req, res, next) => {
  try {
    const decision = await getOwnedDecision(req.params.id, req.user._id);
    const validated = updateDecisionSchema.parse(req.body);

    if (validated.title) decision.title = validated.title;
    if (validated.description !== undefined) decision.description = validated.description;
    if (validated.category) decision.category = validated.category;
    if (validated.objective) decision.objective = validated.objective;
    if (validated.alternatives) decision.alternatives = validated.alternatives;
    if (validated.criteria) decision.criteria = validated.criteria;

    // Recalculate deterministic scores and risks
    const { calculatedScores, ranking } = calculateDeterministicScores(
      decision.alternatives,
      decision.criteria
    );

    const riskAnalysis = analyzeDecisionRisks({
      alternatives: decision.alternatives,
      criteria: decision.criteria,
      calculatedScores,
      ranking,
    });

    const decisionStability = computeDecisionStability({
      alternatives: decision.alternatives,
      criteria: decision.criteria,
      ranking,
    });

    decision.calculatedScores = calculatedScores;
    decision.ranking = ranking;
    decision.riskAnalysis = riskAnalysis;
    decision.decisionStability = decisionStability;

    // Invalidate stale AI recommendation on structural edit
    if (validated.alternatives || validated.criteria) {
      decision.status = 'calculated';
    }

    await decision.save();

    res.status(200).json({
      success: true,
      message: 'Decision updated successfully',
      data: decision,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a decision
 * @route   DELETE /api/decisions/:id
 * @access  Private
 */
export const deleteDecision = async (req, res, next) => {
  try {
    const decision = await getOwnedDecision(req.params.id, req.user._id);
    await Decision.deleteOne({ _id: decision._id });

    res.status(200).json({
      success: true,
      message: 'Decision deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Trigger recalculation of scores & risk analysis
 * @route   POST /api/decisions/:id/calculate
 * @access  Private
 */
export const calculateDecision = async (req, res, next) => {
  try {
    const decision = await getOwnedDecision(req.params.id, req.user._id);

    const { calculatedScores, ranking } = calculateDeterministicScores(
      decision.alternatives,
      decision.criteria
    );

    const riskAnalysis = analyzeDecisionRisks({
      alternatives: decision.alternatives,
      criteria: decision.criteria,
      calculatedScores,
      ranking,
    });

    const decisionStability = computeDecisionStability({
      alternatives: decision.alternatives,
      criteria: decision.criteria,
      ranking,
    });

    decision.calculatedScores = calculatedScores;
    decision.ranking = ranking;
    decision.riskAnalysis = riskAnalysis;
    decision.decisionStability = decisionStability;
    decision.status = decision.aiRecommendation?.recommendedOption ? 'analyzed' : 'calculated';

    await decision.save();

    res.status(200).json({
      success: true,
      message: 'Mathematical scoring and risk analysis refreshed',
      data: decision,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Analyze decision with Google Gemini AI
 * @route   POST /api/decisions/:id/analyze
 * @access  Private
 */
export const analyzeDecision = async (req, res, next) => {
  try {
    const decision = await getOwnedDecision(req.params.id, req.user._id);

    // 1. Ensure mathematical scores and risk analysis are up-to-date
    const { calculatedScores, ranking } = calculateDeterministicScores(
      decision.alternatives,
      decision.criteria
    );

    const riskAnalysis = analyzeDecisionRisks({
      alternatives: decision.alternatives,
      criteria: decision.criteria,
      calculatedScores,
      ranking,
    });

    const decisionStability = computeDecisionStability({
      alternatives: decision.alternatives,
      criteria: decision.criteria,
      ranking,
    });

    // 2. Call Gemini AI Decision Intelligence service
    const aiRecommendation = await analyzeDecisionWithAI({
      title: decision.title,
      description: decision.description,
      category: decision.category,
      objective: decision.objective,
      alternatives: decision.alternatives,
      criteria: decision.criteria,
      calculatedScores,
      ranking,
      riskAnalysis,
      decisionStability,
    });

    // 3. Save AI results to decision document
    decision.calculatedScores = calculatedScores;
    decision.ranking = ranking;
    decision.riskAnalysis = riskAnalysis;
    decision.decisionStability = decisionStability;
    decision.aiRecommendation = aiRecommendation;
    decision.confidence = aiRecommendation.confidence || 85;
    decision.status = 'analyzed';

    await decision.save();

    res.status(200).json({
      success: true,
      message: 'AI Decision Analysis generated successfully',
      data: decision,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Run sensitivity What-If analysis on custom weights
 * @route   POST /api/decisions/:id/what-if
 * @access  Private
 */
export const whatIfAnalysis = async (req, res, next) => {
  try {
    const decision = await getOwnedDecision(req.params.id, req.user._id);
    const validated = whatIfSchema.parse(req.body);

    const results = simulateWhatIf(decision, validated.weights);

    // If user requested to persist this custom scenario
    if (req.body.save === true) {
      decision.criteria.forEach((c) => {
        if (validated.weights[c.id] !== undefined) {
          c.weight = validated.weights[c.id];
        }
      });
      decision.calculatedScores = results.calculatedScores;
      decision.ranking = results.ranking.map((r) => ({
        rank: r.rank,
        alternativeId: r.alternativeId,
        alternativeName: r.alternativeName,
        score: r.score,
      }));
      decision.riskAnalysis = analyzeDecisionRisks({
        alternatives: decision.alternatives,
        criteria: decision.criteria,
        calculatedScores: decision.calculatedScores,
        ranking: decision.ranking,
      });
      decision.decisionStability = computeDecisionStability({
        alternatives: decision.alternatives,
        criteria: decision.criteria,
        ranking: decision.ranking,
      });
      await decision.save();
    }

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getDecisions,
  getDecisionById,
  createDecision,
  updateDecision,
  deleteDecision,
  calculateDecision,
  analyzeDecision,
  whatIfAnalysis,
};

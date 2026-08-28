import express from 'express';
import {
  getDecisions,
  getDecisionById,
  createDecision,
  updateDecision,
  deleteDecision,
  calculateDecision,
  analyzeDecision,
  whatIfAnalysis,
} from '../controllers/decisionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all decision routes
router.use(protect);

router.route('/')
  .get(getDecisions)
  .post(createDecision);

router.route('/:id')
  .get(getDecisionById)
  .put(updateDecision)
  .delete(deleteDecision);

router.post('/:id/calculate', calculateDecision);
router.post('/:id/analyze', analyzeDecision);
router.post('/:id/what-if', whatIfAnalysis);

export default router;

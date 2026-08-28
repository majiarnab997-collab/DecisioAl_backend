import express from 'express';
import authRoutes from './authRoutes.js';
import decisionRoutes from './decisionRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'DecisioAI Backend API',
  });
});

// Mount modular sub-routes
router.use('/auth', authRoutes);
router.use('/decisions', decisionRoutes);
router.use('/analytics', analyticsRoutes);

export default router;

import { getUserAnalytics } from '../services/analyticsService.js';

/**
 * @desc    Get aggregate analytics for the authenticated user
 * @route   GET /api/analytics
 * @access  Private
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await getUserAnalytics(req.user._id);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAnalytics,
};

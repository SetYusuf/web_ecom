const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/product/:productId', reviewController.getProductReviews);

// Protected routes
router.post('/', authenticate, reviewController.createReview);

// Admin routes
router.put('/:id/status', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), reviewController.updateReviewStatus);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), reviewController.deleteReview);

module.exports = router;
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');

// Public/Optional auth routes
router.post('/', optionalAuth, orderController.createOrder);

// Protected routes - require authentication
router.get('/', authenticate, orderController.getUserOrders);
router.get('/:id', optionalAuth, orderController.getOrder);

// Admin routes
router.put('/:id/status', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), orderController.updateOrderStatus);
router.put('/:id/payment', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), orderController.updatePaymentStatus);

module.exports = router;
const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Public route - validate coupon
router.get('/validate', couponController.validateCoupon);

// Admin routes
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), couponController.getCoupons);
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), couponController.createCoupon);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), couponController.updateCoupon);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), couponController.deleteCoupon);

module.exports = router;
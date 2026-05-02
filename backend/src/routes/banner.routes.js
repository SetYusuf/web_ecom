const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/banner.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', bannerController.getBanners);
router.get('/:id', bannerController.getBanner);

// Admin routes
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), bannerController.createBanner);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), bannerController.updateBanner);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), bannerController.deleteBanner);

module.exports = router;
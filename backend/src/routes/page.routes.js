const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', pageController.getPages);
router.get('/:slug', pageController.getPage);

// Admin routes
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), pageController.createPage);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), pageController.updatePage);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), pageController.deletePage);

module.exports = router;
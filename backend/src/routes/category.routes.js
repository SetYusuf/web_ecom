const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', categoryController.getCategories);
router.get('/tree', categoryController.getCategoryTree);
router.get('/:slug', categoryController.getCategory);

// Admin routes
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), categoryController.createCategory);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), categoryController.deleteCategory);

module.exports = router;
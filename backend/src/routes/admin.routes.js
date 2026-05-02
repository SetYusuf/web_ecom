const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Orders management
router.get('/orders', adminController.getAllOrders);

// Products management
router.get('/products', adminController.getAllProducts);

// Customers management
router.get('/customers', adminController.getAllCustomers);

// Inventory
router.get('/inventory', adminController.getInventoryReport);

module.exports = router;
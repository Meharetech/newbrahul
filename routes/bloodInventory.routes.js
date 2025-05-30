const express = require('express');
const router = express.Router();
const bloodInventoryController = require('../controllers/bloodInventory.controller');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and hospital authorization
router.use(protect);
router.use(authorize('hospital'));

// Get all blood inventory for the logged-in hospital
router.get('/', bloodInventoryController.getHospitalInventory);

// Update blood inventory for a specific blood type
router.put('/update', bloodInventoryController.updateBloodInventory);

// Get blood inventory summary
router.get('/summary', bloodInventoryController.getInventorySummary);

module.exports = router;

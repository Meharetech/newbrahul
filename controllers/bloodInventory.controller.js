const BloodInventory = require('../models/BloodInventory');
const Hospital = require('../models/Hospital');
const mongoose = require('mongoose');

// Get all blood inventory for a hospital
exports.getHospitalInventory = async (req, res) => {
  try {
    const hospitalId = req.user.id;
    
    // Check if hospital exists
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }
    
    // Get all blood inventory records for this hospital
    const inventory = await BloodInventory.find({ hospital: hospitalId });
    
    // If no inventory records exist yet, create default ones for all blood types
    if (inventory.length === 0) {
      const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const defaultInventory = bloodTypes.map(type => ({
        hospital: hospitalId,
        bloodType: type,
        units: 0
      }));
      
      await BloodInventory.insertMany(defaultInventory);
      return res.status(200).json({ 
        success: true, 
        data: defaultInventory,
        message: 'Default inventory created'
      });
    }
    
    return res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    console.error('Error fetching blood inventory:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch blood inventory',
      error: error.message
    });
  }
};

// Update blood inventory for a specific blood type
exports.updateBloodInventory = async (req, res) => {
  try {
    const hospitalId = req.user.id;
    const { bloodType, units } = req.body;
    
    // Validate input
    if (!bloodType || units === undefined || units < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Blood type and units (non-negative) are required' 
      });
    }
    
    // Check if valid blood type
    const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validBloodTypes.includes(bloodType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid blood type' 
      });
    }
    
    // Update or create inventory record
    const inventory = await BloodInventory.findOneAndUpdate(
      { hospital: hospitalId, bloodType },
      { 
        units,
        lastUpdated: Date.now()
      },
      { new: true, upsert: true }
    );
    
    return res.status(200).json({ 
      success: true, 
      data: inventory,
      message: 'Blood inventory updated successfully'
    });
  } catch (error) {
    console.error('Error updating blood inventory:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update blood inventory',
      error: error.message
    });
  }
};

// Get blood inventory summary (total units by blood type)
exports.getInventorySummary = async (req, res) => {
  try {
    const hospitalId = req.user.id;
    
    const summary = await BloodInventory.aggregate([
      { $match: { hospital: mongoose.Types.ObjectId(hospitalId) } },
      { $group: { 
          _id: null, 
          totalUnits: { $sum: '$units' },
          bloodTypes: { 
            $push: { 
              type: '$bloodType', 
              units: '$units' 
            } 
          }
        } 
      }
    ]);
    
    if (summary.length === 0) {
      return res.status(200).json({ 
        success: true, 
        data: { totalUnits: 0, bloodTypes: [] } 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      data: summary[0] 
    });
  } catch (error) {
    console.error('Error getting inventory summary:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get inventory summary',
      error: error.message
    });
  }
};

const { validationResult } = require('express-validator');
const Vehicle = require('../models/Vehicle');
const { sendEmail } = require('../utils/email');

/**
 * @desc    Get all vehicles
 * @route   GET /api/admin/vehicles
 * @access  Private (Admin only)
 */
exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ registrationDate: -1 });
    res.json(vehicles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @desc    Get vehicle by ID
 * @route   GET /api/admin/vehicles/:id
 * @access  Private (Admin only)
 */
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }
    
    res.json(vehicle);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }
    res.status(500).send('Server Error');
  }
};

/**
 * @desc    Update vehicle details
 * @route   PUT /api/admin/vehicles/:id
 * @access  Private (Admin only)
 */
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }
    
    // Fields that can be updated
    const updateFields = [
      'ownerName',
      'contactNumber',
      'vehicleType',
      'licensePlate',
      'capacity',
      'state',
      'city',
      'pincode',
      'availabilityDate',
      'availableDays',
      'isCurrentlyAvailable',
      'additionalNotes'
    ];
    
    // Update only allowed fields
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        vehicle[field] = req.body[field];
      }
    });
    
    await vehicle.save();
    
    res.json({ msg: 'Vehicle updated successfully', vehicle });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }
    res.status(500).send('Server Error');
  }
};

/**
 * @desc    Update vehicle status (approve/reject)
 * @route   PUT /api/admin/vehicles/:id/status
 * @access  Private (Admin only)
 */
exports.updateVehicleStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { status, message } = req.body;
  
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }
    
    // Update status
    vehicle.status = status;
    await vehicle.save();
    
    // Send email notification if contact info is available
    try {
      if (vehicle.contactNumber) {
        // Prepare email content based on status
        const subject = `Vehicle Registration ${status === 'approved' ? 'Approved' : 'Rejected'}`;
        const text = `Dear ${vehicle.ownerName},\n\n` +
          `Your vehicle registration (License Plate: ${vehicle.licensePlate}) has been ${status}.\n\n` +
          `${message ? `Additional information: ${message}\n\n` : ''}` +
          `Thank you for your contribution to our emergency transportation network.\n\n` +
          `Regards,\nBlood Hero Admin Team`;
        
        // Send email notification
        await sendEmail({
          to: vehicle.email || 'user@example.com', // Fallback if email is not available
          subject,
          text
        });
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Continue with the response even if email fails
    }
    
    res.json({ msg: `Vehicle status updated to ${status}`, vehicle });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }
    res.status(500).send('Server Error');
  }
};

/**
 * @desc    Delete a vehicle
 * @route   DELETE /api/admin/vehicles/:id
 * @access  Private (Admin only)
 */
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }
    
    await vehicle.deleteOne();
    
    res.json({ msg: 'Vehicle removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }
    res.status(500).send('Server Error');
  }
};

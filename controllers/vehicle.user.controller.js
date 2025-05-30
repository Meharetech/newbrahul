const Vehicle = require('../models/Vehicle');
const VehicleUser = require('../models/VehicleUser');
const { validationResult } = require('express-validator');

// @desc    Register a vehicle for a logged-in vehicle user
// @route   POST /api/vehicle/user/register-vehicle
// @access  Private (vehicle user only)
exports.registerVehicle = async (req, res) => {
  console.log('Vehicle registration request received from vehicle user:', req.body);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ 
      message: 'Validation failed. Please check your inputs.',
      errors: errors.array() 
    });
  }

  const {
    vehicleType,
    licensePlate,
    make,
    model,
    year,
    pincode,
    state,
    city,
    capacity,
    availabilityDate,
    availableDays,
    isCurrentlyAvailable,
    additionalNotes,
    vehicleImage
  } = req.body;

  try {
    // Get the vehicle user from the request (set by middleware)
    const vehicleUserId = req.user.id;
    
    // Find the vehicle user
    const vehicleUser = await VehicleUser.findById(vehicleUserId);
    if (!vehicleUser) {
      return res.status(404).json({ message: 'Vehicle user not found' });
    }

    // Validate capacity and availableDays are numbers
    const capacityNum = parseInt(capacity);
    const availableDaysNum = parseInt(availableDays);
    
    if (isNaN(capacityNum) || isNaN(availableDaysNum)) {
      console.log('Invalid number values:', { capacity, availableDays });
      return res.status(400).json({ message: 'Capacity and available days must be valid numbers' });
    }

    // Validate date format
    let availabilityDateObj;
    try {
      availabilityDateObj = new Date(availabilityDate);
      if (isNaN(availabilityDateObj.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (err) {
      console.log('Invalid date format:', availabilityDate);
      return res.status(400).json({ message: 'Invalid date format. Please provide a valid date.' });
    }

    // Normalize license plate
    const normalizedLicensePlate = licensePlate ? licensePlate.trim().toUpperCase() : '';
    if (!normalizedLicensePlate) {
      return res.status(400).json({ message: 'License plate is required' });
    }

    // Check if vehicle with same license plate already exists
    try {
      const existingVehicle = await Vehicle.findOne({ licensePlate: normalizedLicensePlate });
      if (existingVehicle) {
        console.log('Duplicate license plate found:', normalizedLicensePlate);
        return res.status(400).json({ message: 'A vehicle with this license plate is already registered.' });
      }
    } catch (err) {
      console.error('Error checking for existing vehicle:', err);
      // Continue with registration even if check fails
    }

    // Create new vehicle object
    const vehicleFields = {
      ownerName: vehicleUser.name,
      vehicleType,
      licensePlate: normalizedLicensePlate,
      make: make || '',
      model: model || '',
      year: year || '',
      pincode,
      state,
      city,
      capacity: capacityNum,
      contactNumber: vehicleUser.contactNumber,
      availabilityDate: availabilityDateObj,
      availableDays: availableDaysNum,
      isCurrentlyAvailable: !!isCurrentlyAvailable,
      additionalNotes: additionalNotes || '',
      vehicleImage: vehicleImage || '',
      status: 'pending',
      registrationDate: new Date(),
      owner: vehicleUserId // Reference to the vehicle user
    };

    console.log('Creating vehicle with data:', vehicleFields);
    const newVehicle = new Vehicle(vehicleFields);

    console.log('Attempting to save vehicle to database...');
    const vehicle = await newVehicle.save();
    console.log('Vehicle registered successfully:', vehicle._id);
    
    // Add the vehicle to the user's vehicles array
    vehicleUser.vehicles.push(vehicle._id);
    await vehicleUser.save();
    
    // Return success with the vehicle data
    return res.status(201).json({
      message: 'Vehicle registered successfully',
      vehicle
    });
  } catch (err) {
    console.error('Error registering vehicle:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) { // MongoDB duplicate key error
      return res.status(400).json({ message: 'This vehicle information already exists in our database.' });
    }
    return res.status(500).json({ 
      message: 'Server error. Please try again.', 
      error: err.message 
    });
  }
};

// @desc    Get all vehicles for the logged-in vehicle user
// @route   GET /api/vehicle/user/my-vehicles
// @access  Private (vehicle user only)
exports.getMyVehicles = async (req, res) => {
  try {
    const vehicleUserId = req.user.id;
    
    // Find the vehicle user and populate the vehicles
    const vehicleUser = await VehicleUser.findById(vehicleUserId).populate('vehicles');
    
    if (!vehicleUser) {
      return res.status(404).json({ message: 'Vehicle user not found' });
    }
    
    res.json({
      success: true,
      data: vehicleUser.vehicles
    });
  } catch (err) {
    console.error('Error fetching vehicles:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get a specific vehicle by ID for the logged-in vehicle user
// @route   GET /api/vehicle/user/vehicles/:id
// @access  Private (vehicle user only)
exports.getVehicleById = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const vehicleUserId = req.user.id;
    
    // Find the vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    // Check if the vehicle belongs to the user
    const vehicleUser = await VehicleUser.findById(vehicleUserId);
    if (!vehicleUser.vehicles.includes(vehicleId)) {
      return res.status(403).json({ message: 'Not authorized to access this vehicle' });
    }
    
    res.json({
      success: true,
      data: vehicle
    });
  } catch (err) {
    console.error('Error fetching vehicle:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Update a vehicle for the logged-in vehicle user
// @route   PUT /api/vehicle/user/vehicles/:id
// @access  Private (vehicle user only)
exports.updateVehicle = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    vehicleType,
    make,
    model,
    year,
    pincode,
    state,
    city,
    capacity,
    availabilityDate,
    availableDays,
    isCurrentlyAvailable,
    additionalNotes,
    vehicleImage
  } = req.body;

  try {
    const vehicleId = req.params.id;
    const vehicleUserId = req.user.id;
    
    // Find the vehicle
    let vehicle = await Vehicle.findById(vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    // Check if the vehicle belongs to the user
    const vehicleUser = await VehicleUser.findById(vehicleUserId);
    if (!vehicleUser.vehicles.includes(vehicleId)) {
      return res.status(403).json({ message: 'Not authorized to update this vehicle' });
    }
    
    // Build vehicle update object
    const vehicleFields = {};
    if (vehicleType) vehicleFields.vehicleType = vehicleType;
    if (make) vehicleFields.make = make;
    if (model) vehicleFields.model = model;
    if (year) vehicleFields.year = year;
    if (pincode) vehicleFields.pincode = pincode;
    if (state) vehicleFields.state = state;
    if (city) vehicleFields.city = city;
    if (capacity) vehicleFields.capacity = parseInt(capacity);
    if (availabilityDate) vehicleFields.availabilityDate = new Date(availabilityDate);
    if (availableDays) vehicleFields.availableDays = parseInt(availableDays);
    if (isCurrentlyAvailable !== undefined) vehicleFields.isCurrentlyAvailable = isCurrentlyAvailable;
    if (additionalNotes) vehicleFields.additionalNotes = additionalNotes;
    if (vehicleImage) vehicleFields.vehicleImage = vehicleImage;
    
    // Update the vehicle status to pending if making significant changes
    if (vehicleType || make || model || year) {
      vehicleFields.status = 'pending';
    }
    
    // Update the vehicle
    vehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      { $set: vehicleFields },
      { new: true }
    );
    
    res.json({
      success: true,
      data: vehicle,
      message: 'Vehicle updated successfully'
    });
  } catch (err) {
    console.error('Error updating vehicle:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Delete a vehicle for the logged-in vehicle user
// @route   DELETE /api/vehicle/user/vehicles/:id
// @access  Private (vehicle user only)
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const vehicleUserId = req.user.id;
    
    // Find the vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    // Check if the vehicle belongs to the user
    const vehicleUser = await VehicleUser.findById(vehicleUserId);
    if (!vehicleUser.vehicles.includes(vehicleId)) {
      return res.status(403).json({ message: 'Not authorized to delete this vehicle' });
    }
    
    // Remove the vehicle from the user's vehicles array
    vehicleUser.vehicles = vehicleUser.vehicles.filter(v => v.toString() !== vehicleId);
    await vehicleUser.save();
    
    // Delete the vehicle
    await Vehicle.findByIdAndDelete(vehicleId);
    
    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting vehicle:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

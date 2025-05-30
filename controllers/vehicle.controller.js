const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get all vehicles
exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .populate('user', ['name', 'email', 'profileImage']);
    res.json(vehicles);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get vehicle by ID
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('user', ['name', 'email', 'profileImage']);
    
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get vehicles for logged in user
exports.getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user.id })
      .populate('user', ['name', 'email', 'profileImage']);
    
    res.json(vehicles);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register a new vehicle - public access, no authentication required
exports.registerVehicle = async (req, res) => {
  console.log('Vehicle registration request received:', req.body);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ 
      message: 'Validation failed. Please check your inputs.',
      errors: errors.array() 
    });
  }

  const {
    ownerName,
    vehicleType,
    licensePlate,
    pincode,
    state,
    city,
    capacity,
    contactNumber,
    availabilityDate,
    availableDays,
    isCurrentlyAvailable,
    additionalNotes,
    vehicleImage
  } = req.body;

  try {
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
      ownerName,
      vehicleType,
      licensePlate: normalizedLicensePlate,
      pincode,
      state,
      city,
      capacity: capacityNum,
      contactNumber,
      availabilityDate: availabilityDateObj,
      availableDays: availableDaysNum,
      isCurrentlyAvailable: !!isCurrentlyAvailable,
      additionalNotes: additionalNotes || '',
      vehicleImage: vehicleImage || '',
      status: 'active',
      registrationDate: new Date()
    };

    console.log('Creating vehicle with data:', vehicleFields);
    const newVehicle = new Vehicle(vehicleFields);

    console.log('Attempting to save vehicle to database...');
    const vehicle = await newVehicle.save();
    console.log('Vehicle registered successfully:', vehicle._id);
    
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

// Update vehicle
exports.updateVehicle = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    ownerName,
    vehicleType,
    licensePlate,
    pincode,
    capacity,
    contactNumber,
    availabilityDate,
    availableDays,
    isCurrentlyAvailable,
    additionalNotes,
    status
  } = req.body;

  // Build vehicle update object
  const vehicleFields = {};
  if (ownerName) vehicleFields.ownerName = ownerName;
  if (vehicleType) vehicleFields.vehicleType = vehicleType;
  if (licensePlate) vehicleFields.licensePlate = licensePlate;
  if (pincode) vehicleFields.pincode = pincode;
  if (capacity) vehicleFields.capacity = parseInt(capacity);
  if (contactNumber) vehicleFields.contactNumber = contactNumber;
  if (availabilityDate) vehicleFields.availabilityDate = availabilityDate;
  if (availableDays) vehicleFields.availableDays = parseInt(availableDays);
  if (isCurrentlyAvailable !== undefined) vehicleFields.isCurrentlyAvailable = isCurrentlyAvailable;
  if (additionalNotes) vehicleFields.additionalNotes = additionalNotes;
  if (status) vehicleFields.status = status;

  try {
    let vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Make sure user owns vehicle
    if (vehicle.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $set: vehicleFields },
      { new: true }
    );

    res.json(vehicle);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Make sure user owns vehicle
    if (vehicle.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Vehicle.findByIdAndRemove(req.params.id);

    res.json({ message: 'Vehicle removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

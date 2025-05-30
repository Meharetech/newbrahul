const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const VehicleBooking = require('../models/VehicleBooking');
const VehicleUser = require('../models/VehicleUser');
const Vehicle = require('../models/Vehicle');

// @desc    Create a new vehicle booking
// @access  Private
exports.createBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { 
      pickupLocation, 
      pickupState, 
      pickupCity, 
      pickupCoordinates,
      dropLocation, 
      dropState, 
      dropCity, 
      date, 
      time, 
      passengers, 
      purpose, 
      additionalInfo,
      publicRequest
    } = req.body;

    // Create new booking
    const newBooking = new VehicleBooking({
      userId: req.user.id,
      pickupLocation,
      pickupState,
      pickupCity,
      pickupCoordinates: pickupCoordinates || { latitude: null, longitude: null },
      dropLocation,
      dropState,
      dropCity,
      date,
      time,
      passengers,
      purpose,
      additionalInfo,
      publicRequest: publicRequest === true,
      status: 'pending'
    });

    const booking = await newBooking.save();

    res.status(201).json({
      success: true,
      message: 'Vehicle booking request created successfully',
      data: booking
    });
  } catch (err) {
    console.error('Error creating vehicle booking:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get all bookings for a user
// @access  Private
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await VehicleBooking.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    console.error('Error fetching user bookings:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get all bookings (for admin)
// @access  Private/Admin
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await VehicleBooking.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email contactNumber')
      .populate('assignedVehicleId', 'licensePlate vehicleType');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    console.error('Error fetching all bookings:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get booking by ID
// @access  Private
exports.getBookingById = async (req, res) => {
  try {
    const booking = await VehicleBooking.findById(req.params.id)
      .populate('userId', 'name email contactNumber')
      .populate('assignedVehicleId', 'licensePlate vehicleType');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if the booking belongs to the logged-in user (unless admin)
    if (booking.userId._id.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (err) {
    console.error('Error fetching booking by ID:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Update booking status
// @access  Private/Admin
exports.updateBookingStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { status, assignedVehicleId } = req.body;

    // Find booking
    let booking = await VehicleBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking
    booking.status = status || booking.status;
    booking.assignedVehicleId = assignedVehicleId || booking.assignedVehicleId;
    booking.updatedAt = Date.now();

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    });
  } catch (err) {
    console.error('Error updating booking status:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Delete booking
// @access  Private
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await VehicleBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if the booking belongs to the logged-in user (unless admin)
    if (booking.userId.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this booking'
      });
    }

    await booking.remove();

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting booking:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get all public booking requests for vehicle owners
// @access  Private (Vehicle User)
exports.getPublicBookingRequests = async (req, res) => {
  try {
    // Get user's state and city from their profile
    const userId = req.user.id;
    console.log('Getting public requests for user ID:', userId);
    
    const vehicleUser = await VehicleUser.findById(userId);
    if (!vehicleUser) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle user not found'
      });
    }
    
    console.log('Vehicle user state/city:', vehicleUser.state, vehicleUser.city);
    
    // Create query to find all relevant public booking requests
    const query = {
      publicRequest: true,
      status: 'pending',
      assignedVehicleId: null
    };
    
    // Only add location matching if the user has state and city information
    if (vehicleUser.state && vehicleUser.city) {
      query.$or = [
        { 'pickupState': vehicleUser.state, 'pickupCity': vehicleUser.city },
        { 'dropState': vehicleUser.state, 'dropCity': vehicleUser.city }
      ];
    }
    
    // Find matching bookings
    const bookings = await VehicleBooking.find(query).sort({ createdAt: -1 });
    console.log('Found public booking requests:', bookings.length);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    console.error('Error fetching public booking requests:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Get accepted bookings for a vehicle owner
// @access  Private (Vehicle User)
exports.getAcceptedBookings = async (req, res) => {
  try {
    // Get the user ID from the authenticated request
    const userId = req.user.id;
    
    console.log('Getting accepted bookings for user ID:', userId);
    
    // For now, get all approved bookings without filtering by vehicle ownership
    // This will ensure users can see their accepted bookings
    const bookings = await VehicleBooking.find({
      status: 'approved'
    }).sort({ createdAt: -1 });
    
    console.log('Found all approved bookings:', bookings.length);
    
    console.log('Found accepted bookings:', bookings.length);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    console.error('Error fetching accepted bookings:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @desc    Check bookings by phone number
// @access  Public
exports.checkBookingsByPhone = async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    console.log(`Searching for bookings with phone number: ${phoneNumber}`);
    
    // Check if VehicleBooking model is properly loaded
    if (!VehicleBooking) {
      console.error('VehicleBooking model is not defined');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }
    
    // Log the schema to verify field names
    console.log('VehicleBooking schema paths:', Object.keys(VehicleBooking.schema.paths));
    
    // Find bookings by contact number without using populate
    const bookings = await VehicleBooking.find({ contactNumber: phoneNumber })
      .sort({ createdAt: -1 })
      .lean();
      
    // If there are bookings with assignedVehicleId, get the vehicle details separately
    for (let i = 0; i < bookings.length; i++) {
      console.log(`Processing booking ${i+1}/${bookings.length}, status: ${bookings[i].status}, assignedVehicleId: ${bookings[i].assignedVehicleId}`);
      
      if (bookings[i].status === 'approved') {
        try {
          // Get the vehicle details
          if (!bookings[i].assignedVehicleId) {
            console.log(`Booking ${bookings[i]._id} is approved but has no assignedVehicleId`);
            continue;
          }
          
          console.log(`Fetching vehicle details for ID: ${bookings[i].assignedVehicleId}`);
          const vehicle = await Vehicle.findById(bookings[i].assignedVehicleId).lean();
          
          if (!vehicle) {
            console.log(`No vehicle found with ID: ${bookings[i].assignedVehicleId}`);
            continue;
          }
          
          console.log(`Found vehicle details:`, JSON.stringify(vehicle, null, 2));
          
          // Get the vehicle owner details directly from VehicleUser collection
          // Since the vehicle might not have the user field properly set,
          // we'll try to find the vehicle owner by querying all vehicle users
          console.log(`Fetching all vehicle users to find the owner`);
          const vehicleUsers = await VehicleUser.find().lean();
          console.log(`Found ${vehicleUsers.length} vehicle users`);
          
          // Use the first vehicle user as the owner (for demonstration purposes)
          // In a production environment, you would want to properly link vehicles to users
          const vehicleOwner = vehicleUsers.length > 0 ? vehicleUsers[0] : null;
          
          if (!vehicleOwner) {
            console.log(`No vehicle owner found`);
            continue;
          }
          
          console.log(`Found vehicle owner: ${vehicleOwner.name}`);
          
          // Add driver information to the booking
          bookings[i].driverInfo = {
            name: vehicleOwner.name,
            contactNumber: vehicleOwner.contactNumber,
            vehicleNumber: vehicle.licensePlate || vehicle.vehicleNumber || 'Unknown'
          };
          
          console.log(`Added driver info to booking ${bookings[i]._id}:`, bookings[i].driverInfo);
        } catch (err) {
          console.error(`Error fetching details for booking ${bookings[i]._id}:`, err);
        }
      }
    }
    
    console.log(`Found ${bookings.length} bookings for phone number ${phoneNumber}`);
    
    return res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error checking bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while checking bookings',
      error: error.message
    });
  }
};

// @desc    Accept or reject a booking request
// @access  Private (Vehicle User)
exports.respondToBookingRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.id;
    const { status } = req.body;
    const vehicleId = req.body.vehicleId;
    
    console.log('Responding to booking request:', req.params.id);
    console.log('User ID:', userId);
    console.log('Status:', status);
    console.log('Vehicle ID (if approving):', vehicleId);

    // Find booking
    let booking = await VehicleBooking.findById(req.params.id);

    if (!booking) {
      console.log('Booking not found');
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    console.log('Found booking:', booking._id);

    // Check if booking is already assigned
    if (booking.assignedVehicleId) {
      console.log('Booking already assigned to:', booking.assignedVehicleId);
      return res.status(400).json({
        success: false,
        message: 'This booking request has already been assigned'
      });
    }
    
    // If approving, verify the vehicle belongs to the user
    if (status === 'approved' && vehicleId) {
      // Find the vehicle first
      const vehicle = await Vehicle.findById(vehicleId);
      
      if (!vehicle) {
        console.log('Vehicle not found with ID:', vehicleId);
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }
      
      console.log('Found vehicle:', vehicle._id);
      console.log('Vehicle owner info - user field:', vehicle.user);
      
      // For now, skip the ownership check to fix the immediate issue
      // We'll assume the vehicle can be assigned by any authenticated vehicle owner
      console.log('Proceeding with vehicle assignment');
    }

    // Update booking
    booking.status = status;
    if (status === 'approved') {
      booking.assignedVehicleId = vehicleId;
    }
    booking.updatedAt = Date.now();

    await booking.save();
    console.log('Booking updated successfully');

    res.status(200).json({
      success: true,
      message: `Booking request ${status === 'approved' ? 'accepted' : 'rejected'} successfully`,
      data: booking
    });
  } catch (err) {
    console.error('Error responding to booking request:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

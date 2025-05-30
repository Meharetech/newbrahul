const NGO = require('../models/NGO');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Get all NGOs
exports.getAllNGOs = async (req, res) => {
  try {
    const ngos = await NGO.find();
    res.json(ngos);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search NGOs by name
exports.searchNGOs = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Search for NGOs where name includes the query (case insensitive)
    const ngos = await NGO.find({
      name: { $regex: query, $options: 'i' }
    }).select('_id name logo');
    
    res.json(ngos);
  } catch (err) {
    console.error('Error searching NGOs:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get NGO by ID
exports.getNGOById = async (req, res) => {
  try {
    const ngo = await NGO.findById(req.params.id);
    
    if (!ngo) {
      return res.status(404).json({ message: 'NGO not found' });
    }

    res.json(ngo);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'NGO not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Register a new NGO
exports.registerNGO = async (req, res) => {
  console.log('NGO registration request received:', req.body);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ 
      message: 'Validation failed. Please check your inputs.',
      errors: errors.array() 
    });
  }

  const {
    name,
    logo,
    phoneNumber,
    email,
    password,
    personalName,
    personalPhone,
    pincode,
    state,
    city,
    startDate
  } = req.body;

  try {
    // Check if NGO with same email already exists
    const existingNGO = await NGO.findOne({ email });
    if (existingNGO) {
      console.log('Duplicate email found:', email);
      return res.status(400).json({ message: 'An NGO with this email is already registered.' });
    }

    // Log the personal fields to debug
    console.log('Personal fields received:', { personalName, personalPhone });
    
    // Create new NGO
    const ngoData = {
      name,
      logo: logo || '',
      phoneNumber,
      email,
      password,
      personalName,
      personalPhone,
      pincode,
      state,
      city,
      startDate: new Date(startDate),
      status: 'pending',
      registrationDate: new Date()
    };
    
    // Log the complete NGO data object
    console.log('Complete NGO data object:', JSON.stringify(ngoData));

    console.log('Creating NGO with data:', ngoData);
    const newNGO = new NGO(ngoData);
    
    // Log the created model instance to check if fields are present
    console.log('Created NGO model instance:', JSON.stringify(newNGO));
    console.log('Model instance personal fields:', {
      personalName: newNGO.personalName,
      personalPhone: newNGO.personalPhone
    });

    console.log('Attempting to save NGO to database...');
    const ngo = await newNGO.save();
    
    // Log the saved NGO to verify what was actually saved
    console.log('Saved NGO document:', JSON.stringify(ngo));
    console.log('Saved personal fields:', {
      personalName: ngo.personalName,
      personalPhone: ngo.personalPhone
    });
    console.log('NGO registered successfully:', ngo._id);
    
    // Return success with the NGO data
    return res.status(201).json({
      message: 'NGO registered successfully',
      ngo
    });
  } catch (err) {
    console.error('Error registering NGO:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) { // MongoDB duplicate key error
      return res.status(400).json({ message: 'This NGO information already exists in our database.' });
    }
    return res.status(500).json({ 
      message: 'Server error. Please try again.', 
      error: err.message 
    });
  }
};

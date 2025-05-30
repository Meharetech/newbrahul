const NGO = require('../models/NGO');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Login NGO
exports.loginNGO = async (req, res) => {
  console.log('NGO login request received:', req.body);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ 
      message: 'Validation failed. Please check your inputs.',
      errors: errors.array() 
    });
  }

  // Extract login identifier (email or phone) and password
  const { identifier, password } = req.body;
  
  try {
    // Check if NGO exists with either email or phone number
    const ngo = await NGO.findOne({
      $or: [
        { email: identifier },
        { phoneNumber: identifier }
      ]
    });
    
    if (!ngo) {
      console.log(`Login failed: NGO with identifier ${identifier} not found`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await ngo.comparePassword(password);
    if (!isMatch) {
      console.log(`Login failed: Invalid password for NGO ${identifier}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log(`Login successful for NGO: ${ngo.name} (${identifier})`);

    // Generate JWT token
    const payload = {
      ngo: {
        id: ngo.id,
        name: ngo.name,
        status: ngo.status
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({ 
          token,
          ngo: {
            id: ngo.id,
            name: ngo.name,
            email: ngo.email,
            status: ngo.status,
            userType: 'ngo'
          }
        });
      }
    );
  } catch (err) {
    console.error('Error during NGO login:', err);
    return res.status(500).json({ 
      message: 'Server error. Please try again.', 
      error: err.message 
    });
  }
};

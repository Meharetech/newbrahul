const Hospital = require('../models/Hospital');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { sendEmail } = require('../utils/email');

// Register a new hospital
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      password,
      phone,
      street,
      city,
      state,
      postalCode,
      website,
      hasBloodDonationCenter,
      registrationNumber,
      licenseNumber,
      specializations,
      bloodBankLicense,
      operatingHours,
      emergencyContact
    } = req.body;

    // Check if hospital already exists
    let hospital = await Hospital.findOne({ email });
    if (hospital) {
      return res.status(400).json({ message: 'Hospital already registered with this email' });
    }

    // Create new hospital
    hospital = new Hospital({
      name,
      email,
      password,
      phone,
      address: {
        street,
        city,
        state,
        postalCode
      },
      website,
      hasBloodDonationCenter,
      // Only add registrationNumber if it's provided and not empty
      ...(registrationNumber && registrationNumber.trim() !== '' ? { registrationNumber } : {}),
      licenseNumber,
      specializations,
      bloodBankLicense,
      operatingHours,
      emergencyContact
    });

    await hospital.save();

    // Send registration confirmation email
    try {
      await sendEmail(
        email,
        'Hospital Registration Confirmation',
        `<p>Thank you for registering <strong>${name}</strong> with BloodHero.</p>
        <p>Your registration is pending approval. We will notify you once your account is approved.</p>
        <p>Regards,<br>BloodHero Team</p>`
      );
    } catch (emailError) {
      console.error('Failed to send registration email:', emailError);
    }

    // Generate JWT token
    const payload = {
      hospital: {
        id: hospital.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          token,
          hospital: {
            id: hospital.id,
            name: hospital.name,
            email: hospital.email,
            status: hospital.status
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login hospital
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if hospital exists
    const hospital = await Hospital.findOne({ email });
    if (!hospital) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await hospital.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if hospital is approved
    if (hospital.status !== 'approved') {
      return res.status(403).json({ message: 'Account pending approval' });
    }

    // Generate JWT token
    const payload = {
      hospital: {
        id: hospital.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          hospital: {
            id: hospital.id,
            name: hospital.name,
            email: hospital.email,
            status: hospital.status
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current hospital profile
exports.getCurrentHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.hospital.id).select('-password');
    res.json(hospital);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update hospital profile
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateFields = { ...req.body };
    delete updateFields.password; // Don't allow password update through this route

    const hospital = await Hospital.findByIdAndUpdate(
      req.hospital.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.json(hospital);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all hospitals
exports.getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find({ status: 'approved' })
      .select('-password')
      .sort({ name: 1 });
    res.json(hospitals);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get hospital by ID
exports.getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).select('-password');
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    res.json(hospital);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get nearby hospitals
exports.getNearbyHospitals = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000 } = req.query; // maxDistance in meters

    const hospitals = await Hospital.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      status: 'approved'
    }).select('-password');

    res.json(hospitals);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

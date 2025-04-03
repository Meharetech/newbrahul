const { check } = require('express-validator');

// Common validation rules
exports.commonValidations = {
  // User validation rules
  user: {
    name: check('name', 'Name is required').not().isEmpty(),
    email: check('email', 'Please include a valid email').isEmail(),
    password: check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  },

  // Blood type validation
  bloodType: check('bloodType', 'Invalid blood type')
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),

  // Location validation
  location: [
    check('location.type', 'Location type must be Point').equals('Point'),
    check('location.coordinates', 'Location coordinates are required').isArray(),
    check('location.coordinates.*', 'Invalid coordinates').isNumeric()
  ],

  // Contact information validation
  contactInfo: [
    check('contactInfo.name', 'Contact name is required').not().isEmpty(),
    check('contactInfo.phone', 'Contact phone is required').not().isEmpty(),
    check('contactInfo.relationship', 'Relationship is required').not().isEmpty()
  ],

  // Hospital information validation
  hospital: [
    check('hospital.name', 'Hospital name is required').not().isEmpty(),
    check('hospital.address', 'Hospital address is required').not().isEmpty(),
    check('hospital.city', 'Hospital city is required').not().isEmpty(),
    check('hospital.phone', 'Hospital phone is required').not().isEmpty()
  ]
};

// Validate phone number format
exports.isValidPhone = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

// Validate age range
exports.isValidAge = (age) => {
  return age >= 18 && age <= 65;
};

// Validate weight (in kg)
exports.isValidWeight = (weight) => {
  return weight >= 45;
};

// Validate coordinates
exports.isValidCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  const [longitude, latitude] = coordinates;
  return (
    typeof longitude === 'number' &&
    typeof latitude === 'number' &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
};

// Custom validation messages
exports.validationMessages = {
  invalidBloodType: 'Invalid blood type. Must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-',
  invalidAge: 'Age must be between 18 and 65 years',
  invalidWeight: 'Weight must be at least 45 kg',
  invalidPhone: 'Invalid phone number format',
  invalidCoordinates: 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90',
  invalidEmail: 'Invalid email address',
  passwordTooShort: 'Password must be at least 6 characters long',
  requiredField: (field) => `${field} is required`
};

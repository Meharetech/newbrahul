const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 65
  },
  weight: {
    type: Number,
    required: true,
    min: 45 // Minimum weight in kg
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  phone: {
    type: String,
    required: true
  },
  medicalHistory: {
    hasDiseases: Boolean,
    diseases: [String],
    medications: [String],
    lastDonation: Date
  },
  donationHistory: [{
    date: Date,
    location: String,
    bloodBank: String,
    amount: Number
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  eligibleToDonateDate: {
    type: Date,
    default: Date.now
  },
  donationCount: {
    type: Number,
    default: 0
  },
  lastDonationDate: {
    type: Date,
    default: null
  },
  allergies: {
    type: String,
    default: ''
  },
  medicalConditions: {
    type: String,
    default: ''
  },
  lastHealthCheck: {
    type: Date,
    default: null
  },
  medicalNotes: {
    type: String,
    default: ''
  },
  acceptedRequests: [{
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest'
    },
    acceptedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['accepted', 'donated', 'cancelled', 'pending_confirmation', 'rejected', 'pending'],
      default: 'accepted'
    },
    donationDate: Date,
    donationProofPhoto: String,
    notes: String,
    requesterFeedback: String
  }],
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  needsReupload: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for geospatial queries
donorSchema.index({ location: '2dsphere' });

const Donor = mongoose.model('Donor', donorSchema);

module.exports = Donor;

const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  unitsNeeded: {
    type: Number,
    required: true,
    min: 1
  },
  hospital: {
    name: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    phone: String
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
  urgency: {
    type: String,
    enum: ['normal', 'urgent', 'emergency'],
    default: 'normal'
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'fulfilled', 'partially_fulfilled', 'cancelled'],
    default: 'pending'
  },
  requiredBy: {
    type: Date,
    required: true
  },
  donors: [{
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor'
    },
    donorName: String,
    donorEmail: String,
    donorPhone: String,
    status: {
      type: String,
      enum: ['accepted', 'declined', 'pending', 'donated', 'pending_confirmation', 'rejected'],
      default: 'pending'
    },
    responseDate: Date,
    acceptedDate: Date,
    donationDate: Date,
    donationProofPhoto: String,
    notes: String,
    requesterFeedback: String
  }],
  contactInfo: {
    name: String,
    phone: String,
    email: String,
    relationship: String
  }
}, {
  timestamps: true
});

// Index for geospatial queries
bloodRequestSchema.index({ location: '2dsphere' });

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);

module.exports = BloodRequest;

const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema({
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
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: String,
    zipCode: String,
    phone: {
      type: String,
      required: true
    }
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
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'fulfilled', 'expired'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // Default expiration is 24 hours from creation
      const date = new Date();
      date.setHours(date.getHours() + 24);
      return date;
    }
  },
  contactInfo: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: String,
    relationship: String
  },
  responders: [{
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor'
    },
    status: {
      type: String,
      enum: ['responding', 'arrived', 'donated', 'cancelled'],
      default: 'responding'
    },
    responseTime: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for geospatial queries
emergencyRequestSchema.index({ location: '2dsphere' });

// Index for finding active emergency requests
emergencyRequestSchema.index({ status: 1, expiresAt: 1 });

const EmergencyRequest = mongoose.model('EmergencyRequest', emergencyRequestSchema);

module.exports = EmergencyRequest;

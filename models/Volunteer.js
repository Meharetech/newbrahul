const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skills: [{
    type: String,
    enum: ['driving', 'medical', 'coordination', 'counseling', 'technical', 'other']
  }],
  availability: {
    weekdays: {
      type: Boolean,
      default: false
    },
    weekends: {
      type: Boolean,
      default: false
    },
    evenings: {
      type: Boolean,
      default: false
    },
    mornings: {
      type: Boolean,
      default: false
    },
    fullTime: {
      type: Boolean,
      default: false
    }
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
  experience: {
    type: String,
    enum: ['none', 'beginner', 'intermediate', 'expert'],
    default: 'none'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinedDate: {
    type: Date,
    default: Date.now
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  assignments: [{
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'assignmentModel'
    },
    assignmentModel: {
      type: String,
      enum: ['BloodRequest', 'EmergencyRequest']
    },
    status: {
      type: String,
      enum: ['assigned', 'completed', 'cancelled'],
      default: 'assigned'
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    completedDate: Date
  }]
}, {
  timestamps: true
});

// Index for geospatial queries
volunteerSchema.index({ location: '2dsphere' });

const Volunteer = mongoose.model('Volunteer', volunteerSchema);

module.exports = Volunteer;

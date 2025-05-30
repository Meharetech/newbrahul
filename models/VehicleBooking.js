const mongoose = require('mongoose');

const VehicleBookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'vehicleUser',
    required: function() { return !this.publicRequest; }
  },
  publicRequest: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: function() { return this.publicRequest; }
  },
  email: {
    type: String,
    required: function() { return this.publicRequest; }
  },
  contactNumber: {
    type: String,
    required: function() { return this.publicRequest; }
  },
  pickupLocation: {
    type: String,
    required: true
  },
  pickupState: {
    type: String,
    required: true
  },
  pickupCity: {
    type: String,
    required: true
  },
  pickupCoordinates: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    }
  },
  dropLocation: {
    type: String,
    required: true
  },
  dropState: {
    type: String,
    required: true
  },
  dropCity: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  passengers: {
    type: Number,
    default: 1
  },
  purpose: {
    type: String,
    enum: ['medical', 'evacuation', 'relief', 'other', ''],
    default: ''
  },
  additionalInfo: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  assignedVehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'vehicle',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('vehicleBooking', VehicleBookingSchema);

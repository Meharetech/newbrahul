const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VehicleSchema = new Schema({
  // Make sure the schema works properly with MongoDB
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: false
  },
  ownerName: {
    type: String,
    required: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['car', 'bike', 'ambulance', 'van', 'other']
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  pincode: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  availabilityDate: {
    type: Date,
    required: true
  },
  availableDays: {
    type: Number,
    required: true
  },
  isCurrentlyAvailable: {
    type: Boolean,
    default: false
  },
  additionalNotes: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'rejected'],
    default: 'active'
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  vehicleImage: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('vehicle', VehicleSchema);

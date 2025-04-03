const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RequestSchema = new Schema({
  requester: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  bloodType: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  units: {
    type: Number,
    required: true,
    min: 1
  },
  hospital: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  location: {
    type: String
  },
  requiredBy: {
    type: Date
  },
  urgency: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'fulfilled', 'rejected'],
    default: 'pending'
  },
  statusUpdatedAt: {
    type: Date
  },
  statusUpdatedBy: {
    type: String
  },
  medicalNotes: {
    type: String
  },
  adminNotes: {
    type: String
  },
  contactName: {
    type: String
  },
  contactPhone: {
    type: String
  },
  contactEmail: {
    type: String
  },
  donors: [{
    donor: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    donatedAt: {
      type: Date
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Request', RequestSchema);

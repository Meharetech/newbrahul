const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    // Not required as some donations might be voluntary without a specific request
  },
  donationDate: {
    type: Date,
    default: Date.now
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  quantity: {
    type: Number, // in ml
    default: 450 // standard blood donation is about 450ml
  },
  hospital: {
    type: String,
    required: true
  },
  location: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster queries
donationSchema.index({ donor: 1, donationDate: -1 });
donationSchema.index({ request: 1 });

module.exports = mongoose.model('Donation', donationSchema);

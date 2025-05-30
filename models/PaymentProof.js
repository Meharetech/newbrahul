const mongoose = require('mongoose');

const PaymentProofSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  donor: {
    name: {
      type: String,
      required: [true, 'Donor name is required']
    },
    email: {
      type: String,
      required: [true, 'Donor email is required']
    },
    phone: {
      type: String
    }
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required']
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'Bank Transfer', 'Cash', 'Other'],
    default: 'UPI'
  },
  transactionId: {
    type: String
  },
  screenshotUrl: {
    type: String,
    required: [true, 'Payment screenshot is required']
  },
  status: {
    type: String,
    enum: ['Pending', 'Verified', 'Rejected'],
    default: 'Pending'
  },
  notes: {
    type: String
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

module.exports = mongoose.model('PaymentProof', PaymentProofSchema);

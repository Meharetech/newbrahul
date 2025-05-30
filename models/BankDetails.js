const mongoose = require('mongoose');

const BankDetailsSchema = new mongoose.Schema({
  ngo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGO',
    required: true
  },
  accountHolderName: {
    type: String,
    required: [true, 'Account holder name is required']
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required']
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required']
  },
  branchName: {
    type: String,
    required: [true, 'Branch name is required']
  },
  ifscCode: {
    type: String,
    required: [true, 'IFSC code is required']
  },
  accountType: {
    type: String,
    enum: ['Savings', 'Current', 'Other'],
    default: 'Savings'
  },
  upiId: {
    type: String
  },
  qrCodeImage: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model('BankDetails', BankDetailsSchema);

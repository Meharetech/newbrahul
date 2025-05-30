const mongoose = require('mongoose');

const bloodInventorySchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  units: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index to ensure a hospital can only have one record per blood type
bloodInventorySchema.index({ hospital: 1, bloodType: 1 }, { unique: true });

const BloodInventory = mongoose.model('BloodInventory', bloodInventorySchema);

module.exports = BloodInventory;

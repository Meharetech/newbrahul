const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  ngo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGO',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  goalType: {
    type: String,
    enum: ['Fundraising', 'Volunteers', 'Awareness', 'Awareness Drive', 'Volunteer Recruitment', 'Other'],
    required: true
  },
  goalAmount: {
    type: Number,
    default: 0
  },
  raisedAmount: {
    type: Number,
    default: 0
  },
  beneficiaries: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  image: {
    type: String
  },
  documents: [{
    type: String
  }],
  callToAction: {
    buttonText: {
      type: String,
      default: 'Support Now'
    },
    buttonLink: {
      type: String
    }
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  featured: {
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

module.exports = mongoose.model('Project', ProjectSchema);

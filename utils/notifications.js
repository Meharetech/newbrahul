const { sendEmail, emailTemplates } = require('./email');
const Donor = require('../models/Donor');
const User = require('../models/User');

// Send notification to nearby donors for blood request
exports.notifyNearbyDonors = async (request, maxDistance = 10000) => {
  try {
    // Find donors near the request location with matching blood type
    const donors = await Donor.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: request.location.coordinates
          },
          $maxDistance: maxDistance
        }
      },
      bloodType: request.bloodType,
      isAvailable: true
    }).populate('user', ['name', 'email']);

    // Send email to each donor
    const emailPromises = donors.map(async (donor) => {
      if (donor.user && donor.user.email) {
        const template = request.urgency === 'emergency' 
          ? emailTemplates.emergencyRequest(request)
          : emailTemplates.bloodRequest(request);
        
        return sendEmail(donor.user.email, template.subject, template.html);
      }
    });

    await Promise.all(emailPromises.filter(p => p)); // Filter out undefined promises
    
    return donors.length;
  } catch (error) {
    console.error('Error notifying donors:', error);
    throw error;
  }
};

// Send donation confirmation email
exports.sendDonationConfirmation = async (userId, donation) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.email) return false;
    
    const template = emailTemplates.donationConfirmation(donation);
    await sendEmail(user.email, template.subject, template.html);
    
    return true;
  } catch (error) {
    console.error('Error sending donation confirmation:', error);
    return false;
  }
};

// Send request fulfilled notification
exports.sendRequestFulfilledNotification = async (request) => {
  try {
    const user = await User.findById(request.requestedBy);
    if (!user || !user.email) return false;
    
    const template = emailTemplates.requestFulfilled(request);
    await sendEmail(user.email, template.subject, template.html);
    
    return true;
  } catch (error) {
    console.error('Error sending request fulfilled notification:', error);
    return false;
  }
};

// Send welcome email to new user
exports.sendWelcomeEmail = async (user) => {
  try {
    if (!user.email) return false;
    
    const template = emailTemplates.welcome(user.name);
    await sendEmail(user.email, template.subject, template.html);
    
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

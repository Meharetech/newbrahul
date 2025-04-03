const BloodRequest = require('../models/BloodRequest');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Donor = require('../models/Donor');
const notificationController = require('./notification.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const socketUtils = require('../utils/socket');
const { sendEmail } = require('../utils/email');

// Set up file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads/donation-proof');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const userId = req.user ? req.user.id : 'unknown';
      cb(null, `${Date.now()}-${userId}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 1024 * 1024 * 30 }, // 30 MB
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
});

// Upload donation proof middleware
exports.uploadDonationProof = (req, res, next) => {
  // Set the upload directory for donation proofs
  req.uploadDir = 'donation-proof';
  
  // Use single file upload with field name 'donationProof'
  const uploadSingle = upload.single('donationProof');

  // Log the request to help debug
  console.log('Received file upload request:', {
    body: req.body,
    files: req.files,
    headers: req.headers['content-type']
  });

  uploadSingle(req, res, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ 
        message: err.message || 'Error uploading file',
        error: err 
      });
    }
    
    // If no file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    console.log('File uploaded successfully:', req.file);

    // Add file path to request body
    const baseUrl = process.env.BACKEND_URL || `http://${req.get('host')}`;
    const relativePath = `/uploads/donation-proof/${req.file.filename}`;
    req.body.photoUrl = `${baseUrl}${relativePath}`;
    
    console.log('Photo URL set to:', req.body.photoUrl);
    
    next();
  });
};

// Get all blood requests
exports.getAllRequests = async (req, res) => {
  try {
    // Get the current user ID from the request
    const currentUserId = req.user ? req.user.id : null;
    
    // Create a filter to exclude requests created by the current user
    const filter = currentUserId ? { requestedBy: { $ne: currentUserId } } : {};
    
    // Find requests that match the filter
    const requests = await BloodRequest.find(filter)
      .populate('requestedBy', ['name', 'email'])
      .populate('donors.donor', ['user', 'bloodType']);
    
    console.log(`Found ${requests.length} blood requests (excluding user's own requests)`);
    
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get blood request by ID
exports.getRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requestedBy', ['name', 'email'])
      .populate('donors.donor', ['user', 'bloodType']);
    
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    res.json(request);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Blood request not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get blood requests for current user
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({ requestedBy: req.user.id })
      .sort({ createdAt: -1 })
      .populate('donors.donor');

    // Format the response with donor counts
    const formattedRequests = requests.map(request => {
      // Count accepted donors
      const acceptedDonorsCount = request.donors.filter(d => 
        d.status === 'accepted' || d.status === 'donated' || d.status === 'pending_confirmation'
      ).length;

      return {
        _id: request._id,
        requestedBy: request.requestedBy,
        patientName: request.patientName,
        bloodType: request.bloodType,
        unitsNeeded: request.unitsNeeded,
        hospital: request.hospital,
        location: request.location,
        urgency: request.urgency,
        reason: request.reason,
        status: request.status,
        requiredBy: request.requiredBy,
        donors: request.donors,
        contactInfo: request.contactInfo,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        acceptedDonorsCount: acceptedDonorsCount,
        maxDonorsReached: acceptedDonorsCount >= 3
      };
    });

    res.json(formattedRequests);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get blood requests history for current user
exports.getMyRequestHistory = async (req, res) => {
  try {
    const requests = await BloodRequest.find({ 
      requestedBy: req.user.id,
      // Only include requests that are not in pending status
      status: { $in: ['fulfilled', 'partially_fulfilled', 'cancelled'] }
    })
      .sort({ createdAt: -1 })
      .populate('donors.donor');

    // Format the response with additional statistics
    const formattedRequests = requests.map(request => {
      // Count donors by status
      const donorStats = {
        total: request.donors.length,
        donated: request.donors.filter(d => d.status === 'donated').length,
        accepted: request.donors.filter(d => d.status === 'accepted').length,
        pending: request.donors.filter(d => d.status === 'pending').length,
        declined: request.donors.filter(d => d.status === 'declined').length,
        rejected: request.donors.filter(d => d.status === 'rejected').length
      };

      return {
        _id: request._id,
        patientName: request.patientName,
        bloodType: request.bloodType,
        unitsNeeded: request.unitsNeeded,
        hospital: request.hospital,
        location: request.location,
        urgency: request.urgency,
        reason: request.reason,
        status: request.status,
        requiredBy: request.requiredBy,
        donorStats: donorStats,
        contactInfo: request.contactInfo,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        completionDate: request.status === 'fulfilled' ? 
          request.donors.filter(d => d.status === 'donated')
            .sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate))[0]?.donationDate : null
      };
    });

    // Add summary statistics
    const stats = {
      total: formattedRequests.length,
      fulfilled: formattedRequests.filter(r => r.status === 'fulfilled' && (!r.donorStats || r.donorStats.donated === 0)).length,
      partiallyFulfilled: formattedRequests.filter(r => r.status === 'partially_fulfilled').length,
      cancelled: formattedRequests.filter(r => r.status === 'cancelled').length,
      pending: formattedRequests.filter(r => r.status === 'pending').length,
      totalDonors: formattedRequests.reduce((acc, req) => acc + (req.donorStats?.total || 0), 0),
      totalDonated: formattedRequests.reduce((acc, req) => acc + (req.donorStats?.donated || 0), 0),
      donatedRequests: formattedRequests.filter(r => r.donorStats && r.donorStats.donated > 0).length
    };

    res.json({
      requests: formattedRequests,
      stats: stats
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new blood request
exports.createRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    patientName,
    bloodType,
    unitsNeeded,
    hospital,
    location,
    urgency,
    reason,
    requiredBy,
    contactInfo,
    userEmail // Get email from request if provided
  } = req.body;

  try {
    // Check if user has reached the daily limit of 15 requests
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow
    
    const requestCount = await BloodRequest.countDocuments({
      requestedBy: req.user.id,
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    if (requestCount >= 15) {
      return res.status(400).json({ 
        message: 'Daily limit reached. You can create a maximum of 15 blood requests per day.' 
      });
    }

    const newRequest = new BloodRequest({
      requestedBy: req.user.id,
      patientName,
      bloodType,
      unitsNeeded,
      hospital,
      location,
      urgency: urgency || 'normal',
      reason,
      requiredBy,
      contactInfo
    });

    const request = await newRequest.save();
    
    // Get user information for notification
    const user = await User.findById(req.user.id).select('name email');
    
    // Determine the email to use - prioritize user email from request, then from database
    // This ensures we use what the user entered in the form first
    const emailToUse = userEmail || contactInfo?.email || user?.email || null;
    
    console.log('Email determination:', {
      userEmailFromRequest: userEmail,
      contactInfoEmail: contactInfo?.email,
      userEmailFromDB: user?.email,
      finalEmailToUse: emailToUse
    });
    
    // Send notification to the user
    if (user) {
      // Add in-app notification
      await notificationController.addNotificationToUser(req.user.id, {
        title: 'Blood Request Created',
        message: `Your blood request for ${bloodType} blood type has been created successfully.`,
        type: 'new_blood_request',
        urgent: urgency === 'emergency'
      });
      
      // Also notify via socket if available
      socketUtils.notifyUser(req.user.id, 'new_blood_request', {
        title: 'Blood Request Created',
        message: `Your blood request for ${bloodType} blood type has been created successfully.`,
        requestId: request._id,
        email: emailToUse
      });
      
      // Send email notification
      if (emailToUse) {
        try {
          console.log(`Attempting to send email to ${emailToUse}`);
          
          // Create HTML content for email
          const htmlContent = `
            <h2 style="color: #e53e3e;">Your Blood Request Has Been Created</h2>
            <p>Dear ${user.name || patientName || 'User'},</p>
            <p>Your request for <strong>${bloodType}</strong> blood type has been successfully created.</p>
            <p><strong>Request Details:</strong></p>
            <ul style="list-style-type: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Patient Name:</strong> ${patientName}</li>
              <li style="margin-bottom: 8px;"><strong>Blood Type:</strong> ${bloodType}</li>
              <li style="margin-bottom: 8px;"><strong>Units Needed:</strong> ${unitsNeeded}</li>
              <li style="margin-bottom: 8px;"><strong>Hospital:</strong> ${hospital.name || 'Not specified'}</li>
              <li style="margin-bottom: 8px;"><strong>Location:</strong> ${hospital.address || ''}, ${hospital.city || ''}, ${hospital.state || ''}</li>
              <li style="margin-bottom: 8px;"><strong>Urgency:</strong> ${urgency || 'Normal'}</li>
              <li style="margin-bottom: 8px;"><strong>Required By:</strong> ${new Date(requiredBy).toLocaleDateString()}</li>
            </ul>
            <p>You will be notified when donors respond to your request.</p>
            <p>Thank you for using BloodHero!</p>
            <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
          `;
          
          // Send the email directly
          const emailResult = await sendEmail(
            emailToUse,
            `Blood Request Created: ${bloodType}`,
            htmlContent
          );
          
          console.log(`Email notification result:`, emailResult);
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Continue execution even if email fails
        }
      } else {
        console.log('No email address found for notification');
      }
    }
    
    // Find donors in the same state and city
    try {
      // Find donors with matching state and city
      const matchingDonors = await Donor.find({
        'address.state': hospital.state,
        'address.city': hospital.city,
        bloodType: { $in: getCompatibleBloodTypes(bloodType) }
      }).populate('user', 'name email');
      
      console.log(`Found ${matchingDonors.length} matching donors in ${hospital.city}, ${hospital.state}`);
      
      // Send email notifications to matching donors
      for (const donor of matchingDonors) {
        if (donor.user && donor.user.email) {
          try {
            const donorHtmlContent = `
              <h2 style="color: #e53e3e;">New Blood Request in Your Area</h2>
              <p>Dear ${donor.user.name || 'Donor'},</p>
              <p>A new blood request has been created in your area that matches your blood type.</p>
              <p><strong>Request Details:</strong></p>
              <ul style="list-style-type: none; padding-left: 0;">
                <li style="margin-bottom: 8px;"><strong>Blood Type Needed:</strong> ${bloodType}</li>
                <li style="margin-bottom: 8px;"><strong>Units Needed:</strong> ${unitsNeeded}</li>
                <li style="margin-bottom: 8px;"><strong>Location:</strong> ${hospital.city}, ${hospital.state}</li>
                <li style="margin-bottom: 8px;"><strong>Hospital:</strong> ${hospital.name || 'Not specified'}</li>
                <li style="margin-bottom: 8px;"><strong>Urgency:</strong> ${urgency || 'Normal'}</li>
                <li style="margin-bottom: 8px;"><strong>Required By:</strong> ${new Date(requiredBy).toLocaleDateString()}</li>
              </ul>
              <p>Please log in to your BloodHero account to view more details and respond to this request.</p>
              <p>Thank you for being a blood donor!</p>
              <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
            `;
            
            await sendEmail(
              donor.user.email,
              `Urgent: Blood Request in ${hospital.city} Needs Your Help`,
              donorHtmlContent
            );
            
            console.log(`Sent email notification to donor: ${donor.user.email}`);
            
            // Also add in-app notification
            await notificationController.addNotificationToUser(donor.user._id, {
              title: 'New Blood Request in Your Area',
              message: `A new request for ${bloodType} blood type has been created in your area.`,
              type: 'blood_request',
              urgent: urgency === 'emergency'
            });
            
          } catch (donorEmailError) {
            console.error(`Failed to send email to donor ${donor.user.email}:`, donorEmailError);
            // Continue with other donors even if one email fails
          }
        }
      }
    } catch (donorSearchError) {
      console.error('Error finding matching donors:', donorSearchError);
      // Continue execution even if donor notification fails
    }
    
    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Helper function to determine compatible blood types
function getCompatibleBloodTypes(requestedType) {
  // Blood type compatibility chart
  const compatibilityChart = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Can receive from all types
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-'] // Universal donor
  };
  
  return compatibilityChart[requestedType] || [requestedType];
}

// Update blood request
exports.updateRequest = async (req, res) => {
  const {
    patientName,
    bloodType,
    unitsNeeded,
    hospital,
    location,
    urgency,
    reason,
    status,
    requiredBy,
    contactInfo
  } = req.body;

  // Build request object
  const requestFields = {};
  if (patientName) requestFields.patientName = patientName;
  if (bloodType) requestFields.bloodType = bloodType;
  if (unitsNeeded) requestFields.unitsNeeded = unitsNeeded;
  if (hospital) requestFields.hospital = hospital;
  if (location) requestFields.location = location;
  if (urgency) requestFields.urgency = urgency;
  if (reason) requestFields.reason = reason;
  if (status) requestFields.status = status;
  if (requiredBy) requestFields.requiredBy = requiredBy;
  if (contactInfo) requestFields.contactInfo = contactInfo;

  try {
    let request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    // Check if user owns the request or is admin
    if (request.requestedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Update request
    request = await BloodRequest.findByIdAndUpdate(
      req.params.id,
      { $set: requestFields },
      { new: true }
    );

    res.json(request);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Blood request not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Respond to blood request (donor)
exports.respondToRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    const { status } = req.body;
    
    // Check if donor already responded
    const donorIndex = request.donors.findIndex(
      donor => donor.donor.toString() === req.params.donorId
    );

    if (donorIndex !== -1) {
      // Update existing response
      request.donors[donorIndex].status = status;
      request.donors[donorIndex].responseDate = Date.now();
    } else {
      // Add new response
      request.donors.push({
        donor: req.params.donorId,
        status,
        responseDate: Date.now()
      });
    }

    // Update request status if needed
    if (status === 'donated') {
      const donatedCount = request.donors.filter(d => d.status === 'donated').length;
      if (donatedCount >= request.unitsNeeded) {
        request.status = 'fulfilled';
      } else if (donatedCount > 0) {
        request.status = 'partially_fulfilled';
      }
    }

    await request.save();
    res.json(request);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Blood request not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete blood request
exports.deleteRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    // Check if user owns the request or is admin
    if (request.requestedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await request.remove();
    res.json({ message: 'Blood request removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Blood request not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Find nearby blood requests
exports.findNearbyRequests = async (req, res) => {
  try {
    const { lat, lng, bloodType, urgency, date } = req.query;
    const currentUserId = req.user.id;

    // Create base filter
    let filter = { requestedBy: { $ne: currentUserId } };

    // Add blood type filter if specified
    if (bloodType) {
      filter.bloodType = bloodType;
    }

    // Add urgency filter if specified
    if (urgency) {
      filter.urgency = urgency;
    }

    // Add date filter if specified
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      filter.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Find requests that match the filter
    const requests = await BloodRequest.find(filter)
      .populate('requestedBy', ['name', 'email'])
      .populate('donors.donor', ['user', 'bloodType']);

    // If coordinates are provided, calculate distances
    if (lat && lng) {
      const coordinates = [parseFloat(lng), parseFloat(lat)];
      
      // Add distance field to each request
      requests.forEach(request => {
        if (request.location && request.location.coordinates) {
          const distance = calculateDistance(
            coordinates[1],
            coordinates[0],
            request.location.coordinates[1],
            request.location.coordinates[0]
          );
          request._doc.distance = distance;
        }
      });
    }

    res.json(requests);
  } catch (err) {
    console.error('Error finding nearby requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept blood request (donor)
exports.acceptBloodRequest = async (req, res) => {
  try {
    // Get the request ID from params
    const requestId = req.params.id;
    
    // Get the accepted date from request body or use current time
    const acceptedDate = req.body.acceptedDate ? new Date(req.body.acceptedDate) : new Date();
    console.log(`Accepting request ${requestId} at time:`, acceptedDate);
    
    // Find the blood request
    const bloodRequest = await BloodRequest.findById(requestId);
    
    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found' });
    }
    
    // Find the user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the donor profile for the current user or create one if it doesn't exist
    let donor = await Donor.findOne({ user: req.user.id });
    
    if (!donor) {
      // Create a new donor profile with default values for all required fields
      donor = new Donor({
        user: req.user.id,
        bloodType: 'O+', // Default blood type
        age: 25, // Default age
        weight: 70, // Default weight in kg
        gender: 'male', // Default gender
        phone: user.phone || '0000000000', // Use user's phone or default
        location: {
          type: 'Point',
          coordinates: [0, 0] // Default coordinates
        },
        isAvailable: true,
        acceptedRequests: []
      });
      
      await donor.save();
      console.log('Created new donor profile for user:', req.user.id);
    }
    
    // Check if donor already responded to this request
    const existingDonorIndex = bloodRequest.donors.findIndex(
      d => d.donor && d.donor.toString() === donor._id.toString()
    );
    
    if (existingDonorIndex !== -1) {
      return res.status(400).json({ 
        message: 'You have already responded to this blood request' 
      });
    }
    
    // Check if the request already has 3 or more accepted donors
    const acceptedDonorsCount = bloodRequest.donors.filter(d => 
      d.status === 'accepted' || d.status === 'donated' || d.status === 'pending_confirmation'
    ).length;
    
    if (acceptedDonorsCount >= 3) {
      return res.status(400).json({
        message: 'This request already has the maximum number of donors (3) and cannot accept more'
      });
    }
    
    // Add donor to the request's donors array
    bloodRequest.donors.push({
      donor: donor._id,
      status: 'accepted',
      responseDate: acceptedDate
    });
    
    // Update request status if needed
    const acceptedCount = bloodRequest.donors.filter(d => d.status === 'accepted' || d.status === 'donated').length;
    
    if (acceptedCount >= bloodRequest.unitsNeeded) {
      bloodRequest.status = 'fulfilled';
    } else if (acceptedCount > 0) {
      bloodRequest.status = 'partially_fulfilled';
    }
    
    // Save the updated request
    await bloodRequest.save();
    
    // Also update the donor's accepted requests
    donor.acceptedRequests = donor.acceptedRequests || [];
    donor.acceptedRequests.push({
      request: bloodRequest._id,
      acceptedAt: acceptedDate,
      status: 'accepted'
    });
    
    await donor.save();
    
    // Get requester information for notification
    const requester = await User.findById(bloodRequest.requestedBy);
    
    // Send notification to the requester
    if (requester) {
      // Add in-app notification
      await notificationController.addNotificationToUser(requester._id, {
        title: 'Donor Accepted Your Request',
        message: `A donor has accepted your blood request for ${bloodRequest.bloodType} blood type.`,
        type: 'request_accepted',
        urgent: bloodRequest.urgency === 'emergency',
        data: {
          requestId: bloodRequest._id,
          donorId: donor._id
        }
      });
      
      // Notify via socket if available
      socketUtils.notifyUser(requester._id, 'request_accepted', {
        title: 'Donor Accepted Your Request',
        message: `A donor has accepted your blood request for ${bloodRequest.bloodType} blood type.`,
        requestId: bloodRequest._id,
        donorId: donor._id
      });
      
      // Send email notification if email is available
      if (requester.email || bloodRequest.contactInfo?.email) {
        const emailToUse = bloodRequest.contactInfo?.email || requester.email;
        
        try {
          // Create HTML content for email
          const htmlContent = `
            <h2 style="color: #e53e3e;">Donor Accepted Your Blood Request</h2>
            <p>Dear ${requester.name || 'User'},</p>
            <p>A donor has accepted your blood request for <strong>${bloodRequest.bloodType}</strong> blood type.</p>
            <p><strong>Request Details:</strong></p>
            <ul style="list-style-type: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Patient Name:</strong> ${bloodRequest.patientName}</li>
              <li style="margin-bottom: 8px;"><strong>Blood Type:</strong> ${bloodRequest.bloodType}</li>
              <li style="margin-bottom: 8px;"><strong>Units Needed:</strong> ${bloodRequest.unitsNeeded}</li>
              <li style="margin-bottom: 8px;"><strong>Hospital:</strong> ${bloodRequest.hospital?.name || 'Not specified'}</li>
              <li style="margin-bottom: 8px;"><strong>Location:</strong> ${bloodRequest.hospital?.address || ''}, ${bloodRequest.hospital?.city || ''}, ${bloodRequest.hospital?.state || ''}</li>
              <li style="margin-bottom: 8px;"><strong>Urgency:</strong> ${bloodRequest.urgency || 'Normal'}</li>
              <li style="margin-bottom: 8px;"><strong>Required By:</strong> ${new Date(bloodRequest.requiredBy).toLocaleDateString()}</li>
            </ul>
            <p>Thank you for using BloodHero!</p>
            <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
          `;
          
          // Send the email directly
          const emailResult = await sendEmail(
            emailToUse,
            `Donor Accepted Your Blood Request: ${bloodRequest.bloodType}`,
            htmlContent
          );
          
          console.log(`Email notification result:`, emailResult);
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Continue execution even if email fails
        }
      } else {
        console.log('No email address found for notification');
      }
    }
    
    // Send email notification to the donor
    if (user.email) {
      try {
        console.log(`Attempting to send email to donor: ${user.email}`);
        
        // Format the required date
        const requiredDate = bloodRequest.requiredBy ? new Date(bloodRequest.requiredBy).toLocaleDateString() : 'Not specified';
        
        // Create HTML content for donor email
        const donorHtmlContent = `
          <h2 style="color: #e53e3e;">Blood Request Acceptance Confirmation</h2>
          <p>Dear ${user.name || 'Donor'},</p>
          <p>Thank you for accepting the blood request. Your commitment to donate blood can save lives!</p>
          <p><strong>Request Details You Accepted:</strong></p>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 8px;"><strong>Patient Name:</strong> ${bloodRequest.patientName || 'Not specified'}</li>
            <li style="margin-bottom: 8px;"><strong>Blood Type:</strong> ${bloodRequest.bloodType}</li>
            <li style="margin-bottom: 8px;"><strong>Hospital:</strong> ${bloodRequest.hospital?.name || 'Not specified'}</li>
            <li style="margin-bottom: 8px;"><strong>Location:</strong> ${bloodRequest.hospital?.address || ''}, ${bloodRequest.hospital?.city || ''}, ${bloodRequest.hospital?.state || ''}</li>
            <li style="margin-bottom: 8px;"><strong>Required By:</strong> ${requiredDate}</li>
          </ul>
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Visit the hospital at the specified location.</li>
            <li>Inform the hospital staff that you're there to donate for ${bloodRequest.patientName || 'the patient'}.</li>
            <li>After donation, upload proof of donation through the BloodHero app.</li>
          </ol>
          <p>You can view all your accepted requests in the "Accepted Requests" section of your BloodHero dashboard.</p>
          <p>Thank you for your generosity and for being a hero!</p>
          <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
        `;
        
        // Send the email to the donor with direct method call
        const donorEmailResult = await sendEmail(
          user.email,
          `Blood Donation Request Accepted: ${bloodRequest.bloodType}`,
          donorHtmlContent
        );
        
        console.log(`Donor email notification result:`, donorEmailResult);
        
        // Also add in-app notification to donor
        await notificationController.addNotificationToUser(user.id, {
          title: 'Blood Request Accepted',
          message: `You have successfully accepted a blood request for ${bloodRequest.bloodType} blood type.`,
          type: 'request_accepted',
          data: {
            requestId: bloodRequest._id
          }
        });
        
      } catch (donorEmailError) {
        console.error('Failed to send email notification to donor:', donorEmailError);
        console.error('Error details:', donorEmailError.message);
        // Continue execution even if email fails
      }
    } else {
      console.log('No donor email address found for notification. User:', user);
    }
    
    res.json(bloodRequest);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get donor's accepted blood requests
exports.getAcceptedRequests = async (req, res) => {
  try {
    // Find the donor profile for the current user
    const donor = await Donor.findOne({ user: req.user.id });
    
    if (!donor) {
      return res.status(404).json({ message: 'Donor profile not found' });
    }
    
    // Find the donor with populated accepted requests
    const donorWithRequests = await Donor.findById(donor._id)
      .populate({
        path: 'acceptedRequests.request',
        model: 'BloodRequest',
        populate: [
          {
            path: 'requestedBy',
            model: 'User',
            select: 'name email'
          }
        ]
      });
    
    // Format the response data
    const acceptedRequests = donorWithRequests.acceptedRequests.map(item => {
      const request = item.request;
      
      // Skip if the request has been deleted
      if (!request) {
        return null;
      }
      
      // Ensure consistent status format
      let status = item.status;
      // Don't capitalize the status to maintain consistency with the frontend filter
      // This ensures that 'pending_confirmation' stays as is and doesn't become 'Pending_confirmation'
      
      return {
        requestId: request._id,
        bloodGroup: request.bloodType,
        requesterName: request.patientName,
        requesterInfo: request.requestedBy,
        phone: request.contactInfo?.phone || 'N/A',
        location: `${request.hospital?.city || ''}, ${request.hospital?.state || ''}`,
        address: request.hospital?.address || 'N/A',
        status: status, // Use the original status value without capitalization
        hospitalName: request.hospital?.name || 'N/A',
        urgencyLevel: request.urgency === 'emergency' ? 'Critical' : 
                     request.urgency === 'urgent' ? 'High' : 'Normal',
        unitsNeeded: request.unitsNeeded,
        createdAt: request.createdAt, // Include full creation timestamp
        acceptedDate: item.acceptedAt, // Include full acceptance timestamp
        donationDate: item.donationDate || null,
        notes: item.notes || '',
        requesterFeedback: item.requesterFeedback || '',
        needsReupload: item.needsReupload || false,
        donationProofPhoto: item.donationProofPhoto || null
      };
    }).filter(Boolean); // Remove null items (deleted requests)
    
    res.json(acceptedRequests);
  } catch (err) {
    console.error('Error fetching accepted requests:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get directions to a fixed location
// @route   GET /api/requests/directions/:requestId
// @access  Private
exports.getDirectionsToRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    
    // Validate request ID
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request ID format' });
    }
    
    // Get the request
    const bloodRequest = await BloodRequest.findById(requestId);
    
    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found' });
    }
    
    // Use the fixed coordinates for the destination
    const fixedCoordinates = {
      lat: 29.159770,
      lng: 75.737342
    };
    
    // Get user's current location from query params
    const { userLat, userLng } = req.query;
    
    if (!userLat || !userLng) {
      return res.status(400).json({ message: 'User coordinates are required' });
    }
    
    // Return the directions data
    res.json({
      requestId: bloodRequest._id,
      requestDetails: {
        patientName: bloodRequest.patientName,
        bloodType: bloodRequest.bloodType,
        hospital: bloodRequest.hospital,
        urgency: bloodRequest.urgency
      },
      userLocation: {
        lat: parseFloat(userLat),
        lng: parseFloat(userLng)
      },
      destinationLocation: fixedCoordinates
    });
  } catch (error) {
    console.error('Error getting directions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Confirm blood donation with photo proof
exports.confirmDonation = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { photoUrl, notes } = req.body;
    const userId = req.user.id;

    // Find the blood request
    const bloodRequest = await BloodRequest.findById(requestId)
      .populate('requestedBy', 'name email')
      .populate('hospital');
    
    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    // Find the donor
    const donor = await Donor.findOne({ user: userId }).populate('user', 'name email');
    if (!donor) {
      return res.status(404).json({ message: 'Donor profile not found' });
    }

    // Find the accepted request in donor's acceptedRequests array
    const acceptedRequestIndex = donor.acceptedRequests.findIndex(
      ar => ar.request.toString() === requestId
    );

    if (acceptedRequestIndex === -1) {
      return res.status(404).json({ message: 'You have not accepted this request' });
    }

    // Update the donor's accepted request with the photo and notes
    donor.acceptedRequests[acceptedRequestIndex].donationProofPhoto = photoUrl;
    donor.acceptedRequests[acceptedRequestIndex].notes = notes;
    donor.acceptedRequests[acceptedRequestIndex].donationDate = new Date();
    donor.acceptedRequests[acceptedRequestIndex].status = 'pending_confirmation';
    await donor.save();

    // Find the donor in the blood request's donors array
    const donorInRequestIndex = bloodRequest.donors.findIndex(
      d => d.donor.toString() === donor._id.toString()
    );

    if (donorInRequestIndex === -1) {
      return res.status(404).json({ message: 'Donor not found in request' });
    }

    // Update the blood request's donor entry with the photo and notes
    bloodRequest.donors[donorInRequestIndex].donationProofPhoto = photoUrl;
    bloodRequest.donors[donorInRequestIndex].notes = notes;
    bloodRequest.donors[donorInRequestIndex].donationDate = new Date();
    bloodRequest.donors[donorInRequestIndex].status = 'pending_confirmation';
    bloodRequest.donors[donorInRequestIndex].donorName = donor.user.name;
    bloodRequest.donors[donorInRequestIndex].donorEmail = donor.user.email;
    bloodRequest.donors[donorInRequestIndex].donorPhone = donor.user.phone || donor.phone;
    
    // Store the accepted date if available
    if (donor.acceptedRequests[acceptedRequestIndex].acceptedAt) {
      bloodRequest.donors[donorInRequestIndex].acceptedDate = donor.acceptedRequests[acceptedRequestIndex].acceptedAt;
    }
    
    await bloodRequest.save();

    // Get donor's user information for the email
    const donorUser = await User.findById(userId);

    // Send email notification to the requester
    const requester = bloodRequest.requestedBy;
    if (requester && requester.email) {
      // Create a verification link for the email
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3012'}/dashboard/requester/verify-donation/${requestId}/${donor._id}`;
      
      // Create email data
      const emailData = {
        requesterName: requester.name,
        donorName: donorUser.name,
        donorEmail: donorUser.email,
        donorPhone: donor.user.phone || donor.phone || 'Not provided',
        acceptedDate: donor.acceptedRequests[acceptedRequestIndex].acceptedAt 
          ? new Date(donor.acceptedRequests[acceptedRequestIndex].acceptedAt).toLocaleDateString()
          : 'Not recorded',
        bloodType: bloodRequest.bloodType || bloodRequest.bloodGroup,
        hospitalName: bloodRequest.hospital ? bloodRequest.hospital.name : 'Not specified',
        donationDate: new Date().toLocaleDateString(),
        notes: notes || 'No additional notes provided',
        photoUrl,
        verificationLink
      };

      // Create HTML content directly instead of using emailTemplates
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #e53e3e; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; background-color: #e53e3e; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; }
            .info-box { background-color: #f0f0f0; padding: 15px; margin: 15px 0; border-left: 4px solid #e53e3e; }
            .photo-container { margin: 20px 0; }
            .photo { max-width: 100%; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Blood Donation Confirmation</h1>
            </div>
            <div class="content">
              <p>Dear ${emailData.requesterName || 'Requester'},</p>
              <p>A donor has confirmed their blood donation for your request. Please verify this donation.</p>
              
              <div class="info-box">
                <h3>Donation Details:</h3>
                <p><strong>Donor Name:</strong> ${emailData.donorName}</p>
                <p><strong>Donor Email:</strong> ${emailData.donorEmail}</p>
                <p><strong>Donor Phone:</strong> ${emailData.donorPhone}</p>
                <p><strong>Blood Type:</strong> ${emailData.bloodType}</p>
                <p><strong>Hospital:</strong> ${emailData.hospitalName}</p>
                <p><strong>Donation Date:</strong> ${emailData.donationDate}</p>
                <p><strong>Notes:</strong> ${emailData.notes}</p>
              </div>
              
              <div class="photo-container">
                <p><strong>Donation Proof:</strong></p>
                <img src="${emailData.photoUrl}" alt="Donation Proof" class="photo">
              </div>
              
              <p>Please verify this donation by clicking the button below:</p>
              <p style="text-align: center;">
                <a href="${emailData.verificationLink}" class="button">Verify Donation</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p>${emailData.verificationLink}</p>
            </div>
            <div class="footer">
              <p>Thank you for using BloodHero!</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      try {
        await sendEmail(
          requester.email,
          'Blood Donation Confirmation',
          emailHtml
        );
        console.log('Donation confirmation email sent successfully');
      } catch (emailError) {
        console.error('Failed to send donation confirmation email:', emailError);
        // Continue execution even if email fails
      }
    }

    res.status(200).json({ 
      message: 'Donation confirmation submitted successfully. Waiting for requester verification.',
      donationDate: donor.acceptedRequests[acceptedRequestIndex].donationDate,
      status: 'pending_confirmation',
      photoUrl: photoUrl
    });
  } catch (error) {
    console.error('Error confirming donation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update donation status (confirm or reject by requester)
exports.updateDonationStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { donorId, donationStatus, feedback } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!donationStatus || !['confirmed', 'rejected', 'reupload'].includes(donationStatus)) {
      return res.status(400).json({ message: 'Invalid donation status' });
    }

    // Find the blood request and verify ownership
    const bloodRequest = await BloodRequest.findById(requestId);
    
    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    // Verify that the user is the requester
    if (bloodRequest.requestedBy._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this request' });
    }

    console.log('Looking for donor with ID:', donorId, 'in request:', requestId);
    console.log('Available donors:', bloodRequest.donors.map(d => ({
      donorId: d.donor.toString(),
      status: d.status
    })));
    
    const donorEntry = bloodRequest.donors.find(d => {
      // Handle both string IDs and object IDs
      const donorIdStr = donorId.toString();
      const currentDonorId = typeof d.donor === 'object' ? d.donor._id.toString() : d.donor.toString();
      return currentDonorId === donorIdStr;
    });

    if (!donorEntry) {
      return res.status(404).json({ message: 'Donor not found in this request' });
    }

    // Verify that the donation is in pending_confirmation status
    if (donorEntry.status !== 'pending_confirmation') {
      return res.status(400).json({ 
        message: 'This donation is not awaiting confirmation',
        currentStatus: donorEntry.status
      });
    }

    // Update the donor entry status
    if (donationStatus === 'confirmed') {
      donorEntry.status = 'donated';
      
      // Mark the request as fulfilled immediately when one donor is verified
      bloodRequest.status = 'fulfilled';
      
      // Reject all other donors who are not yet donated or rejected
      const otherDonors = bloodRequest.donors.filter(d => 
        d.donor.toString() !== donorId.toString() && 
        d.status !== 'donated' && 
        d.status !== 'rejected'
      );
      
      console.log(`Found ${otherDonors.length} other donors to reject`);
      
      // Update status for other donors
      for (const otherDonor of otherDonors) {
        otherDonor.status = 'rejected';
        otherDonor.requesterFeedback = 'Blood has already been received from another donor. Thank you for your willingness to help.';
        
        // Find and update the donor's acceptedRequests array
        try {
          const donorToUpdate = await Donor.findById(otherDonor.donor);
          if (donorToUpdate) {
            const acceptedRequestIndex = donorToUpdate.acceptedRequests.findIndex(
              ar => ar.request.toString() === requestId
            );
            
            if (acceptedRequestIndex !== -1) {
              donorToUpdate.acceptedRequests[acceptedRequestIndex].status = 'rejected';
              donorToUpdate.acceptedRequests[acceptedRequestIndex].requesterFeedback = 
                'Blood has already been received from another donor. Thank you for your willingness to help.';
              await donorToUpdate.save();
              
              // Send notification to the rejected donor
              if (donorToUpdate.user) {
                const donorUser = await User.findById(donorToUpdate.user);
                if (donorUser && donorUser.email) {
                  // Send email notification
                  await notificationController.sendEmail({
                    to: donorUser.email,
                    subject: 'Blood Donation No Longer Needed',
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                        <h2 style="color: #d32f2f;">Blood Donation Update</h2>
                        <p>Dear ${donorUser.name},</p>
                        <p>Thank you for your willingness to donate blood for request #${requestId.substring(0, 8)}.</p>
                        <p>We want to inform you that the required blood has already been received from another donor.</p>
                        <p>Your commitment to helping others is greatly appreciated, and we encourage you to check other blood donation requests that may need your help.</p>
                        <p>Best regards,<br>The BloodHero Team</p>
                      </div>
                    `
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('Error updating other donor status:', error);
          // Continue with the main flow even if there's an error updating other donors
        }
      }
    } else if (donationStatus === 'rejected') {
      donorEntry.status = 'rejected';
    } else if (donationStatus === 'reupload') {
      // Delete the existing donation proof image if it exists
      if (donorEntry.donationProofPhoto) {
        try {
          // Extract the filename from the URL
          const photoUrl = donorEntry.donationProofPhoto;
          const filename = photoUrl.split('/').pop();
          const filePath = path.join(__dirname, '..', 'uploads', 'donation-proof', filename);
          
          console.log('Attempting to delete file:', filePath);
          
          // Check if file exists before deleting
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Successfully deleted donation proof image:', filename);
          } else {
            console.log('File not found, nothing to delete:', filePath);
          }
        } catch (deleteError) {
          console.error('Error deleting donation proof image:', deleteError);
          // Continue execution even if file deletion fails
        }
      }
      
      // Reset the donation proof photo
      donorEntry.donationProofPhoto = null;
      donorEntry.status = 'accepted';
      donorEntry.needsReupload = true; // Flag to indicate reupload is needed
    }
    
    donorEntry.requesterFeedback = feedback;
    
    // If all required units are fulfilled, update the request status
    if (donationStatus === 'confirmed') {
      const donatedUnits = bloodRequest.donors.filter(d => d.status === 'donated').length;
      if (donatedUnits >= bloodRequest.unitsNeeded) {
        bloodRequest.status = 'fulfilled';
      } else if (donatedUnits > 0) {
        bloodRequest.status = 'partially_fulfilled';
      }
    }
    
    await bloodRequest.save();

    // Update the donor's accepted request status
    try {
      // First try to find by direct ID
      let donor = await Donor.findById(donorId).populate('user', 'name email');
      
      // If not found, try to find by user ID
      if (!donor) {
        donor = await Donor.findOne({ 'user': donorId }).populate('user', 'name email');
      }
      
      // If still not found, try to find by accepted requests
      if (!donor) {
        donor = await Donor.findOne({ 'acceptedRequests.request': requestId }).populate('user', 'name email');
      }
      
      console.log('Found donor:', donor ? donor._id : 'Not found');
      
      if (donor) {
        const acceptedRequestIndex = donor.acceptedRequests.findIndex(
          ar => ar.request.toString() === requestId
        );

        if (acceptedRequestIndex !== -1) {
          if (donationStatus === 'confirmed') {
            donor.acceptedRequests[acceptedRequestIndex].status = 'donated';
          } else if (donationStatus === 'rejected') {
            donor.acceptedRequests[acceptedRequestIndex].status = 'rejected';
          } else if (donationStatus === 'reupload') {
            // Delete the existing donation proof image if it exists
            if (donor.acceptedRequests[acceptedRequestIndex].donationProofPhoto) {
              try {
                // Extract the filename from the URL
                const photoUrl = donor.acceptedRequests[acceptedRequestIndex].donationProofPhoto;
                const filename = photoUrl.split('/').pop();
                const filePath = path.join(__dirname, '..', 'uploads', 'donation-proof', filename);
                
                console.log('Attempting to delete file:', filePath);
                
                // Check if file exists before attempting to delete
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  console.log('Successfully deleted donation proof image from donor record:', filename);
                }
              } catch (deleteError) {
                console.error('Error deleting donation proof image from donor record:', deleteError);
                // Continue execution even if file deletion fails
              }
            }
            
            // Reset the donation proof photo in the donor's record
            donor.acceptedRequests[acceptedRequestIndex].donationProofPhoto = null;
            donor.acceptedRequests[acceptedRequestIndex].status = 'accepted';
            donor.acceptedRequests[acceptedRequestIndex].needsReupload = true;
          }
          donor.acceptedRequests[acceptedRequestIndex].requesterFeedback = feedback;
          await donor.save();
        }
        
        // Send notification to donor
        if (donor.user && donor.user.email) {
          const emailData = {
            donorName: donor.user.name,
            requesterName: bloodRequest.requestedBy.name,
            bloodType: bloodRequest.bloodType || bloodRequest.bloodGroup,
            hospitalName: bloodRequest.hospital ? bloodRequest.hospital.name : 'Not specified',
            status: donationStatus === 'confirmed' ? 'confirmed' : donationStatus === 'reupload' ? 'reupload' : 'rejected',
            feedback: feedback || 'No feedback provided'
          };
          
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <h2 style="color: #d32f2f;">Donation Status Update</h2>
              <p>Dear ${emailData.donorName},</p>
              <p>Your blood donation for request #${requestId.substring(0, 8)} has been ${emailData.status}.</p>
              <p><strong>Request Details:</strong></p>
              <ul style="list-style-type: none; padding-left: 0;">
                <li style="margin-bottom: 8px;"><strong>Blood Type:</strong> ${emailData.bloodType}</li>
                <li style="margin-bottom: 8px;"><strong>Hospital:</strong> ${emailData.hospitalName}</li>
              </ul>
              <p><strong>Feedback from Requester:</strong> ${emailData.feedback}</p>
              <p>Thank you for your generosity!</p>
              <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
            </div>
          `;
          
          await sendEmail(
            donor.user.email,
            `Your Blood Donation was ${donationStatus === 'confirmed' ? 'Confirmed' : donationStatus === 'reupload' ? 'Needs Reupload' : 'Rejected'}`,
            emailHtml
          );
        }
        
        // Also send in-app notification
        if (donor.user) {
          try {
            // Add notification directly to the user model
            const user = await User.findById(donor.user._id);
            if (user) {
              user.notifications.push({
                type: donationStatus === 'confirmed' ? 'donation_confirmed' : donationStatus === 'reupload' ? 'donation_reupload' : 'donation_rejected',
                title: donationStatus === 'confirmed' ? 'Donation Confirmed' : donationStatus === 'reupload' ? 'Donation Needs Reupload' : 'Donation Rejected',
                message: donationStatus === 'confirmed' 
                  ? `Your blood donation for request #${requestId.substring(0, 8)} has been confirmed. Thank you!` 
                  : donationStatus === 'reupload'
                    ? `Your blood donation proof for request #${requestId.substring(0, 8)} needs to be reuploaded. Reason: ${feedback || 'No reason provided'}` 
                    : `Your blood donation for request #${requestId.substring(0, 8)} has been rejected. Reason: ${feedback || 'No reason provided'}`,
                data: {
                  requestId,
                  status: donationStatus
                },
                read: false,
                date: new Date()
              });
              
              await user.save();
              
              // Emit socket event if socket utility is available
              if (socketUtils && socketUtils.getIO()) {
                socketUtils.getIO().to(donor.user._id.toString()).emit('notification', {
                  type: donationStatus === 'confirmed' ? 'donation_confirmed' : donationStatus === 'reupload' ? 'donation_reupload' : 'donation_rejected',
                  message: donationStatus === 'confirmed' 
                    ? 'Your blood donation has been confirmed!' 
                    : donationStatus === 'reupload'
                      ? 'Please reupload your donation proof.'
                      : 'Your blood donation has been rejected.'
                });
              }
            }
          } catch (notificationError) {
            console.error('Error sending notification:', notificationError);
            // Continue execution even if notification fails
          }
        }
      }
    } catch (error) {
      console.error('Error updating donor record:', error);
      // Continue execution even if donor update fails
    }

    res.status(200).json({ 
      message: `Donation ${donationStatus === 'confirmed' ? 'confirmed' : donationStatus === 'reupload' ? 'needs reupload' : 'rejected'} successfully`,
      status: bloodRequest.status
    });
  } catch (error) {
    console.error('Error updating donation status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

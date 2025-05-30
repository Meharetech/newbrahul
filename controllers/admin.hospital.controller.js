const Hospital = require('../models/Hospital');
const { validationResult } = require('express-validator');
const { sendEmail } = require('../utils/email');

/**
 * @route   GET /api/admin/hospitals
 * @desc    Get all hospitals
 * @access  Private (Admin only)
 */
exports.getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find()
      .sort({ registrationDate: -1 })
      .select('-password');
    
    res.json(hospitals);
  } catch (err) {
    console.error('Error fetching hospitals:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @route   GET /api/admin/hospitals/:id
 * @desc    Get hospital by ID
 * @access  Private (Admin only)
 */
exports.getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).select('-password');
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    res.json(hospital);
  } catch (err) {
    console.error('Error fetching hospital:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @route   PUT /api/admin/hospitals/:id/status
 * @desc    Update hospital status (approve/reject)
 * @access  Private (Admin only)
 */
exports.updateHospitalStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { status } = req.body;
  
  // Validate status
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }
  
  try {
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    // Update status
    hospital.status = status;
    await hospital.save();
    
    // Send email notification to hospital
    try {
      const statusText = status === 'approved' ? 'approved' : 
                         status === 'rejected' ? 'rejected' : 'pending review';
      
      const emailSubject = `Hospital Registration ${status.charAt(0).toUpperCase() + status.slice(1)}`;
      
      let emailContent = `<p>Dear ${hospital.name},</p>`;
      
      if (status === 'approved') {
        emailContent += `
          <p>We are pleased to inform you that your hospital registration has been approved.</p>
          <p>You can now log in to your account and access all features of our platform.</p>
        `;
      } else if (status === 'rejected') {
        emailContent += `
          <p>We regret to inform you that your hospital registration has been rejected.</p>
          <p>If you believe this is an error or would like more information, please contact our support team.</p>
        `;
      } else {
        emailContent += `
          <p>Your hospital registration status has been updated to pending review.</p>
          <p>We will notify you once a decision has been made.</p>
        `;
      }
      
      emailContent += `
        <p>Thank you for your interest in our platform.</p>
        <p>Regards,<br>BloodHero Team</p>
      `;
      
      await sendEmail(
        hospital.email,
        emailSubject,
        emailContent
      );
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
      // Continue with the response even if email fails
    }
    
    res.json({ 
      message: `Hospital status updated to ${status}`,
      hospital: {
        _id: hospital._id,
        name: hospital.name,
        email: hospital.email,
        status: hospital.status
      }
    });
  } catch (err) {
    console.error('Error updating hospital status:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @route   DELETE /api/admin/hospitals/:id
 * @desc    Delete a hospital
 * @access  Private (Admin only)
 */
exports.deleteHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    await hospital.remove();
    
    res.json({ message: 'Hospital removed successfully' });
  } catch (err) {
    console.error('Error deleting hospital:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

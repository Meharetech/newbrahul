const BankDetails = require('../models/BankDetails');
const NGO = require('../models/NGO');

// Create or update bank details
exports.updateBankDetails = async (req, res) => {
  try {
    console.log('Updating bank details, request body:', req.body);
    console.log('File in request:', req.file);
    
    // Check if ngo object exists in request
    if (!req.ngo || !req.ngo.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const ngoId = req.ngo.id;
    console.log('NGO ID:', ngoId);
    
    // Check if NGO exists
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
    }

    const {
      accountHolderName,
      accountNumber,
      bankName,
      branchName,
      ifscCode,
      accountType,
      upiId
    } = req.body;

    // Check if bank details already exist for this NGO
    let bankDetails = await BankDetails.findOne({ ngo: ngoId });
    console.log('Existing bank details:', bankDetails);

    // Prepare update data
    const bankDetailsData = {
      accountHolderName,
      accountNumber,
      bankName,
      branchName,
      ifscCode,
      accountType: accountType || 'Savings',
      upiId,
      updatedAt: Date.now()
    };

    // If QR code image is provided in the request
    if (req.file) {
      // Create a URL path that can be accessed from the frontend
      const qrCodePath = `/uploads/qrcodes/${req.file.filename}`;
      console.log('QR code path:', qrCodePath);
      bankDetailsData.qrCodeImage = qrCodePath;
    }

    console.log('Bank details data to save:', bankDetailsData);

    if (bankDetails) {
      // Update existing bank details
      bankDetails = await BankDetails.findOneAndUpdate(
        { ngo: ngoId },
        { $set: bankDetailsData },
        { new: true }
      );
      console.log('Updated bank details:', bankDetails);
    } else {
      // Create new bank details
      bankDetailsData.ngo = ngoId;
      bankDetails = await BankDetails.create(bankDetailsData);
      console.log('Created new bank details:', bankDetails);
    }

    res.status(200).json({
      success: true,
      data: bankDetails,
      message: 'Bank details updated successfully'
    });
  } catch (error) {
    console.error('Error updating bank details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get bank details for an NGO
exports.getBankDetails = async (req, res) => {
  try {
    const ngoId = req.ngo.id;
    
    const bankDetails = await BankDetails.findOne({ ngo: ngoId });
    
    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        message: 'Bank details not found'
      });
    }

    res.status(200).json({
      success: true,
      data: bankDetails
    });
  } catch (error) {
    console.error('Error fetching bank details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get bank details for a specific project (for donors)
exports.getProjectBankDetails = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Find the project and get the NGO ID
    const project = await require('../models/Project').findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const ngoId = project.ngo;
    
    // Get bank details for this NGO
    const bankDetails = await BankDetails.findOne({ ngo: ngoId });
    
    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        message: 'Bank details not found for this project'
      });
    }

    // Return only necessary information for public access
    const publicBankDetails = {
      accountHolderName: bankDetails.accountHolderName,
      bankName: bankDetails.bankName,
      accountNumber: bankDetails.accountNumber,
      ifscCode: bankDetails.ifscCode,
      upiId: bankDetails.upiId,
      qrCodeImage: bankDetails.qrCodeImage
    };

    res.status(200).json({
      success: true,
      data: publicBankDetails
    });
  } catch (error) {
    console.error('Error fetching project bank details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete bank details
exports.deleteBankDetails = async (req, res) => {
  try {
    const ngoId = req.ngo.id;
    
    const result = await BankDetails.findOneAndDelete({ ngo: ngoId });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Bank details not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bank details deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bank details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get public bank details for an NGO by ID (no authentication required)
exports.getPublicNgoBankDetails = async (req, res) => {
  try {
    const { ngoId } = req.params;
    
    if (!ngoId) {
      return res.status(400).json({
        success: false,
        message: 'NGO ID is required'
      });
    }
    
    // Find the NGO to verify it exists and is approved
    const ngo = await NGO.findById(ngoId);
    
    if (!ngo || ngo.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'NGO not found or not approved'
      });
    }
    
    // Get bank details for this NGO
    const bankDetails = await BankDetails.findOne({ ngo: ngoId });
    
    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        message: 'Bank details not found for this NGO'
      });
    }

    // Return only necessary information for public access
    const publicBankDetails = {
      accountHolderName: bankDetails.accountHolderName,
      bankName: bankDetails.bankName,
      accountNumber: bankDetails.accountNumber,
      ifscCode: bankDetails.ifscCode,
      branchName: bankDetails.branchName,
      accountType: bankDetails.accountType,
      upiId: bankDetails.upiId,
      // Ensure the QR code path is properly formatted
      qrCodeImage: bankDetails.qrCodeImage
    };
    
    console.log('Bank details being sent to frontend:', publicBankDetails);

    res.status(200).json({
      success: true,
      data: publicBankDetails
    });
  } catch (error) {
    console.error('Error fetching NGO bank details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

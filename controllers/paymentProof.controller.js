const PaymentProof = require('../models/PaymentProof');
const Project = require('../models/Project');
const path = require('path');
const fs = require('fs');

// Base directory for uploads
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const PAYMENTS_DIR = path.join(UPLOADS_DIR, 'payments');

// Submit payment proof
exports.submitPaymentProof = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      donorName, 
      donorEmail, 
      donorPhone, 
      amount, 
      paymentMethod, 
      transactionId, 
      notes 
    } = req.body;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Ensure screenshot is uploaded
    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        message: 'Payment screenshot is required'
      });
    }

    // Ensure we have a consistent filename format
    let filename;
    if (req.file.filename) {
      filename = req.file.filename;
    } else {
      // Generate a consistent filename format
      filename = `payment-${projectId}-${Date.now()}${path.extname(req.file.originalname)}`;
      
      // If the file was saved with a different name, we might need to rename it
      const originalPath = req.file.path;
      const targetPath = path.join(PAYMENTS_DIR, filename);
      
      // Only rename if the paths are different
      if (originalPath !== targetPath) {
        try {
          // Make sure the payments directory exists
          if (!fs.existsSync(PAYMENTS_DIR)) {
            fs.mkdirSync(PAYMENTS_DIR, { recursive: true });
          }
          
          // Copy the file to ensure it's in the right location with the right name
          fs.copyFileSync(originalPath, targetPath);
          console.log(`Copied file from ${originalPath} to ${targetPath}`);
          
          // Update the path in the request object
          req.file.path = targetPath;
        } catch (err) {
          console.error('Error copying file to payments directory:', err);
        }
      }
    }
    
    // Always use a consistent relative path format
    const relativePath = `uploads/payments/${filename}`;
    
    console.log('Storing payment proof with relative path:', relativePath);
    console.log('Original file path:', req.file.path);
    console.log('Filename:', filename);
    
    const paymentProof = await PaymentProof.create({
      project: projectId,
      donor: {
        name: donorName,
        email: donorEmail,
        phone: donorPhone || ''
      },
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || 'UPI',
      transactionId: transactionId || '',
      screenshotUrl: relativePath,
      notes: notes || '',
      status: 'Pending'
    });
    
    // Note: We don't update the project's raised amount here anymore
    // The amount will only be added to the raised amount when the payment is verified

    res.status(201).json({
      success: true,
      data: paymentProof,
      message: 'Payment proof submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting payment proof:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all payment proofs for a project (NGO only)
exports.getProjectPaymentProofs = async (req, res) => {
  try {
    const { projectId } = req.params;
    const ngoId = req.ngo.id;

    // Check if project belongs to the NGO
    const project = await Project.findOne({ _id: projectId, ngo: ngoId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or you do not have permission to access it'
      });
    }

    // Get all payment proofs for the project
    const paymentProofs = await PaymentProof.find({ project: projectId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: paymentProofs.length,
      data: paymentProofs
    });
  } catch (error) {
    console.error('Error fetching payment proofs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all payment proofs for an NGO
exports.getNGOPaymentProofs = async (req, res) => {
  try {
    const ngoId = req.ngo.id;

    // Get all projects for this NGO
    const projects = await Project.find({ ngo: ngoId }).select('_id');
    const projectIds = projects.map(project => project._id);

    // Get all payment proofs for these projects
    const paymentProofs = await PaymentProof.find({ project: { $in: projectIds } })
      .populate('project', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: paymentProofs.length,
      data: paymentProofs
    });
  } catch (error) {
    console.error('Error fetching NGO payment proofs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update payment proof status (verify/reject)
exports.updatePaymentProofStatus = async (req, res) => {
  try {
    const { proofId } = req.params;
    const { status, notes } = req.body;
    const ngoId = req.ngo.id;

    // Find the payment proof
    const paymentProof = await PaymentProof.findById(proofId).populate('project');
    
    if (!paymentProof) {
      return res.status(404).json({
        success: false,
        message: 'Payment proof not found'
      });
    }

    // Check if the project belongs to the NGO
    const project = await Project.findOne({ 
      _id: paymentProof.project._id, 
      ngo: ngoId 
    });

    if (!project) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this payment proof'
      });
    }

    // Handle payment verification status changes
    if (status === 'Verified' && paymentProof.status !== 'Verified') {
      // If verifying a payment for the first time or after rejection, add to raised amount
      await Project.findByIdAndUpdate(
        paymentProof.project._id,
        { 
          $inc: { raisedAmount: paymentProof.amount },
          $set: { updatedAt: Date.now() }
        }
      );
      console.log(`Payment of ${paymentProof.amount} verified and added to project ${paymentProof.project._id}`);
    } else if (status === 'Rejected' && paymentProof.status === 'Verified') {
      // If rejecting a previously verified payment, subtract from raised amount
      await Project.findByIdAndUpdate(
        paymentProof.project._id,
        { 
          $inc: { raisedAmount: -paymentProof.amount },
          $set: { updatedAt: Date.now() }
        }
      );
      console.log(`Payment of ${paymentProof.amount} rejected and subtracted from project ${paymentProof.project._id}`);
    }

    // Update the payment proof
    const updatedProof = await PaymentProof.findByIdAndUpdate(
      proofId,
      { 
        $set: { 
          status, 
          notes: notes || paymentProof.notes,
          updatedAt: Date.now() 
        } 
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedProof,
      message: `Payment proof ${status.toLowerCase()} successfully`
    });
  } catch (error) {
    console.error('Error updating payment proof status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete payment proof
exports.deletePaymentProof = async (req, res) => {
  try {
    const { proofId } = req.params;
    const ngoId = req.ngo.id;

    // Find the payment proof
    const paymentProof = await PaymentProof.findById(proofId).populate('project');
    
    if (!paymentProof) {
      return res.status(404).json({
        success: false,
        message: 'Payment proof not found'
      });
    }

    // Check if the project belongs to the NGO
    if (paymentProof.project.ngo.toString() !== ngoId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this payment proof'
      });
    }

    // If the payment was verified, adjust the raised amount
    if (paymentProof.status === 'Verified') {
      await Project.findByIdAndUpdate(
        paymentProof.project._id,
        { 
          $inc: { raisedAmount: -paymentProof.amount },
          $set: { updatedAt: Date.now() }
        }
      );
    }

    // Delete the payment proof
    await PaymentProof.findByIdAndDelete(proofId);

    res.status(200).json({
      success: true,
      message: 'Payment proof deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment proof:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get payment proof image
exports.getPaymentProofImage = async (req, res) => {
  try {
    const { proofId } = req.params;
    
    // Find the payment proof
    const paymentProof = await PaymentProof.findById(proofId);
    
    if (!paymentProof) {
      return res.status(404).json({
        success: false,
        message: 'Payment proof not found'
      });
    }
    
    // Get the screenshot URL from the payment proof
    let screenshotPath = paymentProof.screenshotUrl;
    console.log('Original screenshot path:', screenshotPath);
    
    // Try multiple approaches to find the file
    const possiblePaths = [];
    
    // 1. If it's a full path (absolute path)
    if (screenshotPath.includes('C:') || screenshotPath.startsWith('/')) {
      const filename = path.basename(screenshotPath);
      possiblePaths.push(path.join(PAYMENTS_DIR, filename));
    }
    
    // 2. If it's a relative path starting with 'uploads/'
    if (screenshotPath.startsWith('uploads/')) {
      possiblePaths.push(path.join(__dirname, '..', screenshotPath));
    }
    
    // 3. If it's just the filename
    if (!screenshotPath.includes('/') && !screenshotPath.includes('\\')) {
      possiblePaths.push(path.join(PAYMENTS_DIR, screenshotPath));
    }
    
    // 4. Try with uploads/payments/ prefix
    if (!screenshotPath.startsWith('uploads/payments/')) {
      possiblePaths.push(path.join(UPLOADS_DIR, 'payments', path.basename(screenshotPath)));
    }
    
    // 5. Try direct path as is
    possiblePaths.push(screenshotPath);
    
    // Log all paths we're going to try
    console.log('Trying the following paths:', possiblePaths);
    
    // Try each path until we find one that exists
    let foundPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        foundPath = testPath;
        console.log('Found file at path:', foundPath);
        break;
      }
    }
    
    // If we still can't find the file, try pattern matching
    if (!foundPath) {
      console.log('File not found in any of the expected locations, trying pattern matching');
      try {
        const files = fs.readdirSync(PAYMENTS_DIR);
        const projectId = paymentProof.project.toString();
        const filePattern = `payment-${projectId}`;
        
        console.log('Looking for files matching pattern:', filePattern);
        console.log('Available files:', files);
        
        const matchingFile = files.find(file => file.includes(filePattern));
        
        if (matchingFile) {
          foundPath = path.join(PAYMENTS_DIR, matchingFile);
          console.log('Found matching file:', foundPath);
        }
      } catch (err) {
        console.error('Error during pattern matching:', err);
      }
    }
    
    // If we still can't find the file, return 404
    if (!foundPath) {
      console.error('Could not find payment screenshot after trying all options');
      return res.status(404).json({
        success: false,
        message: 'Payment screenshot not found'
      });
    }
    
    // Determine the content type based on file extension
    const ext = path.extname(foundPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    
    // Set the content type header
    res.setHeader('Content-Type', contentType);
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(foundPath);
    fileStream.pipe(res);
    
    // Handle errors
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error serving file',
          error: error.message
        });
      }
    });
  } catch (error) {
    console.error('Error getting payment proof image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

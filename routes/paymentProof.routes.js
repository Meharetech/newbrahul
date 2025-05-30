const express = require('express');
const router = express.Router();
const paymentProofController = require('../controllers/paymentProof.controller');
const ngoAuth = require('../middleware/ngoAuth');
const multer = require('multer');
const path = require('path');

// Ensure upload directories exist
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'uploads');
const paymentsDir = path.join(uploadDir, 'payments');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory');
}

if (!fs.existsSync(paymentsDir)) {
  fs.mkdirSync(paymentsDir, { recursive: true });
  console.log('Created payments directory');
}

// Set up multer storage for payment screenshots
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, paymentsDir);
  },
  filename: function(req, file, cb) {
    if (!req.params.projectId) {
      return cb(new Error('Project ID is required'), null);
    }
    cb(null, `payment-${req.params.projectId}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter for payment screenshots
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB max file size
  },
  fileFilter: fileFilter
});

// Routes
router.post('/project/:projectId', upload.single('screenshot'), paymentProofController.submitPaymentProof);
router.get('/project/:projectId', ngoAuth, paymentProofController.getProjectPaymentProofs);
router.get('/ngo', ngoAuth, paymentProofController.getNGOPaymentProofs);
router.put('/:proofId', ngoAuth, paymentProofController.updatePaymentProofStatus);
router.delete('/:proofId', ngoAuth, paymentProofController.deletePaymentProof);

// Public route for getting payment proof images
router.get('/image/:proofId', paymentProofController.getPaymentProofImage);

// Additional route without /api prefix for direct access
router.get('/:proofId/image', paymentProofController.getPaymentProofImage);

module.exports = router;

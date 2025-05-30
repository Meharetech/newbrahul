const express = require('express');
const router = express.Router();
const bankDetailsController = require('../controllers/bankDetails.controller');
const ngoAuth = require('../middleware/ngoAuth');
const multer = require('multer');
const path = require('path');

// Ensure upload directories exist
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'uploads');
const qrcodesDir = path.join(uploadDir, 'qrcodes');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory');
}

if (!fs.existsSync(qrcodesDir)) {
  fs.mkdirSync(qrcodesDir, { recursive: true });
  console.log('Created qrcodes directory');
}

// Set up multer storage for QR code images
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, qrcodesDir);
  },
  filename: function(req, file, cb) {
    if (!req.ngo || !req.ngo.id) {
      return cb(new Error('Authentication required'), null);
    }
    cb(null, `qrcode-${req.ngo.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter for QR code images
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
router.post('/update', ngoAuth, upload.single('qrCodeImage'), bankDetailsController.updateBankDetails);
router.get('/', ngoAuth, bankDetailsController.getBankDetails);
router.get('/project/:projectId', bankDetailsController.getProjectBankDetails);
router.get('/ngo/:ngoId', bankDetailsController.getPublicNgoBankDetails);
router.delete('/', ngoAuth, bankDetailsController.deleteBankDetails);

module.exports = router;

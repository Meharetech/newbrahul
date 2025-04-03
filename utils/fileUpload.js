const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check if a specific upload directory is specified in the request
    const subDir = req.uploadDir || '';
    const uploadDir = path.join(__dirname, '../uploads', subDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename: timestamp + user ID (if available) + original extension
    const userId = req.user ? req.user.id : 'unknown';
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${userId}${fileExt}`;
    cb(null, fileName);
  }
});

// Check file type
const fileFilter = (req, file, cb) => {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|gif/;
  
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB max file size
  fileFilter: fileFilter
});

// Handle profile image upload
exports.uploadProfileImage = upload.single('profileImage');

// Handle multiple file uploads
exports.uploadMultipleFiles = upload.array('files', 5); // Max 5 files

// Get file URL
exports.getFileUrl = (req, filename) => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/${filename}`;
};

// Delete file
exports.deleteFile = (filename) => {
  const filePath = path.join(__dirname, '../uploads', filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  
  return false;
};

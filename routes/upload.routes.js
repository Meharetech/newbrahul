const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { uploadProfileImage, uploadMultipleFiles } = require('../utils/fileUpload');
const auth = require('../middleware/auth');

// @route   POST /api/upload/profile-image
// @desc    Upload profile image
// @access  Private
router.post('/profile-image', auth, uploadProfileImage, uploadController.uploadProfileImage);

// @route   POST /api/upload/multiple
// @desc    Upload multiple files
// @access  Private
router.post('/multiple', auth, uploadMultipleFiles, uploadController.uploadMultipleFiles);

// @route   DELETE /api/upload/:filename
// @desc    Delete uploaded file
// @access  Private
router.delete('/:filename', auth, uploadController.deleteUploadedFile);

module.exports = router;

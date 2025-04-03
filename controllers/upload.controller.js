const { getFileUrl, deleteFile } = require('../utils/fileUpload');

// Upload profile image
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = getFileUrl(req, req.file.filename);
    
    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        url: fileUrl,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Error uploading file' });
  }
};

// Upload multiple files
exports.uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const filesInfo = req.files.map(file => ({
      filename: file.filename,
      url: getFileUrl(req, file.filename),
      mimetype: file.mimetype,
      size: file.size
    }));
    
    res.json({
      success: true,
      files: filesInfo
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Error uploading files' });
  }
};

// Delete file
exports.deleteUploadedFile = async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }

    const deleted = deleteFile(filename);
    
    if (!deleted) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ message: 'Error deleting file' });
  }
};

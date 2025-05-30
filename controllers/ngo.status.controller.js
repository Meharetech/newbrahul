const NGO = require('../models/NGO');

// Update NGO status
exports.updateNGOStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Find NGO by ID
    const ngo = await NGO.findById(id);
    if (!ngo) {
      return res.status(404).json({ message: 'NGO not found' });
    }

    // Update status
    ngo.status = status;
    await ngo.save();

    return res.status(200).json({
      message: `NGO status updated to ${status}`,
      ngo
    });
  } catch (err) {
    console.error('Error updating NGO status:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'NGO not found' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

 const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get all states and cities
router.get('/states', (req, res) => {
  try {
    const stateData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../utils/state.json'), 'utf8')
    );
    
    res.json({ success: true, data: stateData });
  } catch (error) {
    console.error('Error fetching state data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch state data' });
  }
});

// Get cities for a specific state
router.get('/cities/:state', (req, res) => {
  try {
    const { state } = req.params;
    const stateData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../utils/state.json'), 'utf8')
    );
    
    if (stateData[state]) {
      res.json({ success: true, data: stateData[state] });
    } else {
      res.status(404).json({ success: false, message: 'State not found' });
    }
  } catch (error) {
    console.error('Error fetching city data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch city data' });
  }
});

module.exports = router;

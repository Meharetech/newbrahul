const express = require('express');
const router = express.Router();
const { Client } = require('@googlemaps/google-maps-services-js');
const axios = require('axios');
const geoUtils = require('../utils/geo');

// Create Google Maps client
const client = new Client({});

// @route   GET /api/geo/reverse-geocode
// @desc    Convert coordinates to address
// @access  Public
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    console.log(`Reverse geocoding for coordinates: ${lat}, ${lng}`);

    // Check if Google Maps API key is available
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key is missing');
      return res.status(500).json({ message: 'Google Maps API key is not configured' });
    }

    try {
      // Make direct request to Google Maps API
      const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const response = await axios.get(apiUrl);
      
      if (response.data.status !== 'OK') {
        console.error('Reverse geocoding error:', response.data.status);
        return res.status(400).json({ message: 'Failed to get address from coordinates', status: response.data.status });
      }

      const results = response.data.results;
      if (results.length === 0) {
        return res.status(404).json({ message: 'No address found for these coordinates' });
      }

      // Extract address components
      const addressComponents = results[0].address_components;
      const formattedAddress = results[0].formatted_address;

      // Extract specific address components
      let street = '';
      let city = '';
      let state = '';
      let country = '';
      let postalCode = '';

      addressComponents.forEach(component => {
        const types = component.types;

        if (types.includes('route')) {
          street = component.long_name;
        } else if (types.includes('locality')) {
          city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        } else if (types.includes('country')) {
          country = component.long_name;
        } else if (types.includes('postal_code')) {
          postalCode = component.long_name;
        }
      });

      // If no street found, try to use the first line of the formatted address
      if (!street && formattedAddress) {
        const addressParts = formattedAddress.split(',');
        if (addressParts.length > 0) {
          street = addressParts[0].trim();
        }
      }

      res.json({
        address: {
          street,
          city,
          state,
          country,
          postalCode,
          formattedAddress
        },
        coordinates: {
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        }
      });
    } catch (error) {
      console.error('Google API request error:', error.message);
      return res.status(500).json({ message: 'Error communicating with Google Maps API', error: error.message });
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ message: 'Server error during reverse geocoding' });
  }
});

// @route   GET /api/geo/geocode
// @desc    Convert address to coordinates
// @access  Public
router.get('/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    
    console.log(`Geocoding request received for address: ${address}`);
    
    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const location = await geoUtils.geocodeAddress(address);
    console.log('Successfully geocoded coordinates:', location);
    res.json({ location });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ 
      message: 'Server error during geocoding',
      error: error.message 
    });
  }
});

// @route   GET /api/geo/directions
// @desc    Get directions between two coordinates
// @access  Public
router.get('/directions', async (req, res) => {
  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng, mode } = req.query;
    
    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
      return res.status(400).json({ 
        message: 'Origin and destination coordinates are required' 
      });
    }

    console.log(`Getting directions from [${origin_lat}, ${origin_lng}] to [${dest_lat}, ${dest_lng}]`);

    // Check if Google Maps API key is available
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key is missing');
      return res.status(500).json({ message: 'Google Maps API key is not configured' });
    }

    const travelMode = mode || 'driving';
    
    try {
      // Make direct request to Google Maps API
      const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin_lat},${origin_lng}&destination=${dest_lat},${dest_lng}&mode=${travelMode}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const response = await axios.get(apiUrl);
      
      if (response.data.status !== 'OK') {
        console.error('Directions API error:', response.data.status);
        return res.status(400).json({ 
          message: 'Failed to get directions', 
          status: response.data.status 
        });
      }

      const routes = response.data.routes;
      if (routes.length === 0) {
        return res.status(404).json({ message: 'No routes found between these locations' });
      }

      // Extract relevant information from the first route
      const route = routes[0];
      const legs = route.legs[0];
      
      const directions = {
        distance: legs.distance,
        duration: legs.duration,
        start_address: legs.start_address,
        end_address: legs.end_address,
        steps: legs.steps.map(step => ({
          distance: step.distance,
          duration: step.duration,
          instructions: step.html_instructions,
          travel_mode: step.travel_mode,
          maneuver: step.maneuver || null,
          polyline: step.polyline
        })),
        overview_polyline: route.overview_polyline,
        warnings: route.warnings,
        waypoint_order: route.waypoint_order,
        bounds: route.bounds
      };

      res.json({
        directions,
        origin: {
          lat: parseFloat(origin_lat),
          lng: parseFloat(origin_lng)
        },
        destination: {
          lat: parseFloat(dest_lat),
          lng: parseFloat(dest_lng)
        }
      });
    } catch (error) {
      console.error('Google API request error:', error.message);
      return res.status(500).json({ message: 'Error communicating with Google Maps API', error: error.message });
    }
  } catch (error) {
    console.error('Directions API error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching directions',
      error: error.message 
    });
  }
});

module.exports = router;

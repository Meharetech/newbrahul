// Convert address to coordinates using Google Maps Geocoding API
const { Client } = require('@googlemaps/google-maps-services-js');

const client = new Client({});

// Convert address to coordinates
exports.geocodeAddress = async (address) => {
  try {
    const response = await client.geocode({
      params: {
        address: address,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      };
    }
    throw new Error('No results found');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};

// Calculate distance between two points in kilometers
exports.calculateDistance = (coords1, coords2) => {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Convert degrees to radians
const toRad = (degrees) => {
  return degrees * (Math.PI/180);
};

// Find nearby coordinates within radius
exports.findNearbyCoordinates = (centerCoords, radiusKm, points) => {
  return points.filter(point => {
    const distance = exports.calculateDistance(centerCoords, point.coordinates);
    return distance <= radiusKm;
  });
};

// Format coordinates for MongoDB geospatial query
exports.formatCoordinates = (longitude, latitude) => {
  return {
    type: 'Point',
    coordinates: [parseFloat(longitude), parseFloat(latitude)]
  };
};

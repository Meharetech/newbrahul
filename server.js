require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const socketUtils = require('./utils/socket');
const authRoutes = require('./routes/auth.routes');
const donorRoutes = require('./routes/donor.routes');
const requestRoutes = require('./routes/request.routes');
const emergencyRoutes = require('./routes/emergency.routes');
const volunteerRoutes = require('./routes/volunteer.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const vehicleAuthRoutes = require('./routes/vehicle.auth.routes');
const vehicleUserRoutes = require('./routes/vehicle.user.routes');
const vehicleBookingRoutes = require('./routes/vehicleBooking.routes');
const uploadRoutes = require('./routes/upload.routes');
const statsRoutes = require('./routes/stats.routes');
const eventRoutes = require('./routes/event.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const geoRoutes = require('./routes/geo.routes');
const locationRoutes = require('./routes/location.routes');
const adminRoutes = require('./routes/admin.routes');
const adminDonorRoutes = require('./routes/admin.donor.routes');
const adminRequestRoutes = require('./routes/admin.request.routes');
const adminProjectRoutes = require('./routes/admin.project.routes');
const featuredProjectRoutes = require('./routes/featured.project.routes');
const publicProjectRoutes = require('./routes/public.project.routes');
const userRoutes = require('./routes/user.routes');
const userProfileRoutes = require('./routes/user.profile.routes');
const ngoRoutes = require('./routes/ngo.routes');
const projectRoutes = require('./routes/project.routes');
const publicVehicleBookingRoutes = require('./routes/public.vehicleBooking.routes');
const bankDetailsRoutes = require('./routes/bankDetails.routes');
const paymentProofRoutes = require('./routes/paymentProof.routes');
const hospitalRoutes = require('./routes/hospital.routes');
const bloodInventoryRoutes = require('./routes/bloodInventory.routes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketUtils.init(server);

// Connect to MongoDB
connectDB(); 

// Middleware
app.use(cors({
  origin: ['https://backend12-c2nm.onrender.com', '', 'http://thebloodhero.com', 'https://www.thebloodhero.com', 'http://www.thebloodhero.com', 'http://localhost:3000', 'http://localhost:3012'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-auth-token', '*']
}));

// Add a middleware to handle preflight requests and set proper headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-auth-token, *');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Also serve static files directly (without /api prefix)
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

console.log('Serving static files from:', path.join(__dirname, 'uploads'));
console.log('Also serving static files at /api/uploads');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/vehicle/auth', vehicleAuthRoutes);
app.use('/api/vehicle/user', vehicleUserRoutes);
app.use('/api/vehicle/bookings', vehicleBookingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/donors', adminDonorRoutes);
app.use('/api/admin/requests', adminRequestRoutes);
app.use('/api/admin', adminProjectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user/profile', userProfileRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', featuredProjectRoutes);
app.use('/api/public', publicProjectRoutes);
app.use('/api/public', publicVehicleBookingRoutes);
app.use('/api/bank-details', bankDetailsRoutes);
app.use('/api/payment-proofs', paymentProofRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/blood-inventory', bloodInventoryRoutes);
// Direct routes without /api prefix
app.use('/payment-proofs', paymentProofRoutes);
app.use('/location', locationRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('BloodHero API is running');
});

// Error handling middleware
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // For testing purposes

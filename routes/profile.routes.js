const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   GET /api/profile
// @desc    Get user profile
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Special handling for admin user
        if (req.isAdmin) {
            return res.json({
                _id: 'admin',
                name: 'Admin User',
                email: process.env.ADMIN_EMAIL || 'rahul@gmail.com',
                role: 'admin',
                roles: ['admin']
            });
        }

        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');   
    }
});

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', auth, async (req, res) => {
    const {
        name,
        email,
        phone,
        address,
        bloodGroup,
        age,
        gender
    } = req.body;

    try {
        // Special handling for admin user
        if (req.isAdmin) {
            return res.status(403).json({ msg: 'Admin profile cannot be updated through this endpoint' });
        }

        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Update fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (address) user.address = address;
        if (bloodGroup) user.bloodGroup = bloodGroup;
        if (age) user.age = age;
        if (gender) user.gender = gender;

        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

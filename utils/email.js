const nodemailer = require('nodemailer');

// Create reusable transporter with direct Gmail configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  debug: true,
  logger: true
});

// Verify connection configuration on startup
transporter.verify(function(error, success) {
  if (error) {
    console.error('Email server connection error:', error);
  } else {
    console.log('Email server connection is ready to send messages');
  }
});

// Send email function with retry mechanism
exports.sendEmail = async (to, subject, html, retries = 2) => {
  if (!to || !subject || !html) {
    console.error('Missing required email parameters:', { to, subject, htmlLength: html?.length });
    throw new Error('Missing required email parameters');
  }

  console.log(`Attempting to send email to ${to} with subject "${subject}"`);
  console.log(`Using email configuration: Gmail (${process.env.EMAIL_USER})`);
  
  let lastError = null;
  
  // Try sending the email with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} of ${retries} for sending email to ${to}`);
      }
      
      const mailOptions = {
        from: `"BloodHero" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      };
      
      console.log('Mail options:', { 
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        htmlPreview: mailOptions.html.substring(0, 50) + '...' 
      });
      
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`Email sent successfully! Message ID: ${info.messageId}`);
      return info;
    } catch (error) {
      lastError = error;
      console.error(`Email sending error (attempt ${attempt + 1}/${retries + 1}):`, error);
      
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
};

// Add a specific function for login notifications to ensure they're sent properly
exports.sendLoginNotification = async (email, name, loginTime) => {
  if (!email || !name) {
    console.error('Missing required parameters for login notification:', { email, name });
    return false;
  }
  
  try {
    console.log(`Sending login notification to ${email} (${name})`);
    
    // Format date and time
    const formattedDate = loginTime.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const formattedTime = loginTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
    
    const htmlContent = `
      <h2 style="color: #e53e3e;">Login Notification</h2>
      <p>Dear ${name},</p>
      <p>You have successfully logged in to your BloodHero account.</p>
      <p><strong>Login Details:</strong></p>
      <ul style="list-style-type: none; padding-left: 0;">
        <li style="margin-bottom: 8px;"><strong>Date:</strong> ${formattedDate}</li>
        <li style="margin-bottom: 8px;"><strong>Time:</strong> ${formattedTime}</li>
      </ul>
      <p>If this wasn't you, please secure your account by changing your password immediately.</p>
      <p>Thank you for using BloodHero!</p>
      <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
    `;
    
    const result = await exports.sendEmail(
      email,
      'BloodHero - Login Notification',
      htmlContent
    );
    
    return result;
  } catch (error) {
    console.error('Failed to send login notification:', error);
    return false;
  }
};

// Add a specific function for registration notifications
exports.sendRegistrationNotification = async (email, name, userData) => {
  if (!email || !name) {
    console.error('Missing required parameters for registration notification:', { email, name });
    return false;
  }
  
  try {
    console.log(`Sending registration notification to ${email} (${name})`);
    
    const htmlContent = `
      <h2 style="color: #e53e3e;">Welcome to BloodHero!</h2>
      <p>Dear ${name},</p>
      <p>Thank you for registering with BloodHero. Your account has been successfully created.</p>
      <p><strong>Account Details:</strong></p>
      <ul style="list-style-type: none; padding-left: 0;">
        <li style="margin-bottom: 8px;"><strong>Name:</strong> ${name}</li>
        <li style="margin-bottom: 8px;"><strong>Email:</strong> ${email}</li>
        <li style="margin-bottom: 8px;"><strong>Role:</strong> ${userData.role || 'Donor'}</li>
        ${userData.bloodGroup ? `<li style="margin-bottom: 8px;"><strong>Blood Group:</strong> ${userData.bloodGroup}</li>` : ''}
      </ul>
      <p>You can now log in to your account and start using BloodHero services.</p>
      <p>Thank you for joining our mission to save lives through blood donation!</p>
      <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
    `;
    
    const result = await exports.sendEmail(
      email,
      'Welcome to BloodHero - Registration Successful',
      htmlContent
    );
    
    return result;
  } catch (error) {
    console.error('Failed to send registration notification:', error);
    return false;
  }
};

// Email templates
exports.emailTemplates = {
  // Welcome email
  welcome: (name) => `
    <h1>Welcome to BloodHero, ${name}!</h1>
    <p>Thank you for joining our platform. Together, we can save lives through blood donation.</p>
    <p>If you have any questions, please don't hesitate to contact us.</p>
    <p>Best regards,<br>The BloodHero Team</p>
  `,
  
  // Blood request notification
  bloodRequest: (request) => `
    <h1>New Blood Request</h1>
    <p>A new blood request has been created in your area:</p>
    <ul>
      <li>Blood Type: ${request.bloodType}</li>
      <li>Units Needed: ${request.unitsNeeded}</li>
      <li>Hospital: ${request.hospital.name}</li>
      <li>Urgency: ${request.urgency}</li>
    </ul>
    <p>Please check the BloodHero app for more details.</p>
  `,
  
  // Emergency request notification
  emergencyRequest: (request) => `
    <h1>URGENT: Emergency Blood Request</h1>
    <p>An emergency blood request has been created in your area:</p>
    <ul>
      <li>Blood Type: ${request.bloodType}</li>
      <li>Units Needed: ${request.unitsNeeded}</li>
      <li>Hospital: ${request.hospital.name}</li>
    </ul>
    <p>This is an emergency situation. Your immediate response could save a life.</p>
    <p>Please check the BloodHero app for more details.</p>
  `,
  
  // Donation confirmation
  donationConfirmation: (donation) => `
    <h1>Blood Donation Confirmed</h1>
    <p>Thank you for your generous donation!</p>
    <ul>
      <li>Blood Type: ${donation.bloodType}</li>
      <li>Date: ${donation.date}</li>
      <li>Location: ${donation.location}</li>
    </ul>
    <p>Your donation will help save lives. Thank you for being a hero!</p>
  `,
  
  // Donation confirmed by donor with photo proof
  donationConfirmed: (data) => `
    <h1>Blood Donation Confirmation</h1>
    <p>Hello ${data.requesterName},</p>
    <p>Great news! Donor ${data.donorName} has confirmed their blood donation for your request.</p>
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h3>Donation Details:</h3>
      <ul>
        <li><strong>Blood Type:</strong> ${data.bloodType}</li>
        <li><strong>Hospital:</strong> ${data.hospitalName}</li>
        <li><strong>Date:</strong> ${data.donationDate}</li>
      </ul>
      <p><strong>Donor's Notes:</strong> ${data.notes}</p>
    </div>
    
    <div style="background-color: #e9f5ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h3>Donor Information:</h3>
      <ul>
        <li><strong>Name:</strong> ${data.donorName}</li>
        <li><strong>Email:</strong> ${data.donorEmail || 'Not provided'}</li>
        <li><strong>Phone:</strong> ${data.donorPhone || 'Not provided'}</li>
        <li><strong>Request Accepted On:</strong> ${data.acceptedDate || 'Not recorded'}</li>
      </ul>
    </div>
    
    <p>The donor has provided a photo as proof of donation:</p>
    <div style="text-align: center; margin: 20px 0;">
      <img src="${data.photoUrl}" alt="Donation Proof" style="max-width: 100%; max-height: 400px; border-radius: 5px;">
    </div>
    
    <div style="background-color: #f0f9e8; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
      <h3>Please Verify This Donation</h3>
      <p>Click the button below to verify this donation:</p>
      <a href="${data.verificationLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px;">Verify Donation</a>
      <p style="font-size: 12px; margin-top: 10px;">Or copy and paste this link in your browser: ${data.verificationLink}</p>
    </div>
    
    <p>Thank you for using BloodHero!</p>
    <p>Best regards,<br>The BloodHero Team</p>
  `,
  
  // Donation status updated by requester
  donationStatusUpdated: (data) => `
    <h1>Donation Status Update</h1>
    <p>Hello ${data.donorName},</p>
    <p>The requester ${data.requesterName} has ${data.status === 'confirmed' ? 'confirmed' : 'indicated they did not receive'} your blood donation.</p>
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h3>Donation Details:</h3>
      <ul>
        <li><strong>Blood Type:</strong> ${data.bloodType}</li>
        <li><strong>Hospital:</strong> ${data.hospitalName}</li>
        <li><strong>Status:</strong> ${data.status === 'confirmed' ? 'Confirmed' : 'Not Received'}</li>
      </ul>
      <p><strong>Requester's Feedback:</strong> ${data.feedback}</p>
    </div>
    <p>Thank you for your generosity and commitment to saving lives!</p>
    <p>Best regards,<br>The BloodHero Team</p>
  `,
  
  // Request fulfilled notification
  requestFulfilled: (request) => `
    <h1>Blood Request Fulfilled</h1>
    <p>Your blood request has been fulfilled:</p>
    <ul>
      <li>Blood Type: ${request.bloodType}</li>
      <li>Units Needed: ${request.unitsNeeded}</li>
      <li>Hospital: ${request.hospital.name}</li>
    </ul>
    <p>Thank you for using BloodHero.</p>
  `
};

const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();
const session = require('express-session');
const bcryptjs = require('bcryptjs');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const moment = require('moment-timezone');

const app = express();
const port = process.env.PORT || 3000;

// Set default timezone to EAT (East Africa Time)
moment.tz.setDefault("Africa/Kigali");

app.get('', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Set up multer to store uploaded files in the 'profiles' folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'profiles');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir); // Create the directory if it doesn't exist
        }
        cb(null, dir); // Set the destination
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Use a timestamp as the filename
    }
});
const upload = multer({ storage });

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/profiles', express.static(path.join(__dirname, 'profiles'))); // Serve the profile pictures from the 'profiles' folder
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
app.use(cors({
    origin: 'http://localhost:3000', // Change to your frontend URL
    credentials: true
}));

// Create connection to the database server
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: process.env.DB_NAME
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
    } else {
        console.log('Connected to the DB server.');
    }
});

// Register Page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/forgot', (req,res) =>{
    res.sendFile(__dirname + '/views/forgot_password.html');
  })
  app.get('/reset-password', (req,res) =>{
    res.sendFile(__dirname + '/views/reset_password.html');
  })
  app.get('/verify-otp', (req,res) =>{
    res.sendFile(__dirname + '/views/verify_otp.html');
  })

  app.get('/privacy-policy',(req,res) =>{
    res.sendFile(__dirname + '/views/privacy_policy.html');
  })
  app.get('/terms-conditions',(req,res) =>{
    res.sendFile(__dirname + '/views/terms_and_conditions.html');
  })

const { body, validationResult } = require('express-validator');

// Register Logic
app.post(
  '/register',
  upload.single('profile'),
  [
    // Validate input fields
    body('name')
      .trim()
      .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long.')
      .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces.'),
    body('email')
      .trim()
      .isEmail().withMessage('Invalid email format.'),
    body('phone')
      .trim()
      .isEmpty().withMessage('Phone number is required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
      .matches(/\d/).withMessage('Password must contain at least one number.')
      .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character.'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.')
  ],
  (req, res) => {
    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password } = req.body;

    // Check if user already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('Error checking existing user:', err);
        return res.status(500).send('Database error.');
      }

      if (results.length > 0) {
        return res.status(400).send('User with this email already exists.');
      }

      // Hash the password before inserting
      bcryptjs.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return res.status(500).send('Error registering user.');
        }

        // Handle the optional profile picture
        const profilePicture = req.file ? `/profiles/${req.file.filename}` : null;

        // Insert new user
        const newUser = {
          name,
          email,
          phone,
          password: hashedPassword,
          profile_picture: profilePicture
        };

        db.query('INSERT INTO users SET ?', newUser, (err) => {
          if (err) {
            console.error('Error storing user:', err);
            return res.status(500).send('Error registering user.');
          }

          // Successful registration
          res.status(201).send(`User ${name} registered successfully!`);
        });
      });
    });
  }
);

// Function to generate OTP
function generateOTP() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let otp = '';
    const otpLength = 9;
    for (let i = 0; i < otpLength; i++) {
      otp += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return otp;
  }
  
  // Function to send OTP email with user's name
  function sendOTPEmail(toEmail, otp) {
    // Fetch user name from the database based on their email
    const query = 'SELECT name FROM users WHERE email = ?';
  
    db.query(query, [toEmail], (err, results) => {
      if (err) {
        console.error('Error fetching user data:', err);
        return;
      }
  
      // If user is found, use their  name, otherwise fallback to 'User'
      const userName = results.length > 0 ? results[0].name : 'User';
  
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
  
      const mailOptions = {
        from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'MSME Web App Account OTP',
        html: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>OTP Email</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    background-color: #f4f4f4;
                    color: #333;
                    margin: 0;
                    padding: 0;
                }
                .email-container {
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background-color: #0a58ca;
                    padding: 20px;
                    text-align: center;
                    color: #ffffff;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                }
                .content {
                    padding: 20px;
                    line-height: 1.6;
                }
                .content p {
                    font-size: 16px;
                    margin-bottom: 20px;
                }
                .otp-code {
                    display: inline-block;
                    background-color: #f1f8ff;
                    padding: 10px 20px;
                    font-size: 24px;
                    font-weight: bold;
                    color: #0a58ca;
                    border-radius: 5px;
                    letter-spacing: 2px;
                    margin-bottom: 20px;
                }
                .cta {
                    text-align: center;
                    margin-top: 30px;
                }
                .cta a {
                    padding: 10px 20px;
                    background-color: #0a58ca;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 5px;
                    font-size: 16px;
                    font-weight: bold;
                }
                .footer {
                    background-color: #f4f4f4;
                    padding: 15px;
                    text-align: center;
                    font-size: 12px;
                    color: #777;
                }
                .footer p {
                    margin: 5px 0;
                    text-align:center;
                }
                .footer a {
                    color: #0a58ca;
                    text-decoration: none;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>Your One-Time Password (OTP)</h1>
                </div>
                <div class="content">
                    <p>Hello, ${userName},</p>
                    <p>Your One-Time Password (OTP) to complete your login process is:</p>
                    <div class="otp-code">${otp}</div>
                    <p>Please enter this code promptly as it is valid for a limited time. If you did not request this code, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>If you have any questions or need assistance, please <a href="#">contact our support team</a>.</p>
                    <p>Thank you for using our service!</p>
                    <footer>
                      <p>&copy; ${new Date().getFullYear()} MSME Web App. All rights reserved.</p>
                      <p><a href="http://localhost:5000/privacy-policy">Privacy Policy</a> | <a href="http://localhost:5000/terms-conditions">Terms and Conditions</a></p>
                    </footer>
                </div>
            </div>
        </body>
        </html>`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
    });
  }

// Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', (req, res) => {
    const loginTime = moment.tz("Africa/Kigali").format('YYYY-MM-DD HH:mm:ss');
    const messageTime = moment.tz("Africa/Kigali").format('YYYY-MM-DD HH:mm:ss');
    const { email, password } = req.body;

    if (!email || !password) {
        const message = 'Email and password are required';
        const status = 'failure';

        const logFailedSql = `
            INSERT INTO login_logs (email, status, login_time, message, message_time)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.query(logFailedSql, [email, status, loginTime, message, messageTime], (err) => {
            if (err) console.error('Log error:', err);
        });

        return res.status(400).json({ error: message });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Database error.');
        }

        if (results.length === 0) {
            const message = 'User not found. Please register.';
            const status = 'failure';

            const logFailedSql = `
                INSERT INTO login_logs (email, status, login_time, message, message_time)
                VALUES (?, ?, ?, ?, ?)
            `;
            db.query(logFailedSql, [email, status, loginTime, message, messageTime], (logErr) => {
                if (logErr) console.error('Log error:', logErr);
            });

            return res.status(404).json({ error: message });
        }

        const user = results[0];

        bcryptjs.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error during password comparison:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (!isMatch) {
                const message = 'Invalid credentials, please try again.';
                const status = 'failure';

                const logFailedSql = `
                    INSERT INTO login_logs (user_id, email, status, login_time, message, message_time)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                db.query(logFailedSql, [user.id, email, status, loginTime, message, messageTime], (logErr) => {
                    if (logErr) console.error('Log error:', logErr);
                });

                return res.status(401).json({ error: message });
            }

            // Generate OTP
            const otp = generateOTP(); // Call to OTP generation function
            const otpExpirationTime = moment.tz("Africa/Kigali").add(10, 'minutes').format('YYYY-MM-DD HH:mm:ss');
            const status = 'success'; // Correct enum value

            // Update user with OTP
            const updateSql = 'UPDATE users SET otp = ?, otp_expires = ? WHERE id = ?';
            db.query(updateSql, [otp, otpExpirationTime, user.id], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating OTP:', updateErr);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                // Log the successful login
                const logSuccessSql = `
                    INSERT INTO login_logs (user_id, email, status, otp, login_time, message, message_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                db.query(logSuccessSql, [user.id, email, status, otp, loginTime, 'Login successful! OTP sent to your email.', messageTime], (logResultErr, logResult) => {
                    if (logResultErr) {
                        console.error('Log error:', logResultErr);
                    } else {
                        // Store the logId in the session
                        req.session.logId = logResult.insertId; // Correct usage here
                    }

                // Store user information in the session
                req.session.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    profile_picture: user.profile_picture
                };

                // Send OTP email
                sendOTPEmail(user.email, otp); // Function to send OTP email

                // Respond indicating OTP was sent
                return res.status(200).json({ message: 'Login successful! OTP sent to your email.' });
            });
        });
    });
});

})
// Route for OTP verification
app.post('/verify-otp', (req, res) => {
    const { otp } = req.body;

    // Check if OTP is provided and if the user is logged in
    if (!otp || !req.session.user || !req.session.user.email) {
        return res.status(400).json({ error: 'OTP is required and user must be logged in.' });
    }

    const userEmail = req.session.user.email;

    // Fetch user data based on the email stored in session
    db.query('SELECT * FROM users WHERE email = ?', [userEmail], (err, results) => {
        if (err) {
            console.error('Error fetching user for OTP verification:', err);
            return res.status(500).json({ error: 'Database error.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const userData = results[0];

        // Check if the provided OTP is valid and not expired
        const isOtpValid = userData.otp === otp && new Date(userData.otp_expires) > new Date();

        if (isOtpValid) {
            // OTP is valid; clear the OTP to prevent reuse
            db.query('UPDATE users SET otp = NULL, otp_expires = NULL WHERE email = ?', [userEmail], (updateErr) => {
                if (updateErr) {
                    console.error('Error clearing OTP:', updateErr);
                    return res.status(500).json({ error: 'Internal server error.' });
                }

                // Redirect based on user role
                let redirectUrl = '';
                switch (userData.role) {
                    case 'admin':
                        redirectUrl = '/admin-dashboard';
                        break;
                    case 'trader':
                        redirectUrl = '/dashboard';
                        break;
                    case 'user':
                        redirectUrl = '/customers';
                        break;
                    default:
                        return res.status(400).json({ error: 'Unknown user role.' });
                }

                // Send success response with redirect URL
                return res.status(200).json({ message: 'OTP verified successfully!', redirectUrl });
            });
        } else {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }
    });
});


  // Function to send reset password email with HTML/CSS
  function sendResetPasswordEmail(fullName, toEmail, resetUrl) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `${process.env.WEBSITE_NAME} <${process.env.EMAIL_USER}>`, // Sender address
      to: toEmail,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Hello ${fullName},</h2>
          <p style="color: #555;">You requested a password reset. Please click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p style="color: #555; margin-top: 20px;">If the button above doesn't work, copy and paste the following link into your browser:</p>
          <p style="color: #555;"><a href="${resetUrl}" style="color: #4CAF50;">${resetUrl}</a></p>
          <p style="color: #999; font-size: 12px;">This link will expire in 30 minutes. If you did not request this reset, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee;">
          <footer style="color: #999; font-size: 12px; text-align: center;">
            <p>&copy; ${new Date().getFullYear()} MSME Web App. All rights reserved.</p>
              <p><a href="http://localhost:5000/privacy-policy">Privacy Policy</a> | <a href="http://localhost:5000/terms-conditions">Terms and Conditions</a></p>
          </footer>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  }

  app.post('/forgot-password', (req, res) => {
    const { email } = req.body;
  
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
  
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
  
      if (result.length === 0) {
        return res.status(400).json({ error: 'No account found with that email' });
      }
  
      const user = result[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiration = moment.tz("Africa/Kigali").add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  
      const updateSql = 'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?';
      db.query(updateSql, [resetToken, tokenExpiration, email], (updateErr) => {
        if (updateErr) {
          console.error('Error updating reset token:', updateErr);
          return res.status(500).json({ error: 'Internal server error' });
        }
  
        // Store email and token in session
        req.session.resetEmail = email;
        req.session.resetToken = resetToken;
  
        // Send email with reset link
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
        sendResetPasswordEmail(user.name, user.email, resetUrl);
  
        return res.status(200).json({ message: 'Reset token sent to your email.' });
      });
    });
  });
  
  // Reset password route
  app.post('/reset-password', (req, res) => {
    const { email, token, newPassword } = req.body;
  
    // Validate inputs
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Invalid request or session expired' });
    }
  
    // Get the current time in Africa/Kigali timezone
    const currentTime = moment.tz("Africa/Kigali").format('YYYY-MM-DD HH:mm:ss');
  
    const sql = `
      SELECT *
      FROM users
      WHERE email = ?
      AND reset_token = ?
      AND reset_token_expires > ?
    `;
    db.query(sql, [email, token, currentTime], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
  
      // If no result found, the token is either invalid or expired
      if (result.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }
  
      // Token is valid, proceed with password reset
      bcryptjs.hash(newPassword, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
          console.error('Error hashing password:', hashErr);
          return res.status(500).json({ error: 'Internal server error' });
        }
  
        const updateSql = `
          UPDATE users
          SET password = ?, reset_token = NULL, reset_token_expires = NULL
          WHERE email = ?
        `;
        db.query(updateSql, [hashedPassword, email], (updateErr) => {
          if (updateErr) {
            console.error('Error updating password:', updateErr);
            return res.status(500).json({ error: 'Internal server error' });
          }
  
          // Clear session data after successful password reset
          req.session.resetEmail = null;
          req.session.resetToken = null;
  
          return res.status(200).json({ message: 'Password has been reset successfully!' });
        });
      });
    });
  });

// Check authentication middleware
function checkAuth(req, res, next) {
    const userData = req.session.user ;
    if (userData) {
        next(); // User is authenticated, proceed to the next middleware
    } else {
        res.status(401).json({ error: 'Unauthorized' }); // User is not authenticated
    }
}

// Other Pages
app.get('/inventory', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'inventory.html'));
});
app.get('/user-profile', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'user_profile.html'));
});
app.get('/customer-orders', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'customer_orders.html'));
});
app.get('/customers-list', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'customers_list.html'));
});
app.get('/customers', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'customers.html'));
});
app.get('/orders', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'orders.html'));
});
app.get('/invoice', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'invoice.html'));
});
app.get('/reports', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'reports.html'));
});

// Serve the 'profiles' folder statically
app.use('/profiles', express.static(path.join(__dirname, 'profiles')));

/// GET user profile
app.get('/api/user/', checkAuth, (req, res) => {
    const userId = req.session.user.id;
    if (userId !== req.session.user.id) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, rows) => {
        if (err) {
            console.error('Error fetching user data:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (rows.length > 0) {
            const user = rows[0];
            res.json(user); // Return user profile
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });
});

// PUT update user profile
app.put('/api/user/:id', checkAuth, (req, res) => {
    const userId = req.params.id;
    const sessionUserId = req.session.user.id;

    if (userId !== sessionUserId) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }

    const { name, email, phone, profile_picture } = req.body;
    const sql = 'UPDATE users SET name = ?, email = ? WHERE id = ?';

    db.query(sql, [name, email,userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error updating user', error: err });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'Profile updated successfully' });
    });
});

// DELETE user account
app.delete('/api/user/:id', checkAuth, (req, res) => {
    const userId = req.params.id; // Get user ID from URL params
    if (userId !== req.session.user.id) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }

    db.query('DELETE FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error deleting user', error: err });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'Account deleted successfully' });
    });
});

// Endpoint to fetch users with role 'customers'
app.get('/api/customers', (req, res) => {
    db.query('SELECT * FROM users WHERE role = ?', ['user'], (error, results) => {
        if (error) {
            console.error('Error fetching customers:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No customers found' });
        }

        res.json(results); // Send the customers data back
    });
});

// Get products
app.get('/api/products', checkAuth, (req, res) => {
    const userId = req.session.user.id;
    db.query('SELECT * FROM products WHERE user_id = ?', [userId], (error, rows) => {
        if (error) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Add product
app.post('/api/products', checkAuth, (req, res) => {
    const { name, category, price, stock, description } = req.body;
    const userId = req.session.user.id;
    const fullName = req.session.user.name;
    const email = req.session.user.email;

    db.query(
        'INSERT INTO products (user_id, fullName, email, name, category, price, stock, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, fullName, email, name, category, price, stock, description],
        (error) => {
            if (error) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ message: 'Product added successfully' });
        }
    );
});

// Edit product
app.put('/api/products/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    const { name, category, price, stock, description } = req.body;
    db.query(
        'UPDATE products SET name = ?, category = ?, price = ?, stock = ? WHERE id = ? AND user_id = ?',
        [name, category, price, stock, description, id, req.session.user.id],
        (error) => {
            if (error) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(200).json({ message: 'Product updated' });
        }
    );
});

// Delete product
app.delete('/api/products/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM products WHERE id = ? AND user_id = ?', [id, req.session.user.id], (error) => {
        if (error) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(200).json({ message: 'Product deleted' });
    });
});

// Create Order
app.post('/api/orders', (req, res) => {
    const userData = req.session.user;
    console.log(userData.id);
    const { itemName, pricePerItem, orderDate, totalAmount, orderDescription } = req.body;

    console.log('Received order request:', req.body); // Log the incoming request

    // Check if customer exists
    const customerQuery = `SELECT id FROM customers WHERE customer_email = ?`;
    db.query(customerQuery, [userData.email], (error, results) => {
        if (error) {
            console.error('Error checking customer:', error); // Log the error
            return res.status(500).json({ error: 'Database error while checking customer' });
        }

        let customerId;
        if (results.length > 0) {
            console.log('Customer exists, ID:', customerId);
            insertOrder(customerId);
        } else {
            const insertCustomerQuery = `INSERT INTO customers (customer_name, customer_email, customer_phone) VALUES (?, ?, ?)`;
            db.query(insertCustomerQuery, [userData.name, userData.email, userData.phone], (error, results) => {
                if (error) {
                    console.error('Error inserting customer:', error);
                    return res.status(500).json({ error: 'Database error while inserting customer' });
                }
                customerId = results.insertId; 
                insertOrder(customerId);
            });
        }
    });

    // Function to insert the order
    function insertOrder(customerId) {
        const orderQuery = `INSERT INTO orders (user_id, customer_name, customer_email, itemName, pricePerItem, order_date, total_amount, orderDescription, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`;
        db.query(orderQuery, [userData.id, userData.name, userData.email, itemName, pricePerItem, orderDate, totalAmount, orderDescription],
        (error, results) => {
            if (error) {
                console.error('Error creating order:', error); // Log the error
                return res.status(500).json({ error: 'Database error while creating order' });
            }
            console.log('Order created successfully, ID:', results.insertId); // Log success
            res.status(201).json({ id: results.insertId });
        });
    }
});


// Get orders
app.get('/api/orders', checkAuth, (req, res) => {
    const userId = req.session.user.id;

    const query = 'SELECT * FROM orders';

    // Execute the query and log the result
    db.query(query,  (error, rows) => {
        if (error) {
            console.error("Database error:", error);
            return res.status(500).json({ error: 'Database error' });
        }

        if (rows.length === 0) {
            console.log("No orders found for this user.");
            return res.status(404).json({ message: 'No orders found' });
        }

        // Send the data to the frontend
        res.json(rows);
    });
});

// Get a product
app.get('/api/orders/:id', checkAuth, (req, res) => {
    const userId = req.session.user.id;
    if(userId == null){
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    const { id } = req.params;  // Destructure the correct param name
    db.query('SELECT * FROM orders WHERE id = ?', [id], (error, rows) => {
        if (error) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
        console.log(rows);
    });
});

// Search for an order by ID
app.get('/api/orders/search?id= :id', checkAuth, (req, res) => {
    const userId = req.session.user.id;
    if(userId){
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    const { id } = req.body;

    db.query('SELECT * FROM orders WHERE id = ?', [ id], (error, rows) => {
        if (error) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(rows[0]); // Return the found order
    });
});

app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Ensure only valid statuses are passed
    const validStatuses = ['pending', 'shipped', 'delivered'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    // Check current order status
    db.query('SELECT status FROM orders WHERE id = ?', [id], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error' });
        }

        const currentStatus = results[0].status;

        // Prevent updating if status is already delivered
        if (currentStatus === 'delivered') {
            return res.status(400).json({ error: 'Cannot update status of a delivered order' });
        }

        // Update the order status
        db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id], (error) => {
            if (error) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(200).json({ message: 'Order status updated' });
        });
    });
});

// Delete an order
app.delete('/api/orders/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM orders WHERE id = ? AND user_id = ?', [id, req.session.user.id], (error) => {
        if (error) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(200).json({ message: 'order deleted' });
    });
});

// Create Invoice Route
app.post('/api/invoices', (req, res) => {
    const userData = req.session.user;
    const userId = userData.id;
    const creator_name =userData.name;
    const creator_email = userData.email;
    const { clientName, clientEmail, invoiceDate, dueDate, description, amount } = req.body;

    const sql = 'INSERT INTO invoices (userId, creator_name, creator_email, clientName, clientEmail, invoiceDate, dueDate, description, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [userId, creator_name, creator_email, clientName, clientEmail, invoiceDate, dueDate, description, amount];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error creating invoice:', err);
            return res.status(500).json({ error: 'Error creating invoice' });
        }

        const invoiceId = result.insertId;
        const invoicePath = path.join(__dirname, `invoices/invoice_${invoiceId}.pdf`);
        
        // Generate PDF
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(invoicePath));

        doc.fontSize(25).text('Invoice', { align: 'center' });
        doc.text(`Invoice ID: ${invoiceId}`);
        doc.text(`Creator Name: ${creator_name}`);
        doc.text(`Creator Email: ${creator_email}`);
        doc.text(`Client Name: ${clientName}`);
        doc.text(`Client Email: ${clientEmail}`);
        doc.text(`Invoice Date: ${invoiceDate}`);
        doc.text(`Due Date: ${dueDate}`);
        doc.text(`Description: ${description}`);
        doc.text(`Amount: $${amount.toFixed(2)}`);

        doc.end();

        // Send Email
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: creator_email,
            to: clientEmail,
            subject: `Invoice #${invoiceId}`,
            text: `Please find attached the invoice #${invoiceId}.`,
            attachments: [
                {
                    filename: `invoice_${invoiceId}.pdf`,
                    path: invoicePath,
                },
            ],
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ error: 'Error sending invoice email' });
            }
            console.log('Email sent:', info.response);
            res.status(201).json({ id: invoiceId, ...req.body });
        });
    });
});

// Report generation endpoint
app.post('/generate-report', (req, res) => {

    const userData = req.session.user;

    if (!userData) {
        return res.status(403).json({ success: false, message: 'User not authenticated.' });
    }

    const userId = userData.id;
    const generator_name = userData.name;
    const generator_email = userData.email;
    const { reportType, startDate, endDate } = req.body;

    if (!reportType || !startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'Invalid input data.' });
    }

    const generateFullReport = (customers, orders, invoices, inventory) => {
        const doc = new PDFDocument();
        const pdfPath = `reports/all-report-${Date.now()}.pdf`;
        doc.pipe(fs.createWriteStream(pdfPath));

        // Title
        doc.fontSize(20).text('Comprehensive Report', { align: 'center' });
        doc.moveDown();

        // Customers Section
        doc.fontSize(16).text('Customer Details', { underline: true });
        if (customers.length > 0) {
            customers.forEach(customer => {
                doc.text(`Name: ${customer.name}`);
                doc.text(`Email: ${customer.email}`);
                doc.text(`Registered At: ${customer.created_at}`);
                doc.moveDown();
            });
        } else {
            doc.text('No customers found in the specified date range.');
        }
        doc.moveDown();

        // Orders Section
        doc.fontSize(16).text('Order Details', { underline: true });
        if (orders.length > 0) {
            orders.forEach(order => {
                doc.text(`Order ID: ${order.id}`);
                doc.text(`Amount: ${order.amount}`);
                doc.text(`Status: ${order.status}`);
                doc.text(`Date: ${order.order_date}`);
                doc.moveDown();
            });
        } else {
            doc.text('No orders found in the specified date range.');
        }
        doc.moveDown();

        // Invoices Section
        doc.fontSize(16).text('Invoice Details', { underline: true });
        if (invoices.length > 0) {
            invoices.forEach(invoice => {
                doc.text(`Invoice Number: ${invoice.number}`);
                doc.text(`Amount: ${invoice.amount}`);
                doc.text(`Date: ${invoice.invoice_date}`);
                doc.moveDown();
            });
        } else {
            doc.text('No invoices found in the specified date range.');
        }
        doc.moveDown();

        // Inventory Section
        doc.fontSize(16).text('Inventory Status', { underline: true });
        if (inventory.length > 0) {
            inventory.forEach(item => {
                doc.text(`Item: ${item.name}`);
                doc.text(`Quantity: ${item.quantity}`);
                doc.text(`Added On: ${item.createdAt}`);
                doc.moveDown();
            });
        } else {
            doc.text('No inventory records found in the specified date range.');
        }

        // Finalize PDF
        doc.end();
        return pdfPath;
    };

    // Handle different report types
    if (reportType === 'all') {
        const queries = [
            { query: `SELECT * FROM customers WHERE created_at BETWEEN ? AND ?`, params: [startDate, endDate] },
            { query: `SELECT * FROM orders WHERE order_date BETWEEN ? AND ?`, params: [startDate, endDate] },
            { query: `SELECT * FROM invoices WHERE invoice_date BETWEEN ? AND ?`, params: [startDate, endDate] },
            { query: `SELECT * FROM products WHERE createdAt BETWEEN ? AND ?`, params: [startDate, endDate] }
        ];

        let completedQueries = 0;
        let customers = [], orders = [], invoices = [], inventory = [];
        let errors = false;

        queries.forEach((q, index) => {
            db.query(q.query, q.params, (err, results) => {
                if (err) {
                    console.error('Error fetching data:', err);
                    errors = true;
                } else {
                    switch (index) {
                        case 0: customers = results; break;
                        case 1: orders = results; break;
                        case 2: invoices = results; break;
                        case 3: inventory = results; break;
                    }
                }

                completedQueries++;
                if (completedQueries === queries.length) {
                    if (errors) {
                        return res.status(500).json({ success: false, message: 'Error generating report' });
                    }
                    const pdfPath = generateFullReport(customers, orders, invoices, inventory);
                    const insertQuery = `
                        INSERT INTO report_generations (user_id, generator_name, generator_email, report_type, start_date, end_date, file_path)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `;
                    const insertValues = [userId, generator_name, generator_email, reportType, startDate, endDate, pdfPath];

                    db.query(insertQuery, insertValues, (err) => {
                        if (err) {
                            console.error('Error inserting report generation details:', err);
                            return res.status(500).json({ success: false, message: 'Error saving report details' });
                        }
                        sendEmailWithReport(generator_email, pdfPath, generator_name);
                        res.status(200).json({ success: true, message: 'All-in-one report generated and sent to your email.' });
                    });
                }
            });
        });
    } else {
        let query = '';
        switch (reportType) {
            case 'customers':
                query = `SELECT * FROM customers WHERE created_at BETWEEN ? AND ?`;
                break;
            case 'orders':
                query = `SELECT * FROM orders WHERE order_date BETWEEN ? AND ?`;
                break;
            case 'invoices':
                query = `SELECT * FROM invoices WHERE invoiceDate BETWEEN ? AND ?`;
                break;
            case 'inventory':
                query = `SELECT * FROM products WHERE createdAt BETWEEN ? AND ?`;
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid report type' });
        }

        db.query(query, [startDate, endDate], (err, results) => {
            if (err) {
                console.error('Error fetching data:', err);
                return res.status(500).json({ success: false, message: 'Error generating report' });
            }

            const pdfPath = `reports/${reportType}-report.pdf`;
            const doc = new PDFDocument();
            doc.pipe(fs.createWriteStream(pdfPath));

            doc.fontSize(20).text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, { align: 'center' });
            doc.moveDown();

            results.forEach(item => {
                Object.entries(item).forEach(([key, value]) => {
                    doc.text(`${key}: ${value}`);
                });
                doc.moveDown();
            });

            doc.end();

            const insertQuery = `
                INSERT INTO report_generations (user_id, report_type, start_date, end_date, file_path)
                VALUES (?, ?, ?, ?, ?)
            `;
            const insertValues = [userId, reportType, startDate, endDate, pdfPath];
            db.query(insertQuery, insertValues, (err) => {
                if (err) {
                    console.error('Error inserting report generation details:', err);
                    return res.status(500).json({ success: false, message: 'Error saving report details' });
                }

                sendEmailWithReport(generator_email, pdfPath, generator_name);
                res.status(200).json({ success: true, message: 'Report generated and sent to your email.' });
            });
        });
    }
});

// Function to send the email with the report
function sendEmailWithReport(email, pdfPath, generatorName) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Report Generated`,
        text: `Dear ${generatorName},\n\nWe are pleased to provide you with the requested report. Please find the attached report.\n\nBest regards,\nMSME Empowerment Team`,
        attachments: [{ path: pdfPath }]
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) {
            console.error('Error sending email:', err);
            return;
        }
    });
}

// Dashboard Page
app.get('/dashboard', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});
app.get('/admin-dashboard', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin_dashboard.html'));
});

app.post('/logout', (req, res) => {
    const userData = req.session.user;
    const email = userData.email; // Get the logged-in email from the session
    const userId = userData.id; // Get the user ID from the session
    const logId = req.session.logId; // Get the login log ID from the session

    console.log(`Attempting to logout user with email: ${email}, ID: ${userId}, and logId: ${logId}`);

    // Check if session data exists
    if (!email || !logId || !userId) {
        return res.status(403).json({ error: 'No active login session found.' });
    }

    const logoutTime = moment.tz("Africa/Kigali").format('YYYY-MM-DD HH:mm:ss');

    // Fetch the login time from the database using logId
    const logSql = 'SELECT login_time FROM login_logs WHERE id = ?';
    db.query(logSql, [logId], (logErr, logResult) => {
        if (logErr) {
            console.error('Error fetching login log:', logErr);
            return res.status(500).json({ error: 'Database error during logout.' });
        }

        if (logResult.length === 0) {
            console.log('No login log found for logId:', logId);
            return res.status(404).json({ error: 'Login log not found.' });
        }

        const loginTimeFromDB = logResult[0].login_time;

        // Calculate time spent in seconds between login and logout
        const timeSpent = moment(logoutTime).diff(moment(loginTimeFromDB), 'seconds');

        // Update the login log with logout details
        const updateLogSql = `
            UPDATE login_logs
            SET logout_time = ?, time_spent = ?, message = ?
            WHERE id = ?
        `;
        db.query(updateLogSql, [logoutTime, timeSpent, 'User logged out successfully.', logId], (updateErr) => {
            if (updateErr) {
                console.error('Error updating login log:', updateErr);
                return res.status(500).json({ error: 'Database error during logout.' });
            }

            // Clear session data manually
            req.session.user = null; // Clear user information from session
            req.session.logId = null; // Clear logId

            console.log(`User with email ${email} logged out successfully.`);
            // Send a JSON response with the message (client will handle the redirect)
            return res.status(200).json({ message: 'Logout successful', redirect: '/login' });
        });
    });
});

// Fetch all users
app.get('/api/users-data', (req, res) => {
    db.query('SELECT id, name,email, role FROM users', (err, users) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(users);
    });
});

// Update a user's role
app.put('/api/users-data/:id', (req, res) => {
    const { role } = req.body;
    db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id], (err) => {
        if (err) {
            console.error('Error updating user role:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.sendStatus(204);
    });
});

// Delete a user
app.delete('/api/users-data/:id', (req, res) => {
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            console.error('Error deleting user:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.sendStatus(204);
    });
});

// Fetch all login logs
app.get('/api/login-logs', (req, res) => {
    db.query('SELECT id, email, status, login_time, logout_time FROM login_logs', (err, logs) => {
        if (err) {
            console.error('Error fetching login logs:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(logs);
    });
});
// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    });
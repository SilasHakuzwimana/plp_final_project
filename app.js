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

const app = express();
const port = process.env.PORT || 3000;

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

    const { name, email, password } = req.body;

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

// Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Login Logic
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Database error.');
        }

        if (results.length === 0) {
            return res.send('User not found. Please register.');
        }

        const user = results[0];

        bcryptjs.compare(password, user.password, (err, isMatch) => {
            if (err || !isMatch) {
                return res.send('Invalid credentials, please try again.');
            }

            req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, profile_picture: user.profile_picture };
            if (user.role === 'admin' || user.role === 'trader') {
                res.redirect('/dashboard'); // Redirect to dashboard for admin or trader
            } else {
                res.redirect('/customers'); // Redirect to /customers for other roles
            }
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
app.post('/generate-report', (req, res) => {
    const { reportType, startDate, endDate } = req.body;
    res.send(`Generating ${reportType} report from ${startDate} to ${endDate}.`);
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
    const userId = req.params.id; // Get user ID from URL params
    const sessionUserId = req.session.user.id; // Get user ID from session

    console.log('User ID from URL:', userId);
    console.log('User ID from session:', sessionUserId);

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
    db.query('SELECT * FROM users WHERE role = ?', ['customers'], (error, results) => {
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
    const { itemName, pricePerItem, orderDate, totalAmount, orderDescription } = req.body;
    const query = `INSERT INTO orders (user_id, customer_name, customer_email, itemName, pricePerItem, order_date, total_amount, orderDescription, status) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`;
    db.query(query, [userData.id, userData.name, userData.email, itemName, pricePerItem, orderDate, totalAmount, orderDescription], 
    (error, results) => {
        if (error) return res.status(500).json({ error: 'Database error' });
        res.status(201).json({ id: results.insertId });
    });
});

// Get orders
app.get('/api/orders', checkAuth, (req, res) => {
    const userId = req.session.user.id;

    // Log the userId to ensure it's correctly set
    console.log("User ID from session:", userId);

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
            port: 587,
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

// Dashboard Page
app.get('/dashboard', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

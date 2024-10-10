const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { check, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
require('dotenv').config();
const moment = require('moment-timezone');
const crypto = require('crypto');
;

// Initialize the app
const app = express();

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
}));
const port = process.env.DB_PORT  || 3000

// Create connection to the database server
const connection = mysql.createConnection({
    host:                  process.env.DB_HOST,
    user:                  process.env.DB_USER,
    password:              process.env.DB_PASS,
    database:              process.env.DB_NAME
});

// Connect to the database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
    } else {
        console.log('Connected successfully to the DB server.');
    }
});

// Serve static files
app.use(express.static(__dirname));

// Middleware to handle incoming data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define routes for static HTML pages
app.get('', (req, res) => {
    res.sendFile(path.join(__dirname, 'public','index.html'));
});

app.get('/view-reports', (req, res) => {
    res.sendFile(path.join(__dirname,'public', 'expense_report.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname,'public', 'contact.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname,'public', 'about.html'));
});
app.get('/budget', (req, res) => {
    res.sendFile(path.join(__dirname,'public', 'budget.html'));
});
app.get('/category', (req, res) => {
    res.sendFile(path.join(__dirname,'public', 'category.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/forgot', (req, res) => {
    res.sendFile(path.join(__dirname, 'public','forgot_password.html'));
});
app.get('/reset/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public','reset_password.html'));
});

app.get('/otp-verification',(req, res) =>{
    res.sendFile(path.join(__dirname,'public', 'otp_verification.html'));
})
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public','dashboard.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public','login.html'));
});
app.get('/expense', (req, res) => {
    res.sendFile(path.join(__dirname,'public', 'expense.html'));
});

// User object for handling user-related operations
class User {
    static getUserByEmail(email, callback) {
        const query = 'SELECT * FROM app_users WHERE email = ?';
        connection.query(query, [email], callback);
    }

    static getUserByUsername(username, callback) {
        const query = 'SELECT * FROM app_users WHERE username = ?';
        connection.query(query, [username], callback);
    }

    static createUser(newUser, callback) {
        const query = 'INSERT INTO app_users (full_name, username, email, password) VALUES (?, ?, ?, ?)';
        connection.query(query, [newUser.full_name, newUser.username, newUser.email, newUser.password], callback);
    }

    static saveResetToken(userId, token, callback) {
        const expires = moment.tz('Africa/Kigali').add(30, 'minutes').toDate(); // Token expires in 30 minutes
        connection.query('UPDATE app_users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, userId], callback);
    }

    static verifyResetToken(token, callback) {
        connection.query('SELECT * FROM app_users WHERE reset_token = ?', [token], (err, user) => {
            if (err) {
                return callback(err, null);
            }

            if (!user || user.length === 0) {
                return callback(new Error('Token not found'), null);
            }

            const now = moment.tz('Africa/Kigali').toDate(); // Current time in Africa/Kigali
            console.log(`The current time is: ${now}`);
            if (now > user[0].reset_token_expires) {
                return callback(new Error('Token has expired'), null);
            }

            callback(null, user[0]);
        });
    }

    static updatePassword(userId, newPassword, callback) {
        const query = 'UPDATE app_users SET password = ? WHERE id = ?';
        connection.query(query, [newPassword, userId], callback);
    }
}

module.exports = User;


// Registration handling
app.post('/register', [
    check('email').isEmail().withMessage('Please provide a valid email address.'),
    check('username').isAlphanumeric().withMessage('Username needs to be alphanumeric'),
    check('email').custom(async (email) => {
        return new Promise((resolve, reject) => {
            User.getUserByEmail(email, (err, user) => {
                if (err) {
                    reject(new Error('Server Error'));
                }
                if (user.length > 0) {
                    reject(new Error('Email already exists!'));
                }
                resolve(true);
            });
        });
    }),
    check('username').custom(async (username) => {
        return new Promise((resolve, reject) => {
            User.getUserByUsername(username, (err, user) => {
                if (err) {
                    reject(new Error('Server Error'));
                }
                if (user.length > 0) {
                    reject(new Error('Username already exists!'));
                }
                resolve(true);
            });
        });
    })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    const newUser = {
        full_name: req.body.full_name,
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword
    };

    User.createUser(newUser, (error) => {
        if (error) {
            console.error('Error inserting new user record: ' + error.message);
            return res.status(500).json({ error: error.message });
        }
        console.log('New user successfully created.');
        res.status(201).json({ message: 'Registration successful', user: newUser });
    });
});

const sendOTPEmail = async (email, fullName,otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Your email service
        auth: {
            user: process.env.EMAIL_USER, // Your email
            pass: process.env.EMAIL_PASS, // Your email password
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Expense Tracker App OTP',
        html: `
           <!DOCTYPE html>
        <html lang="en">

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #f4f4f4;
                }

                .container {
                    padding: 20px;
                    border: 1px solid #f0f0f0;
                    border-radius: 5px;
                    background-color: #ffffff;
                    max-width: 600px;
                    margin: 20px auto;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                }

                h2 {
                    color: #333;
                }

                p {
                    font-size: 16px;
                    color: #555;
                    line-height: 1.5;
                }

                .otp-code {
                    font-size: 32px;
                    color: #007BFF;
                    text-align: center;
                    font-weight: bold;
                    margin: 20px 0;
                }

                .footer {
                    font-size: 14px;
                    color: #999;
                    text-align: center;
                    margin-top: 20px;
                }

                .note {
                    font-size: 14px;
                    color: #FF0000;
                    text-align: center;
                    margin: 10px 0;
                }
            </style>
        </head>

        <body>
            <div class="container">
                <h2>Expense Tracker App OTP</h2>
                <p>Dear ${fullName},</p>
                <p>Your One-Time Password (OTP) is:</p>
                <div class="otp-code">${otp}</div>
                <p>Please enter this code to verify your login.</p>
                <div class="note">This code is valid for 10 minutes only.</div>
                <p>Thank you,<br>Expense Tracker App Team</p>
            </div>
        </body>

        </html>
        `,
    };

    await transporter.sendMail(mailOptions);
};

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Retrieve the user by username
    User.getUserByUsername(username, async (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        // Check if the user exists
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        const user = results[0];

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
        await sendOTPEmail(user.email, user.full_name, otp);

        // Set OTP expiration to 10 minutes from now
        const otpExpires = moment.tz('Africa/Kigali').add(10, 'minutes').toDate();

        // Save OTP and its expiration in the database
        connection.query('UPDATE app_users SET otp = ?, otp_expires = ? WHERE id = ?', 
            [otp, otpExpires, user.id], (error) => {
                if (error) {
                    console.error('Error saving OTP:', error);
                    return res.status(500).json({ message: 'Internal server error' });
                }

                // Store OTP in session (optional, can be removed for better security)
                req.session.otp = otp;
                req.session.user_id = user.id;

                return res.status(200).json({ message: 'OTP sent to your email.' });
            });
    });
});

app.post('/verify-otp', (req, res) => {
    const { otp } = req.body;

    // Retrieve user from database based on user_id stored in session
    const userId = req.session.user_id;

    connection.query('SELECT * FROM app_users WHERE id = ?', [userId], (error, results) => {
        if (error) {
            console.error('Error fetching user:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }

        const user = results[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if OTP matches and its expiration
        const now = moment.tz('Africa/Kigali').toDate(); // Current time in Africa/Kigali
        if (otp === user.otp && now < user.otp_expires) {
            req.session.user = { id: userId }; // Store user info in session
            return res.redirect('/dashboard'); // Redirect to dashboard on successful login
        } else {
            return res.status(401).json({ message: 'Invalid or expired OTP' });
        }
    });
});

// Authorization middleware
const userAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

const sendPasswordResetEmail = async (email, resetUrl) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Your email service
        auth: {
            user: process.env.EMAIL_USER, // Your email
            pass: process.env.EMAIL_PASS, // Your email password
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #f0f0f0; border-radius: 5px; background-color: #f9f9f9;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p style="font-size: 16px; color: #555;">Dear User,</p>
                <p style="font-size: 16px; color: #555;">We received a request to reset your password. Click the link below to reset it:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 10px 15px; margin: 20px 0; font-size: 16px; color: #fff; background-color: #007BFF; border-radius: 5px; text-decoration: none;">Reset Your Password</a>
                <p style="font-size: 14px; color: #999;">If you did not request a password reset, please ignore this email.</p>
                <p style="font-size: 16px; color: #555;">Thank you,<br>Expense Tracker App Team</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};

app.post('/forgot', async (req, res) => {
    const { email } = req.body;

    // Retrieve the user by email
    User.getUserByEmail(email, async (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = results[0];
        const token = crypto.randomBytes(20).toString('hex');
        await User.saveResetToken(user.id, token); // Save token and expiration

        const resetUrl = `http://localhost:3000/reset/${token}`;
        await sendPasswordResetEmail(email, resetUrl);

        return res.status(200).json({ message: 'Password reset link sent to your email.' });
    });
});

app.post('/reset/:token', async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Verify token and check if it hasn't expired
    User.verifyResetToken(token, async (err, user) => {
        if (err || !user) {
            return res.status(400).json({ message: 'Invalid or expired token.' });
        }

        // Hash new password and update user record
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updatePassword(user.id, hashedPassword);

        return res.status(200).json({ message: 'Password has been reset.' });
    });
});

// Secure route
app.get('/dashboard', userAuthenticated, (req, res) => {
    res.status(200).json({ message: 'You are viewing a secured route.' });
});

// Destroy session (logout)
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Express route to handle adding a new category
app.post('/add-category', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    const { category_name } = req.body;

    // Validate request
    if (!category_name) {
        return res.status(400).json({ error: 'Category name is required.' });
    }

    const newCategory = { category_name, user_id: userId };

    connection.query('INSERT INTO category SET ?', newCategory, (err) => {
        if (err) {
            console.error('Error adding category:', err);
            return res.status(500).json({ error: 'Failed to add category.' });
        }
        res.status(200).json({ message: 'Category added successfully.' });
    });
});

// Express route to get categories for the logged-in user
app.get('/get-categories', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;

    connection.query('SELECT category_id, category_name FROM category WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.status(500).json({ error: 'Failed to fetch categories.' });
        }

        // Always return a categories array, even if empty
        if (results.length === 0) {
            return res.status(200).json({ categories: [], message: 'No categories found. Add some to get started.' });
        }

        res.status(200).json({ categories: results });
    });
});


// Express route to get a specific category by ID
app.get('/get-category/:id', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    const { id } = req.params;

    connection.query('SELECT * FROM category WHERE category_id = ? AND user_id = ?', [id, userId], (err, results) => {
        if (err) {
            console.error('Error fetching category:', err);
            return res.status(500).json({ error: 'Failed to fetch category.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Category not found or unauthorized.' });
        }
        res.status(200).json(results[0]);
    });
});
app.get('/search-category/:searchTerm', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    const searchTerm = req.params.searchTerm || '';

    // Sanitize and prepare the search term for SQL query
    const sanitizedSearchTerm = `%${searchTerm}%`;

    const query = `
        SELECT * FROM category
        WHERE user_id = ?
          AND (category_name LIKE ? OR category_id = ?)
    `;

    // Execute the query
    connection.query(query, [userId, sanitizedSearchTerm, searchTerm], (err, results) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.status(500).json({ error: 'Failed to fetch categories.' });
        }
        res.status(200).json(results);
    });
});

// Route to update a category
app.put('/update-category/:id', [
    check('category_name').optional().notEmpty().withMessage('Category name is required')
], (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    const { id } = req.params;
    const { category_name } = req.body;

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const updateFields = {};
    if (category_name) updateFields.category_name = category_name;

    // Update category
    connection.query('UPDATE category SET ? WHERE category_id = ? AND user_id = ?', [updateFields, id, userId], (err, result) => {
        if (err) {
            console.error('Error updating category:', err);
            return res.status(500).json({ error: 'Failed to update category.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found or unauthorized.' });
        }
        res.status(200).json({ message: 'Category updated successfully.' });
    });
});

// Route to delete a category
app.delete('/delete-category/:id', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    const { id } = req.params;

    // Delete category
    connection.query('DELETE FROM category WHERE category_id = ? AND user_id = ?', [id, userId], (err, result) => {
        if (err) {
            console.error('Error deleting category:', err);
            return res.status(500).json({ error: 'Failed to delete category.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found or unauthorized.' });
        }
        res.status(200).json({ message: 'Category deleted successfully.' });
    });
});

// Express route to handle adding a new budget
// Add a new budget
app.post('/add-budget', [
    check('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number')
], (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    const { amount } = req.body;

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const newBudget = { amount, user_id: userId };

    connection.query('INSERT INTO budget SET ?', newBudget, (err) => {
        if (err) {
            console.error('Error adding budget:', err);
            return res.status(500).json({ error: 'Failed to add budget.' });
        }
        res.status(200).json({ message: 'Budget added successfully.' });
    });
});

// Get all budgets for the logged-in user
app.get('/get-budgets', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    const startOfMonth = moment().startOf('month').format('YYYY-MM-DD HH:mm:ss');
    const endOfMonth = moment().endOf('month').format('YYYY-MM-DD HH:mm:ss');

    // Query to get the budget for the current month and year
    const budgetQuery = `
        SELECT budget_id, SUM(amount) as amount, createdAt
        FROM budget
        WHERE user_id = ? AND createdAt >= ? AND createdAt <= ?`;

    connection.query(budgetQuery, [userId, startOfMonth, endOfMonth], (err, budgetResults) => {
        if (err) {
            console.error('Error fetching budgets:', err);
            return res.status(500).json({ error: 'Failed to fetch budgets.' });
        }
        const amount = budgetResults[0].amount || 0;

        if (budgetResults.length === 0) {
            return res.status(404).json({ message: 'No budgets found.' });
        }

        // Query to calculate total expenses for the current month
        const expensesQuery = `SELECT SUM(amount) AS totalExpenses FROM expenses WHERE user_id = ? AND date >= ? AND date <= ?`;

        connection.query(expensesQuery, [userId, startOfMonth, endOfMonth], (err, expenseResults) => {
            if (err) {
                console.error('Error fetching expenses:', err);
                return res.status(500).json({ error: 'Failed to fetch expenses.' });
            }

            const totalExpensesMonth = expenseResults[0].totalExpenses || 0;

            const budgets = budgetResults.map(budget => {
                const createdAt = moment(budget.createdAt).format('YYYY-MM-DD HH:mm:ss');
                return {
                    ...budget,
                    createdAt,
                    budget_id:budget.budget_id,
                    remainingAmount: (amount - totalExpensesMonth).toLocaleString(),
                    totalExpensesMonth: totalExpensesMonth.toLocaleString(),
                    budget: amount.toLocaleString()
                };
            });

            res.status(200).json({
                success: true,
                budgets,
                totalExpensesMonth: totalExpensesMonth.toLocaleString(),
                remainingAmount: (budgetResults.reduce((sum, b) => sum + b.amount, 0) - totalExpensesMonth).toLocaleString()
            });
        });
    });
});

// Get a specific budget by ID
app.get('/get-budget/:id', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    const { id } = req.params;

    connection.query('SELECT * FROM budget WHERE budget_id = ? AND user_id = ?', [id, userId], (err, results) => {
        if (err) {
            console.error('Error fetching budget:', err);
            return res.status(500).json({ error: 'Failed to fetch budget.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Budget not found or unauthorized.' });
        }
        res.status(200).json(results[0]);
    });
});

// Update a budget
app.put('/update-budget/:id', [
    check('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be a positive number')
], (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    const { id } = req.params;
    const { amount } = req.body;

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const updateFields = {};
    if (amount) updateFields.amount = amount;

    // Update budget
    connection.query('UPDATE budget SET ? WHERE budget_id = ? AND user_id = ?', [updateFields, id, userId], (err, result) => {
        if (err) {
            console.error('Error updating budget:', err);
            return res.status(500).json({ error: 'Failed to update budget.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Budget not found or unauthorized.' });
        }
        res.status(200).json({ message: 'Budget updated successfully.' });
    });
});

// Delete a budget
app.delete('/delete-budget/:id', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    const { id } = req.params;

    // Delete budget
    connection.query('DELETE FROM budget WHERE budget_id = ? AND user_id = ?', [id, userId], (err, result) => {
        if (err) {
            console.error('Error deleting budget:', err);
            return res.status(500).json({ error: 'Failed to delete budget.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Budget not found or unauthorized.' });
        }
        res.status(200).json({ message: 'Budget deleted successfully.' });
    });
});
// Import necessary modules
app.get('/expenses-summary', (req, res) => {
    const userId = req.session.user_id;

    // Get the start and end of the current month
    const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
    const endOfMonth = moment().endOf('month').format('YYYY-MM-DD');
    // Get the current month name
    const currentMonth = moment().format('MMMM');

    // Query to get the total amount spent this month
    const totalExpensesQuery = `SELECT SUM(amount) AS total_expenses FROM expenses WHERE user_id = ?`;
    const spentThisMonthQuery = `SELECT SUM(amount) AS spent_this_month FROM expenses WHERE user_id = ? AND date >= ? AND date <= ?`;

    connection.query(totalExpensesQuery, [userId], (err, totalResults) => {
        if (err) {
            console.error('Error retrieving total expenses:', err);
            return res.status(500).json({ success: false, message: 'Failed to retrieve total expenses.' });
        }

        const totalExpenses = totalResults[0].total_expenses || 0;

        connection.query(spentThisMonthQuery, [userId, startOfMonth, endOfMonth], (err, monthResults) => {
            if (err) {
                console.error('Error retrieving expenses for this month:', err);
                return res.status(500).json({ success: false, message: 'Failed to retrieve expenses for this month.' });
            }

            const spentThisMonth = monthResults[0].spent_this_month || 0;

            res.json({
                success: true,
                totalExpenses: totalExpenses,
                expensesThisMonth: spentThisMonth,
                startOfMonth:startOfMonth,
                endOfMonth: endOfMonth,
                currentMonth:currentMonth
            });
        });
    });
});

// Get total expenses and remaining amount
app.get('/remaining-amount', (req, res) => {
    const userId = req.session.user_id; // Assuming user ID is stored in session
    const startOfMonth = moment().startOf('month').format('YYYY-MM-DD HH:mm:ss');
    const endOfMonth = moment().endOf('month').format('YYYY-MM-DD HH:mm:ss');


    // Query to get the budget for the current month and year
    const budgetQuery = `
        SELECT SUM(amount) as amount
        FROM budget
        WHERE user_id = ?`;

    connection.query(budgetQuery, [userId, startOfMonth, endOfMonth], (err, budgetResults) => {
        if (err) {
            return res.json({ success: false, message: 'Database error while fetching budget', error: err });
        }

        if (budgetResults.length === 0) {
            return res.json({ success: false, message: 'No budget set for this month' });
        }

        const budget = budgetResults[0].amount || 0;

        // Query to calculate total expenses for the current month
        const expensesQuery = `SELECT SUM(amount) AS totalExpenses FROM expenses WHERE user_id = ? AND date >= ? AND date <= ?`;

        connection.query(expensesQuery, [userId, startOfMonth, endOfMonth], (err, expenseResults) => {
            if (err) {
                return res.json({ success: false, message: 'Database error while fetching expenses', error: err });
            }

            const totalExpensesMonth = expenseResults[0].totalExpenses || 0;
            const remainingAmount = budget - totalExpensesMonth;

            res.json({
                success: true,
                totalExpensesMonth: totalExpensesMonth.toLocaleString(),
                remainingAmount: remainingAmount.toLocaleString(),
                budget: budget.toLocaleString()
            });
        });
    });
});

app.get('/expenses-data', (req, res) => {
    connection.query('SELECT * FROM expenses', (error, results) => {
        if (error) {
            console.error('Failed to fetch expenses data:', error);
            res.status(500).json({ error: 'Failed to fetch expenses data' });
            return;
        }
        res.json(results);
    });
});

//route to add expenses
app.post('/add-expense', [
    check('item_name').notEmpty().withMessage('Item name is required'),
    check('category').notEmpty().withMessage('Category is required'),
    check('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    check('date').isISO8601().withMessage('Date must be in a valid format (YYYY-MM-DD)'),
    check('description').optional().isString()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const { item_name, category, amount, date, description } = req.body;

    // Retrieve category_id
    connection.query('SELECT category_id FROM category WHERE category_name = ?', [category], (err, results) => {
        if (err) {
            console.error('Error fetching category:', err);
            return res.status(500).json({ error: 'Database error while fetching category.' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: 'Invalid category name.' });
        }

        const category_id = results[0].category_id;

        // Insert into expenses table
        const newExpense = {
            user_id: req.session.user_id,
            item_name,
            category_id,
            amount,
            date,
            description
        };

        connection.query('INSERT INTO expenses SET ?', newExpense, (err, result) => {
            if (err) {
                console.error('Error adding expense:', err);
                return res.status(500).json({ error: 'Failed to add expense.' });
            }
            res.status(201).json({
                message: 'Expense added successfully.',
                expense: { id: result.insertId, ...newExpense }
            });
        });
    });
});

// Route to get all expenses for the logged-in user
app.get('/get-expenses', (req, res) => {
    // Ensure user is authenticated
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;

    // Fetch expenses for the logged-in user
    connection.query('SELECT e.expense_id, e.item_name, e.category_id, e.amount,c.category_name, e.date, e.description FROM expenses e JOIN category c ON e.category_id = c.category_id WHERE e.user_id = ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(200).json(results);
    });
});

// Route to get expense details by ID for the logged-in user
app.get('/get-expense/:id', (req, res) => {
    const { id } = req.params;

    // Ensure user is authenticated
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;

    // Fetch expense details by ID and ensure it belongs to the logged-in user
    connection.query('SELECT * FROM expenses WHERE expense_id = ? AND user_id = ?', [id, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Expense not found or unauthorized' });
        }
        res.status(200).json(results[0]);
    });
});

app.get('/search-expense', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    const searchTerm = req.query.search || '';

    // Sanitize the search term to prevent SQL injection
    const sanitizedSearchTerm = `%${searchTerm}%`;

    // Updated query with correct logic and parameter binding
    const query = `
        SELECT e.expense_id, e.item_name, e.category_id, e.amount,c.category_name, e.date, e.description FROM expenses e JOIN category c ON e.category_id = c.category_id
        WHERE e.user_id = ?
          AND (item_name LIKE ?)OR (expense_id LIKE ?)`;

    // Execute the query
    connection.query(query, [userId, sanitizedSearchTerm, searchTerm], (err, results) => {
        if (err) {
            console.error('Error fetching categories:', err);
            return res.status(500).json({ error: 'Failed to fetch categories.' });
        }
        res.status(200).json(results);
    });
});

app.put('/update-expense/:id', [
    check('item_name').optional().notEmpty().withMessage('Item name is required'),
    check('category').optional().notEmpty().withMessage('Category is required'),
    check('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    check('date').optional().isISO8601().withMessage('Date must be in a valid format (YYYY-MM-DD)'),
    check('description').optional().isString()
], async (req, res) => {
    const { id } = req.params;

    // Ensure user is authenticated
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array()); // Log validation errors
        return res.status(400).json({ errors: errors.array() });
    }

    // Destructure request body
    const { item_name, category, amount, date, description } = req.body;

    console.log('Request body:', req.body); // Log request body for debugging

    // Convert date to UTC (if necessary)
    const utcDate = date ? new Date(date).toISOString().slice(0, 10) : undefined;

    // Prepare fields for update
    const updateFields = { item_name, amount, date: utcDate, description };
    const queryParams = [userId, id];

    console.log('Updating with fields:', updateFields); // Log fields being updated

    try {
        // If category is provided, get the category_id
        if (category) {
            const [results] = await connection.promise().query('SELECT category_id as id FROM category WHERE category_id = ?', [category]);

            if (results.length === 0) {
                return res.status(400).json({ error: 'Invalid category name.' });
            }

            const category_id = results[0].id;
            updateFields.category_id = category_id;
        }

        // Update expense
        const [result] = await connection.promise().query('UPDATE expenses SET ? WHERE user_id = ? AND expense_id = ?', [updateFields, userId, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Expense not found or unauthorized' });
        }

        res.status(200).json({ message: 'Expense updated successfully.' });

    } catch (err) {
        console.error('Error updating expense:', err); // Log detailed error
        res.status(500).json({ error: 'Failed to update expense.' });
    }
});



// Route to delete an expense
app.delete('/delete-expense/:id', (req, res) => {
    const { id } = req.params;

    // Ensure user is authenticated
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;

    // Delete expense
    connection.query('DELETE FROM expenses WHERE user_id = ? AND expense_id = ?', [userId, id], (err, result) => {
        if (err) {
            console.error('Error deleting expense:', err);
            return res.status(500).json({ error: 'Failed to delete expense.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Expense not found or unauthorized' });
        }
        res.status(200).json({ message: 'Expense deleted successfully.' });
    });
});


// Express route to handle sending a message
app.post('/send-message', (req, res) => {
    const { name, email, tel, message } = req.body;

    if (!name || !email || !tel || !message) {
        return res.status(400).json({ success: false, error: 'Name, email, tel, and message are required.' });
    }

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"${process.env.WEBSITE_NAME}" <${email}>`,
        replyTo: email,
        to: process.env.EMAIL_USER,
        subject: `Contact form message from ${process.env.WEBSITE_NAME}`,
        text: `You have received a new message from your website contact form:\n\n` +
              `Name: ${name}\n` +
              `Email: ${email}\n` +
              `Telephone: ${tel || 'N/A'}\n\n` +
              `Message:\n${message}`
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ success: false, error: 'Failed to send message.' });
        }
        res.status(200).json({ success: true, message: 'Message sent successfully.' });
    });
});

app.get('/report', async (req, res) => {
    // Ensure user is authenticated
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const userId = req.session.user_id;
    try {
        // Fetch user information from app_users table
        const [userRows] = await connection.promise().query('SELECT full_name, email FROM app_users WHERE id = ?', [userId]);
        const user = userRows[0]; // Assuming userId exists and is valid

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch expenses data
        const [rows] = await connection.promise().query('SELECT * FROM expenses WHERE user_id =?', [userId]);
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-disposition', 'attachment; filename=report.pdf');
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Add logo at the top center
        const logoPath = path.join(__dirname, 'images/University-College-School-crests-logo-emblems - Made with PosterMyWall.jpg'); // Adjust the path to your logo file
        const logoWidth = 100; // Set the width of the logo
        const pageWidth = doc.page.width;
        const logoX = (pageWidth - logoWidth) / 2; // Center the logo

        doc.image(logoPath, logoX, 20, { width: logoWidth });

        // Add "Expense Tracking Application" header and horizontal line
        doc.moveDown(6);
        doc.fillColor('#3498db').fontSize(14).text('Expense Tracking Application', { align: 'center' });
        doc.moveDown(0.5);

        const lineWidth = pageWidth - 100; // Adjust line length
        const lineX = (pageWidth - lineWidth) / 2; // Center the line
        doc.moveTo(lineX, doc.y).lineTo(lineX + lineWidth, doc.y).stroke('#3498db');

        // Add report title below the line
        doc.moveDown(1);
        doc.fillColor('#047013fd').fontSize(18).text('Expenses Report', { align: 'center' });
        doc.moveDown();

        let pageNumber = 1;
        let maxHeight = doc.page.height - doc.page.margins.bottom - 50; // Space for footer and page number

        rows.forEach((expense, index) => {
            if (doc.y > maxHeight) {
                // Add footer with page number
                const footerText = `Page ${pageNumber} - Date of Generation: ${new Date().toLocaleString()}  - Downloaded by: ${user.full_name} (${user.email})`;
                doc.moveDown(0.5);
                doc.fillColor('gray').fontSize(10)
                    .text(footerText, { align: 'center' })
                    .text('Generated by Expense Tracker App', { align: 'center' });

                // Add a new page
                doc.addPage();
                pageNumber++;

                // Reset height for new page
                maxHeight = doc.page.height - doc.page.margins.bottom - 50;
            }

            // Add expenses data
            doc.fillColor('black').fontSize(12);
            doc.text(`Item name: ${expense.item_name}`);
            doc.text(`Date: ${expense.date}`);
            doc.text(`Amount: $${expense.amount}`);
            doc.text(`Description: ${expense.description}`);
            doc.moveDown(1.5);
            doc.moveDown(0.5);
        });

        // Add footer to the last page
        const footerY = doc.page.height - doc.page.margins.bottom; // Position for the footer line
        const lineY = footerY - 65; // Y position for the horizontal line
        const textMargin = 60; // Margin above the line for text
        const footerWidth = doc.page.width - 2 * doc.page.margins.left; // Width for footer text
        const footerX = doc.page.margins.left; // X position for footer text

        // Draw the horizontal line for the footer
        doc.strokeColor('#3498db').lineWidth(1)
        .moveTo(footerX, lineY)
        .lineTo(doc.page.width - doc.page.margins.right, lineY)
        .stroke();

        // Add footer text
        doc.fillColor('gray').fontSize(10);

        // Main footer text
        doc.text(`Page ${pageNumber} - Date of Generation: ${new Date().toLocaleString()}`, footerX, footerY - textMargin, { align: 'center', width: footerWidth })
        .text(`Downloaded by: ${user.full_name} (${user.email})`, footerX, footerY - textMargin + 10, { align: 'center', width: footerWidth })
        .text('Generated by Expense Tracker App', footerX, footerY - textMargin + 30, { align: 'center', width: footerWidth });

        // Ensure there's enough space before adding more content or the end of the page
        doc.moveDown(0.5);

        doc.end();
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Route to get user info
app.get('/user-info', (req, res) => {
    const userId = req.session.user_id; // Assuming userId is stored in the session

    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Query the database
    connection.query('SELECT full_name, email FROM app_users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Database query error:', err); // Log the error for debugging
            return res.status(500).json({ error: 'Failed to fetch user data' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            full_name: results[0].full_name,
            email: results[0].email
        });
    });
});

// Start server
app.listen(port, () => {
    console.log('Server is running on port 3000.');
});

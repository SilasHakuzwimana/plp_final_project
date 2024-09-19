const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();
const bcryptjs = require('bcryptjs');
const app = express();

const port = process.env.PORT || 3000;

// In-memory user store (replace with a real database)
let users = [];

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes

// Register Page
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/views/register.html');
});

// Register Logic with bcrypt hashing
app.post('/register', async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.send('Passwords do not match.');
    }

    // Check if the user already exists
    const userExists = users.find(user => user.email === email);
    if (userExists) {
        return res.send('User already exists.');
    }

    try {
        // Hash the password
        const hashedPassword = await bcryptjs.hash(password, 10);
        
        // Store the user
        const newUser = { name, email, password: hashedPassword };
        users.push(newUser);

        res.send(`User ${name} registered successfully!`);
    } catch (error) {
        res.status(500).send('Error registering user: ' + error.message);
    }
});

// Login Page
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});

// Login Logic with bcrypt password comparison
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Find the user by email
    const user = users.find(user => user.email === email);
    if (!user) {
        return res.send('User not found. Please register.');
    }

    try {
        // Compare the hashed password
        const isMatch = await bcryptjs.compare(password, user.password);
        if (isMatch) {
            res.redirect('/dashboard');
        } else {
            res.send('Invalid credentials, please try again.');
        }
    } catch (error) {
        res.status(500).send('Error during login: ' + error.message);
    }
});

// Dashboard Page
app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/views/dashboard.html');
});

// Other Pages
app.get('/inventory', (req, res) => {
    res.sendFile(__dirname + '/views/inventory.html');
});
app.get('/customers', (req, res) => {
    res.sendFile(__dirname + '/views/customers.html');
});
app.get('/orders', (req, res) => {
    res.sendFile(__dirname + '/views/orders.html');
});
app.get('/reports', (req, res) => {
    res.sendFile(__dirname + '/views/reports.html');
});
app.post('/generate-report', (req, res) => {
    const { reportType, startDate, endDate } = req.body;
    res.send(`Generating ${reportType} report from ${startDate} to ${endDate}.`);
});
app.get('/logout', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});

// Start Server
app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});

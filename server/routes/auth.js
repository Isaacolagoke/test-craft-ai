const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Track login attempts
const loginAttempts = new Map();

// Password validation
const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    if (password.length < minLength) errors.push(`Password must be at least ${minLength} characters long`);
    if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter');
    if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter');
    if (!hasNumbers) errors.push('Password must contain at least one number');
    if (!hasSpecialChar) errors.push('Password must contain at least one special character');

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Password requirements not met',
                details: passwordValidation.errors
            });
        }

        // Check if user already exists
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const result = await db.run(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        // Generate token
        const token = jwt.sign(
            { id: result.lastID, email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: result.lastID,
                name,
                email
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to register user'
        });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Check login attempts
        const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
        const now = Date.now();
        const lockoutDuration = 15 * 60 * 1000; // 15 minutes

        if (attempts.count >= 5 && (now - attempts.lastAttempt) < lockoutDuration) {
            const remainingTime = Math.ceil((lockoutDuration - (now - attempts.lastAttempt)) / 60000);
            return res.status(429).json({
                success: false,
                error: `Too many failed attempts. Please try again in ${remainingTime} minutes`
            });
        }

        // Get user
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            loginAttempts.set(email, {
                count: attempts.count + 1,
                lastAttempt: now
            });
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            loginAttempts.set(email, {
                count: attempts.count + 1,
                lastAttempt: now
            });
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                attemptsLeft: 5 - (attempts.count + 1)
            });
        }

        // Reset login attempts on successful login
        loginAttempts.delete(email);

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to login'
        });
    }
});

// Password reset request
router.post('/reset-password-request', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { id: user.id, email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Store reset token in database
        await db.run(
            'UPDATE users SET reset_token = ?, reset_token_expires = datetime("now", "+1 hour") WHERE id = ?',
            [resetToken, user.id]
        );

        // In a real application, send email with reset link
        // For now, just return the token
        res.json({
            success: true,
            message: 'Password reset instructions sent',
            resetToken // Remove this in production
        });
    } catch (err) {
        console.error('Password reset request error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to process password reset request'
        });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Token and new password are required'
            });
        }

        // Validate new password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Password requirements not met',
                details: passwordValidation.errors
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if token is valid and not expired in database
        const user = await db.get(
            'SELECT id FROM users WHERE id = ? AND reset_token = ? AND reset_token_expires > datetime("now")',
            [decoded.id, token]
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear reset token
        await db.run(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.json({
            success: true,
            message: 'Password reset successful'
        });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to reset password'
        });
    }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token is required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user info
        const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [decoded.id]);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (err) {
        console.error('Token verification error:', err);
        res.status(403).json({
            success: false,
            error: 'Invalid token'
        });
    }
});

module.exports = router;
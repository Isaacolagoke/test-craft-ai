const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Password validation
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const errors = [];
    
    if (password.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters long`);
    }
    
    if (!hasUpperCase) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!hasLowerCase) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!hasNumbers) {
        errors.push('Password must contain at least one number');
    }
    
    if (!hasSpecialChar) {
        errors.push('Password must contain at least one special character');
    }
    
    return errors;
}

// In-memory storage for login attempts (consider using Redis for production)
const loginAttempts = new Map();

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        console.log('Registration attempt:', { ...req.body, password: '[REDACTED]' });
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required'
            });
        }

        // Validate password
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Password does not meet requirements',
                details: passwordErrors
            });
        }

        // Check if user already exists
        try {
            const existingUser = await db.get('users', { email });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'User already exists'
                });
            }
        } catch (err) {
            console.error('Error checking for existing user:', err);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        try {
            // Insert user into database
            const newUser = await db.insert('users', {
                name,
                email,
                password: hashedPassword
            });
            
            // Generate token
            const token = jwt.sign(
                { id: newUser.id, email },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            console.log('User registered successfully:', { id: newUser.id, name, email });
            
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                token,
                user: {
                    id: newUser.id,
                    name,
                    email
                }
            });
        } catch (insertErr) {
            console.error('Error inserting user into database:', insertErr);
            
            // Check if it's a unique constraint error
            if (insertErr.message && insertErr.message.includes('unique constraint')) {
                return res.status(409).json({
                    success: false,
                    error: 'User with this email already exists'
                });
            }
            
            throw insertErr;
        }
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to register user',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
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
        const user = await db.get('users', { email });
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
            process.env.JWT_SECRET || 'your-secret-key',
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

        const user = await db.get('users', { email });
        if (!user) {
            // For security reasons, don't reveal if user exists
            return res.json({
                success: true,
                message: 'If your email is registered, you will receive reset instructions'
            });
        }

        // Generate reset token (would be used in reset email)
        const resetToken = jwt.sign(
            { id: user.id, email: user.email, purpose: 'reset' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        // Here you would normally send an email with the reset link
        // For demo purposes, just return the token
        res.json({
            success: true,
            message: 'If your email is registered, you will receive reset instructions',
            resetToken // Only include in development
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

        // Validate password
        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Password does not meet requirements',
                details: passwordErrors
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        } catch (error) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        // Check if token is for password reset
        if (decoded.purpose !== 'reset') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token purpose'
            });
        }

        // Get user
        const user = await db.get('users', { id: decoded.id });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user password
        await db.update('users', { id: user.id }, { password: hashedPassword });

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to reset password'
        });
    }
});

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        // JWT authentication middleware would set req.user
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        const user = await db.get('users', { id: req.user.id });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Don't return password
        const { password, ...userWithoutPassword } = user;

        res.json({
            success: true,
            user: userWithoutPassword
        });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile'
        });
    }
});

module.exports = router;

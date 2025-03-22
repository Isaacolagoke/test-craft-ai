const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const db = require('../db');

// Store active sessions
const activeSessions = new Map();

// Security headers middleware using helmet
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://api.openai.com"]
        }
    },
    crossOriginEmbedderPolicy: false
});

// Rate limiting for different endpoints
const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            error: message,
            retryAfter: Math.ceil(windowMs / 60000) // minutes
        }
    });
};

// Rate limits
const limits = {
    auth: createRateLimit(
        15 * 60 * 1000, // 15 minutes
        50, // 50 attempts
        'Too many authentication attempts. Please try again later.'
    ),
    aiGeneration: createRateLimit(
        60 * 60 * 1000, // 1 hour
        50, // 50 AI generations
        'AI generation limit reached. Please try again in an hour.'
    ),
    quizCreation: createRateLimit(
        60 * 60 * 1000, // 1 hour
        100, // 100 quizzes
        'Quiz creation limit reached. Please try again in an hour.'
    )
};

// Session management
const sessionManager = {
    // Add new session
    addSession: (userId, token) => {
        if (!activeSessions.has(userId)) {
            activeSessions.set(userId, new Set());
        }
        activeSessions.get(userId).add(token);
    },

    // Remove session
    removeSession: (userId, token) => {
        if (activeSessions.has(userId)) {
            activeSessions.get(userId).delete(token);
        }
    },

    // Invalidate all sessions for user
    invalidateAllSessions: (userId) => {
        activeSessions.delete(userId);
    },

    // Check if session is valid
    isValidSession: (userId, token) => {
        return activeSessions.has(userId) && activeSessions.get(userId).has(token);
    }
};

// Enhanced error messages
const createErrorResponse = (type, details = {}) => {
    const errorMessages = {
        auth: {
            invalidCredentials: {
                error: 'Invalid credentials',
                suggestions: [
                    'Check if your email is correct',
                    'Make sure your password is correct',
                    'Reset your password if you forgot it'
                ]
            },
            passwordRequirements: {
                error: 'Password requirements not met',
                requirements: [
                    'At least 8 characters long',
                    'At least one uppercase letter',
                    'At least one lowercase letter',
                    'At least one number',
                    'At least one special character'
                ]
            },
            sessionExpired: {
                error: 'Session expired',
                action: 'Please log in again'
            }
        },
        quiz: {
            creationLimit: {
                error: 'Quiz creation limit reached',
                current: details.count,
                limit: details.limit,
                resetTime: details.resetTime
            },
            aiGenerationLimit: {
                error: 'AI generation limit reached',
                current: details.count,
                limit: details.limit,
                resetTime: details.resetTime
            }
        }
    };

    return {
        success: false,
        ...errorMessages[type]
    };
};

// Track quiz creation counts
const quizCounter = new Map();

// Quiz creation tracking
const trackQuizCreation = async (userId) => {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // Get or initialize user's quiz count
    if (!quizCounter.has(userId)) {
        quizCounter.set(userId, []);
    }
    
    // Clean old entries
    const userQuizzes = quizCounter.get(userId).filter(time => time > hourAgo);
    
    // Add new entry
    userQuizzes.push(now);
    quizCounter.set(userId, userQuizzes);
    
    // Get total quizzes created in last hour
    const count = userQuizzes.length;
    
    // Get user's total quizzes from database
    const totalQuizzes = await db.get(
        'SELECT COUNT(*) as count FROM quizzes WHERE creator_id = ?',
        [userId]
    );

    return {
        hourlyCount: count,
        totalCount: totalQuizzes.count
    };
};

module.exports = {
    securityHeaders,
    limits,
    sessionManager,
    createErrorResponse,
    trackQuizCreation
}; 
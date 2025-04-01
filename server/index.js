require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');
const statisticsRoutes = require('./routes/statistics');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configure PORT for deployment flexibility
const port = PORT;

// Enable CORS for production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://test-craft-ai.onrender.com', // Update with your actual frontend URL
        'https://testcraft-ai.vercel.app',    // Add alternative domains if needed
      ] 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make sure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads/quiz-images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/statistics', statisticsRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'TestCraft.ai API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Initialize database tables
function initializeDatabase() {
  console.log('Initializing database with fresh schema...');
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      try {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Quizzes table
        db.run(`CREATE TABLE IF NOT EXISTS quizzes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          creator_id INTEGER NOT NULL,
          settings TEXT,
          image_url TEXT,
          status TEXT DEFAULT 'draft',
          access_code TEXT UNIQUE,
          published_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (creator_id) REFERENCES users (id)
        )`);

        // Questions table
        db.run(`CREATE TABLE IF NOT EXISTS questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quiz_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          content TEXT NOT NULL,
          options TEXT,
          correct_answer TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
        )`);

        // Responses table
        db.run(`CREATE TABLE IF NOT EXISTS responses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quiz_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          answers TEXT NOT NULL,
          score REAL,
          completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (quiz_id) REFERENCES quizzes (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Feedback table
        db.run(`CREATE TABLE IF NOT EXISTS feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quiz_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (quiz_id) REFERENCES quizzes (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`, (err) => {
          if (err) {
            console.error('Error creating tables:', err);
            reject(err);
          } else {
            console.log('Database schema initialized successfully');
            resolve();
          }
        });
      } catch (error) {
        console.error('Error in database initialization:', error);
        reject(error);
      }
    });
  });
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email already registered' });
                    }
                    return res.status(500).json({ error: 'Error creating user' });
                }

                // After successful registration, create and send token
                const token = jwt.sign(
                    { id: this.lastID, email: email },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '24h' }
                );

                res.status(201).json({
                    message: 'User registered successfully',
                    token,
                    user: {
                        id: this.lastID,
                        name,
                        email
                    }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Error hashing password' });
    }
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Error finding user' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        try {
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Error comparing passwords' });
        }
    });
});

// Protected route example
app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching user' });
        }
        res.json(user);
    });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
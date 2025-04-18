require('dotenv').config();

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');
const statisticsRoutes = require('./routes/statistics');
const db = require('./db/index');

const supabase = require('./db/supabase');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access denied. No token provided.' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid or expired token.' 
      });
    }
    req.user = user;
    next();
  });
}

// Configure PORT for deployment flexibility
const port = PORT;

// Enable CORS for production
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'https://testcraft-web.onrender.com',
      'https://testcraft-web.onrender.app',
      'https://testcraft-ai.vercel.app',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      // Still allow the request to proceed
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Add CORS header to all responses as backup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    return res.status(204).json({});
  }
  next();
});

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

// Check database connection
async function checkDatabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
    } else {
      console.log('Successfully connected to Supabase');
    }
  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
  }
}

// Validate the database connection when the server starts
checkDatabaseConnection();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/statistics', statisticsRoutes);

// Direct route for quiz publishing (to handle the 404 issue)
app.put('/quizzes/:id/publish', authenticateToken, async (req, res) => {
  console.log('Direct publish route hit, redirecting to correct endpoint');
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`Direct route: Attempting to publish quiz ${id} for user ${userId}`);

    // Check if quiz exists and belongs to user
    const quiz = await db.getQuiz(id, userId);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to modify it'
      });
    }

    // Check if quiz has questions
    const questions = await db.getQuestions(id);
    if (!questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot publish quiz without questions'
      });
    }

    // Parse or initialize settings
    let settings = {};
    
    try {
      // Parse settings if available
      if (quiz.settings) {
        if (typeof quiz.settings === 'string') {
          settings = JSON.parse(quiz.settings);
        } else {
          settings = quiz.settings;
        }
      }
      
      // Check if accessCode exists in settings
      let accessCode = settings.accessCode;
      
      // Generate a new accessCode if not present
      if (!accessCode) {
        // Generate a 6-character alphanumeric code
        accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log('Generated new access code:', accessCode);
        
        // Store the access code in settings
        settings.accessCode = accessCode;
      }
    } catch (e) {
      console.error('Error processing settings:', e);
      // If there was an error, ensure we at least have a valid settings object with an accessCode
      settings = {
        ...settings,
        accessCode: Math.random().toString(36).substring(2, 8).toUpperCase()
      };
      console.log('Created fallback settings with new access code:', settings.accessCode);
    }

    // Only update fields that exist in the database schema
    const updates = {
      status: 'published',
      published_at: new Date().toISOString(),
      settings: settings
    };

    console.log('Updating quiz with:', JSON.stringify(updates));
    
    // Update the quiz with the published status and access code
    const result = await db.updateQuiz(id, updates);
    console.log('Update result:', result);

    // Return success response
    res.json({
      success: true,
      quiz: {
        ...result,
        settings: settings
      },
      message: 'Quiz published successfully',
      accessCode: settings.accessCode // For backward compatibility
    });
  } catch (error) {
    console.error('Error in direct publish route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish quiz',
      details: error.message
    });
  }
});

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
  console.log('Database tables are managed by Supabase');
  // For reference only - tables were created with the schema.sql file
}

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
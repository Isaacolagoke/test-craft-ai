require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { OpenAI } = require('openai');

const app = express();
const port = 3001;
const JWT_SECRET = 'your-secret-key'; // In production, use environment variable

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // Make sure to set this environment variable
});

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File size too large',
                details: 'Maximum file size is 3MB'
            });
        }
        return res.status(400).json({
            error: 'File upload error',
            details: err.message
        });
    } else if (err) {
        return res.status(400).json({
            error: 'Invalid file',
            details: err.message
        });
    }
    next();
};

const uploadMultiple = upload.fields([
    { name: 'question_image', maxCount: 1 },
    { name: 'option_images', maxCount: 4 } // Maximum 4 option images
]);

// Middleware
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Initialize SQLite database
const db = new sqlite3.Database('testcraft.db', (err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to SQLite database');
        // Drop existing tables to ensure clean schema
        db.serialize(() => {
            db.run('DROP TABLE IF EXISTS feedback');
            db.run('DROP TABLE IF EXISTS responses');
            db.run('DROP TABLE IF EXISTS questions');
            db.run('DROP TABLE IF EXISTS quizzes');
            db.run('DROP TABLE IF EXISTS users');
            initializeDatabase();
        });
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        // Quizzes table with updated schema
        db.run(`CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      duration INTEGER, -- in minutes
      complexity TEXT CHECK(complexity IN ('beginner', 'intermediate', 'advanced')),
      category TEXT,
      number_of_questions INTEGER,
      image_url TEXT,
      creator_id INTEGER NOT NULL,
      settings TEXT,
      public_access BOOLEAN DEFAULT FALSE,
      access_code TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'deleted')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users (id)
    )`);

        // Questions table
        db.run(`CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('multiple_choice', 'short_answer', 'paragraph', 'file_upload', 'true_false', 'dropdown', 'matching', 'fill_in_blanks')),
      content TEXT NOT NULL,
      question_image_url TEXT,
      options TEXT,
      option_image_urls TEXT,
      correct_answer TEXT,
      matching_pairs TEXT,
      fill_in_blanks TEXT,
      file_requirements TEXT,
      file_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
    )`);

        // Responses table with updated schema
        db.run(`CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      user_id INTEGER,
      participant_name TEXT,
      participant_email TEXT,
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
    )`);
    });
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
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
                res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
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
                JWT_SECRET,
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

// Quiz Creation endpoint (updated with image upload)
app.post('/api/quizzes', authenticateToken, upload.single('image'), (req, res) => {
    console.log('Received quiz creation request:', {
        body: req.body,
        file: req.file,
        headers: req.headers,
        user: req.user
    });

    // Extract data from form-data
    const title = req.body.title;
    const description = req.body.description;
    const duration = parseInt(req.body.duration);
    const complexity = req.body.complexity;
    const category = req.body.category;
    const number_of_questions = parseInt(req.body.number_of_questions);
    const creator_id = req.user.id;

    // Validate required fields
    if (!title || !description || !duration || !complexity || !category || !number_of_questions) {
        console.log('Validation failed - missing required fields:', {
            title: !!title,
            description: !!description,
            duration: !!duration,
            complexity: !!complexity,
            category: !!category,
            number_of_questions: !!number_of_questions
        });
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate complexity
    const validComplexities = ['beginner', 'intermediate', 'advanced'];
    if (!validComplexities.includes(complexity)) {
        console.log('Invalid complexity level:', complexity);
        return res.status(400).json({ error: 'Invalid complexity level' });
    }

    // Handle image URL
    let image_url = '/uploads/default-quiz-icon.png'; // Default image path
    if (req.file) {
        image_url = `/uploads/${req.file.filename}`;
    }

    const sql = `INSERT INTO quizzes (title, description, duration, complexity, category, number_of_questions, image_url, creator_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [title, description, duration, complexity, category, number_of_questions, image_url, creator_id], function (err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                error: 'Error creating quiz',
                details: err.message,
                code: err.code
            });
        }

        const quizId = this.lastID;
        console.log('Quiz created successfully with ID:', quizId);

        // Fetch the created quiz
        db.get('SELECT * FROM quizzes WHERE id = ?', [quizId], (err, quiz) => {
            if (err) {
                console.error('Error fetching created quiz:', err);
                return res.status(500).json({
                    error: 'Error fetching created quiz',
                    details: err.message
                });
            }
            res.status(201).json({
                message: 'Quiz created successfully',
                quizId: quizId,
                quiz: quiz
            });
        });
    });
});

// AI Quiz Generation endpoint
app.post('/api/quizzes/generate', authenticateToken, async (req, res) => {
    const {
        title,
        description,
        duration,
        complexity,
        category,
        number_of_questions,
        question_types = ['multiple_choice', 'true_false'] // Default to simpler question types
    } = req.body;

    // Validate required fields
    if (!title || !description || !duration || !complexity || !category || !number_of_questions) {
        return res.status(400).json({
            error: 'Missing required fields',
            details: 'Title, description, duration, complexity, category, and number of questions are required'
        });
    }

    // Validate complexity
    const validComplexities = ['beginner', 'intermediate', 'advanced'];
    if (!validComplexities.includes(complexity)) {
        return res.status(400).json({ error: 'Invalid complexity level' });
    }

    try {
        // Create quiz first
        const quizResult = await new Promise((resolve, reject) => {
            const sql = `INSERT INTO quizzes (title, description, duration, complexity, category, number_of_questions, creator_id) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;

            db.run(sql, [title, description, duration, complexity, category, number_of_questions, req.user.id], function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });

        const quizId = quizResult;

        // Generate questions using OpenAI with improved prompt and JSON mode
        const prompt = `Generate ${number_of_questions} ${complexity} level questions about ${title}.
                       Topic: ${description}
                       Category: ${category}
                       
                       Each question MUST be in this exact JSON format:
                       {
                         "type": "multiple_choice", // Must be one of: ${question_types.join(', ')}
                         "question": "The question text",
                         "options": ["option1", "option2", "option3", "option4"],
                         "correct_answer": "The correct option text"
                       }
                       
                       Return an array of questions in this format.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: "You are a quiz question generator. You will ONLY respond with valid JSON arrays containing questions in the exact format specified by the user. Each question MUST include all required fields: type, question, options, and correct_answer."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
        });

        const generatedQuestions = JSON.parse(completion.choices[0].message.content).questions;

        // Validate and insert generated questions
        for (const q of generatedQuestions) {
            // Validate question format
            if (!q.type || !q.question || !q.options || !q.correct_answer) {
                throw new Error('Invalid question format: missing required fields');
            }

            // Validate question type
            if (!question_types.includes(q.type)) {
                throw new Error(`Invalid question type: ${q.type}`);
            }

            await new Promise((resolve, reject) => {
                const sql = `INSERT INTO questions (
                    quiz_id, type, content, options, correct_answer
                ) VALUES (?, ?, ?, ?, ?)`;

                db.run(sql, [
                    quizId,
                    q.type,
                    q.question,
                    JSON.stringify(q.options),
                    q.correct_answer
                ], function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
        }

        // Fetch the created quiz with its questions
        const quiz = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM quizzes WHERE id = ?', [quizId], (err, quiz) => {
                if (err) reject(err);
                else resolve(quiz);
            });
        });

        const questions = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM questions WHERE quiz_id = ?', [quizId], (err, questions) => {
                if (err) reject(err);
                else resolve(questions);
            });
        });

        res.status(201).json({
            message: 'AI-generated quiz created successfully',
            quiz: {
                ...quiz,
                questions: questions.map(q => ({
                    ...q,
                    options: JSON.parse(q.options || '[]')
                }))
            }
        });

    } catch (error) {
        console.error('Error generating quiz:', error);
        res.status(500).json({
            error: 'Error generating quiz',
            details: error.message
        });
    }
});

// Get all quizzes for the authenticated user
app.get('/api/quizzes', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM quizzes WHERE creator_id = ? AND status != "deleted" ORDER BY created_at DESC',
        [req.user.id],
        (err, quizzes) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching quizzes' });
            }
            res.json(quizzes);
        }
    );
});

// Get a specific quiz with its questions
app.get('/api/quizzes/:id', authenticateToken, (req, res) => {
    const quizId = req.params.id;

    db.get(
        'SELECT * FROM quizzes WHERE id = ? AND creator_id = ? AND status != "deleted"',
        [quizId, req.user.id],
        (err, quiz) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching quiz' });
            }
            if (!quiz) {
                return res.status(404).json({ error: 'Quiz not found' });
            }

            db.all(
                'SELECT * FROM questions WHERE quiz_id = ?',
                [quizId],
                (err, questions) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error fetching questions' });
                    }
                    res.json({
                        ...quiz,
                        questions: questions.map(q => ({
                            ...q,
                            options: JSON.parse(q.options || '[]')
                        }))
                    });
                }
            );
        }
    );
});

// Update quiz settings endpoint
app.put('/api/quizzes/:id/settings', authenticateToken, (req, res) => {
    const quizId = req.params.id;
    const {
        passing_score,
        time_limit,
        randomize_questions,
        show_correct_answers,
        public_access,
        access_code
    } = req.body;

    // Validate settings
    if (passing_score !== undefined && (passing_score < 0 || passing_score > 100)) {
        return res.status(400).json({ error: 'Passing score must be between 0 and 100' });
    }

    if (time_limit !== undefined && time_limit < 0) {
        return res.status(400).json({ error: 'Time limit cannot be negative' });
    }

    const settings = {
        passing_score: passing_score || 70,
        time_limit: time_limit || 30,
        randomize_questions: randomize_questions !== undefined ? randomize_questions : true,
        show_correct_answers: show_correct_answers !== undefined ? show_correct_answers : true,
        public_access: public_access !== undefined ? public_access : false,
        access_code: access_code || null
    };

    db.run(
        'UPDATE quizzes SET settings = ?, public_access = ?, access_code = ? WHERE id = ? AND creator_id = ? AND status != "deleted"',
        [JSON.stringify(settings), settings.public_access, settings.access_code, quizId, req.user.id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Error updating quiz settings' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Quiz not found or unauthorized' });
            }
            res.json({
                message: 'Quiz settings updated successfully',
                settings,
                share_url: settings.public_access ?
                    `${req.protocol}://${req.get('host')}/quiz/${quizId}${settings.access_code ? '?code=' + settings.access_code : ''}` :
                    null
            });
        }
    );
});

// Update quiz status endpoint (pause/unpause)
app.put('/api/quizzes/:id/status', authenticateToken, (req, res) => {
    const quizId = req.params.id;
    const { status } = req.body;

    if (!['active', 'paused'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be "active" or "paused"' });
    }

    db.run(
        'UPDATE quizzes SET status = ? WHERE id = ? AND creator_id = ? AND status != "deleted"',
        [status, quizId, req.user.id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Error updating quiz status' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Quiz not found or unauthorized' });
            }
            res.json({ message: `Quiz ${status} successfully` });
        }
    );
});

// Delete quiz endpoint
app.delete('/api/quizzes/:id', authenticateToken, (req, res) => {
    const quizId = req.params.id;

    db.run(
        'UPDATE quizzes SET status = "deleted" WHERE id = ? AND creator_id = ?',
        [quizId, req.user.id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Error deleting quiz' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Quiz not found or unauthorized' });
            }
            res.json({ message: 'Quiz deleted successfully' });
        }
    );
});

// Add question to quiz endpoint
app.post('/api/quizzes/:id/questions', authenticateToken, uploadMultiple, handleMulterError, (req, res) => {
    const quizId = req.params.id;
    const { type, content, options, correct_answer, matching_pairs, fill_in_blanks, file_requirements } = req.body;

    // Validate required fields
    if (!type || !content || !correct_answer) {
        return res.status(400).json({
            error: 'Missing required fields',
            details: 'Type, content, and correct answer are required'
        });
    }

    // Validate question type
    const validTypes = [
        'multiple_choice',
        'short_answer',
        'paragraph',
        'file_upload',
        'true_false',
        'dropdown',
        'matching',
        'fill_in_blanks'
    ];
    if (!validTypes.includes(type)) {
        return res.status(400).json({
            error: 'Invalid question type',
            details: `Question type must be one of: ${validTypes.join(', ')}`
        });
    }

    // Validate type-specific requirements
    switch (type) {
        case 'multiple_choice':
        case 'dropdown':
            if (!options || !Array.isArray(options)) {
                return res.status(400).json({
                    error: 'Invalid options',
                    details: `${type} questions require an array of options`
                });
            }
            if (options.length < 2) {
                return res.status(400).json({
                    error: 'Not enough options',
                    details: `${type} questions require at least 2 options`
                });
            }
            if (options.length > 4) {
                return res.status(400).json({
                    error: 'Too many options',
                    details: `${type} questions cannot have more than 4 options`
                });
            }
            // Validate that number of option images matches number of options
            if (req.files && req.files['option_images'] && req.files['option_images'].length !== options.length) {
                return res.status(400).json({
                    error: 'Image count mismatch',
                    details: 'Number of option images must match number of options'
                });
            }
            break;

        case 'true_false':
            if (!['true', 'false'].includes(correct_answer.toLowerCase())) {
                return res.status(400).json({ error: 'True/false questions must have "true" or "false" as correct answer' });
            }
            break;

        case 'matching':
            if (!matching_pairs || !Array.isArray(matching_pairs) || matching_pairs.length < 2) {
                return res.status(400).json({ error: 'Matching questions require at least 2 pairs' });
            }
            if (matching_pairs.length > 4) {
                return res.status(400).json({ error: 'Matching questions cannot have more than 4 pairs' });
            }
            break;

        case 'fill_in_blanks':
            if (!fill_in_blanks || !Array.isArray(fill_in_blanks) || fill_in_blanks.length < 1) {
                return res.status(400).json({ error: 'Fill in the blanks questions require at least 1 blank' });
            }
            break;

        case 'file_upload':
            if (!file_requirements) {
                return res.status(400).json({ error: 'File upload questions require file requirements' });
            }
            break;
    }

    // First verify quiz exists and user owns it
    db.get(
        'SELECT * FROM quizzes WHERE id = ? AND creator_id = ? AND status != "deleted"',
        [quizId, req.user.id],
        (err, quiz) => {
            if (err) {
                return res.status(500).json({ error: 'Error verifying quiz ownership' });
            }
            if (!quiz) {
                return res.status(404).json({ error: 'Quiz not found or unauthorized' });
            }

            // Handle file uploads
            let question_image_url = null;
            let option_image_urls = null;

            if (req.files) {
                if (req.files['question_image']) {
                    question_image_url = `/uploads/${req.files['question_image'][0].filename}`;
                }
                if (req.files['option_images']) {
                    option_image_urls = JSON.stringify(req.files['option_images'].map(file => `/uploads/${file.filename}`));
                }
            }

            // Insert the question
            const sql = `INSERT INTO questions (
                quiz_id, type, content, question_image_url, options, option_image_urls, correct_answer, 
                matching_pairs, fill_in_blanks, file_requirements, file_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            db.run(sql, [
                quizId,
                type,
                content,
                question_image_url,
                ['multiple_choice', 'dropdown'].includes(type) ? JSON.stringify(options) : null,
                option_image_urls,
                correct_answer,
                type === 'matching' ? JSON.stringify(matching_pairs) : null,
                type === 'fill_in_blanks' ? JSON.stringify(fill_in_blanks) : null,
                type === 'file_upload' ? file_requirements : null,
                null
            ], function (err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({
                        error: 'Error adding question',
                        details: err.message
                    });
                }

                const questionId = this.lastID;
                console.log('Question added successfully with ID:', questionId);

                // Fetch the created question
                db.get('SELECT * FROM questions WHERE id = ?', [questionId], (err, question) => {
                    if (err) {
                        console.error('Error fetching created question:', err);
                        return res.status(500).json({
                            error: 'Error fetching created question',
                            details: err.message
                        });
                    }
                    res.status(201).json({
                        message: 'Question added successfully',
                        questionId: questionId,
                        question: {
                            ...question,
                            options: question.options ? JSON.parse(question.options) : null,
                            option_image_urls: question.option_image_urls ? JSON.parse(question.option_image_urls) : null,
                            matching_pairs: question.matching_pairs ? JSON.parse(question.matching_pairs) : null,
                            fill_in_blanks: question.fill_in_blanks ? JSON.parse(question.fill_in_blanks) : null
                        }
                    });
                });
            });
        }
    );
});

// Delete question endpoint
app.delete('/api/quizzes/:quizId/questions/:questionId', authenticateToken, (req, res) => {
    const { quizId, questionId } = req.params;

    // First verify quiz exists and user owns it
    db.get(
        'SELECT * FROM quizzes WHERE id = ? AND creator_id = ? AND status != "deleted"',
        [quizId, req.user.id],
        (err, quiz) => {
            if (err) {
                return res.status(500).json({ error: 'Error verifying quiz ownership' });
            }
            if (!quiz) {
                return res.status(404).json({ error: 'Quiz not found or unauthorized' });
            }

            // Get question details to delete associated files
            db.get(
                'SELECT * FROM questions WHERE id = ? AND quiz_id = ?',
                [questionId, quizId],
                (err, question) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error fetching question' });
                    }
                    if (!question) {
                        return res.status(404).json({ error: 'Question not found' });
                    }

                    // Delete associated files
                    if (question.question_image_url) {
                        const filePath = path.join(__dirname, question.question_image_url);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }

                    if (question.option_image_urls) {
                        const imageUrls = JSON.parse(question.option_image_urls);
                        imageUrls.forEach(url => {
                            const filePath = path.join(__dirname, url);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                        });
                    }

                    // Delete the question
                    db.run(
                        'DELETE FROM questions WHERE id = ? AND quiz_id = ?',
                        [questionId, quizId],
                        function (err) {
                            if (err) {
                                return res.status(500).json({ error: 'Error deleting question' });
                            }
                            if (this.changes === 0) {
                                return res.status(404).json({ error: 'Question not found' });
                            }
                            res.json({ message: 'Question deleted successfully' });
                        }
                    );
                }
            );
        }
    );
});

// Question preview endpoint
app.post('/api/quizzes/:id/questions/preview', authenticateToken, uploadMultiple, handleMulterError, (req, res) => {
    const { type, content, options, correct_answer, matching_pairs, fill_in_blanks, file_requirements } = req.body;

    // Validate required fields
    if (!type || !content || !correct_answer) {
        return res.status(400).json({
            error: 'Missing required fields',
            details: 'Type, content, and correct answer are required'
        });
    }

    // Process files if any
    let question_image_url = null;
    let option_image_urls = null;

    if (req.files) {
        if (req.files['question_image']) {
            question_image_url = `/uploads/${req.files['question_image'][0].filename}`;
        }
        if (req.files['option_images']) {
            option_image_urls = req.files['option_images'].map(file => `/uploads/${file.filename}`);
        }
    }

    // Create preview response
    const preview = {
        type,
        content,
        question_image_url,
        options: ['multiple_choice', 'dropdown'].includes(type) ? options : null,
        option_image_urls,
        correct_answer,
        matching_pairs: type === 'matching' ? matching_pairs : null,
        fill_in_blanks: type === 'fill_in_blanks' ? fill_in_blanks : null,
        file_requirements: type === 'file_upload' ? file_requirements : null
    };

    res.json({
        message: 'Question preview generated',
        preview
    });
});

// Quiz submission endpoint
app.post('/api/quizzes/:id/submit', authenticateToken, async (req, res) => {
    const quizId = req.params.id;
    const userId = req.user.id;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Answers must be provided as an array' });
    }

    try {
        // Get quiz details and questions
        const quiz = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM quizzes WHERE id = ?', [quizId], (err, quiz) => {
                if (err) reject(err);
                else resolve(quiz);
            });
        });

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        const questions = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM questions WHERE quiz_id = ?', [quizId], (err, questions) => {
                if (err) reject(err);
                else resolve(questions);
            });
        });

        // Calculate score
        let score = 0;
        const questionMap = new Map(questions.map(q => [q.id, q]));

        for (const answer of answers) {
            const question = questionMap.get(answer.question_id);
            if (!question) continue;

            let isCorrect = false;
            switch (question.type) {
                case 'multiple_choice':
                case 'true_false':
                case 'dropdown':
                    isCorrect = answer.answer === question.correct_answer;
                    break;
                case 'short_answer':
                case 'paragraph':
                    isCorrect = answer.answer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
                    break;
                case 'matching':
                    const correctPairs = JSON.parse(question.matching_pairs);
                    isCorrect = answer.answer.every((pair, index) =>
                        pair.term === correctPairs[index].term &&
                        pair.match === correctPairs[index].match
                    );
                    break;
                case 'fill_in_blanks':
                    const correctBlanks = JSON.parse(question.fill_in_blanks);
                    isCorrect = answer.answer.every((blank, index) =>
                        blank.toLowerCase().trim() === correctBlanks[index].toLowerCase().trim()
                    );
                    break;
            }
            if (isCorrect) score++;
        }

        const finalScore = (score / questions.length) * 100;

        // Save response
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO responses (quiz_id, user_id, answers, score) VALUES (?, ?, ?, ?)',
                [quizId, userId, JSON.stringify(answers), finalScore],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        res.json({
            message: 'Quiz submitted successfully',
            score: finalScore,
            total_questions: questions.length,
            correct_answers: score
        });
    } catch (error) {
        console.error('Error submitting quiz:', error);
        res.status(500).json({
            error: 'Error submitting quiz',
            details: error.message
        });
    }
});

// Get quiz results endpoint
app.get('/api/quizzes/:id/results', authenticateToken, async (req, res) => {
    const quizId = req.params.id;
    const userId = req.user.id;

    try {
        // Get quiz details
        const quiz = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM quizzes WHERE id = ? AND (creator_id = ? OR status = "active")',
                [quizId, userId],
                (err, quiz) => {
                    if (err) reject(err);
                    else resolve(quiz);
                }
            );
        });

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found or unauthorized' });
        }

        // Get user's responses
        const responses = await new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM responses WHERE quiz_id = ? AND user_id = ? ORDER BY completed_at DESC',
                [quizId, userId],
                (err, responses) => {
                    if (err) reject(err);
                    else resolve(responses);
                }
            );
        });

        res.json({
            quiz_details: quiz,
            attempts: responses.map(r => ({
                id: r.id,
                score: r.score,
                completed_at: r.completed_at,
                answers: JSON.parse(r.answers)
            }))
        });
    } catch (error) {
        console.error('Error fetching quiz results:', error);
        res.status(500).json({
            error: 'Error fetching quiz results',
            details: error.message
        });
    }
});

// Get quiz analytics endpoint (for quiz creators)
app.get('/api/quizzes/:id/analytics', authenticateToken, async (req, res) => {
    const quizId = req.params.id;
    const userId = req.user.id;

    try {
        // Verify quiz ownership
        const quiz = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM quizzes WHERE id = ? AND creator_id = ?',
                [quizId, userId],
                (err, quiz) => {
                    if (err) reject(err);
                    else resolve(quiz);
                }
            );
        });

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found or unauthorized' });
        }

        // Get all responses for this quiz
        const responses = await new Promise((resolve, reject) => {
            db.all(
                'SELECT r.*, u.name as user_name FROM responses r JOIN users u ON r.user_id = u.id WHERE r.quiz_id = ? ORDER BY r.completed_at DESC',
                [quizId],
                (err, responses) => {
                    if (err) reject(err);
                    else resolve(responses);
                }
            );
        });

        // Calculate analytics
        const totalAttempts = responses.length;
        const averageScore = totalAttempts > 0
            ? responses.reduce((sum, r) => sum + r.score, 0) / totalAttempts
            : 0;

        // Get question-wise analytics
        const questions = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM questions WHERE quiz_id = ?', [quizId], (err, questions) => {
                if (err) reject(err);
                else resolve(questions);
            });
        });

        const questionAnalytics = questions.map(q => {
            const questionResponses = responses.map(r => {
                const answers = JSON.parse(r.answers);
                return answers.find(a => a.question_id === q.id);
            }).filter(Boolean);

            const correctAnswers = questionResponses.filter(r => {
                switch (q.type) {
                    case 'multiple_choice':
                    case 'true_false':
                    case 'dropdown':
                        return r.answer === q.correct_answer;
                    case 'short_answer':
                    case 'paragraph':
                        return r.answer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
                    case 'matching':
                        const correctPairs = JSON.parse(q.matching_pairs);
                        return r.answer.every((pair, index) =>
                            pair.term === correctPairs[index].term &&
                            pair.match === correctPairs[index].match
                        );
                    case 'fill_in_blanks':
                        const correctBlanks = JSON.parse(q.fill_in_blanks);
                        return r.answer.every((blank, index) =>
                            blank.toLowerCase().trim() === correctBlanks[index].toLowerCase().trim()
                        );
                    default:
                        return false;
                }
            }).length;

            return {
                question_id: q.id,
                type: q.type,
                content: q.content,
                total_attempts: questionResponses.length,
                correct_answers: correctAnswers,
                success_rate: questionResponses.length > 0
                    ? (correctAnswers / questionResponses.length) * 100
                    : 0
            };
        });

        res.json({
            quiz_details: quiz,
            overall_analytics: {
                total_attempts: totalAttempts,
                average_score: averageScore,
                highest_score: Math.max(...responses.map(r => r.score), 0),
                lowest_score: Math.min(...responses.map(r => r.score), 0)
            },
            question_analytics: questionAnalytics,
            recent_attempts: responses.slice(0, 10).map(r => ({
                id: r.id,
                user_name: r.user_name,
                score: r.score,
                completed_at: r.completed_at
            }))
        });
    } catch (error) {
        console.error('Error fetching quiz analytics:', error);
        res.status(500).json({
            error: 'Error fetching quiz analytics',
            details: error.message
        });
    }
});

// Public quiz access endpoints
app.get('/quiz/:id', (req, res) => {
    const quizId = req.params.id;
    const accessCode = req.query.code;

    db.get(
        `SELECT q.*, u.name as creator_name 
         FROM quizzes q 
         JOIN users u ON q.creator_id = u.id 
         WHERE q.id = ? AND q.status = 'active' AND q.public_access = TRUE`,
        [quizId],
        (err, quiz) => {
            if (err) {
                return res.status(500).json({ error: 'Error retrieving quiz' });
            }
            if (!quiz) {
                return res.status(404).json({ error: 'Quiz not found or not accessible' });
            }

            // Check access code if required
            const settings = JSON.parse(quiz.settings || '{}');
            if (settings.access_code && settings.access_code !== accessCode) {
                return res.status(403).json({ error: 'Invalid access code' });
            }

            // Get questions for the quiz
            db.all(
                'SELECT id, type, content, options FROM questions WHERE quiz_id = ?',
                [quizId],
                (err, questions) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error retrieving questions' });
                    }

                    // Remove sensitive information
                    delete quiz.creator_id;
                    delete quiz.settings;

                    // Randomize questions if enabled
                    if (settings.randomize_questions) {
                        questions = questions.sort(() => Math.random() - 0.5);
                    }

                    res.json({
                        quiz: {
                            ...quiz,
                            questions: questions.map(q => ({
                                ...q,
                                options: JSON.parse(q.options || '[]')
                            }))
                        },
                        settings: {
                            time_limit: settings.time_limit,
                            show_correct_answers: settings.show_correct_answers
                        }
                    });
                }
            );
        }
    );
});

// Submit public quiz answers
app.post('/quiz/:id/submit', (req, res) => {
    const quizId = req.params.id;
    const { answers, participant_name, participant_email } = req.body;
    const accessCode = req.query.code;

    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Invalid answers format' });
    }

    db.get(
        'SELECT * FROM quizzes WHERE id = ? AND status = "active" AND public_access = TRUE',
        [quizId],
        (err, quiz) => {
            if (err) {
                return res.status(500).json({ error: 'Error retrieving quiz' });
            }
            if (!quiz) {
                return res.status(404).json({ error: 'Quiz not found or not accessible' });
            }

            // Check access code if required
            const settings = JSON.parse(quiz.settings || '{}');
            if (settings.access_code && settings.access_code !== accessCode) {
                return res.status(403).json({ error: 'Invalid access code' });
            }

            // Get questions and calculate score
            db.all(
                'SELECT id, type, correct_answer FROM questions WHERE quiz_id = ?',
                [quizId],
                (err, questions) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error calculating score' });
                    }

                    let score = 0;
                    const totalQuestions = questions.length;
                    const results = questions.map((q, i) => {
                        const userAnswer = answers[i];
                        const isCorrect = q.correct_answer === userAnswer;
                        if (isCorrect) score++;
                        return {
                            question_id: q.id,
                            correct: isCorrect,
                            user_answer: userAnswer,
                            correct_answer: settings.show_correct_answers ? q.correct_answer : undefined
                        };
                    });

                    const scorePercentage = (score / totalQuestions) * 100;
                    const passed = scorePercentage >= settings.passing_score;

                    // Store the response
                    db.run(
                        `INSERT INTO responses (quiz_id, participant_name, participant_email, score, answers, completed_at)
                         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [quizId, participant_name || 'Anonymous', participant_email, scorePercentage, JSON.stringify(answers)],
                        function (err) {
                            if (err) {
                                return res.status(500).json({ error: 'Error saving response' });
                            }

                            res.json({
                                score: scorePercentage,
                                passed,
                                total_questions: totalQuestions,
                                correct_answers: score,
                                results: settings.show_correct_answers ? results : undefined,
                                message: passed ? 'Congratulations! You passed the quiz.' : 'Keep practicing! You can try again.'
                            });
                        }
                    );
                }
            );
        }
    );
});

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'TestCraft.ai API is running' });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

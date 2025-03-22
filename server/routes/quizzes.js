const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Added fs module
const { get, all, run } = require('../db');

// Initialize Gemini with configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log('GEMINI_API_KEY present:', !!GEMINI_API_KEY);

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}

// Create a new instance of GoogleGenerativeAI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Configure multer for quiz image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads/quiz-images');
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PNG, JPEG, GIF and SVG are allowed.'))
    }
  }
});

// Helper function to extract JSON from markdown-formatted text
function extractJsonFromMarkdown(text) {
    if (!text) {
        throw new Error('Empty response from AI');
    }

    try {
        // First try to find content between ```json and ```
        let jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        
        // If not found, try between ``` and ```
        if (!jsonMatch) {
            jsonMatch = text.match(/```\n([\s\S]*?)\n```/);
        }
        
        // If still not found, try to parse the entire text as JSON
        if (!jsonMatch) {
            try {
                return JSON.parse(text.trim());
            } catch (e) {
                console.error('Failed to parse entire text as JSON:', e);
                throw new Error('No valid JSON found in the response');
            }
        }

        const jsonContent = jsonMatch[1].trim();
        
        // Clean up any trailing commas that might cause JSON.parse to fail
        const cleanedJson = jsonContent.replace(/,(\s*[}\]])/g, '$1');
        
        try {
            return JSON.parse(cleanedJson);
        } catch (e) {
            console.error('Failed to parse extracted JSON:', e);
            console.error('JSON content:', jsonContent);
            throw new Error('Invalid JSON format in the response');
        }
    } catch (err) {
        console.error('Error extracting JSON:', err);
        throw new Error('Failed to extract valid JSON from the response');
    }
}

// Upload quiz image
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Get relative path for URL
    const relativePath = path.relative(
      path.join(__dirname, '../uploads'),
      req.file.path
    );

    const imageUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    res.json({
      success: true,
      imageUrl: imageUrl
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      details: error.message
    });
  }
});

// Update quiz status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isAcceptingResponses } = req.body;
    const userId = req.user.id;

    console.log('Updating quiz status:', { id, isAcceptingResponses, userId });

    // Check if quiz exists and belongs to user
    const quiz = await get(
      'SELECT * FROM quizzes WHERE id = ? AND creator_id = ?',
      [id, userId]
    );

    if (!quiz) {
      console.log('Quiz not found or unauthorized:', { id, userId });
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to modify it'
      });
    }

    // Update quiz status
    await run(
      'UPDATE quizzes SET is_accepting_responses = ? WHERE id = ?',
      [isAcceptingResponses ? 1 : 0, id]
    );

    console.log('Quiz status updated successfully:', { id, isAcceptingResponses });

    res.json({ 
      success: true,
      status: isAcceptingResponses ? 'active' : 'paused',
      isAcceptingResponses
    });
  } catch (error) {
    console.error('Error updating quiz status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quiz status'
    });
  }
});

// Get all quizzes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching quizzes for user:', userId);
    
    // First get all quizzes
    const quizzes = await all(
      'SELECT * FROM quizzes WHERE creator_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // For each quiz, get its questions
    const quizzesWithQuestions = await Promise.all(quizzes.map(async (quiz) => {
      const questions = await all(
        'SELECT * FROM questions WHERE quiz_id = ?',
        [quiz.id]
      );

      // Parse settings from JSON string if it exists
      let settings = {};
      try {
        settings = quiz.settings ? JSON.parse(quiz.settings) : {};
      } catch (e) {
        console.error('Error parsing quiz settings:', e);
      }

      return {
        ...quiz,
        questions,
        settings
      };
    }));
    
    res.json({ success: true, quizzes: quizzesWithQuestions });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quizzes' });
  }
});

// Get quiz by ID (preview)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get quiz with questions
    const quiz = await get('SELECT * FROM quizzes WHERE id = ?', [id]);
    
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // Check if user has access (creator or quiz is published)
    if (quiz.creator_id !== userId && quiz.status !== 'published') {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this quiz'
      });
    }

    // Get questions
    const questions = await all('SELECT * FROM questions WHERE quiz_id = ?', [id]);

    // Parse settings and question options
    let settings = {};
    try {
      settings = quiz.settings ? JSON.parse(quiz.settings) : {};
    } catch (e) {
      console.error('Error parsing quiz settings:', e);
    }

    // Parse question options
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    res.json({
      success: true,
      quiz: {
        ...quiz,
        settings,
        questions: parsedQuestions
      }
    });

  } catch (error) {
    console.error('Error getting quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get quiz',
      details: error.message
    });
  }
});

// Create quiz
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, settings, questions } = req.body;
    const userId = req.user.id;

    // Insert quiz
    const result = await run(
      'INSERT INTO quizzes (creator_id, title, description, settings) VALUES (?, ?, ?, ?)',
      [userId, title, description, JSON.stringify(settings)]
    );

    const quizId = result.id;

    // Insert questions if provided
    if (questions && questions.length > 0) {
      for (const question of questions) {
        await run(
          'INSERT INTO questions (quiz_id, type, text, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?, ?)',
          [
            quizId,
            question.type,
            question.text,
            JSON.stringify(question.options),
            question.correctAnswer,
            question.explanation
          ]
        );
      }
    }

    // Get the created quiz with questions
    const quiz = await get('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    const quizQuestions = await all('SELECT * FROM questions WHERE quiz_id = ?', [quizId]);

    // Parse settings
    let parsedSettings = {};
    try {
      parsedSettings = quiz.settings ? JSON.parse(quiz.settings) : {};
    } catch (e) {
      console.error('Error parsing quiz settings:', e);
    }

    // Parse question options
    const parsedQuestions = quizQuestions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    res.json({
      success: true,
      quiz: {
        ...quiz,
        settings: parsedSettings,
        questions: parsedQuestions
      }
    });

  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create quiz',
      details: error.message
    });
  }
});

// Update quiz
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user.id;
    
    const quiz = await get(
      'SELECT * FROM quizzes WHERE id = ? AND creator_id = ?',
      [id, userId]
    );
    
    if (!quiz) {
      return res.status(404).json({
        error: 'Quiz not found or you do not have permission to modify it'
      });
    }
    
    await run(
      'UPDATE quizzes SET title = ?, description = ? WHERE id = ?',
      [title, description, id]
    );
    
    res.json({
      id,
      title,
      description,
      creator_id: userId
    });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Delete quiz
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if quiz exists and belongs to user
    const quiz = await get(
      'SELECT * FROM quizzes WHERE id = ? AND creator_id = ?',
      [id, userId]
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to delete it'
      });
    }

    // Delete quiz (questions will be deleted automatically due to ON DELETE CASCADE)
    await run('DELETE FROM quizzes WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete quiz',
      details: error.message
    });
  }
});

// Generate quiz questions
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'AI service is not configured'
      });
    }

    const {
      topic,
      instructions,
      complexity,
      category,
      numberOfQuestions = 5,
      questionTypes = ["multiple_choice"]
    } = req.body;

    // Log request body for debugging
    console.log('Generate quiz request:', req.body);

    // Validate input parameters
    const missingFields = [];
    if (!topic) missingFields.push('topic');
    if (!complexity) missingFields.push('complexity');
    if (!category) missingFields.push('category');

    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields);
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: `Required fields missing: ${missingFields.join(', ')}`
      });
    }

    console.log('Initializing Gemini model...');
    
    try {
      // Get the model
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.8,
          topK: 40
        }
      });

      console.log('Preparing prompt...');
      const prompt = `Create a quiz about "${topic}" with ${numberOfQuestions} multiple choice questions.
Instructions: ${instructions}
Complexity: ${complexity}
Category: ${category}

Format your response as a JSON array of questions. Each question should have:
1. A clear question text
2. Four options (A, B, C, D)
3. The correct answer (0-3 index)
4. A brief explanation

Example format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "text": "What is 2 + 2?",
      "options": ["4", "3", "5", "6"],
      "correctAnswer": 0,
      "explanation": "2 + 2 equals 4"
    }
  ]
}

Generate ${numberOfQuestions} questions in this exact format.`;

      console.log('Sending prompt to Gemini...');
      const result = await model.generateContent(prompt);
      console.log('Generation completed');
      
      const responseText = result.response.text();
      console.log('Raw response length:', responseText.length);

      // Try to parse the response as JSON
      let formattedQuestions;
      try {
        formattedQuestions = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        // Try to extract JSON from markdown
        formattedQuestions = extractJsonFromMarkdown(responseText);
      }

      if (!formattedQuestions || !formattedQuestions.questions) {
        throw new Error('Invalid response format from AI');
      }

      // Return the generated questions
      res.json({
        success: true,
        questions: formattedQuestions.questions
      });

    } catch (error) {
      console.error('Gemini API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate questions',
        details: error.message
      });
    }

  } catch (error) {
    console.error('Error in generate endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate questions'
    });
  }
});

// Publish quiz
router.post('/:id/publish', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if quiz exists and belongs to user
    const quiz = await get(
      'SELECT * FROM quizzes WHERE id = ? AND creator_id = ?',
      [id, userId]
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to modify it'
      });
    }

    // Check if quiz has questions
    const questions = await all(
      'SELECT * FROM questions WHERE quiz_id = ?',
      [id]
    );

    if (!questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot publish quiz without questions'
      });
    }

    // Update quiz status to published
    await run(
      'UPDATE quizzes SET status = ?, published_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['published', id]
    );

    res.json({
      success: true,
      message: 'Quiz published successfully'
    });

  } catch (error) {
    console.error('Error publishing quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish quiz',
      details: error.message
    });
  }
});

// Pause quiz
router.put('/:id/pause', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if quiz exists and belongs to user
    const quiz = await get(
      'SELECT * FROM quizzes WHERE id = ? AND creator_id = ?',
      [id, userId]
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to modify it'
      });
    }

    // Update quiz status
    await run(
      'UPDATE quizzes SET status = ? WHERE id = ?',
      ['draft', id]
    );

    // Get updated quiz
    const updatedQuiz = await get('SELECT * FROM quizzes WHERE id = ?', [id]);
    const questions = await all('SELECT * FROM questions WHERE quiz_id = ?', [id]);

    // Parse settings
    let settings = {};
    try {
      settings = updatedQuiz.settings ? JSON.parse(updatedQuiz.settings) : {};
    } catch (e) {
      console.error('Error parsing quiz settings:', e);
    }

    res.json({
      success: true,
      quiz: {
        ...updatedQuiz,
        settings,
        questions
      }
    });
  } catch (error) {
    console.error('Error pausing quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause quiz'
    });
  }
});

// Get quiz by access code
router.get('/access/:code', async (req, res) => {
  try {
    const accessCode = req.params.code;
    
    const query = `
      SELECT q.*, u.name as creator_name
      FROM quizzes q
      JOIN users u ON q.creator_id = u.id
      WHERE q.access_code = ? AND q.status = 'published'
    `;

    const quiz = await get(query, [accessCode]);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      quiz: quiz
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz',
      details: error.message
    });
  }
});

// Submit quiz answers
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { answers } = req.body;
    
    // Get quiz questions
    const query = `
      SELECT q.*, qu.questions as quiz_questions, qu.settings
      FROM questions q
      JOIN quizzes qu ON q.quiz_id = qu.id
      WHERE qu.id = ?
    `;

    const quiz = await get(query, [quizId]);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // Calculate score
    let score = 0;
    const questions = JSON.parse(quiz.quiz_questions);
    const settings = JSON.parse(quiz.settings);
      
    answers.forEach((answer, index) => {
      if (questions[index].correctAnswer === answer) {
        score++;
      }
    });

    const percentage = (score / questions.length) * 100;
    const passed = percentage >= settings.passMark;

    // Save response
    const saveQuery = `
      INSERT INTO responses (
        quiz_id,
        user_id,
        answers,
        score,
        completed_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    await run(saveQuery, [
      quizId,
      req.user.id,
      JSON.stringify(answers),
      percentage
    ]);

    res.json({
      success: true,
      results: {
        score: percentage,
        passed,
        correctAnswers: score,
        totalQuestions: questions.length,
        answers: settings.showAnswers ? questions.map(q => q.correctAnswer) : null
      }
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit quiz',
      details: error.message
    });
  }
});

// Add a health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
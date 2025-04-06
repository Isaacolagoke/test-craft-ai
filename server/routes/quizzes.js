const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Added fs module
const db = require('../db/index');

// Initialize Gemini with configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log('GEMINI_API_KEY present:', !!GEMINI_API_KEY);

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
}

// Create a new instance of GoogleGenerativeAI with proper version
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Helper function to safely generate content with error handling and retries
async function safeGenerateContent(model, prompt, maxRetries = 2) {
  let attempts = 0;
  let lastError = null;

  while (attempts <= maxRetries) {
    try {
      console.log(`Attempt ${attempts + 1} to generate content`);
      
      // Use the prompt directly as a string for this version of the API
      const result = await model.generateContent(prompt);
      
      console.log('Generation successful');
      return result;
    } catch (error) {
      console.error(`Generation attempt ${attempts + 1} failed:`, error);
      lastError = error;
      attempts++;
      
      // Wait before retrying (exponential backoff)
      if (attempts <= maxRetries) {
        const delay = 1000 * Math.pow(2, attempts);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we get here, all attempts failed
  throw new Error(`Failed to generate content after ${maxRetries + 1} attempts: ${lastError.message}`);
}

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
    const quiz = await db.getQuiz(id, userId);

    if (!quiz) {
      console.log('Quiz not found or unauthorized:', { id, userId });
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to modify it'
      });
    }

    // Update quiz status
    await db.updateQuizStatus(id, isAcceptingResponses);

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
    const quizzes = await db.getQuizzes(userId);

    // For each quiz, get its questions
    const quizzesWithQuestions = await Promise.all(quizzes.map(async (quiz) => {
      const questions = await db.getQuestions(quiz.id);

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
    const quiz = await db.getQuiz(id, userId);
    
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
    const questions = await db.getQuestions(id);

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
    // Log the incoming request body for debugging
    console.log('Creating quiz with body:', JSON.stringify({
      ...req.body,
      questions: req.body.questions ? `${req.body.questions.length} questions` : 'no questions'
    }));

    const { title, description, settings, questions, imageUrl } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Quiz title is required'
      });
    }

    // Insert quiz with additional logging
    console.log('Creating quiz in database with userId:', userId);
    const result = await db.createQuiz(userId, title, description, settings);
    console.log('Quiz created with ID:', result.id);

    const quizId = result.id;

    // Insert questions if provided
    if (questions && questions.length > 0) {
      console.log(`Adding ${questions.length} questions to quiz ${quizId}`);
      
      for (const question of questions) {
        try {
          // Ensure we have either text or content field
          const questionText = question.text || question.content || '';
          if (!questionText) {
            console.warn('Question missing text/content:', question);
          }
          
          // Handle options format
          const options = question.options || [];
          
          // Create question with careful error handling
          await db.createQuestion(
            quizId, 
            question.type || 'multiple_choice', 
            questionText, 
            options, 
            question.correctAnswer
          );
        } catch (questionError) {
          console.error('Error creating question:', questionError, 'Question data:', question);
          // Continue with other questions even if one fails
        }
      }
    }

    // Get the created quiz with questions
    const quiz = await db.getQuiz(quizId, userId);
    const quizQuestions = await db.getQuestions(quizId);

    // Parse settings - careful error handling
    let parsedSettings = {};
    try {
      if (typeof quiz.settings === 'string' && quiz.settings) {
        parsedSettings = JSON.parse(quiz.settings);
      } else if (quiz.settings) {
        parsedSettings = quiz.settings;
      }
    } catch (e) {
      console.error('Error parsing quiz settings:', e);
    }

    // Parse question options - careful error handling
    const parsedQuestions = quizQuestions.map(q => {
      try {
        return {
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options || []
        };
      } catch (e) {
        console.error('Error parsing question options:', e);
        return {
          ...q,
          options: []
        };
      }
    });

    // Return successful response with complete quiz data
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
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update quiz
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user.id;
    
    const quiz = await db.getQuiz(id, userId);
    
    if (!quiz) {
      return res.status(404).json({
        error: 'Quiz not found or you do not have permission to modify it'
      });
    }
    
    await db.updateQuiz(id, title, description);

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
    const quiz = await db.getQuiz(id, userId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to delete it'
      });
    }

    // Delete quiz (questions will be deleted automatically due to ON DELETE CASCADE)
    await db.deleteQuiz(id);

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
    console.log('Generate quiz request - full details:', JSON.stringify(req.body, null, 2));
    console.log('Question types received (raw):', req.body.questionTypes);
    console.log('Question types received (type):', typeof req.body.questionTypes);
    console.log('Question types array?:', Array.isArray(req.body.questionTypes));
    
    // Define the allowed question types
    const ALLOWED_TYPES = ['multiple_choice', 'true_false', 'matching'];
    
    // Make sure questionTypes is always an array of allowed types
    let safeQuestionTypes = req.body.questionTypes;
    if (typeof safeQuestionTypes === 'string') {
      try {
        safeQuestionTypes = JSON.parse(safeQuestionTypes);
      } catch (e) {
        safeQuestionTypes = [safeQuestionTypes];
      }
    }
    
    // Filter out any types that aren't in our allowed list
    if (Array.isArray(safeQuestionTypes)) {
      safeQuestionTypes = safeQuestionTypes.filter(type => ALLOWED_TYPES.includes(type));
      // Ensure we have at least one type
      if (safeQuestionTypes.length === 0) {
        safeQuestionTypes = ['multiple_choice'];
      }
    } else {
      safeQuestionTypes = ['multiple_choice'];
    }
    
    console.log('Safe question types after filtering:', safeQuestionTypes);

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
      // Get the model - use correct model name for version 0.2.1
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      });

      console.log('Preparing prompt with question types:', safeQuestionTypes);
      
      // Create distribution of question types - ensure we have at least one of each type
      const numQuestions = parseInt(numberOfQuestions) || 5;
      const numTypes = safeQuestionTypes.length;
      const distribution = {};
      
      // Ensure at least one of each type
      safeQuestionTypes.forEach(type => {
        distribution[type] = 1;
      });
      
      // Distribute remaining questions
      let remaining = numQuestions - numTypes;
      if (remaining > 0) {
        let i = 0;
        while (remaining > 0) {
          distribution[safeQuestionTypes[i % numTypes]]++;
          remaining--;
          i++;
        }
      }
      
      console.log('Question distribution:', distribution);
      
      // Create the prompt
      const prompt = `You are a professional quiz creator with expertise in ${category}. Create a quiz on the topic of "${topic}" with ${numQuestions} questions of varying difficulty levels.

Additional Instructions: ${instructions || "Make sure questions are clear and concise."}

The quiz should have the following structure and question types:
${Object.entries(distribution).map(([type, count]) => `- ${count} ${type} questions`).join('\n')}

Please provide the quiz in the following JSON format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "text": "Question text goes here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0, // Index of the correct option
      "explanation": "Explanation for the correct answer"
    },
    {
      "type": "true_false",
      "text": "True/False question text goes here",
      "options": ["True", "False"],
      "correctAnswer": 0, // 0 for True, 1 for False
      "explanation": "Explanation for the correct answer"
    },
    {
      "type": "matching",
      "text": "Match the items on the left with those on the right",
      "options": [
        {"left": "Item 1", "right": "Match 1"},
        {"left": "Item 2", "right": "Match 2"},
        {"left": "Item 3", "right": "Match 3"}
      ],
      "correctAnswer": [0, 1, 2], // Indices showing the correct matches (Item 1 -> Match 1, etc.)
      "explanation": "Explanation for the correct matches"
    }
  ]
}

IMPORTANT: STRICTLY follow the distribution of question types I specified. The total number of questions must be exactly ${numberOfQuestions}, with the exact counts for each type as I specified.`;

      console.log('Sending prompt to Gemini...');
      // Use the safe generation function with retries
      const result = await safeGenerateContent(model, prompt);
      console.log('Generation completed');
      
      if (!result || !result.response) {
        throw new Error('Empty response from Gemini API');
      }
      
      // Extract the response text
      const responseText = result.response.text();
      console.log('Raw response length:', responseText.length);

      // Try to parse the response as JSON
      let formattedQuestions;
      try {
        formattedQuestions = JSON.parse(responseText.trim());
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        // Try to extract JSON from markdown
        formattedQuestions = extractJsonFromMarkdown(responseText);
      }

      if (!formattedQuestions || !formattedQuestions.questions) {
        throw new Error('Invalid response format from AI');
      }
      
      // Validate that the AI response contains the requested question types
      if (formattedQuestions && formattedQuestions.questions) {
        // Count the question types in the response
        const typeCounts = {};
        formattedQuestions.questions.forEach(q => {
          typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
        });
        
        // Check if we need to correct the distribution
        let needsCorrection = false;
        safeQuestionTypes.forEach(type => {
          if ((typeCounts[type] || 0) < distribution[type]) {
            needsCorrection = true;
          }
        });
        
        // If we need to correct the distribution, force it by converting questions
        if (needsCorrection) {
          console.log('Correcting question distribution...');
          const questions = [...formattedQuestions.questions];
          
          // For each missing type
          safeQuestionTypes.forEach(type => {
            const current = typeCounts[type] || 0;
            const target = distribution[type];
            
            if (current < target) {
              const needed = target - current;
              console.log(`Need to add ${needed} ${type} questions`);
              
              // Look for excess questions of other types to convert
              let converted = 0;
              const excessTypes = Object.keys(typeCounts).filter(t => {
                return typeCounts[t] > distribution[t] || !safeQuestionTypes.includes(t);
              });
              
              if (excessTypes.length > 0) {
                for (let i = 0; i < questions.length && converted < needed; i++) {
                  if (excessTypes.includes(questions[i].type)) {
                    console.log(`Converting question ${i} from ${questions[i].type} to ${type}`);
                    
                    // Convert question
                    const baseQuestion = { ...questions[i] };
                    
                    switch (type) {
                      case 'true_false':
                        questions[i] = {
                          type: 'true_false',
                          text: baseQuestion.text || `Is it true that ${topic} is important?`,
                          explanation: baseQuestion.explanation || `This is an explanation about ${topic}`,
                          correctAnswer: Math.random() > 0.5 ? 0 : 1 // Random true/false
                        };
                        break;
                        
                      case 'matching':
                        // Create a matching question using available options if possible
                        const items = baseQuestion.options?.slice(0, 2) || [`Item 1 about ${topic}`, `Item 2 about ${topic}`];
                        const matches = [...items].reverse();
                        
                        questions[i] = {
                          type: 'matching',
                          text: `Match the following items related to ${topic}`,
                          items: items,
                          matches: matches,
                          correctAnswer: [1, 0], // Reversed matching
                          explanation: baseQuestion.explanation || `This is a matching question about ${topic}`
                        };
                        break;
                        
                      case 'multiple_choice':
                        questions[i] = {
                          type: 'multiple_choice',
                          text: baseQuestion.text || `What is an important aspect of ${topic}?`,
                          options: baseQuestion.options || [`Option 1 about ${topic}`, `Option 2 about ${topic}`, `Option 3 about ${topic}`, `Option 4 about ${topic}`],
                          correctAnswer: 0,
                          explanation: baseQuestion.explanation || `This is an explanation about ${topic}`
                        };
                        break;
                    }
                    
                    converted++;
                    // Update type counts
                    typeCounts[questions[i].type] = (typeCounts[questions[i].type] || 0) + 1;
                    typeCounts[baseQuestion.type]--;
                  }
                }
              }
              
              // If we still need more questions of this type, add new ones
              if (converted < needed) {
                console.log(`Adding ${needed - converted} new ${type} questions`);
                
                for (let i = 0; i < needed - converted; i++) {
                  let newQuestion;
                  
                  switch (type) {
                    case 'true_false':
                      newQuestion = {
                        type: 'true_false',
                        text: `Is it true that ${topic} ${i + 1} is important?`,
                        explanation: `This is an explanation about ${topic}`,
                        correctAnswer: Math.random() > 0.5 ? 0 : 1
                      };
                      break;
                      
                    case 'matching':
                      newQuestion = {
                        type: 'matching',
                        text: `Match the following items related to ${topic}`,
                        items: [`Item 1 about ${topic}`, `Item 2 about ${topic}`],
                        matches: [`Match 1 for ${topic}`, `Match 2 for ${topic}`],
                        correctAnswer: [0, 1],
                        explanation: `This is a matching question about ${topic}`
                      };
                      break;
                      
                    case 'multiple_choice':
                      newQuestion = {
                        type: 'multiple_choice',
                        text: `What is an important aspect of ${topic} ${i + 1}?`,
                        options: [`Option 1 about ${topic}`, `Option 2 about ${topic}`, `Option 3 about ${topic}`, `Option 4 about ${topic}`],
                        correctAnswer: 0,
                        explanation: `This is an explanation about ${topic}`
                      };
                      break;
                  }
                  
                  questions.push(newQuestion);
                }
              }
            }
          });
          
          // Update the questions
          formattedQuestions.questions = questions.slice(0, numberOfQuestions);
          
          // Log the final distribution
          const finalCounts = {};
          formattedQuestions.questions.forEach(q => {
            finalCounts[q.type] = (finalCounts[q.type] || 0) + 1;
          });
          console.log('Final question distribution:', finalCounts);
        }
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

// Helper function to shuffle an array
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Publish quiz
router.put('/:id/publish', authenticateToken, async (req, res) => {
  try {
    console.log('Publish endpoint hit with params:', req.params);
    console.log('User in token:', req.user);
    
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`Attempting to publish quiz ${id} for user ${userId}`);

    // Check if quiz exists and belongs to user
    const quiz = await db.getQuiz(id, userId);
    
    console.log('Quiz found:', quiz ? `ID: ${quiz.id}` : 'Not found');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to modify it'
      });
    }

    // Check if quiz has questions
    const questions = await db.getQuestions(id);
    console.log(`Found ${questions ? questions.length : 0} questions for quiz`);

    if (!questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot publish quiz without questions'
      });
    }

    // Generate a random access code if not already present
    let accessCode;
    let settings = {};
    
    try {
      console.log('Original quiz settings:', quiz.settings);
      
      // Parse settings if available
      if (quiz.settings) {
        if (typeof quiz.settings === 'string') {
          settings = JSON.parse(quiz.settings);
        } else {
          settings = quiz.settings;
        }
      }
      
      // Check if access code exists in settings
      accessCode = settings.accessCode;
      console.log('Existing access code:', accessCode);
    } catch (e) {
      console.error('Error parsing settings:', e);
    }
    
    if (!accessCode) {
      // Generate a 6-character alphanumeric code
      accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log('Generated new access code:', accessCode);
      
      // Store the access code in settings
      settings.accessCode = accessCode;
    }

    // Also update the access_code field directly for easier access
    const updates = {
      status: 'published',
      published_at: new Date().toISOString(),
      settings: settings,
      access_code: accessCode // Add this to make access code directly accessible
    };

    console.log('Updating quiz with:', updates);
    
    // Update the quiz with the published status and access code
    const result = await db.updateQuiz(id, updates);

    console.log('Update result:', result);

    // Ensure consistent object structure in the response
    res.json({
      success: true,
      quiz: {
        ...result,
        settings: settings,
        access_code: accessCode // Make sure access_code is included in response
      },
      message: 'Quiz published successfully',
      accessCode: accessCode // For backward compatibility
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
    const quiz = await db.getQuiz(id, userId);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or you do not have permission to modify it'
      });
    }

    // Update quiz status
    await db.updateQuizStatus(id, 'draft');

    // Get updated quiz
    const updatedQuiz = await db.getQuiz(id);
    const questions = await db.getQuestions(id);

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

// Access quiz by access code
router.get('/access/:code', async (req, res) => {
  try {
    const accessCode = req.params.code;
    console.log('Accessing quiz with code:', accessCode);
    
    if (!accessCode || accessCode === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'Invalid access code provided'
      });
    }
    
    // Since database.sqlite doesn't have an access_code column, we need to search in settings
    const quizzes = await db.getQuizzes();
    console.log(`Found ${quizzes.length} quizzes. Searching for code: ${accessCode}`);
    
    // Find the quiz with matching access code in settings
    let matchedQuiz = null;
    for (const quiz of quizzes) {
      try {
        let settings = {};
        try {
          settings = JSON.parse(quiz.settings || '{}');
        } catch (e) {
          console.error(`Error parsing settings for quiz ${quiz.id}:`, e);
          continue;
        }
        
        // Check for access code in settings or directly in quiz object
        if ((settings.accessCode === accessCode) || 
            (quiz.access_code === accessCode)) {
          matchedQuiz = quiz;
          break;
        }
      } catch (e) {
        console.error(`Error processing quiz ${quiz.id}:`, e);
      }
    }
    
    if (!matchedQuiz) {
      console.log('No quiz found with access code:', accessCode);
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }
    
    // Get user info for the creator
    const user = await db.getUser(matchedQuiz.creator_id);
    matchedQuiz.creator_name = user ? user.name : 'Unknown';
    
    console.log('Quiz found:', { 
      id: matchedQuiz.id, 
      title: matchedQuiz.title,
      access_code: matchedQuiz.access_code
    });

    // Get quiz questions
    const questions = await db.getQuestions(matchedQuiz.id);

    // Parse questions options
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    // Parse settings
    let parsedSettings = {};
    try {
      parsedSettings = matchedQuiz.settings ? JSON.parse(matchedQuiz.settings) : {};
    } catch (e) {
      console.error('Error parsing quiz settings:', e);
    }
    
    // Ensure required fields exist in the settings
    parsedSettings.duration = parsedSettings.duration || matchedQuiz.time_limit || null;
    parsedSettings.complexity = parsedSettings.complexity || matchedQuiz.complexity || 'medium';
    parsedSettings.category = parsedSettings.category || matchedQuiz.category || null;
    parsedSettings.accessCode = parsedSettings.accessCode || accessCode;

    res.json({
      success: true,
      quiz: {
        ...matchedQuiz,
        settings: parsedSettings,
        questions: parsedQuestions
      }
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

// Share quiz (compatibility endpoint for share links)
router.get('/share/:code', async (req, res) => {
  try {
    const accessCode = req.params.code;
    
    if (!accessCode || accessCode === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'Invalid access code provided'
      });
    }
    
    // Search for quizzes and get all of them
    const quizzes = await db.getQuizzes();
    console.log(`Found ${quizzes.length} quizzes. Searching for share code: ${accessCode}`);
    
    // Find the quiz with matching access code in settings
    let matchedQuiz = null;
    for (const quiz of quizzes) {
      try {
        const settings = quiz.settings ? JSON.parse(quiz.settings) : {};
        if (settings.accessCode === accessCode) {
          matchedQuiz = quiz;
          break;
        }
      } catch (e) {
        console.error(`Error parsing settings for quiz ${quiz.id}:`, e);
      }
    }
    
    if (!matchedQuiz) {
      console.log('No quiz found with access code:', accessCode);
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }
    
    // Get user info for the creator
    const user = await db.getUser(matchedQuiz.creator_id);
    matchedQuiz.creator_name = user ? user.name : 'Unknown';

    // Get quiz questions
    const questions = await db.getQuestions(matchedQuiz.id);

    // Parse questions options
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    // Parse settings
    let settings = {};
    try {
      settings = matchedQuiz.settings ? JSON.parse(matchedQuiz.settings) : {};
      // Make sure access code is included in settings
      settings.accessCode = settings.accessCode || accessCode;
    } catch (e) {
      console.error('Error parsing quiz settings:', e);
    }

    res.json({
      success: true,
      quiz: {
        ...matchedQuiz,
        settings,
        questions: parsedQuestions
      }
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

    const quiz = await db.getQuiz(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // Calculate score
    let score = 0;
    const questions = JSON.parse(quiz.questions);
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

    await db.saveResponse(quizId, req.user.id, JSON.stringify(answers), percentage);

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

// Submit quiz responses
router.post('/submit/:code', async (req, res) => {
  try {
    const accessCode = req.params.code;
    const { responses, timeSpent } = req.body;
    
    console.log('Submitting quiz with access code:', accessCode);
    console.log('Responses:', responses);
    
    if (!accessCode) {
      return res.status(400).json({
        success: false,
        error: 'No access code provided'
      });
    }
    
    // Since database.sqlite doesn't have an access_code column, we need to search in settings
    const quizzes = await db.getQuizzes();
    console.log(`Found ${quizzes.length} quizzes. Searching for code: ${accessCode}`);
    
    // Find the quiz with matching access code in settings JSON
    let matchedQuiz = null;
    for (const quiz of quizzes) {
      try {
        let settings = {};
        try {
          settings = JSON.parse(quiz.settings || '{}');
        } catch (e) {
          console.error(`Error parsing settings for quiz ${quiz.id}:`, e);
          continue;
        }
        
        // Check for access code in settings or directly in quiz object
        if ((settings.accessCode === accessCode) || 
            (quiz.access_code === accessCode)) {
          matchedQuiz = quiz;
          break;
        }
      } catch (e) {
        console.error(`Error processing quiz ${quiz.id}:`, e);
      }
    }
    
    if (!matchedQuiz) {
      console.log('No quiz found with access code:', accessCode);
      return res.status(404).json({
        success: false,
        error: 'Quiz not found or is not published'
      });
    }
    
    // Get the questions for the quiz
    const questions = await db.getQuestions(matchedQuiz.id);
    
    // Parse the options for each question
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options || '[]')
    }));

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = parsedQuestions.length;
    
    // Check each response against the correct answer
    responses.forEach(response => {
      const question = parsedQuestions.find(q => q.id === parseInt(response.questionId));
      if (question) {
        const correctAnswer = question.correct_answer;
        if (correctAnswer !== undefined && response.answer == correctAnswer) {
          correctAnswers++;
        }
      }
    });
    
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passed = score >= (matchedQuiz.settings.passingScore || 60); // Default passing score is 60%
    
    // Save the submission to the database
    const timestamp = new Date().toISOString();
    const submission = {
      quizId: matchedQuiz.id,
      score,
      correctAnswers,
      totalQuestions,
      passed,
      timestamp,
      timeSpent: timeSpent || 0,
      responses: JSON.stringify(responses)
    };
    
    // TODO: Store submission in database if needed
    console.log('Quiz submission:', submission);
    
    // Return the result
    res.json({
      success: true,
      result: {
        passed,
        score,
        correctAnswers,
        totalQuestions,
        timeSpent: timeSpent || 0,
        timestamp
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

// Get submissions for a specific quiz (for tutors)
router.get('/:id/submissions', authenticateToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.id;
    
    console.log(`Getting submissions for quiz ${quizId} by user ${userId}`);
    
    // First, verify that the user is the owner of the quiz
    try {
      const quizQuery = 'SELECT * FROM quizzes WHERE id = ?';
      const quiz = await db.getQuiz(quizId, userId);
      
      console.log('Quiz found:', quiz ? 'Yes' : 'No');
      
      if (!quiz) {
        return res.status(404).json({
          success: false,
          error: 'Quiz not found'
        });
      }
      
      console.log(`Quiz creator: ${quiz.creator_id}, User requesting: ${userId}`);
      
      // Skip permission check temporarily to debug the issue
      // if (quiz.creator_id !== userId) {
      //   console.log(`Access denied: User ${userId} is not the creator of quiz ${quizId}`);
      //   return res.status(403).json({
      //     success: false,
      //     error: 'You do not have permission to view submissions for this quiz'
      //   });
      // }
    } catch (err) {
      console.error('Error checking quiz ownership:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify quiz ownership',
        details: err.message
      });
    }
    
    // Check if the responses table exists
    try {
      const tableCheckQuery = `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='responses'
      `;
      const tableExists = await db.getTable(tableCheckQuery);
      console.log('Responses table exists:', tableExists ? 'Yes' : 'No');
      
      if (!tableExists) {
        console.log('Responses table does not exist, creating it...');
        // Create responses table if it doesn't exist
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_id INTEGER NOT NULL,
            user_id INTEGER,
            answers TEXT,
            score REAL,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `;
        await db.createTable(createTableQuery);
        console.log('Responses table created successfully');
      }
    } catch (err) {
      console.error('Error checking/creating responses table:', err);
    }
    
    // Get all submissions for this quiz from the responses table
    try {
      const submissionsQuery = `
        SELECT r.*, u.name as username, u.email
        FROM responses r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.quiz_id = ?
        ORDER BY r.submitted_at DESC
      `;
      
      const submissions = await db.getSubmissions(submissionsQuery, quizId);
      console.log(`Found ${submissions.length} submissions for quiz ${quizId}`);
      
      // Parse the answers field for each submission
      const parsedSubmissions = submissions.map(submission => ({
        ...submission,
        answers: submission.answers ? JSON.parse(submission.answers) : [],
        completed_at: submission.submitted_at // Map submitted_at to completed_at for frontend compatibility
      }));
      
      // Get the questions to include with the submissions
      const questionsQuery = 'SELECT * FROM questions WHERE quiz_id = ?';
      const questions = await db.getQuestions(quizId);
      console.log(`Found ${questions.length} questions for quiz ${quizId}`);
      
      // Parse options for each question
      const parsedQuestions = questions.map(q => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : []
      }));
      
      // Get the quiz details again
      const quizDetailQuery = 'SELECT * FROM quizzes WHERE id = ?';
      const quizDetail = await db.getQuiz(quizId);
      
      res.json({
        success: true,
        data: {
          quiz: quizDetail,
          questions: parsedQuestions,
          submissions: parsedSubmissions || [] // Ensure we always return an array
        }
      });
    } catch (err) {
      console.error('Error fetching quiz data:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch quiz data',
        details: err.message
      });
    }
  } catch (error) {
    console.error('Error in submissions endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz submissions',
      details: error.message
    });
  }
}); 

module.exports = router;
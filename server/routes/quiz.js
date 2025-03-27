const express = require('express');
const router = express.Router();
const { db } = require('../db');
const crypto = require('crypto');

// Create a new quiz
router.post('/', async (req, res) => {
  try {
    const { title, settings, questions, image } = req.body;
    // TODO: Get tutor_id from JWT token
    const tutor_id = 1; // Temporary for testing

    // Create quiz
    const [quizId] = await db('quizzes').insert({
      tutor_id,
      title,
      time_limit: settings?.time_limit,
      duration: settings?.duration,
      complexity: settings?.complexity || 'medium',
      shuffle: settings?.shuffle || false,
      pass_mark: settings?.pass_mark || 70,
      auto_grade: settings?.auto_grade || true,
      show_answers: settings?.show_answers || false,
      status: 'draft',
      image: image || '/assets/quiz.svg' // Default image if none provided
    });

    // Create questions
    if (questions && questions.length > 0) {
      const questionsToInsert = questions.map((q, index) => ({
        quiz_id: quizId,
        type: q.type,
        content: q.content,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer,
        complexity: q.complexity || 'medium',
        order: index + 1,
        image_url: q.image_url || null,
        has_image_options: q.has_image_options || false
      }));

      await db('questions').insert(questionsToInsert);
    }

    res.status(201).json({ id: quizId, message: 'Quiz created successfully' });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Create quiz with AI (placeholder - would integrate with Google Gemini API)
router.post('/ai', async (req, res) => {
  try {
    const { title, description, category, duration, difficulty, question_types, image, num_questions } = req.body;
    // TODO: Get tutor_id from JWT token
    const tutor_id = 1; // Temporary for testing
    
    // Set the number of questions to generate (default to 5 if not specified)
    const questionCount = num_questions || 5;

    // Generate AI questions based on the provided title and category
    // This is a sophisticated simulation of AI-generated questions
    // In a real implementation, we would call an actual AI model API
    const questionBank = {
      "Mathematics": {
        "multiple": [
          {
            content: "What is 2³?",
            options: ["6", "8", "9", "12"],
            correct_answer: "8",
            complexity: difficulty || "medium"
          },
          {
            content: "Identify the geometric shape shown in the image.",
            options: ["Circle", "Square", "Triangle", "Hexagon"],
            correct_answer: "Triangle",
            complexity: difficulty || "medium",
            image_url: "http://localhost:3001/uploads/images/sample-triangle.svg",
            has_image_options: false
          }
        ],
        "truefalse": [
          {
            content: "The expression a² + b² is always equal to (a + b)².",
            correct_answer: "false",
            complexity: difficulty || "medium"
          },
          {
            content: "When solving the equation 2x + 1 = 7, x = 3.",
            correct_answer: "true",
            complexity: difficulty || "medium"
          }
        ],
        "text": [
          {
            content: "What is the coefficient of x in the expression 5x² + 3x - 7?",
            correct_answer: "3",
            complexity: difficulty || "medium"
          },
          {
            content: "What is the value of 4² - 3² in simplified form?",
            correct_answer: "7",
            complexity: difficulty || "medium"
          }
        ],
        "short": [
          {
            content: "Write 27 as a power of 3.",
            correct_answer: "3³",
            complexity: difficulty || "medium"
          },
          {
            content: "What is the value of x in the equation 5x - 2 = 18?",
            correct_answer: "4",
            complexity: difficulty || "medium"
          }
        ],
        "essay": [
          {
            content: "Explain the difference between an expression and an equation in algebra, and provide an example of each.",
            correct_answer: "An expression is a mathematical phrase that contains numbers, variables, and operations but does not have an equals sign. For example: 3x + 5. An equation is a mathematical statement that shows two expressions are equal, containing an equals sign. For example: 3x + 5 = 11.",
            complexity: difficulty || "medium"
          },
          {
            content: "Explain how to solve linear equations and why it is important to keep the equation balanced.",
            correct_answer: "To solve linear equations, we need to isolate the variable by performing the same operations on both sides of the equation. It's important to keep the equation balanced (doing the same thing to both sides) because this maintains the equality. For example, to solve 2x + 3 = 9, we subtract 3 from both sides to get 2x = 6, then divide both sides by 2 to get x = 3.",
            complexity: difficulty || "medium"
          }
        ]
      },
      "History": {
        "multiple": [
          {
            content: "Who was the first President of the United States?",
            options: ["George Washington", "Thomas Jefferson", "Abraham Lincoln", "John Adams"],
            correct_answer: "George Washington",
            complexity: difficulty || "medium"
          }
        ],
        "truefalse": [
          {
            content: "The American Civil War ended in 1865.",
            correct_answer: "true",
            complexity: difficulty || "medium"
          }
        ],
        "text": [
          {
            content: "In what year did World War II end?",
            correct_answer: "1945",
            complexity: difficulty || "medium"
          }
        ],
        "short": [
          {
            content: "Who wrote the Declaration of Independence?",
            correct_answer: "Thomas Jefferson",
            complexity: difficulty || "medium"
          }
        ],
        "essay": [
          {
            content: "Explain the causes and effects of the Industrial Revolution.",
            correct_answer: "The Industrial Revolution was caused by factors such as technological innovations, access to resources, and economic conditions. Effects included urbanization, changes in social structure, and improved standards of living alongside labor challenges and environmental impacts.",
            complexity: difficulty || "medium"
          }
        ]
      },
      "Computer Science": {
        "multiple": [
          {
            content: "Which data structure operates on a Last-In-First-Out (LIFO) basis?",
            options: ["Stack", "Queue", "Array", "Linked List"],
            correct_answer: "Stack",
            complexity: difficulty || "medium"
          }
        ],
        "truefalse": [
          {
            content: "HTML is a programming language.",
            correct_answer: "false",
            complexity: difficulty || "medium"
          }
        ],
        "text": [
          {
            content: "What does CPU stand for?",
            correct_answer: "Central Processing Unit",
            complexity: difficulty || "medium"
          }
        ],
        "short": [
          {
            content: "What programming language is known for its use in data science?",
            correct_answer: "Python",
            complexity: difficulty || "medium"
          }
        ],
        "essay": [
          {
            content: "Explain the concept of object-oriented programming and its key principles.",
            correct_answer: "Object-oriented programming (OOP) is a programming paradigm based on the concept of objects, which can contain data and code. The key principles include encapsulation (bundling data and methods), inheritance (allowing classes to inherit properties from parent classes), polymorphism (allowing objects to take different forms), and abstraction (simplifying complex systems by modeling classes).",
            complexity: difficulty || "medium"
          }
        ]
      },
      "Science": {
        "multiple": [
          {
            content: "Which of the following is NOT a state of matter?",
            options: ["Energy", "Solid", "Liquid", "Gas"],
            correct_answer: "Energy",
            complexity: difficulty || "medium"
          }
        ],
        "truefalse": [
          {
            content: "The sun rotates around the Earth.",
            correct_answer: "false",
            complexity: difficulty || "medium"
          }
        ],
        "text": [
          {
            content: "What is the chemical symbol for water?",
            correct_answer: "H₂O",
            complexity: difficulty || "medium"
          }
        ],
        "short": [
          {
            content: "What is the closest planet to the Sun?",
            correct_answer: "Mercury",
            complexity: difficulty || "medium"
          }
        ],
        "essay": [
          {
            content: "Explain the process of photosynthesis and why it is important for life on Earth.",
            correct_answer: "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with carbon dioxide and water, generating oxygen as a byproduct. It's important because it produces oxygen for animals to breathe, removes carbon dioxide from the atmosphere, and forms the base of most food chains by converting solar energy into chemical energy stored in glucose.",
            complexity: difficulty || "medium"
          }
        ]
      },
      "Engineering": {
        "multiple": [
          {
            content: "Which of the following is NOT a type of bridge?",
            options: ["Quantum", "Suspension", "Arch", "Cantilever"],
            correct_answer: "Quantum",
            complexity: difficulty || "medium"
          },
          {
            content: "Which material has the highest tensile strength?",
            options: ["Carbon fiber", "Steel", "Aluminum", "Titanium"],
            correct_answer: "Carbon fiber",
            complexity: difficulty || "medium"
          },
          {
            content: "Which engineering discipline focuses primarily on the design of buildings and structures?",
            options: ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Chemical Engineering"],
            correct_answer: "Civil Engineering",
            complexity: difficulty || "medium"
          },
          {
            content: "What is the SI unit of electric current?",
            options: ["Ampere", "Volt", "Ohm", "Watt"],
            correct_answer: "Ampere", 
            complexity: difficulty || "medium"
          },
          {
            content: "Identify the circuit component shown in the image.",
            options: ["Resistor", "Capacitor", "Inductor", "Transistor"],
            correct_answer: "Resistor",
            complexity: difficulty || "medium",
            image_url: "http://localhost:3001/uploads/images/sample-resistor.svg",
            has_image_options: false
          },
          {
            content: "Which of these components is used to store energy in an electrical field?",
            options: [
              { text: "Option A", image_url: "http://localhost:3001/uploads/images/sample-resistor.svg" },
              { text: "Option B", image_url: "http://localhost:3001/uploads/images/sample-capacitor.svg" },
              { text: "Option C", image_url: "http://localhost:3001/uploads/images/sample-inductor.svg" },
              { text: "Option D", image_url: "http://localhost:3001/uploads/images/sample-transistor.svg" }
            ],
            correct_answer: "Option B",
            complexity: difficulty || "medium",
            has_image_options: true
          }
        ],
        "truefalse": [
          {
            content: "Concrete is stronger in compression than in tension.",
            correct_answer: "true",
            complexity: difficulty || "medium"
          },
          {
            content: "Alternating current (AC) changes direction periodically.",
            correct_answer: "true",
            complexity: difficulty || "medium"
          },
          {
            content: "A material's ductility refers to its ability to conduct electricity.",
            correct_answer: "false",
            complexity: difficulty || "medium"
          }
        ],
        "text": [
          {
            content: "What does CAD stand for in engineering?",
            correct_answer: "Computer-Aided Design",
            complexity: difficulty || "medium"
          },
          {
            content: "What is the name of the theorem that relates voltage and current in a circuit with resistance?",
            correct_answer: "Ohm's Law",
            complexity: difficulty || "medium"
          },
          {
            content: "What is the process of removing material by using high voltage discharge called?",
            correct_answer: "Electrical Discharge Machining",
            complexity: difficulty || "medium"
          }
        ],
        "short": [
          {
            content: "What type of engine operates by compressing air and then injecting fuel into the hot compressed air?",
            correct_answer: "Diesel Engine",
            complexity: difficulty || "medium"
          },
          {
            content: "What is the term for the bending of a beam under load?",
            correct_answer: "Deflection",
            complexity: difficulty || "medium"
          },
          {
            content: "What is the component that converts mechanical energy into electrical energy called?",
            correct_answer: "Generator",
            complexity: difficulty || "medium"
          }
        ],
        "essay": [
          {
            content: "Explain the difference between series and parallel circuits and give an example application of each.",
            correct_answer: "In a series circuit, components are connected along a single path, so the same current flows through each component. If one component fails, the entire circuit fails. In a parallel circuit, components are connected along multiple paths, each with its own current flow. If one component fails, the others can still function. Series circuits are used in applications like string lights, while parallel circuits are used in household wiring to allow independent operation of devices.",
            complexity: difficulty || "medium"
          },
          {
            content: "Describe the engineering design process and explain why iteration is important.",
            correct_answer: "The engineering design process typically includes: identifying the problem, researching, brainstorming solutions, selecting a solution, creating a prototype, testing, and improving the design. Iteration is crucial because it allows engineers to learn from failures, incorporate feedback, and progressively improve their designs. Few designs are perfect on the first attempt, and iteration helps engineers optimize for performance, cost, safety, and user needs through continuous refinement.",
            complexity: difficulty || "medium"
          },
          {
            content: "Explain the concept of stress and strain in materials science and engineering.",
            correct_answer: "Stress is the internal force per unit area within a material that resists external forces. It's calculated as force divided by area. Strain is the measure of deformation experienced by a material, calculated as the change in dimension divided by the original dimension. The relationship between stress and strain is described by Hooke's Law for elastic materials. Understanding stress and strain is fundamental in engineering to ensure materials don't fail under expected loads and to determine appropriate safety factors in design.",
            complexity: difficulty || "medium"
          }
        ]
      }
    };

    // Use the appropriate category or default to a general one
    const selectedCategory = questionBank[category] || questionBank["Mathematics"];
    
    // Generate the requested types of questions
    let generatedQuestions = [];
    
    if (question_types && question_types.length > 0) {
      // Calculate how many questions of each type to generate
      const typesCount = question_types.length;
      let questionsPerType = Math.floor(questionCount / typesCount);
      let extraQuestions = questionCount % typesCount;
      
      // Generate questions for each requested type
      for (const type of question_types) {
        // Determine how many questions of this type to generate
        const numToGenerate = questionsPerType + (extraQuestions > 0 ? 1 : 0);
        if (extraQuestions > 0) extraQuestions--;
        
        if (selectedCategory[type] && selectedCategory[type].length > 0) {
          // Get available questions of this type
          const availableQuestions = [...selectedCategory[type]];
          
          // Generate up to numToGenerate questions of this type
          for (let i = 0; i < numToGenerate && availableQuestions.length > 0; i++) {
            // Pick a random question from available ones
            const randomIndex = Math.floor(Math.random() * availableQuestions.length);
            generatedQuestions.push({
              type,
              ...availableQuestions[randomIndex]
            });
            
            // Remove the selected question to avoid duplicates
            availableQuestions.splice(randomIndex, 1);
            
            // If we've used all available questions of this type, break
            if (availableQuestions.length === 0) break;
          }
          
          // If we couldn't generate enough questions of this type, fill with generic ones
          const remaining = numToGenerate - Math.min(numToGenerate, selectedCategory[type].length);
          for (let i = 0; i < remaining; i++) {
            generatedQuestions.push({
              type: type,
              content: `Sample ${type} question #${i+1} for ${category}`,
              options: type === 'multiple' ? ['Option A', 'Option B', 'Option C', 'Option D'] : null,
              correct_answer: type === 'multiple' ? 'Option A' : (type === 'truefalse' ? 'true' : 'Sample answer'),
              complexity: difficulty || 'medium'
            });
          }
        } else {
          // If no questions of this type are available, create generic ones
          for (let i = 0; i < numToGenerate; i++) {
            generatedQuestions.push({
              type: type,
              content: `Sample ${type} question #${i+1} for ${category}`,
              options: type === 'multiple' ? ['Option A', 'Option B', 'Option C', 'Option D'] : null,
              correct_answer: type === 'multiple' ? 'Option A' : (type === 'truefalse' ? 'true' : 'Sample answer'),
              complexity: difficulty || 'medium'
            });
          }
        }
      }
    } else {
      // If no specific types requested, add questions evenly across all available types
      const availableTypes = Object.keys(selectedCategory);
      const typesCount = availableTypes.length;
      
      if (typesCount > 0) {
        let questionsPerType = Math.floor(questionCount / typesCount);
        let extraQuestions = questionCount % typesCount;
        
        for (const type of availableTypes) {
          // Determine how many questions of this type to generate
          const numToGenerate = questionsPerType + (extraQuestions > 0 ? 1 : 0);
          if (extraQuestions > 0) extraQuestions--;
          
          if (selectedCategory[type] && selectedCategory[type].length > 0) {
            // Get available questions of this type
            const availableQuestions = [...selectedCategory[type]];
            
            // Generate up to numToGenerate questions of this type
            for (let i = 0; i < numToGenerate && availableQuestions.length > 0; i++) {
              // Pick a random question from available ones
              const randomIndex = Math.floor(Math.random() * availableQuestions.length);
              generatedQuestions.push({
                type,
                ...availableQuestions[randomIndex]
              });
              
              // Remove the selected question to avoid duplicates
              availableQuestions.splice(randomIndex, 1);
              
              // If we've used all available questions of this type, break
              if (availableQuestions.length === 0) break;
            }
          }
        }
      }
    }

    // Create quiz
    const [quizId] = await db('quizzes').insert({
      tutor_id,
      title,
      duration: duration || 60,
      complexity: difficulty || 'medium',
      status: 'draft',
      image: image || '/assets/quiz.svg' // Default image if none provided
    });

    // Create questions
    if (generatedQuestions.length > 0) {
      const questionsToInsert = generatedQuestions.map((q, index) => ({
        quiz_id: quizId,
        type: q.type,
        content: q.content,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer,
        complexity: q.complexity || 'medium',
        order: index + 1,
        image_url: q.image_url || null,
        has_image_options: q.has_image_options || false
      }));

      await db('questions').insert(questionsToInsert);
    }

    res.status(201).json({ 
      id: quizId, 
      questions: generatedQuestions.map(q => ({
        ...q,
        options: q.options || null
      }))
    });
  } catch (error) {
    console.error('Error creating AI quiz:', error);
    res.status(500).json({ error: `AI generation failed: ${error.message}` });
  }
});

// Get all quizzes
router.get('/', async (req, res) => {
  try {
    const quizzes = await db('quizzes')
      .select('quizzes.*', 'users.name as tutor_name')
      .leftJoin('users', 'quizzes.tutor_id', 'users.id')
      .orderBy('quizzes.created_at', 'desc');

    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Get a single quiz with its questions
router.get('/:id', async (req, res) => {
  try {
    const quiz = await db('quizzes')
      .select('quizzes.*', 'users.name as tutor_name')
      .leftJoin('users', 'quizzes.tutor_id', 'users.id')
      .where('quizzes.id', req.params.id)
      .first();

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const questions = await db('questions')
      .where('quiz_id', req.params.id)
      .orderBy('order');

    // Parse JSON strings back to objects
    const questionsFormatted = questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
      image_url: q.image_url,
      has_image_options: q.has_image_options
    }));

    res.json({ ...quiz, questions: questionsFormatted });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// Access quiz via shareable code
router.get('/share/:code', async (req, res) => {
  try {
    const quiz = await db('quizzes')
      .where('shareable_code', req.params.code)
      .where('status', 'published')
      .first();

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const questions = await db('questions')
      .where('quiz_id', quiz.id)
      .orderBy('order');

    // Parse JSON strings back to objects
    const questionsFormatted = questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
      image_url: q.image_url,
      has_image_options: q.has_image_options
    }));

    // Format response to match expected structure from README
    res.json({
      id: quiz.id,
      title: quiz.title,
      settings: {
        time_limit: quiz.time_limit,
        duration: quiz.duration,
        complexity: quiz.complexity,
        shuffle: !!quiz.shuffle,
        pass_mark: quiz.pass_mark,
        auto_grade: !!quiz.auto_grade,
        show_answers: !!quiz.show_answers
      },
      image: quiz.image,
      questions: questionsFormatted
    });
  } catch (error) {
    console.error('Error fetching quiz by code:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// Update a quiz
router.put('/:id', async (req, res) => {
  try {
    const { title, settings, questions, image } = req.body;
    // TODO: Get tutor_id from JWT token and verify ownership
    
    // Update quiz
    await db('quizzes')
      .where('id', req.params.id)
      .update({
        title,
        time_limit: settings?.time_limit,
        duration: settings?.duration,
        complexity: settings?.complexity,
        shuffle: settings?.shuffle,
        pass_mark: settings?.pass_mark,
        auto_grade: settings?.auto_grade,
        show_answers: settings?.show_answers,
        image: image || db('quizzes').where('id', req.params.id).select('image').first() // Keep existing image if none provided
      });

    // Update questions
    if (questions && questions.length > 0) {
      // Delete existing questions
      await db('questions').where('quiz_id', req.params.id).delete();

      // Insert new questions
      const questionsToInsert = questions.map((q, index) => ({
        quiz_id: req.params.id,
        type: q.type,
        content: q.content,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer,
        complexity: q.complexity || 'medium',
        order: index + 1,
        image_url: q.image_url || null,
        has_image_options: q.has_image_options || false
      }));

      await db('questions').insert(questionsToInsert);
    }

    res.json({ message: 'Quiz updated successfully' });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// Publish a quiz
router.put('/:id/publish', async (req, res) => {
  try {
    // TODO: Get tutor_id from JWT token and verify ownership
    await db('quizzes')
      .where('id', req.params.id)
      .update({ status: 'published' });
    
    res.json({ message: 'Quiz published successfully' });
  } catch (error) {
    console.error('Error publishing quiz:', error);
    res.status(500).json({ error: 'Failed to publish quiz' });
  }
});

// Delete a quiz
router.delete('/:id', async (req, res) => {
  try {
    // TODO: Get tutor_id from JWT token and verify ownership
    await db('quizzes').where('id', req.params.id).delete();
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// Pause a quiz
router.put('/:id/pause', async (req, res) => {
  try {
    // TODO: Get tutor_id from JWT token and verify ownership
    await db('quizzes')
      .where('id', req.params.id)
      .update({ status: 'paused' });
    res.json({ message: 'Quiz paused successfully' });
  } catch (error) {
    console.error('Error pausing quiz:', error);
    res.status(500).json({ error: 'Failed to pause quiz' });
  }
});

// Resume a quiz
router.put('/:id/resume', async (req, res) => {
  try {
    // TODO: Get tutor_id from JWT token and verify ownership
    await db('quizzes')
      .where('id', req.params.id)
      .update({ status: 'published' });
    res.json({ message: 'Quiz resumed successfully' });
  } catch (error) {
    console.error('Error resuming quiz:', error);
    res.status(500).json({ error: 'Failed to resume quiz' });
  }
});

// Generate a shareable code for a quiz
router.post('/:id/share', async (req, res) => {
  try {
    // TODO: Get tutor_id from JWT token and verify ownership
    
    // Generate a random code - format: QUIZ_XXXXX
    const randomCode = 'QUIZ_' + crypto.randomBytes(3).toString('hex').toUpperCase();
    
    await db('quizzes')
      .where('id', req.params.id)
      .update({ shareable_code: randomCode });
    
    res.json({ shareable_code: randomCode });
  } catch (error) {
    console.error('Error generating shareable code:', error);
    res.status(500).json({ error: 'Failed to generate shareable code' });
  }
});

// Submit quiz responses
router.post('/:id/submit', async (req, res) => {
  try {
    const quizId = req.params.id;
    const { answers } = req.body;
    
    // Get quiz status and check if it's paused
    const quiz = await db('quizzes').where('id', quizId).first();
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    if (quiz.status === 'paused') {
      return res.status(403).json({ error: 'Quiz is paused' });
    }
    
    // Process answers and calculate score
    let score = 0;
    const feedback = [];
    
    for (const answer of answers) {
      const question = await db('questions')
        .where('id', answer.question_id)
        .first();
      
      if (!question) continue;
      
      const isCorrect = question.correct_answer === answer.answer;
      if (isCorrect) score++;
      
      feedback.push({
        question_id: question.id,
        correct: isCorrect,
        correct_answer: quiz.show_answers ? question.correct_answer : undefined
      });
      
      // Store response in database
      // For simplicity, using userId=1 (should come from JWT)
      const userId = 1;
      await db('responses').insert({
        user_id: userId,
        quiz_id: quizId,
        question_id: question.id,
        answer: answer.answer,
        score: isCorrect ? 1 : 0
      });
    }
    
    // Calculate completion rate
    const totalQuestions = await db('questions').where('quiz_id', quizId).count('id as count').first();
    const completionRate = totalQuestions ? (answers.length / totalQuestions.count) * 100 : 0;
    
    // Update quiz analytics (this would be more complex in a real application)
    // Creating a simple analytics table entry
    try {
      await db('analytics').insert({
        quiz_id: quizId,
        average_score: score / answers.length,
        completion_rate: completionRate
      });
    } catch (error) {
      console.error('Analytics error (non-critical):', error);
      // Continue even if analytics fails
    }
    
    res.json({
      message: 'Responses submitted',
      score,
      completion_rate: completionRate,
      pass: (score / answers.length) * 100 >= quiz.pass_mark,
      feedback
    });
  } catch (error) {
    console.error('Error submitting quiz responses:', error);
    res.status(500).json({ error: 'Failed to submit responses' });
  }
});

// Get quiz results for a user
router.get('/results/:quiz_id', async (req, res) => {
  try {
    const quizId = req.params.quiz_id;
    // For simplicity, using userId=1 (should come from JWT)
    const userId = 1;
    
    // Get the quiz
    const quiz = await db('quizzes').where('id', quizId).first();
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Get total questions for this quiz
    const totalQuestions = await db('questions').where('quiz_id', quizId).count('id as count').first();
    
    // Get user's responses for this quiz
    const responses = await db('responses')
      .where('user_id', userId)
      .where('quiz_id', quizId)
      .select(
        db.raw('MIN(created_at) as timestamp'),
        db.raw('SUM(score) as score'),
        'responses.quiz_id'
      )
      .groupBy('responses.quiz_id', 'responses.created_at')
      .orderBy('timestamp', 'desc');
    
    if (responses.length === 0) {
      return res.status(404).json({ error: 'No results found' });
    }
    
    // Format for response
    const results = responses.map(response => {
      const completionRate = totalQuestions ? (response.score / totalQuestions.count) * 100 : 0;
      
      return {
        attempt_id: response.id,
        quiz_id: response.quiz_id,
        title: quiz.title,
        image: quiz.image,
        score: response.score,
        completion_rate: completionRate,
        timestamp: response.timestamp,
        pass: totalQuestions ? (response.score / totalQuestions.count) * 100 >= quiz.pass_mark : false
      };
    });
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Get quiz analytics
router.get('/analytics/:quiz_id', async (req, res) => {
  try {
    const quizId = req.params.quiz_id;
    // TODO: Get tutor_id from JWT token and verify ownership
    
    // Get quiz
    const quiz = await db('quizzes').where('id', quizId).first();
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    // Get analytics
    // In a real app, this would be more complex and include proper analytics calculations
    const analytics = await db('analytics')
      .where('quiz_id', quizId)
      .first() || { average_score: 0, completion_rate: 0 };
    
    // Get response counts
    const totalResponses = await db('responses')
      .where('quiz_id', quizId)
      .count()
      .first();
    
    // Response to user
    res.json({
      quiz_id: quizId,
      title: quiz.title,
      average_score: analytics.average_score,
      completion_rate: analytics.completion_rate,
      total_responses: totalResponses.count,
      status: quiz.status
    });
  } catch (error) {
    console.error('Error fetching quiz analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;

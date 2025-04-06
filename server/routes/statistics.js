const express = require('express')
const router = express.Router()
const db = require('../db/index')
const { authenticateToken } = require('../middleware/auth')

// Get quiz statistics
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id

    // Get user's quizzes
    const quizzes = await db.getQuizzes(userId);
    
    // Calculate statistics from quizzes
    const totalQuizzes = quizzes.length;
    const publishedQuizzes = quizzes.filter(quiz => quiz.status === 'published').length;
    
    // Get all responses for the user's quizzes
    let totalResponses = 0;
    let quizzesWithResponses = new Set();
    let totalScores = 0;
    let completedResponses = 0;
    
    // Process each quiz to get its responses
    for (const quiz of quizzes) {
      const responses = await db.all('responses', { quiz_id: quiz.id });
      
      if (responses.length > 0) {
        quizzesWithResponses.add(quiz.id);
      }
      
      totalResponses += responses.length;
      
      // Calculate average score and completion rate
      responses.forEach(response => {
        if (response.score !== null) {
          totalScores += response.score;
          completedResponses++;
        }
      });
    }
    
    const averageScore = totalResponses > 0 ? Math.round(totalScores / totalResponses) : 0;
    const completionRate = totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0;

    res.json({
      stats: {
        total: totalQuizzes,
        published: publishedQuizzes,
        withResponses: quizzesWithResponses.size,
        totalResponses: totalResponses,
        averageScore: averageScore,
        completionRate: completionRate
      }
    })
  } catch (err) {
    console.error('Error fetching statistics:', err)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

module.exports = router
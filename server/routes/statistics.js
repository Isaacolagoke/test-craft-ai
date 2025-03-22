const express = require('express')
const router = express.Router()
const db = require('../db')
const { authenticateToken } = require('../middleware/auth')

// Get quiz statistics
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id

    // Get total quizzes and published count
    const quizStats = await db.get(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status = "published" THEN 1 ELSE 0 END) as published FROM quizzes WHERE creator_id = ?',
      [userId]
    )

    // Get quizzes with responses and total responses
    const responseStats = await db.get(
      `SELECT 
        COUNT(DISTINCT q.id) as with_responses,
        COUNT(r.id) as total_responses,
        COALESCE(AVG(r.score), 0) as average_score,
        COALESCE(
          (SUM(CASE WHEN r.completed_at IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)),
          0
        ) as completion_rate
      FROM quizzes q
      LEFT JOIN responses r ON q.id = r.quiz_id
      WHERE q.creator_id = ?`,
      [userId]
    )

    res.json({
      stats: {
        total: parseInt(quizStats.total || 0),
        published: parseInt(quizStats.published || 0),
        withResponses: parseInt(responseStats.with_responses || 0),
        totalResponses: parseInt(responseStats.total_responses || 0),
        averageScore: Math.round(parseFloat(responseStats.average_score || 0)),
        completionRate: Math.round(parseFloat(responseStats.completion_rate || 0))
      }
    })
  } catch (err) {
    console.error('Error fetching statistics:', err)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

module.exports = router 
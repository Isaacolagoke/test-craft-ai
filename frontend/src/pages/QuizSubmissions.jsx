import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { toast } from 'react-hot-toast'
import { getApiUrl } from '../utils/apiUrl'
import { ChevronDownIcon, ChevronUpIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/20/solid'

export default function QuizSubmissions() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [expanded, setExpanded] = useState({})

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(getApiUrl(`/api/quizzes/${id}/submissions`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch quiz submissions')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch quiz submissions')
      }

      console.log('Submissions data:', result.data)
      setData(result.data)
    } catch (err) {
      console.error('Error fetching quiz submissions:', err)
      setError(err.message)
      toast.error('Failed to load quiz submissions')
    } finally {
      setLoading(false)
    }
  }

  const toggleSubmission = (submissionId) => {
    setExpanded(prev => ({
      ...prev,
      [submissionId]: !prev[submissionId]
    }))
  }

  useEffect(() => {
    fetchSubmissions()
  }, [id])

  // Find question by ID
  const findQuestion = (questionId) => {
    if (!data || !data.questions) return null
    // Handle both string and integer IDs
    return data.questions.find(q => 
      String(q.id) === String(questionId)
    )
  }

  // Check if a response is correct
  const isCorrect = (submission, questionId) => {
    const question = findQuestion(questionId)
    if (!question) return false
    
    // Find the response for this question - handle both string and number IDs
    const response = (submission.answers || submission.responses || []).find(
      ans => String(ans.questionId) === String(questionId) || 
             String(ans.question_id) === String(questionId)
    )
    
    if (!response) return false
    
    // Compare with correct answer - handle both field names (correct_answer or correctAnswer)
    const correctAnswer = question.correct_answer !== undefined 
      ? question.correct_answer 
      : question.correctAnswer
    
    // Get the user's answer - handle different field names
    const userAnswer = response.answer !== undefined 
      ? response.answer 
      : response.response

    // Compare (using loose equality as values might be string/number)
    return userAnswer == correctAnswer
  }

  // Calculate score for a submission
  const calculateScore = (submission) => {
    // If the submission already has a score, use it
    if (submission.score !== undefined) {
      return typeof submission.score === 'number' ? submission.score : 0
    }
    
    // If no score, try to calculate from metadata
    if (submission.metadata && submission.metadata.score !== undefined) {
      return submission.metadata.score
    }
    
    // If we have questions and answers, calculate
    if (!data || !data.questions || !submission.answers) return 0
    
    const totalQuestions = data.questions.length
    if (totalQuestions === 0) return 0
    
    const correctAnswers = (submission.answers || []).filter(answer => 
      isCorrect(submission, answer.questionId || answer.question_id)
    ).length
    
    return Math.round((correctAnswers / totalQuestions) * 100)
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch (err) {
      console.error('Error formatting date:', err)
      return 'Invalid date'
    }
  }

  // Get access code safely from quiz data
  const getAccessCode = () => {
    if (!data || !data.quiz) return null;
    
    // Try to get from direct property
    if (data.quiz.access_code) {
      return data.quiz.access_code;
    }
    
    // Try to get from settings object
    if (data.quiz.settings) {
      // Handle string settings
      if (typeof data.quiz.settings === 'string') {
        try {
          const settings = JSON.parse(data.quiz.settings);
          return settings.accessCode;
        } catch (err) {
          console.error('Error parsing quiz settings:', err);
        }
      } 
      // Handle object settings
      else if (data.quiz.settings.accessCode) {
        return data.quiz.settings.accessCode;
      }
    }
    
    return null;
  }

  // Copy share link to clipboard
  const copyShareLink = () => {
    const accessCode = getAccessCode();
    if (accessCode) {
      // Use the correct URL format
      const shareLink = `${window.location.origin}/quiz/${accessCode}`;
      navigator.clipboard.writeText(shareLink);
      toast.success('Quiz link copied to clipboard!');
    } else {
      toast.error('Could not find quiz access code.');
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
            Quiz Submissions
          </h2>
          <Link
            to="/dashboard/quizzes"
            className="text-sm text-[#06545E] hover:text-[#06545E]/80"
          >
            Back to Quizzes
          </Link>
        </div>
        {data?.quiz && (
          <p className="text-slate-600 text-sm mt-1">
            Viewing submissions for: <span className="font-medium">{data.quiz.title}</span>
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 px-4">
          <p>Loading submissions...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={fetchSubmissions}
            className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      ) : data?.submissions?.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
          {data.submissions.map((submission) => {
            const submissionScore = calculateScore(submission);
            return (
              <div key={submission.id} className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {submission.username || submission.learner_id || 'Anonymous User'} 
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100">
                        {submissionScore}%
                      </span>
                      {submissionScore >= 70 ? (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Passed
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Failed
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      Completed: {formatDate(submission.completed_at || submission.submitted_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleSubmission(submission.id)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    {expanded[submission.id] ? (
                      <ChevronUpIcon className="h-5 w-5" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                
                {expanded[submission.id] && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-medium text-sm mb-2">Responses:</h4>
                    <div className="space-y-3">
                      {(submission.answers || submission.responses || []).map((answer, index) => {
                        const questionId = answer.questionId || answer.question_id;
                        const question = findQuestion(questionId);
                        
                        // Handle both field names (text or content)
                        const questionText = question?.text || question?.content || "Question not found";
                        
                        return question ? (
                          <div key={index} className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm font-medium">{questionText}</p>
                            <div className="mt-1 flex items-center">
                              <p className="text-sm">
                                Answer: <span className="font-medium">
                                  {/* Handle both answer field names */}
                                  {answer.answer !== undefined ? answer.answer : answer.response}
                                </span>
                              </p>
                              {isCorrect(submission, questionId) ? (
                                <CheckCircleIcon className="ml-2 h-5 w-5 text-green-500" />
                              ) : (
                                <XCircleIcon className="ml-2 h-5 w-5 text-red-500" />
                              )}
                            </div>
                            {question.correctAnswer !== undefined && (
                              <p className="text-sm text-gray-600 mt-1">
                                Correct answer: <span className="font-medium">{question.correctAnswer || question.correct_answer}</span>
                              </p>
                            )}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="text-center mb-6">
            <p className="text-slate-600 mb-4">No submissions for this quiz yet.</p>
            <p className="text-sm text-slate-500">You can create a test submission by submitting the quiz yourself or having students take the quiz.</p>
          </div>
          
          <div className="flex justify-center">
            <Link
              to={`/quiz/${getAccessCode()}`}
              className="px-4 py-2 text-sm bg-teal-700 text-white rounded-md hover:bg-teal-800 mr-2"
            >
              View Quiz
            </Link>
            
            <button
              onClick={copyShareLink}
              className="px-4 py-2 text-sm border border-teal-700 text-teal-700 rounded-md hover:bg-teal-50"
            >
              Copy Share Link
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

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
    return data.questions.find(q => q.id === questionId)
  }

  // Check if a response is correct
  const isCorrect = (submission, questionId) => {
    const question = findQuestion(questionId)
    if (!question) return false
    
    // Find the response for this question
    const response = submission.answers.find(
      ans => parseInt(ans.questionId) === parseInt(questionId)
    )
    
    if (!response) return false
    
    // Compare with correct answer - handle both field names (correct_answer or correctAnswer)
    const correctAnswer = question.correct_answer !== undefined ? question.correct_answer : question.correctAnswer
    return response.answer == correctAnswer || (
      // Also try response.response as another possible field name based on earlier implementations
      response.response !== undefined && response.response == correctAnswer
    )
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
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
          {data.submissions.map((submission) => (
            <div key={submission.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {submission.username || 'Anonymous User'} 
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100">
                      {submission.score}%
                    </span>
                    {submission.score >= 70 ? (
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
                    Completed: {formatDate(submission.completed_at)}
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
                    {submission.answers && submission.answers.map((answer, index) => {
                      const question = findQuestion(answer.questionId);
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
                            {isCorrect(submission, answer.questionId) ? (
                              <CheckCircleIcon className="ml-2 h-5 w-5 text-green-500" />
                            ) : (
                              <XCircleIcon className="ml-2 h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="text-center mb-6">
            <p className="text-slate-600 mb-4">No submissions for this quiz yet.</p>
            <p className="text-sm text-slate-500">You can create a test submission by submitting the quiz yourself or having students take the quiz.</p>
          </div>
          
          <div className="flex justify-center">
            <Link
              to={`/dashboard/quizzes/${id}/preview`}
              className="px-4 py-2 text-sm bg-teal-700 text-white rounded-md hover:bg-teal-800 mr-2"
            >
              Preview Quiz
            </Link>
            
            <button
              onClick={() => {
                // Copy the preview link
                const settings = data?.quiz?.settings ? JSON.parse(data.quiz.settings) : {};
                const accessCode = settings.accessCode;
                if (accessCode) {
                  const shareLink = `${window.location.origin}/take-quiz/${accessCode}`;
                  navigator.clipboard.writeText(shareLink);
                  toast.success('Quiz link copied to clipboard!');
                } else {
                  toast.error('Could not find quiz access code.');
                }
              }}
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
